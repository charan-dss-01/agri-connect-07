import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { sampleTransactions, sampleIndustries, sampleListings, CARBON_FACTOR } from '@/data/mockData';
import { Users, Factory, BarChart3, Leaf, TrendingUp, CheckCircle, XCircle, ShieldCheck, ShieldX } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const AdminDashboard = () => {
  const totalFarmers = 24;
  const totalIndustries = sampleIndustries.length;
  const totalTransactions = sampleTransactions.length;
  const totalBiomass = sampleTransactions.reduce((s, t) => s + t.quantity, 0);
  const carbonReduction = totalBiomass * CARBON_FACTOR;

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

  const toggleUser = (id: string) => {
    setUserStatus(prev => ({ ...prev, [id]: prev[id] === 'active' ? 'blocked' : 'active' }));
  };

  const barData = [
    { month: 'Oct', biomass: 120 },
    { month: 'Nov', biomass: 280 },
    { month: 'Dec', biomass: 190 },
    { month: 'Jan', biomass: 340 },
    { month: 'Feb', biomass: 210 },
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
    { month: 'Feb', co2: 315 },
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
            { icon: Leaf, label: 'CO₂ Reduced', value: `${carbonReduction}t`, color: 'text-primary' },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-xl p-4 shadow-card animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-card rounded-xl p-5 shadow-card">
            <h4 className="font-semibold text-sm mb-4">Monthly Biomass Traded (tons)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(80, 15%, 88%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="biomass" fill="hsl(142, 50%, 32%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-xl p-5 shadow-card">
            <h4 className="font-semibold text-sm mb-4">Crop Distribution</h4>
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
            <h4 className="font-semibold text-sm mb-4">CO₂ Reduction Trend (tons)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(80, 15%, 88%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="co2" stroke="hsl(142, 50%, 45%)" strokeWidth={2} dot={{ fill: 'hsl(142, 50%, 32%)' }} />
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
                      <button
                        onClick={() => toggleUser(u.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          userStatus[u.id] === 'active'
                            ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                            : 'bg-success/10 text-success hover:bg-success/20'
                        }`}
                      >
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 text-xs text-muted-foreground font-medium">Farmer</th>
                  <th className="pb-3 text-xs text-muted-foreground font-medium">Industry</th>
                  <th className="pb-3 text-xs text-muted-foreground font-medium">Crop</th>
                  <th className="pb-3 text-xs text-muted-foreground font-medium">Qty</th>
                  <th className="pb-3 text-xs text-muted-foreground font-medium">Value</th>
                  <th className="pb-3 text-xs text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sampleTransactions.map(t => (
                  <tr key={t.id} className="border-b border-border/50">
                    <td className="py-3">{t.farmerName}</td>
                    <td className="py-3">{t.industryName}</td>
                    <td className="py-3">{t.cropType}</td>
                    <td className="py-3">{t.quantity}t</td>
                    <td className="py-3">₹{t.totalValue.toLocaleString()}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.status === 'completed' ? 'bg-success/15 text-success' :
                        t.status === 'accepted' ? 'bg-info/15 text-info' :
                        t.status === 'pending' ? 'bg-warning/15 text-warning' :
                        'bg-destructive/15 text-destructive'
                      }`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
