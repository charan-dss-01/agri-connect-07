import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Wheat, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import TransactionTimeline from '@/components/TransactionTimeline';

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    pending: 'bg-warning/15 text-warning',
    accepted: 'bg-info/15 text-info',
    completed: 'bg-success/15 text-success',
    rejected: 'bg-destructive/15 text-destructive',
  };
  const icons: Record<string, any> = { pending: Clock, accepted: CheckCircle, completed: CheckCircle, rejected: XCircle };
  const Icon = icons[status] || Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${map[status] || ''}`}>
      <Icon className="w-3 h-3" /> {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const FarmerRequests = () => {
  const { user } = useAuth();
  const [myTransactions, setMyTransactions] = useState<any[]>([]);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('farmer_id', user.id)
      .order('created_at', { ascending: false });
    setMyTransactions(data || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = filter === 'all' ? myTransactions : myTransactions.filter(t => t.status === filter);

  const statusCounts = {
    all: myTransactions.length,
    pending: myTransactions.filter(t => t.status === 'pending').length,
    accepted: myTransactions.filter(t => t.status === 'accepted').length,
    completed: myTransactions.filter(t => t.status === 'completed').length,
    rejected: myTransactions.filter(t => t.status === 'rejected').length,
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">My Requests</h2>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'accepted', 'completed', 'rejected'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-secondary'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)} ({statusCounts[s]})
            </button>
          ))}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4 shadow-card">
            <p className="text-xs text-muted-foreground">Total Requests</p>
            <p className="text-xl font-bold">{myTransactions.length}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <p className="text-xs text-muted-foreground">Total Earnings</p>
            <p className="text-xl font-bold text-success">
              ₹{myTransactions.filter(t => t.status === 'completed').reduce((s, t) => s + (Number(t.net_profit) || 0), 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <p className="text-xs text-muted-foreground">Biomass Traded</p>
            <p className="text-xl font-bold">
              {myTransactions.filter(t => t.status === 'completed').reduce((s, t) => s + Number(t.quantity), 0)}t
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <p className="text-xs text-muted-foreground">CO₂ Saved</p>
            <p className="text-xl font-bold text-primary">
              {myTransactions.filter(t => t.status === 'completed').reduce((s, t) => s + (Number(t.carbon_saved) || 0), 0).toFixed(1)} kg
            </p>
          </div>
        </div>

        {/* Requests list */}
        <div className="bg-card rounded-xl p-6 shadow-card">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Wheat className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {filter === 'all' ? 'No requests yet. List your crop residue to get started!' : `No ${filter} requests.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(t => (
                <div key={t.id} className="border border-border rounded-lg p-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setExpandedTx(expandedTx === t.id ? null : t.id)}>
                    <div>
                      <p className="font-medium text-sm">{t.crop_type} • {Number(t.quantity)}t</p>
                      <p className="text-xs text-muted-foreground">
                        ₹{Number(t.price_per_ton)}/ton • Total: ₹{Number(t.total_value).toLocaleString()} • Net: ₹{Number(t.net_profit || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        📍 {Number(t.transport_distance || 0)} km • 🚚 ₹{Number(t.transport_cost || 0).toLocaleString()}
                        {Number(t.transport_savings) > 0 && <span className="text-success"> (saved ₹{Number(t.transport_savings).toLocaleString()})</span>}
                      </p>
                      {t.pickup_date && (
                        <p className="text-xs text-info mt-0.5">📅 Pickup: {t.pickup_date}</p>
                      )}
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                  {expandedTx === t.id && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <TransactionTimeline transaction={{
                        ...t,
                        farmerId: t.farmer_id,
                        farmerName: user?.name || '',
                        industryId: t.industry_id,
                        industryName: '',
                        cropType: t.crop_type,
                        pricePerTon: Number(t.price_per_ton),
                        totalValue: Number(t.total_value),
                        transportCost: Number(t.transport_cost || 0),
                        netProfit: Number(t.net_profit || 0),
                        distance: Number(t.transport_distance || 0),
                        createdAt: t.created_at,
                        pickupDate: t.pickup_date,
                        clusterEligible: t.cluster_eligible,
                        transportSavings: Number(t.transport_savings || 0),
                      }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FarmerRequests;
