import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
// Real carbon data comes from completed transactions
import { Wheat, IndianRupee, Truck, Leaf, Loader2, ArrowRight, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import CarbonCreditsCard from '@/components/CarbonCreditsCard';
import GamificationCard from '@/components/GamificationCard';
import ComplaintDialog from '@/components/ComplaintDialog';
import PremiumStatCard from '@/components/PremiumStatCard';
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
      <div className="space-y-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('dashboard.title', { ns: 'farmer' })}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t('header.welcomeBack', { ns: 'common' })} {user?.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ComplaintDialog />
            <motion.button
              onClick={() => navigate('/farmer/list')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all duration-200"
            >
              <Wheat className="w-4 h-4" /> {t('dashboard.cta', { ns: 'farmer' })}
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>

        {/* Premium Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <PremiumStatCard
            title={t('dashboard.stats.totalEarnings', { ns: 'farmer' })}
            value={totalEarnings}
            icon={IndianRupee}
            gradient="success"
            trend={completedTx.length > 0 ? 25 : undefined}
            subtext={`₹${totalEarnings.toLocaleString()}`}
            animated
          />
          <PremiumStatCard
            title={t('dashboard.stats.biomassListed', { ns: 'farmer' })}
            value={totalBiomass}
            icon={Wheat}
            gradient="primary"
            trend={myListings.length > 0 ? 12 : undefined}
            subtext={t('dashboard.stats.biomassListed', { ns: 'farmer' })}
            animated
          />
          <PremiumStatCard
            title={t('dashboard.stats.transactions', { ns: 'farmer' })}
            value={myTransactions.length}
            icon={Truck}
            gradient="accent"
            trend={completedTx.length > 0 ? 18 : undefined}
            subtext={t('dashboard.stats.transactions', { ns: 'farmer' })}
            animated
          />
          <PremiumStatCard
            title={t('dashboard.stats.co2Saved', { ns: 'farmer' })}
            value={carbonSaved}
            icon={Leaf}
            gradient="primary"
            trend={completedTx.length > 0 ? 35 : undefined}
            subtext={t('dashboard.stats.co2Saved', { ns: 'farmer' })}
            animated
          />
        </div>

        {/* Carbon Credits */}
        <CarbonCreditsCard totalBiomass={totalBiomass} />

        {/* Gamification */}
        <GamificationCard />

        {/* Quick access cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            onClick={() => navigate('/farmer/list')}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ translateY: -2 }}
            className="relative overflow-hidden rounded-2xl border border-primary/20 transition-all duration-300 cursor-pointer group p-6 bg-card/60"
          >
            <div className="absolute inset-0 backdrop-blur-xl bg-card/30" />
            <div className="relative z-10">
              <motion.div
                className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-4 transition-transform"
                whileHover={{ scale: 1.03 }}
              >
                <Wheat className="w-6 h-6 text-primary" />
              </motion.div>
              <h3 className="font-semibold text-lg mb-2">{t('dashboard.quickCards.listTitle', { ns: 'farmer' })}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t('dashboard.quickCards.listDescription', { ns: 'farmer' })}</p>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-primary">
                  {t('dashboard.quickCards.activeListings', { ns: 'farmer', count: myListings.filter(l => l.status === 'available').length })}
                </p>
                <ArrowRight className="w-4 h-4 text-primary/80" />
              </div>
            </div>
          </motion.div>

          <motion.div
            onClick={() => navigate('/farmer/requests')}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ translateY: -2 }}
            className="relative overflow-hidden rounded-2xl border border-accent/20 transition-all duration-300 cursor-pointer group p-6 bg-card/60"
          >
            <div className="absolute inset-0 backdrop-blur-xl bg-card/30" />
            <div className="relative z-10">
              <motion.div
                className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center mb-4 transition-transform"
                whileHover={{ scale: 1.03 }}
              >
                <Truck className="w-6 h-6 text-accent" />
              </motion.div>
              <h3 className="font-semibold text-lg mb-2">{t('dashboard.quickCards.requestsTitle', { ns: 'farmer' })}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t('dashboard.quickCards.requestsDescription', { ns: 'farmer' })}</p>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-accent">
                  {t('dashboard.quickCards.requestsSummary', {
                    ns: 'farmer',
                    pending: myTransactions.filter(tx => tx.status === 'pending').length,
                    completed: myTransactions.filter(tx => tx.status === 'completed').length,
                  })}
                </p>
                <ArrowRight className="w-4 h-4 text-accent/80" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Recent activity */}
        {myTransactions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative overflow-hidden rounded-2xl border border-border/50 backdrop-blur-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-30" />
            <div className="absolute inset-0 backdrop-blur-xl bg-card/40" />
            
            <div className="relative z-10 p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">{t('dashboard.recentActivity', { ns: 'farmer' })}</h3>
              </div>
              
              <div className="space-y-3">
                {myTransactions.slice(0, 5).map((tx, idx) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between border-b border-border/30 pb-4 last:border-0 hover:bg-muted/40 px-3 py-2 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-grow">
                      <div className="w-2 h-2 rounded-full bg-primary/80 transition-transform" />
                      <div>
                        <p className="text-sm font-semibold">{tx.crop_type} • {Number(tx.quantity)}t</p>
                        <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <motion.span
                      whileHover={{ scale: 1.05 }}
                      className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                        tx.status === 'completed' ? 'bg-success/20 text-success shadow-lg shadow-success/20' :
                        tx.status === 'accepted' ? 'bg-info/20 text-info shadow-lg shadow-info/20' :
                        tx.status === 'pending' ? 'bg-warning/20 text-warning shadow-lg shadow-warning/20' :
                        'bg-destructive/20 text-destructive shadow-lg shadow-destructive/20'
                      }`}
                    >
                      {statusLabel(tx.status)}
                    </motion.span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FarmerDashboard;
