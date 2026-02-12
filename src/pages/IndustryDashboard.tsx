import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Factory, Wheat, CheckCircle, XCircle, Clock, Calendar, IndianRupee, Loader2 } from 'lucide-react';
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

const IndustryDashboard = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pickupDates, setPickupDates] = useState<Record<string, string>>({});
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; type: 'accept' | 'reject' | 'complete' } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('industry_id', user.id)
      .order('created_at', { ascending: false });
    setTransactions(data || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const pendingRequests = transactions.filter(t => t.status === 'pending');
  const completedCount = transactions.filter(t => t.status === 'completed').length;
  const totalBiomass = transactions.filter(t => t.status === 'completed').reduce((s, t) => s + Number(t.quantity), 0);
  const totalSpent = transactions.filter(t => t.status === 'completed').reduce((s, t) => s + Number(t.total_value), 0);

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
          // Update listing status
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
    fetchTransactions();
  };

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Industry Dashboard</h2>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Clock, label: 'Pending Requests', value: pendingRequests.length.toString(), color: 'text-warning' },
            { icon: CheckCircle, label: 'Completed', value: completedCount.toString(), color: 'text-success' },
            { icon: Wheat, label: 'Biomass Procured', value: `${totalBiomass}t`, color: 'text-primary' },
            { icon: IndianRupee, label: 'Total Spent', value: `₹${totalSpent.toLocaleString()}`, color: 'text-info' },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-xl p-4 shadow-card animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Incoming Requests */}
        <div className="bg-card rounded-xl p-6 shadow-card">
          <h3 className="font-semibold text-lg mb-4">Incoming Requests</h3>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <Factory className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No incoming requests at this time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map(t => (
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

export default IndustryDashboard;
