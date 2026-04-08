import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Search, Loader2, Calendar, Leaf, IndianRupee, Truck, Users } from 'lucide-react';
import TransactionTimeline from '@/components/TransactionTimeline';
import { useTranslation } from 'react-i18next';

const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation(['admin']);
  const map: Record<string, string> = {
    pending: 'bg-warning/15 text-warning',
    accepted: 'bg-info/15 text-info',
    completed: 'bg-success/15 text-success',
    rejected: 'bg-destructive/15 text-destructive',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${map[status] || ''}`}>
      {t(`transactions.statusLabels.${status}`, { ns: 'admin' })}
    </span>
  );
};

interface ProfileMap {
  [userId: string]: { name: string; companyName?: string };
}

const AdminTransactions = () => {
  const { t } = useTranslation(['common', 'admin']);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const [txRes, profilesRes, rolesRes, indRes] = await Promise.all([
        supabase.from('transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('user_id, name'),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('industry_profiles').select('user_id, company_name'),
      ]);

      setTransactions(txRes.data || []);

      const pMap: ProfileMap = {};
      (profilesRes.data || []).forEach(p => {
        pMap[p.user_id] = { name: p.name };
      });
      (indRes.data || []).forEach(i => {
        if (pMap[i.user_id]) {
          pMap[i.user_id].companyName = i.company_name;
        } else {
          pMap[i.user_id] = { name: i.company_name, companyName: i.company_name };
        }
      });
      setProfiles(pMap);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const statusCounts = {
    all: transactions.length,
    pending: transactions.filter(t => t.status === 'pending').length,
    accepted: transactions.filter(t => t.status === 'accepted').length,
    completed: transactions.filter(t => t.status === 'completed').length,
    rejected: transactions.filter(t => t.status === 'rejected').length,
  };

  const completedTx = transactions.filter(t => t.status === 'completed');
  const totalBiomass = completedTx.reduce((s, t) => s + Number(t.quantity), 0);
  const totalValue = completedTx.reduce((s, t) => s + Number(t.total_value), 0);
  const totalCarbon = completedTx.reduce((s, t) => s + Number(t.carbon_saved || 0), 0);

  const filtered = transactions.filter(t => {
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const farmerName = profiles[t.farmer_id]?.name || '';
    const industryName = profiles[t.industry_id]?.companyName || profiles[t.industry_id]?.name || '';
    const matchSearch = search === '' ||
      t.crop_type.toLowerCase().includes(search.toLowerCase()) ||
      farmerName.toLowerCase().includes(search.toLowerCase()) ||
      industryName.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t('transactions.title', { ns: 'admin' })}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3 className="w-4 h-4" />
            <span>{t('transactions.totalCount', { ns: 'admin', count: transactions.length })}</span>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: BarChart3, label: t('transactions.summary.totalTransactions', { ns: 'admin' }), value: transactions.length.toString(), color: 'text-primary' },
            { icon: IndianRupee, label: t('transactions.summary.totalValue', { ns: 'admin' }), value: `₹${totalValue.toLocaleString()}`, color: 'text-success' },
            { icon: Truck, label: t('transactions.summary.biomassTraded', { ns: 'admin' }), value: `${totalBiomass}t`, color: 'text-info' },
            { icon: Leaf, label: t('transactions.summary.co2Saved', { ns: 'admin' }), value: `${(totalCarbon / 1000).toFixed(1)}t`, color: 'text-primary' },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-xl p-4 shadow-card">
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Status Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('transactions.searchPlaceholder', { ns: 'admin' })}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'accepted', 'completed', 'rejected'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
                }`}
              >
                {t(`transactions.filters.${s}`, { ns: 'admin' })} ({statusCounts[s]})
              </button>
            ))}
          </div>
        </div>

        {/* Transactions list */}
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t('transactions.noMatch', { ns: 'admin' })}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(t => {
                const farmerName = profiles[t.farmer_id]?.name || t('transactions.unknownFarmer', { ns: 'admin' });
                const industryName = profiles[t.industry_id]?.companyName || profiles[t.industry_id]?.name || t('transactions.unknownIndustry', { ns: 'admin' });

                return (
                  <div key={t.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{t.crop_type} — {Number(t.quantity)} tons</p>
                          <StatusBadge status={t.status} />
                          {t.cluster_eligible && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success font-medium">
                              <Users className="w-2.5 h-2.5 inline mr-0.5" />{t('transactions.cluster', { ns: 'admin' })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>🌾 {farmerName}</span>
                          <span>🏭 {industryName}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <span>₹{Number(t.price_per_ton)}/ton</span>
                          <span>{t('transactions.total', { ns: 'admin', value: `₹${Number(t.total_value).toLocaleString()}` })}</span>
                          <span>🚚 {Number(t.transport_distance || 0)} km</span>
                          <span>{t('transactions.transport', { ns: 'admin', value: `₹${Number(t.transport_cost || 0).toLocaleString()}` })}</span>
                          {Number(t.transport_savings) > 0 && (
                            <span className="text-success">{t('transactions.saved', { ns: 'admin', value: `₹${Number(t.transport_savings).toLocaleString()}` })}</span>
                          )}
                        </div>
                        {t.status === 'completed' && (
                          <div className="flex items-center gap-4 text-xs mt-1">
                            <span className="text-primary flex items-center gap-1">
                              <Leaf className="w-3 h-3" /> {Number(t.carbon_saved || 0).toLocaleString()} kg CO₂
                            </span>
                            <span className="text-success">{t('dashboard.credits', { ns: 'admin', count: Number(t.credit_points || 0) })}</span>
                          </div>
                        )}
                        {t.pickup_date && (
                          <p className="text-xs text-info mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {t('dashboard.pickup', { ns: 'admin', date: t.pickup_date })}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground text-right shrink-0">
                        <p>{new Date(t.created_at).toLocaleDateString()}</p>
                        <p>{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedTx(expandedTx === t.id ? null : t.id)}
                      className="text-[10px] text-primary mt-2 hover:underline"
                    >
                      {expandedTx === t.id ? t('dashboard.hideTimeline', { ns: 'admin' }) : t('dashboard.showTimeline', { ns: 'admin' })}
                    </button>
                    {expandedTx === t.id && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <TransactionTimeline transaction={{
                          id: t.id, farmerId: t.farmer_id, farmerName, industryId: t.industry_id, industryName,
                          cropType: t.crop_type, quantity: Number(t.quantity), pricePerTon: Number(t.price_per_ton),
                          totalValue: Number(t.total_value), transportCost: Number(t.transport_cost || 0),
                          netProfit: Number(t.net_profit || 0), distance: Number(t.transport_distance || 0),
                          status: t.status, createdAt: t.created_at, pickupDate: t.pickup_date,
                          clusterEligible: t.cluster_eligible, transportSavings: Number(t.transport_savings || 0),
                        }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminTransactions;
