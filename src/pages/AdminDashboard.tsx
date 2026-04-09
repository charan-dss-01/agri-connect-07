import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Users, Factory, BarChart3, Leaf, TrendingUp, ShieldCheck, ShieldX, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import TransactionTimeline from '@/components/TransactionTimeline';
import PremiumStatCard from '@/components/PremiumStatCard';
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
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t('dashboard.title', { ns: 'admin' })}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t('dashboard.subtitle', { ns: 'admin', defaultValue: 'Platform overview and management' })}</p>
        </motion.div>

        {/* Premium Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <PremiumStatCard
            title={t('dashboard.stats.farmers', { ns: 'admin' })}
            value={stats.farmers}
            icon={Users}
            gradient="primary"
            trend={stats.farmers > 0 ? 12 : undefined}
            subtext={t('dashboard.stats.farmers', { ns: 'admin' })}
            animated
          />
          <PremiumStatCard
            title={t('dashboard.stats.industries', { ns: 'admin' })}
            value={stats.industries}
            icon={Factory}
            gradient="accent"
            trend={stats.industries > 0 ? 8 : undefined}
            subtext={t('dashboard.stats.industries', { ns: 'admin' })}
            animated
          />
          <PremiumStatCard
            title={t('dashboard.stats.transactions', { ns: 'admin' })}
            value={stats.transactions}
            icon={BarChart3}
            gradient="destructive"
            trend={stats.transactions > 0 ? 25 : undefined}
            subtext={t('dashboard.stats.transactions', { ns: 'admin' })}
            animated
          />
          <PremiumStatCard
            title={t('dashboard.stats.biomassTraded', { ns: 'admin' })}
            value={stats.biomass}
            icon={TrendingUp}
            gradient="success"
            trend={stats.biomass > 0 ? 18 : undefined}
            subtext={t('dashboard.stats.biomassTraded', { ns: 'admin' })}
            animated
          />
          <PremiumStatCard
            title={t('dashboard.stats.co2Reduced', { ns: 'admin' })}
            value={carbonReduction}
            icon={Leaf}
            gradient="primary"
            trend={carbonReduction > 0 ? 32 : undefined}
            subtext={t('dashboard.stats.co2Reduced', { ns: 'admin' })}
            animated
          />
        </div>

        {/* Carbon Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl border border-primary/20 backdrop-blur-xl p-6"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-30" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Leaf className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold">{t('dashboard.progressTitle', { ns: 'admin' })}</h3>
              </div>
              <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                {carbonProgress.toFixed(0)}% {t('dashboard.progressAchieved', { ns: 'admin' })}
              </span>
            </div>
            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-accent to-success rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${carbonProgress}%` }}
                transition={{ duration: 2, ease: 'easeOut', delay: 0.5 }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {t('dashboard.progressSummary', { ns: 'admin', current: carbonReduction.toFixed(1), goal: carbonGoal })}
            </p>
          </div>
        </motion.div>

        {/* Charts */}
        <div className="grid md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-2xl border border-border/50 backdrop-blur-xl p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
            <div className="relative z-10">
              <h4 className="font-semibold mb-4 text-foreground">{t('dashboard.charts.monthly', { ns: 'admin' })}</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData.length ? monthlyData : [{ month: t('dashboard.charts.noData', { ns: 'admin' }), biomass: 0, transactions: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(80, 15%, 88%)" opacity={0.2} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(80, 15%, 55%)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(80, 15%, 55%)' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(150, 20%, 10%)', border: '1px solid hsl(150, 15%, 18%)', borderRadius: '8px' }} />
                  <Bar dataKey="biomass" fill="hsl(142, 50%, 45%)" radius={[6, 6, 0, 0]} name="Biomass (t)" />
                  <Bar dataKey="transactions" fill="hsl(38, 92%, 50%)" radius={[6, 6, 0, 0]} name="Transactions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative overflow-hidden rounded-2xl border border-border/50 backdrop-blur-xl p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-50" />
            <div className="relative z-10">
              <h4 className="font-semibold mb-4 text-foreground">{t('dashboard.charts.mostDemandedCrop', { ns: 'admin' })}</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData.length ? pieData : [{ name: t('dashboard.charts.noData', { ns: 'admin' }), value: 1 }]} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                    {(pieData.length ? pieData : [{ name: t('dashboard.charts.noData', { ns: 'admin' }) }]).map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(150, 20%, 10%)', border: '1px solid hsl(150, 15%, 18%)', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-3 mt-3 flex-wrap">
                {pieData.map((d, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-xs font-medium">
                    <span className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ backgroundColor: pieColors[i % pieColors.length] }} /> {d.name}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative overflow-hidden rounded-2xl border border-border/50 backdrop-blur-xl p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent opacity-50" />
            <div className="relative z-10">
              <h4 className="font-semibold mb-4 text-foreground">{t('dashboard.charts.co2Trend', { ns: 'admin' })}</h4>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyData.length ? monthlyData : [{ month: t('dashboard.charts.noData', { ns: 'admin' }), co2: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(80, 15%, 88%)" opacity={0.2} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(80, 15%, 55%)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(80, 15%, 55%)' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(150, 20%, 10%)', border: '1px solid hsl(150, 15%, 18%)', borderRadius: '8px' }} />
                  <defs>
                    <linearGradient id="co2Grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142, 50%, 45%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(142, 50%, 45%)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="co2" stroke="hsl(142, 50%, 45%)" strokeWidth={2.5} fill="url(#co2Grad)" dot={{ fill: 'hsl(142, 50%, 45%)', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Top Villages */}
        {topVillages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="relative overflow-hidden rounded-2xl border border-accent/20 backdrop-blur-xl p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-30" />
            <div className="relative z-10">
              <h3 className="font-semibold text-lg mb-6 text-foreground flex items-center gap-2">
                <span className="text-2xl">📍</span> {t('dashboard.topVillages', { ns: 'admin' })}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {topVillages.map(([village, count], i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ translateY: -2 }}
                    className="relative overflow-hidden rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 to-transparent p-4 text-center hover:border-accent/60 transition-all duration-200 group"
                  >
                    <div className="absolute inset-0 backdrop-blur-xl bg-card/30" />
                    <div className="relative z-10">
                      <p className="font-bold text-lg text-accent group-hover:scale-110 transition-transform">{count}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">{village}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Users Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-border/50 backdrop-blur-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-30" />
          <div className="relative z-10 p-6">
            <h3 className="font-semibold text-lg mb-6 text-foreground">{t('dashboard.usersTitle', { ns: 'admin' })}</h3>
            {profiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="w-12 h-12 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">{t('dashboard.noUsers', { ns: 'admin' })}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="pb-4 px-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('dashboard.tableHeaders.name', { ns: 'admin' })}</th>
                      <th className="pb-4 px-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('dashboard.tableHeaders.email', { ns: 'admin' })}</th>
                      <th className="pb-4 px-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('dashboard.tableHeaders.role', { ns: 'admin' })}</th>
                      <th className="pb-4 px-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('dashboard.tableHeaders.status', { ns: 'admin' })}</th>
                      <th className="pb-4 px-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('dashboard.tableHeaders.action', { ns: 'admin' })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((u, idx) => (
                      <motion.tr
                        key={u.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="border-b border-border/20 hover:bg-primary/5 transition-colors"
                      >
                        <td className="py-4 px-4 font-medium text-foreground">{u.name || u.companyName || t('users.unnamed', { ns: 'admin' })}</td>
                        <td className="py-4 px-4 text-muted-foreground text-sm">{u.email}</td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium text-xs capitalize">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <motion.span
                            whileHover={{ scale: 1.05 }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                              u.approved ? 'bg-success/20 text-success shadow-lg shadow-success/20' : 'bg-destructive/20 text-destructive shadow-lg shadow-destructive/20'
                            }`}
                          >
                            {u.approved ? t('users.active', { ns: 'admin' }) : t('users.blocked', { ns: 'admin' })}
                          </motion.span>
                        </td>
                        <td className="py-4 px-4">
                          <motion.button
                            onClick={() => toggleApproval(u.user_id, u.approved)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                              u.approved
                                ? 'bg-destructive/20 text-destructive hover:bg-destructive/30 shadow-lg shadow-destructive/10'
                                : 'bg-success/20 text-success hover:bg-success/30 shadow-lg shadow-success/10'
                            }`}
                          >
                            {u.approved ? <><ShieldX className="w-3.5 h-3.5" /> {t('users.block', { ns: 'admin' })}</> : <><ShieldCheck className="w-3.5 h-3.5" /> {t('users.approve', { ns: 'admin' })}</>}
                          </motion.button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>

        {/* All Transactions */}
        <div className="bg-card rounded-xl p-6 shadow-card">
          <h3 className="font-semibold text-lg mb-4">{t('dashboard.transactionsTitle', { ns: 'admin' })}</h3>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('dashboard.noTransactions', { ns: 'admin' })}</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((txn) => (
                <div key={txn.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{txn.crop_type} • {Number(txn.quantity)}t</p>
                      <p className="text-xs text-muted-foreground">₹{Number(txn.total_value).toLocaleString()} • {Number(txn.transport_distance || 0)}km</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      txn.status === 'completed' ? 'bg-success/15 text-success' :
                      txn.status === 'accepted' ? 'bg-info/15 text-info' :
                      txn.status === 'pending' ? 'bg-warning/15 text-warning' :
                      'bg-destructive/15 text-destructive'
                    }`}>{t(`dashboard.statusLabels.${txn.status}`, { ns: 'admin' })}</span>
                  </div>
                  <button onClick={() => setExpandedTx(expandedTx === txn.id ? null : txn.id)} className="text-[10px] text-primary mt-2 hover:underline">
                    {expandedTx === txn.id ? t('dashboard.hideTimeline', { ns: 'admin' }) : t('dashboard.showTimeline', { ns: 'admin' })}
                  </button>
                  {expandedTx === txn.id && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <TransactionTimeline transaction={{
                        id: txn.id, farmerId: txn.farmer_id, farmerName: '', industryId: txn.industry_id, industryName: '',
                        cropType: txn.crop_type, quantity: Number(txn.quantity), pricePerTon: Number(txn.price_per_ton),
                        totalValue: Number(txn.total_value), transportCost: Number(txn.transport_cost || 0),
                        netProfit: Number(txn.net_profit || 0), distance: Number(txn.transport_distance || 0),
                        status: txn.status, createdAt: txn.created_at, pickupDate: txn.pickup_date,
                        clusterEligible: txn.cluster_eligible, transportSavings: Number(txn.transport_savings || 0),
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
