import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { sampleTransactions } from '@/data/mockData';
import { Factory, Wheat, CheckCircle, XCircle, Clock, Calendar, IndianRupee } from 'lucide-react';
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
  const [transactions, setTransactions] = useState(sampleTransactions);
  const [pickupDates, setPickupDates] = useState<Record<string, string>>({});
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; type: 'accept' | 'reject' | 'complete' } | null>(null);

  const pendingRequests = transactions.filter(t => t.status === 'pending');
  const completedCount = transactions.filter(t => t.status === 'completed').length;
  const totalBiomass = transactions.filter(t => t.status === 'completed').reduce((s, t) => s + t.quantity, 0);
  const totalSpent = transactions.filter(t => t.status === 'completed').reduce((s, t) => s + t.totalValue, 0);

  const doAction = () => {
    if (!confirmAction) return;
    const { id, type } = confirmAction;
    if (type === 'accept') {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'accepted' as const, pickupDate: pickupDates[id] || '2026-02-20' } : t));
      toast({ title: "Request Accepted", description: "Pickup has been scheduled." });
    } else if (type === 'reject') {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'rejected' as const } : t));
      toast({ title: "Request Rejected", variant: "destructive" });
    } else {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'completed' as const } : t));
      toast({ title: "Transaction Completed!", description: "Biomass has been received." });
    }
    setConfirmAction(null);
  };

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
                        <p className="font-medium">{t.farmerName}</p>
                        <StatusBadge status={t.status} />
                        {t.clusterEligible && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success font-medium">Cluster</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.cropType} • {t.quantity} tons • ₹{t.pricePerTon}/ton • {t.distance} km away
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Total: ₹{t.totalValue.toLocaleString()} • Transport: ₹{t.transportCost.toLocaleString()}
                        {t.transportSavings ? <span className="text-success"> (saved ₹{t.transportSavings.toLocaleString()})</span> : null}
                      </p>
                      {t.pickupDate && (
                        <p className="text-xs text-info mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Pickup: {t.pickupDate}
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

                  {/* Timeline toggle */}
                  <button onClick={() => setExpandedTx(expandedTx === t.id ? null : t.id)} className="text-[10px] text-primary mt-2 hover:underline">
                    {expandedTx === t.id ? 'Hide' : 'Show'} Timeline
                  </button>
                  {expandedTx === t.id && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <TransactionTimeline transaction={t} />
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
