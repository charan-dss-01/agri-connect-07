import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
// Real carbon data comes from completed transactions
import { Wheat, IndianRupee, Truck, Leaf, Loader2 } from 'lucide-react';
import CarbonCreditsCard from '@/components/CarbonCreditsCard';
import GamificationCard from '@/components/GamificationCard';
import ComplaintDialog from '@/components/ComplaintDialog';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const FarmerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'farmer']);
  const [myTransactions, setMyTransactions] = useState<any[]>([]);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    const [txRes, listRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('farmer_id', user.id).order('created_at', { ascending: false }),
      supabase.from('residue_listings').select('*').eq('farmer_id', user.id).order('created_at', { ascending: false }),
    ]);
    setMyTransactions(txRes.data || []);
    setMyListings(listRes.data || []);
    setLoadingData(false);
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const completedTx = myTransactions.filter(t => t.status === 'completed');
  const totalEarnings = completedTx.reduce((s, t) => s + (Number(t.net_profit) || 0), 0);
  const totalBiomass = myTransactions.reduce((s, t) => s + (Number(t.quantity) || 0), 0);
  const carbonSaved = completedTx.reduce((s, t) => s + (Number(t.carbon_saved) || 0), 0) / 1000; // kg to tons
  const statusLabel = (status: string) => t(`statuses.${status}`, { ns: 'farmer' });

  if (loadingData) {
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
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t('dashboard.title', { ns: 'farmer' })}</h2>
          <button
            onClick={() => navigate('/farmer/list')}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Wheat className="w-4 h-4" /> {t('dashboard.cta', { ns: 'farmer' })}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: IndianRupee, label: t('dashboard.stats.totalEarnings', { ns: 'farmer' }), value: `₹${totalEarnings.toLocaleString()}`, color: 'text-success' },
            { icon: Wheat, label: t('dashboard.stats.biomassListed', { ns: 'farmer' }), value: `${totalBiomass} tons`, color: 'text-primary' },
            { icon: Truck, label: t('dashboard.stats.transactions', { ns: 'farmer' }), value: myTransactions.length.toString(), color: 'text-info' },
            { icon: Leaf, label: t('dashboard.stats.co2Saved', { ns: 'farmer' }), value: `${carbonSaved} tons`, color: 'text-primary' },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-xl p-4 shadow-card animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Carbon Credits */}
        <CarbonCreditsCard totalBiomass={totalBiomass} />

        {/* Quick access cards */}
        <div className="grid md:grid-cols-2 gap-4">
          <div
            onClick={() => navigate('/farmer/list')}
            className="bg-card rounded-xl p-6 shadow-card cursor-pointer hover:shadow-elevated transition-shadow group"
          >
            <Wheat className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-lg mb-1">{t('dashboard.quickCards.listTitle', { ns: 'farmer' })}</h3>
            <p className="text-sm text-muted-foreground">{t('dashboard.quickCards.listDescription', { ns: 'farmer' })}</p>
            <p className="text-xs text-primary font-medium mt-3">{t('dashboard.quickCards.activeListings', { ns: 'farmer', count: myListings.filter(l => l.status === 'available').length })}</p>
          </div>
          <div
            onClick={() => navigate('/farmer/requests')}
            className="bg-card rounded-xl p-6 shadow-card cursor-pointer hover:shadow-elevated transition-shadow group"
          >
            <Truck className="w-8 h-8 text-info mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-lg mb-1">{t('dashboard.quickCards.requestsTitle', { ns: 'farmer' })}</h3>
            <p className="text-sm text-muted-foreground">{t('dashboard.quickCards.requestsDescription', { ns: 'farmer' })}</p>
            <p className="text-xs text-warning font-medium mt-3">{t('dashboard.quickCards.requestsSummary', { ns: 'farmer', pending: myTransactions.filter(t => t.status === 'pending').length, completed: myTransactions.filter(t => t.status === 'completed').length })}</p>
          </div>
        </div>

        {/* Recent activity */}
        {myTransactions.length > 0 && (
          <div className="bg-card rounded-xl p-6 shadow-card">
            <h3 className="font-semibold text-lg mb-4">{t('dashboard.recentActivity', { ns: 'farmer' })}</h3>
            <div className="space-y-3">
              {myTransactions.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{t.crop_type} • {Number(t.quantity)}t</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    t.status === 'completed' ? 'bg-success/15 text-success' :
                    t.status === 'accepted' ? 'bg-info/15 text-info' :
                    t.status === 'pending' ? 'bg-warning/15 text-warning' :
                    'bg-destructive/15 text-destructive'
                  }`}>{statusLabel(t.status)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FarmerDashboard;
