import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Factory, Wheat, CheckCircle, Clock, IndianRupee, Loader2, ShoppingCart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const IndustryDashboard = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [availableCount, setAvailableCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    const [txRes, listingsRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('industry_id', user.id),
      supabase.from('residue_listings').select('id', { count: 'exact' }).eq('status', 'available'),
    ]);
    setTransactions(txRes.data || []);
    setAvailableCount(listingsRes.count || 0);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const completedCount = transactions.filter(t => t.status === 'completed').length;
  const totalBiomass = transactions.filter(t => t.status === 'completed').reduce((s, t) => s + Number(t.quantity), 0);
  const totalSpent = transactions.filter(t => t.status === 'completed').reduce((s, t) => s + Number(t.total_value), 0);

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Industry Dashboard</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Clock, label: 'Pending Requests', value: pendingCount.toString(), color: 'text-warning' },
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

        <div className="grid md:grid-cols-2 gap-4">
          <Link to="/industry/browse" className="bg-card rounded-xl p-6 shadow-card hover:shadow-lg transition-shadow group">
            <div className="flex items-center justify-between mb-3">
              <ShoppingCart className="w-6 h-6 text-primary" />
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <h3 className="font-semibold mb-1">Browse Listings</h3>
            <p className="text-sm text-muted-foreground">{availableCount} available crop residue listings</p>
          </Link>
          <Link to="/industry/requests" className="bg-card rounded-xl p-6 shadow-card hover:shadow-lg transition-shadow group">
            <div className="flex items-center justify-between mb-3">
              <Factory className="w-6 h-6 text-info" />
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <h3 className="font-semibold mb-1">My Requests</h3>
            <p className="text-sm text-muted-foreground">{transactions.length} total transactions • {pendingCount} pending</p>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default IndustryDashboard;
