import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Users, Factory, BarChart3, Leaf, TrendingUp, ShieldCheck, ShieldX, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import TransactionTimeline from '@/components/TransactionTimeline';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ farmers: 0, industries: 0, transactions: 0, biomass: 0, carbonSaved: 0 });
  const [profiles, setProfiles] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const { t } = useTranslation(['common', 'admin']);

  useEffect(() => {
    const fetchAll = async () => {
      const [profilesRes, rolesRes, txRes, indRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('user_roles').select('*'),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('industry_profiles').select('*'),
      ]);

      const allProfiles = profilesRes.data || [];
      const allRoles = rolesRes.data || [];
      const allTx = txRes.data || [];
      const allInd = indRes.data || [];

      const farmerCount = allRoles.filter(r => r.role === 'farmer').length;
      const industryCount = allInd.length;
      const completedTx = allTx.filter(t => t.status === 'completed');
      const totalBiomass = completedTx.reduce((s, t) => s + Number(t.quantity), 0);
      const totalCarbonSaved = completedTx.reduce((s, t) => s + Number(t.carbon_saved || 0), 0);

      setStats({ farmers: farmerCount, industries: industryCount, transactions: allTx.length, biomass: totalBiomass, carbonSaved: totalCarbonSaved });

      const merged = allProfiles.map(p => {
        const role = allRoles.find(r => r.user_id === p.user_id);
        const ind = allInd.find(i => i.user_id === p.user_id);
        return { ...p, role: role?.role || 'farmer', companyName: ind?.company_name };
      });
      setProfiles(merged);
      setTransactions(allTx);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const carbonReduction = stats.carbonSaved / 1000;
  const carbonGoal = 100;
  const carbonProgress = Math.min((carbonReduction / carbonGoal) * 100, 100);

  const toggleApproval = async (userId: string, currentApproved: boolean) => {
    const { error } = await supabase.from('profiles').update({ approved: !currentApproved }).eq('user_id', userId);
    if (!error) {
      setProfiles(prev => prev.map(p => p.user_id === userId ? { ...p, approved: !currentApproved } : p));
      toast({ title: currentApproved ? t('toasts.userBlocked', { ns: 'admin' }) : t('toasts.userApproved', { ns: 'admin' }) });
    }
  };

  // Build chart data dynamically from transactions grouped by month
  const monthlyData = (() => {
    const grouped: Record<string, { biomass: number; transactions: number; co2: number }> = {};
    transactions.forEach(t => {
      const d = new Date(t.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[key]) grouped[key] = { biomass: 0, transactions: 0, co2: 0 };
      grouped[key].transactions++;
      if (t.status === 'completed') {
        grouped[key].biomass += Number(t.quantity);
        grouped[key].co2 += Number(t.carbon_saved || 0) / 1000;
      }
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const [y, m] = key.split('-');
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return { month: monthNames[parseInt(m) - 1], ...v };
      });
  })();

  const pieData = (() => {
    const counts: Record<string, number> = {};
    transactions.forEach(t => { counts[t.crop_type] = (counts[t.crop_type] || 0) + Number(t.quantity); });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();
  const pieColors = ['hsl(142, 50%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(200, 80%, 50%)'];

  // Top villages from profiles
  const topVillages = (() => {
    const counts: Record<string, number> = {};
    profiles.filter(p => p.village && p.role === 'farmer').forEach(p => {
      counts[p.village] = (counts[p.village] || 0) + 1;
    });
    return Object.entries(counts).sort(([,a], [,b]) => b - a).slice(0, 5);
  })();

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">{t('dashboard.title', { ns: 'admin' })}</h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { icon: Users, label: t('dashboard.stats.farmers', { ns: 'admin' }), value: stats.farmers, color: 'text-primary' },
            { icon: Factory, label: t('dashboard.stats.industries', { ns: 'admin' }), value: stats.industries, color: 'text-info' },
            { icon: BarChart3, label: t('dashboard.stats.transactions', { ns: 'admin' }), value: stats.transactions, color: 'text-warning' },
            { icon: TrendingUp, label: t('dashboard.stats.biomassTraded', { ns: 'admin' }), value: `${stats.biomass}t`, color: 'text-success' },
            { icon: Leaf, label: t('dashboard.stats.co2Reduced', { ns: 'admin' }), value: `${carbonReduction.toFixed(1)}t`, color: 'text-primary' },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-xl p-4 shadow-card animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Carbon Progress */}
        <div className="bg-card rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-primary" />
              <h4 className="font-semibold text-sm">{t('dashboard.progressTitle', { ns: 'admin' })}</h4>
            </div>
            <span className="text-xs text-muted-foreground">{t('dashboard.progressSummary', { ns: 'admin', current: carbonReduction.toFixed(1), goal: carbonGoal })}</span>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-1000 ease-out" style={{ width: `${carbonProgress}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{t('dashboard.progressAchieved', { ns: 'admin', percent: carbonProgress.toFixed(0) })}</p>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-card rounded-xl p-5 shadow-card">
            <h4 className="font-semibold text-sm mb-4">{t('dashboard.charts.monthly', { ns: 'admin' })}</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData.length ? monthlyData : [{ month: t('dashboard.charts.noData', { ns: 'admin' }), biomass: 0, transactions: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(80, 15%, 88%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="biomass" fill="hsl(142, 50%, 32%)" radius={[4, 4, 0, 0]} name="Biomass (t)" />
                <Bar dataKey="transactions" fill="hsl(200, 80%, 50%)" radius={[4, 4, 0, 0]} name="Transactions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-xl p-5 shadow-card">
            <h4 className="font-semibold text-sm mb-4">{t('dashboard.charts.mostDemandedCrop', { ns: 'admin' })}</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData.length ? pieData : [{ name: t('dashboard.charts.noData', { ns: 'admin' }), value: 1 }]} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                  {(pieData.length ? pieData : [{ name: t('dashboard.charts.noData', { ns: 'admin' }) }]).map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {pieData.map((d, i) => (
                <span key={i} className="flex items-center gap-1 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pieColors[i % pieColors.length] }} /> {d.name}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-card rounded-xl p-5 shadow-card">
            <h4 className="font-semibold text-sm mb-4">{t('dashboard.charts.co2Trend', { ns: 'admin' })}</h4>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyData.length ? monthlyData : [{ month: t('dashboard.charts.noData', { ns: 'admin' }), co2: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(80, 15%, 88%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <defs>
                  <linearGradient id="co2Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142, 50%, 45%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(142, 50%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="co2" stroke="hsl(142, 50%, 45%)" strokeWidth={2} fill="url(#co2Grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Villages */}
        {topVillages.length > 0 && (
          <div className="bg-card rounded-xl p-6 shadow-card">
            <h3 className="font-semibold text-lg mb-4">{t('dashboard.topVillages', { ns: 'admin' })}</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {topVillages.map(([village, count], i) => (
                <div key={i} className="bg-muted rounded-lg p-3 text-center">
                  <p className="font-medium text-sm">{village}</p>
                  <p className="text-xs text-muted-foreground">{count} {t('dashboard.stats.farmers', { ns: 'admin' })}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Management */}
        <div className="bg-card rounded-xl p-6 shadow-card">
          <h3 className="font-semibold text-lg mb-4">{t('dashboard.usersTitle', { ns: 'admin' })}</h3>
          {profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('dashboard.noUsers', { ns: 'admin' })}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 text-xs text-muted-foreground font-medium">{t('dashboard.tableHeaders.name', { ns: 'admin' })}</th>
                    <th className="pb-3 text-xs text-muted-foreground font-medium">{t('dashboard.tableHeaders.email', { ns: 'admin' })}</th>
                    <th className="pb-3 text-xs text-muted-foreground font-medium">{t('dashboard.tableHeaders.role', { ns: 'admin' })}</th>
                    <th className="pb-3 text-xs text-muted-foreground font-medium">{t('dashboard.tableHeaders.status', { ns: 'admin' })}</th>
                    <th className="pb-3 text-xs text-muted-foreground font-medium">{t('dashboard.tableHeaders.action', { ns: 'admin' })}</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(u => (
                    <tr key={u.id} className="border-b border-border/50">
                      <td className="py-3 font-medium">{u.name || u.companyName || t('users.unnamed', { ns: 'admin' })}</td>
                      <td className="py-3 text-muted-foreground">{u.email}</td>
                      <td className="py-3 capitalize">{u.role}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.approved ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                          {u.approved ? t('users.active', { ns: 'admin' }) : t('users.blocked', { ns: 'admin' })}
                        </span>
                      </td>
                      <td className="py-3">
                        <button onClick={() => toggleApproval(u.user_id, u.approved)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          u.approved ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'bg-success/10 text-success hover:bg-success/20'
                        }`}>
                          {u.approved ? <><ShieldX className="w-3 h-3" /> {t('users.block', { ns: 'admin' })}</> : <><ShieldCheck className="w-3 h-3" /> {t('users.approve', { ns: 'admin' })}</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* All Transactions */}
        <div className="bg-card rounded-xl p-6 shadow-card">
          <h3 className="font-semibold text-lg mb-4">{t('dashboard.transactionsTitle', { ns: 'admin' })}</h3>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('dashboard.noTransactions', { ns: 'admin' })}</p>
          ) : (
            <div className="space-y-3">
              {transactions.map(t => (
                <div key={t.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t.crop_type} • {Number(t.quantity)}t</p>
                      <p className="text-xs text-muted-foreground">₹{Number(t.total_value).toLocaleString()} • {Number(t.transport_distance || 0)}km</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.status === 'completed' ? 'bg-success/15 text-success' :
                      t.status === 'accepted' ? 'bg-info/15 text-info' :
                      t.status === 'pending' ? 'bg-warning/15 text-warning' :
                      'bg-destructive/15 text-destructive'
                    }`}>{t(`dashboard.statusLabels.${t.status}`, { ns: 'admin' })}</span>
                  </div>
                  <button onClick={() => setExpandedTx(expandedTx === t.id ? null : t.id)} className="text-[10px] text-primary mt-2 hover:underline">
                    {expandedTx === t.id ? t('dashboard.hideTimeline', { ns: 'admin' }) : t('dashboard.showTimeline', { ns: 'admin' })}
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
    </DashboardLayout>
  );
};

export default AdminDashboard;
