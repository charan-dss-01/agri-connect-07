import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { sampleTransactions, sampleIndustries, CARBON_FACTOR } from '@/data/mockData';
import { Users, Factory, BarChart3, Leaf, TrendingUp, ShieldCheck, ShieldX } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { useDemo } from '@/contexts/DemoContext';
import TransactionTimeline from '@/components/TransactionTimeline';

const AdminDashboard = () => {
  const { demoMode, liveStats } = useDemo();
  const baseFarmers = 24;
  const totalFarmers = demoMode ? liveStats.farmers : baseFarmers;
  const totalIndustries = demoMode ? liveStats.industries : sampleIndustries.length;
  const totalTransactions = demoMode ? liveStats.transactions : sampleTransactions.length;
  const totalBiomass = demoMode ? liveStats.biomass : sampleTransactions.reduce((s, t) => s + t.quantity, 0);
  const carbonReduction = totalBiomass * CARBON_FACTOR;
  const carbonGoal = 100;
  const carbonProgress = Math.min((carbonReduction / carbonGoal) * 100, 100);

  const [users] = useState([
    { id: 'f1', name: 'Rajesh Kumar', role: 'farmer', status: 'active' },
    { id: 'f2', name: 'Amit Singh', role: 'farmer', status: 'active' },
    { id: 'f3', name: 'Suresh Yadav', role: 'farmer', status: 'blocked' },
    { id: 'i1', name: 'GreenPower Biomass Ltd', role: 'industry', status: 'active' },
    { id: 'i2', name: 'BioFuel India Pvt Ltd', role: 'industry', status: 'active' },
  ]);
  const [userStatus, setUserStatus] = useState<Record<string, string>>(
    Object.fromEntries(users.map(u => [u.id, u.status]))
  );
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const toggleUser = (id: string) => setUserStatus(prev => ({ ...prev, [id]: prev[id] === 'active' ? 'blocked' : 'active' }));

  const barData = [
    { month: 'Oct', biomass: 120, transactions: 12 },
    { month: 'Nov', biomass: 280, transactions: 24 },
    { month: 'Dec', biomass: 190, transactions: 18 },
    { month: 'Jan', biomass: 340, transactions: 31 },
    { month: 'Feb', biomass: demoMode ? liveStats.biomass : 210, transactions: demoMode ? liveStats.transactions : 19 },
  ];

  const pieData = [
    { name: 'Paddy', value: 45 },
    { name: 'Wheat', value: 30 },
    { name: 'Sugarcane', value: 25 },
  ];
  const pieColors = ['hsl(142, 50%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(200, 80%, 50%)'];

  const lineData = [
    { month: 'Oct', co2: 180 },
    { month: 'Nov', co2: 420 },
    { month: 'Dec', co2: 285 },
    { month: 'Jan', co2: 510 },
    { month: 'Feb', co2: demoMode ? Math.round(carbonReduction) : 315 },
  ];

  const villageData = [
    { village: 'Karnal', tons: 85 },
    { village: 'Ambala', tons: 62 },
    { village: 'Panipat', tons: 54 },
    { village: 'Sonipat', tons: 41 },
    { village: 'Rohtak', tons: 38 },
  ];

  const demandData = [
    { month: 'Oct', powerPlant: 80, biofuel: 40, paper: 20, compost: 15 },
    { month: 'Nov', powerPlant: 150, biofuel: 80, paper: 30, compost: 20 },
    { month: 'Dec', powerPlant: 100, biofuel: 50, paper: 25, compost: 15 },
    { month: 'Jan', powerPlant: 180, biofuel: 90, paper: 40, compost: 30 },
    { month: 'Feb', powerPlant: 120, biofuel: 60, paper: 20, compost: 10 },
  ];

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
            <div
              className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${carbonProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{carbonProgress.toFixed(0)}% of quarterly target achieved</p>
        </div>

        {/* Charts Row 1 */}
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
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {pieData.map((d, i) => (
                <span key={i} className="flex items-center gap-1 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pieColors[i] }} />
                  {d.name}
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

        {/* Charts Row 2: Village + Demand */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl p-5 shadow-card">
            <h4 className="font-semibold text-sm mb-4">Top Performing Villages</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={villageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(80, 15%, 88%)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="village" type="category" tick={{ fontSize: 11 }} width={60} />
                <Tooltip />
                <Bar dataKey="tons" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} name="Tons" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-xl p-5 shadow-card">
            <h4 className="font-semibold text-sm mb-4">Industry Demand Trends</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={demandData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(80, 15%, 88%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="powerPlant" stroke="hsl(142, 50%, 45%)" strokeWidth={2} name="Power Plant" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="biofuel" stroke="hsl(200, 80%, 50%)" strokeWidth={2} name="Biofuel" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="paper" stroke="hsl(38, 92%, 50%)" strokeWidth={2} name="Paper Mill" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="compost" stroke="hsl(170, 50%, 45%)" strokeWidth={2} name="Compost" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Users Management */}
        <div className="bg-card rounded-xl p-6 shadow-card">
          <h3 className="font-semibold text-lg mb-4">User Management</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 text-xs text-muted-foreground font-medium">Name</th>
                  <th className="pb-3 text-xs text-muted-foreground font-medium">Role</th>
                  <th className="pb-3 text-xs text-muted-foreground font-medium">Status</th>
                  <th className="pb-3 text-xs text-muted-foreground font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-border/50">
                    <td className="py-3 font-medium">{u.name}</td>
                    <td className="py-3 capitalize">{u.role}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${userStatus[u.id] === 'active' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                        {userStatus[u.id]}
                      </span>
                    </td>
                    <td className="py-3">
                      <button onClick={() => toggleUser(u.id)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        userStatus[u.id] === 'active' ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'bg-success/10 text-success hover:bg-success/20'
                      }`}>
                        {userStatus[u.id] === 'active' ? <><ShieldX className="w-3 h-3" /> Block</> : <><ShieldCheck className="w-3 h-3" /> Approve</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* All Transactions */}
        <div className="bg-card rounded-xl p-6 shadow-card">
          <h3 className="font-semibold text-lg mb-4">All Transactions</h3>
          <div className="space-y-3">
            {sampleTransactions.map(t => (
              <div key={t.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t.farmerName} → {t.industryName}</p>
                    <p className="text-xs text-muted-foreground">{t.cropType} • {t.quantity}t • ₹{t.totalValue.toLocaleString()}</p>
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
                    <TransactionTimeline transaction={t} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
