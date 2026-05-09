import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Factory, CheckCircle, XCircle, Clock, Calendar, Loader2 } from 'lucide-react';
import TransactionTimeline from '@/components/TransactionTimeline';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation(['industry']);
  const map: Record<string, string> = {
    pending: 'bg-warning/15 text-warning',
    accepted: 'bg-info/15 text-info',
    completed: 'bg-success/15 text-success',
    rejected: 'bg-destructive/15 text-destructive',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${map[status] || ''}`}>
      {t(`statuses.${status}`, { ns: 'industry' })}
    </span>
  );
};

const IndustryRequests = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pickupDates, setPickupDates] = useState<Record<string, string>>({});
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [reportingTxId, setReportingTxId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reporting, setReporting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: string; type: 'accept' | 'reject' | 'complete' } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const { t: translate } = useTranslation(['common', 'industry']);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('transactions').select('*').eq('industry_id', user.id).order('created_at', { ascending: false });
    setTransactions(data || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const startReport = (txId: string) => {
    if (reportingTxId === txId) {
      setReportingTxId(null);
      setReportReason('');
      setReportDetails('');
      return;
    }

    setReportingTxId(txId);
    setReportReason('');
    setReportDetails('');
  };

  const submitReport = async (transaction: any) => {
    if (!user?.id) return;

    const reason = reportReason.trim();
    if (!reason) {
      toast({ title: translate('requests.report.requiredReason', { ns: 'industry' }), variant: 'destructive' });
      return;
    }

    setReporting(true);

    const details = reportDetails.trim();
    const { error } = await supabase.from('fraud_reports').insert({
      reporter_user_id: user.id,
      reported_user_id: transaction.farmer_id,
      reason,
      details: details || `Transaction: ${transaction.id}`,
    });

    setReporting(false);

    if (error) {
      toast({ title: translate('requests.report.failedTitle', { ns: 'industry' }), description: error.message, variant: 'destructive' });
      return;
    }

    toast({
      title: translate('requests.report.successTitle', { ns: 'industry' }),
      description: translate('requests.report.successDescription', { ns: 'industry' }),
    });

    setReportingTxId(null);
    setReportReason('');
    setReportDetails('');
  };

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.status === filter);

  const isValidTransition = (currentStatus: string, nextStatus: 'accepted' | 'rejected' | 'completed') => {
    if (nextStatus === 'accepted') return currentStatus === 'pending';
    if (nextStatus === 'rejected') return currentStatus === 'pending';
    if (nextStatus === 'completed') return currentStatus === 'accepted';
    return false;
  };

  const doAction = async () => {
    if (!confirmAction) return;
    const { id, type } = confirmAction;
    const tx = transactions.find(t => t.id === id);

    if (!tx) {
      setConfirmAction(null);
      return;
    }

    if (type === 'accept') {
      if (!isValidTransition(tx.status, 'accepted')) {
        toast({ title: translate('requests.invalidTransitionTitle', { ns: 'industry', defaultValue: 'Invalid action' }), description: translate('requests.invalidTransitionDescription', { ns: 'industry', defaultValue: 'This request cannot be accepted from its current state.' }), variant: 'destructive' });
        setConfirmAction(null);
        return;
      }

      const pickupDate = pickupDates[id] || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const { error } = await supabase.from('transactions').update({ status: 'accepted', pickup_date: pickupDate }).eq('id', id);
      if (!error) {
        toast({ title: translate('requests.acceptedToastTitle', { ns: 'industry' }), description: translate('requests.acceptedToastDescription', { ns: 'industry' }) });
        if (tx) {
          await supabase.from('notifications').insert({ user_id: tx.farmer_id, message: translate('requests.acceptedNotification', { ns: 'industry', date: pickupDate }), type: 'success' });
          if (tx.listing_id) await supabase.from('residue_listings').update({ status: 'pending' }).eq('id', tx.listing_id);
        }
      }
    } else if (type === 'reject') {
      if (!isValidTransition(tx.status, 'rejected')) {
        toast({ title: translate('requests.invalidTransitionTitle', { ns: 'industry', defaultValue: 'Invalid action' }), description: translate('requests.invalidTransitionDescription', { ns: 'industry', defaultValue: 'This request cannot be rejected from its current state.' }), variant: 'destructive' });
        setConfirmAction(null);
        return;
      }

      const { error } = await supabase.from('transactions').update({ status: 'rejected' }).eq('id', id);
      if (!error) {
        toast({ title: translate('requests.rejectedToastTitle', { ns: 'industry' }), variant: 'destructive' });
        if (tx) await supabase.from('notifications').insert({ user_id: tx.farmer_id, message: translate('requests.rejectedNotification', { ns: 'industry' }), type: 'warning' });
      }
    } else {
      if (!isValidTransition(tx.status, 'completed')) {
        toast({ title: translate('requests.invalidTransitionTitle', { ns: 'industry', defaultValue: 'Invalid action' }), description: translate('requests.invalidTransitionDescription', { ns: 'industry', defaultValue: 'Only accepted requests can be marked completed.' }), variant: 'destructive' });
        setConfirmAction(null);
        return;
      }

      const carbonSaved = Number(tx.quantity) * 1.5;
      const creditPoints = Number(tx.quantity) * 8;
      const { error } = await supabase.from('transactions').update({ status: 'completed', carbon_saved: carbonSaved, credit_points: creditPoints }).eq('id', id);
      if (!error) {
        toast({ title: translate('requests.completedToastTitle', { ns: 'industry' }), description: translate('requests.completedToastDescription', { ns: 'industry' }) });
        if (tx) {
          await supabase.from('notifications').insert({ user_id: tx.farmer_id, message: translate('requests.completedNotification', { ns: 'industry', quantity: Number(tx.quantity), credits: creditPoints }), type: 'success' });
          if (tx.listing_id) await supabase.from('residue_listings').update({ status: 'completed' }).eq('id', tx.listing_id);
        }
      }
    }
    setConfirmAction(null);
    fetchData();
  };

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">{translate('requests.title', { ns: 'industry' })}</h2>

        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'accepted', 'completed', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
              }`}
            >
              {translate(`requests.filters.${f}`, { ns: 'industry' })} ({f === 'all' ? transactions.length : transactions.filter(t => t.status === f).length})
            </button>
          ))}
        </div>

        <div className="bg-card rounded-xl p-6 shadow-card">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Factory className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {filter === 'all' ? translate('requests.emptyAll', { ns: 'industry' }) : translate('requests.emptyFiltered', { ns: 'industry', status: translate(`requests.filters.${filter}`, { ns: 'industry' }) })}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(t => (
                <div key={t.id} className="border border-border rounded-lg p-4 animate-fade-in">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{t.crop_type} — {Number(t.quantity)} tons</p>
                        <StatusBadge status={t.status} />
                        {t.cluster_eligible && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success font-medium">{translate('requests.cluster', { ns: 'industry' })}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                          ₹{Number(t.price_per_ton)}/ton • {translate('requests.distanceAway', { ns: 'industry', distance: Number(t.transport_distance || 0) })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                          {translate('requests.total', { ns: 'industry', value: `₹${Number(t.total_value).toLocaleString()}` })} • {translate('requests.transport', { ns: 'industry', value: `₹${Number(t.transport_cost || 0).toLocaleString()}` })}
                          {Number(t.transport_savings) > 0 && <span className="text-success"> ({translate('requests.saved', { ns: 'industry', value: `₹${Number(t.transport_savings).toLocaleString()}` })})</span>}
                      </p>
                      {t.pickup_date && (
                        <p className="text-xs text-info mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {translate('requests.pickup', { ns: 'industry', date: t.pickup_date })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {t.status === 'pending' && (
                        <>
                          <input
                            type="date"
                            value={pickupDates[t.id] || ''}
                            onChange={e => setPickupDates(p => ({ ...p, [t.id]: e.target.value }))}
                            className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs"
                          />
                          <button onClick={() => setConfirmAction({ id: t.id, type: 'accept' })} className="px-3 py-1.5 rounded-lg bg-success text-success-foreground text-xs font-medium hover:bg-success/90 transition-colors flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> {translate('requests.accept', { ns: 'industry' })}
                          </button>
                          <button onClick={() => setConfirmAction({ id: t.id, type: 'reject' })} className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 transition-colors flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> {translate('requests.reject', { ns: 'industry' })}
                          </button>
                        </>
                      )}
                      {t.status === 'accepted' && (
                        <button onClick={() => setConfirmAction({ id: t.id, type: 'complete' })} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                          {translate('requests.markCompleted', { ns: 'industry' })}
                        </button>
                      )}
                      <button
                        onClick={() => startReport(t.id)}
                        className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
                      >
                        {translate('requests.report.button', { ns: 'industry' })}
                      </button>
                    </div>
                  </div>

                  {reportingTxId === t.id && (
                    <div className="mt-3 p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                      <p className="text-xs font-semibold">{translate('requests.report.title', { ns: 'industry' })}</p>
                      <div>
                        <label className="text-xs text-muted-foreground">{translate('requests.report.reasonLabel', { ns: 'industry' })}</label>
                        <input
                          type="text"
                          value={reportReason}
                          onChange={(e) => setReportReason(e.target.value)}
                          placeholder={translate('requests.report.reasonPlaceholder', { ns: 'industry' })}
                          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">{translate('requests.report.detailsLabel', { ns: 'industry' })}</label>
                        <textarea
                          value={reportDetails}
                          onChange={(e) => setReportDetails(e.target.value)}
                          placeholder={translate('requests.report.detailsPlaceholder', { ns: 'industry' })}
                          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs min-h-20 focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => startReport(t.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-secondary transition-colors"
                        >
                          {translate('requests.report.cancel', { ns: 'industry' })}
                        </button>
                        <button
                          disabled={reporting}
                          onClick={() => submitReport(t)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60 transition-colors"
                        >
                          {reporting ? translate('requests.report.submitting', { ns: 'industry' }) : translate('requests.report.submit', { ns: 'industry' })}
                        </button>
                      </div>
                    </div>
                  )}

                  <button onClick={() => setExpandedTx(expandedTx === t.id ? null : t.id)} className="text-[10px] text-primary mt-2 hover:underline">
                    {expandedTx === t.id ? translate('requests.hideTimeline', { ns: 'industry' }) : translate('requests.showTimeline', { ns: 'industry' })}
                  </button>
                  {expandedTx === t.id && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <TransactionTimeline transaction={{
                        id: t.id, farmerId: t.farmer_id, farmerName: '', industryId: t.industry_id, industryName: '',
                        cropType: t.crop_type, quantity: Number(t.quantity), pricePerTon: Number(t.price_per_ton),
                        totalValue: Number(t.total_value), transportCost: Number(t.transport_cost || 0),
                        netProfit: Number(t.net_profit || 0), distance: Number(t.transport_distance || 0),
                        status: t.status, createdAt: t.created_at, pickupDate: t.pickup_date,
                        clusterEligible: t.cluster_eligible, transportSavings: Number(t.transport_savings || 0),
                      }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.type === 'accept' ? translate('requests.confirm.acceptTitle', { ns: 'industry' }) : confirmAction?.type === 'reject' ? translate('requests.confirm.rejectTitle', { ns: 'industry' }) : translate('requests.confirm.completeTitle', { ns: 'industry' })}
        message={confirmAction?.type === 'accept' ? translate('requests.confirm.acceptMessage', { ns: 'industry' }) : confirmAction?.type === 'reject' ? translate('requests.confirm.rejectMessage', { ns: 'industry' }) : translate('requests.confirm.completeMessage', { ns: 'industry' })}
        confirmLabel={confirmAction?.type === 'reject' ? translate('requests.confirm.reject', { ns: 'industry' }) : translate('requests.confirm.confirm', { ns: 'industry' })}
        variant={confirmAction?.type === 'reject' ? 'danger' : 'success'}
        onConfirm={doAction}
        onCancel={() => setConfirmAction(null)}
      />
    </DashboardLayout>
  );
};

export default IndustryRequests;
