import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Factory, CheckCircle, XCircle, Clock, Calendar, Loader2 } from 'lucide-react';
import TransactionTimeline from '@/components/TransactionTimeline';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from '@/hooks/use-toast';

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    pending: 'bg-warning/15 text-warning',
    accepted: 'bg-info/15 text-info',
    completed: 'bg-success/15 text-success',
    rejected: 'bg-destructive/15 text-destructive',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${map[status] || ''}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const IndustryRequests = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pickupDates, setPickupDates] = useState<Record<string, string>>({});
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; type: 'accept' | 'reject' | 'complete' } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('transactions').select('*').eq('industry_id', user.id).order('created_at', { ascending: false });
    setTransactions(data || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.status === filter);

  const doAction = async () => {
    if (!confirmAction) return;
    const { id, type } = confirmAction;

    if (type === 'accept') {
      const pickupDate = pickupDates[id] || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const { error } = await supabase.from('transactions').update({ status: 'accepted', pickup_date: pickupDate }).eq('id', id);
      if (!error) {
        toast({ title: 'Request Accepted', description: 'Pickup has been scheduled.' });
        const tx = transactions.find(t => t.id === id);
        if (tx) {
          await supabase.from('notifications').insert({ user_id: tx.farmer_id, message: `Your sell request has been accepted! Pickup: ${pickupDate}`, type: 'success' });
          if (tx.listing_id) await supabase.from('residue_listings').update({ status: 'pending' }).eq('id', tx.listing_id);
        }
      }
    } else if (type === 'reject') {
      const { error } = await supabase.from('transactions').update({ status: 'rejected' }).eq('id', id);
      if (!error) {
        toast({ title: 'Request Rejected', variant: 'destructive' });
        const tx = transactions.find(t => t.id === id);
        if (tx) await supabase.from('notifications').insert({ user_id: tx.farmer_id, message: 'Your sell request was rejected.', type: 'warning' });
      }
    } else {
      const tx = transactions.find(t => t.id === id);
      const carbonSaved = tx ? Number(tx.quantity) * 1500 : 0;
      const creditPoints = tx ? Number(tx.quantity) * 10 : 0;
      const { error } = await supabase.from('transactions').update({ status: 'completed', carbon_saved: carbonSaved, credit_points: creditPoints }).eq('id', id);
      if (!error) {
        toast({ title: 'Transaction Completed!', description: 'Biomass has been received.' });
        if (tx) {
          await supabase.from('notifications').insert({ user_id: tx.farmer_id, message: `Transaction completed! ${Number(tx.quantity)}t biomass received. Carbon credits: ${creditPoints}`, type: 'success' });
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
        <h2 className="text-2xl font-bold">My Requests</h2>

        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'accepted', 'completed', 'rejected'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? transactions.length : transactions.filter(t => t.status === f).length})
            </button>
          ))}
        </div>

        <div className="bg-card rounded-xl p-6 shadow-card">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Factory className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No {filter === 'all' ? '' : filter} requests found.</p>
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
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success font-medium">Cluster</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ₹{Number(t.price_per_ton)}/ton • {Number(t.transport_distance || 0)} km away
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Total: ₹{Number(t.total_value).toLocaleString()} • Transport: ₹{Number(t.transport_cost || 0).toLocaleString()}
                        {Number(t.transport_savings) > 0 && <span className="text-success"> (saved ₹{Number(t.transport_savings).toLocaleString()})</span>}
                      </p>
                      {t.pickup_date && (
                        <p className="text-xs text-info mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Pickup: {t.pickup_date}
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
                            <CheckCircle className="w-3 h-3" /> Accept
                          </button>
                          <button onClick={() => setConfirmAction({ id: t.id, type: 'reject' })} className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 transition-colors flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                        </>
                      )}
                      {t.status === 'accepted' && (
                        <button onClick={() => setConfirmAction({ id: t.id, type: 'complete' })} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                          Mark Completed
                        </button>
                      )}
                    </div>
                  </div>

                  <button onClick={() => setExpandedTx(expandedTx === t.id ? null : t.id)} className="text-[10px] text-primary mt-2 hover:underline">
                    {expandedTx === t.id ? 'Hide' : 'Show'} Timeline
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
        title={confirmAction?.type === 'accept' ? 'Accept Request?' : confirmAction?.type === 'reject' ? 'Reject Request?' : 'Mark Completed?'}
        message={confirmAction?.type === 'accept' ? 'This will schedule a pickup for this request.' : confirmAction?.type === 'reject' ? 'This action cannot be undone.' : 'Confirm that biomass has been received.'}
        confirmLabel={confirmAction?.type === 'reject' ? 'Reject' : 'Confirm'}
        variant={confirmAction?.type === 'reject' ? 'danger' : 'success'}
        onConfirm={doAction}
        onCancel={() => setConfirmAction(null)}
      />
    </DashboardLayout>
  );
};

export default IndustryRequests;
