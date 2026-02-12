import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { CARBON_FACTOR } from '@/data/mockData';
import { Users, Factory, BarChart3, Leaf, TrendingUp, ShieldCheck, ShieldX, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { useDemo } from '@/contexts/DemoContext';
import TransactionTimeline from '@/components/TransactionTimeline';
import { toast } from '@/hooks/use-toast';

const AdminDashboard = () => {
  const { demoMode, liveStats } = useDemo();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ farmers: 0, industries: 0, transactions: 0, biomass: 0, carbonSaved: 0 });
  const [profiles, setProfiles] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

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
      const totalBiomass = allTx.filter(t => t.status === 'completed').reduce((s, t) => s + Number(t.quantity), 0);
      const totalCarbonSaved = allTx.filter(t => t.status === 'completed').reduce((s, t) => s + Number(t.carbon_saved || 0), 0);

      setStats({ farmers: farmerCount, industries: industryCount, transactions: allTx.length, biomass: totalBiomass, carbonSaved: totalCarbonSaved });

      // Merge profiles with roles
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

  const totalFarmers = demoMode ? liveStats.farmers : stats.farmers;
  const totalIndustries = demoMode ? liveStats.industries : stats.industries;
  const totalTransactions = demoMode ? liveStats.transactions : stats.transactions;
  const totalBiomass = demoMode ? liveStats.biomass : stats.biomass;
  const carbonReduction = demoMode ? totalBiomass * CARBON_FACTOR : stats.carbonSaved / 1000; // kg to tons
  const carbonGoal = 100;
  const carbonProgress = Math.min((carbonReduction / carbonGoal) * 100, 100);

  const toggleApproval = async (userId: string, currentApproved: boolean) => {
    const { error } = await supabase.from('profiles').update({ approved: !currentApproved }).eq('user_id', userId);
    if (!error) {
      setProfiles(prev => prev.map(p => p.user_id === userId ? { ...p, approved: !currentApproved } : p));
      toast({ title: currentApproved ? 'User Blocked' : 'User Approved' });
    }
  };

  // Chart data from real transactions (simplified — group by month)
  const barData = [
    { month: 'Oct', biomass: 0, transactions: 0 },
    { month: 'Nov', biomass: 0, transactions: 0 },
    { month: 'Dec', biomass: 0, transactions: 0 },
    { month: 'Jan', biomass: 0, transactions: 0 },
    { month: 'Feb', biomass: demoMode ? liveStats.biomass : totalBiomass, transactions: demoMode ? liveStats.transactions : stats.transactions },
  ];

  const pieData = (() => {
    const counts: Record<string, number> = {};
    transactions.forEach(t => { counts[t.crop_type] = (counts[t.crop_type] || 0) + Number(t.quantity); });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();
  const pieColors = ['hsl(142, 50%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(200, 80%, 50%)'];

  const lineData = [
    { month: 'Oct', co2: 0 },
    { month: 'Nov', co2: 0 },
    { month: 'Dec', co2: 0 },
    { month: 'Jan', co2: 0 },
    { month: 'Feb', co2: demoMode ? Math.round(carbonReduction) : Math.round(stats.carbonSaved / 1000) },
  ];

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Admin Dashboard</h2>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { icon: Users, label: 'Farmers', value: totalFarmers, color: 'text-primary' },
            { icon: Factory, label: 'Industries', value: totalIndustries, color: 'text-info' },
            { icon: BarChart3, label: 'Transactions', value: totalTransactions, color: 'text-warning' },
            { icon: TrendingUp, label: 'Biomass Traded', value: `${totalBiomass}t`, color: 'text-success' },
            { icon: Leaf, label: 'CO₂ Reduced', value: `${carbonReduction.toFixed(1)}t`, color: 'text-primary' },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-xl p-4 shadow-card animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Carbon Progress */}
        <div className="bg-card rounded-xl p-5 shadow-card animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-primary" />
              <h4 className="font-semibold text-sm">CO₂ Reduction Progress</h4>
            </div>
            <span className="text-xs text-muted-foreground">{carbonReduction.toFixed(1)}t / {carbonGoal}t goal</span>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-1000 ease-out" style={{ width: `${carbonProgress}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{carbonProgress.toFixed(0)}% of quarterly target achieved</p>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-card rounded-xl p-5 shadow-card">
            <h4 className="font-semibold text-sm mb-4">Monthly Biomass & Transactions</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
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
            <h4 className="font-semibold text-sm mb-4">Most Demanded Crop</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData.length ? pieData : [{ name: 'No data', value: 1 }]} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                  {(pieData.length ? pieData : [{ name: 'No data' }]).map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
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
            <h4 className="font-semibold text-sm mb-4">CO₂ Reduction Trend</h4>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={lineData}>
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

        {/* Users Management */}
        <div className="bg-card rounded-xl p-6 shadow-card">
          <h3 className="font-semibold text-lg mb-4">User Management</h3>
          {profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No users registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 text-xs text-muted-foreground font-medium">Name</th>
                    <th className="pb-3 text-xs text-muted-foreground font-medium">Email</th>
                    <th className="pb-3 text-xs text-muted-foreground font-medium">Role</th>
                    <th className="pb-3 text-xs text-muted-foreground font-medium">Status</th>
                    <th className="pb-3 text-xs text-muted-foreground font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(u => (
                    <tr key={u.id} className="border-b border-border/50">
                      <td className="py-3 font-medium">{u.name || u.companyName || 'Unknown'}</td>
                      <td className="py-3 text-muted-foreground">{u.email}</td>
                      <td className="py-3 capitalize">{u.role}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.approved ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                          {u.approved ? 'active' : 'blocked'}
                        </span>
                      </td>
                      <td className="py-3">
                        <button onClick={() => toggleApproval(u.user_id, u.approved)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          u.approved ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'bg-success/10 text-success hover:bg-success/20'
                        }`}>
                          {u.approved ? <><ShieldX className="w-3 h-3" /> Block</> : <><ShieldCheck className="w-3 h-3" /> Approve</>}
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
          <h3 className="font-semibold text-lg mb-4">All Transactions</h3>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No transactions yet.</p>
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
                    }`}>{t.status}</span>
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
    </DashboardLayout>
  );
};

export default AdminDashboard;
