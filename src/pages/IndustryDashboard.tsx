import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Factory, Wheat, CheckCircle, Clock, IndianRupee, Loader2, ShoppingCart, ArrowRight, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import GamificationCard from '@/components/GamificationCard';
import PremiumStatCard from '@/components/PremiumStatCard';
import ComplaintDialog from '@/components/ComplaintDialog';
import { useTranslation } from 'react-i18next';

const IndustryDashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation(['common', 'industry']);
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
      <div className="space-y-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('dashboard.title', { ns: 'industry' })}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t('header.welcomeBack', { ns: 'common' })} {user?.name}
            </p>
          </div>
          <ComplaintDialog />
        </motion.div>

        {/* Premium Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <PremiumStatCard
            title={t('dashboard.stats.pendingRequests', { ns: 'industry' })}
            value={pendingCount}
            icon={Clock}
            gradient="accent"
            trend={pendingCount > 0 ? 15 : undefined}
            subtext={t('dashboard.stats.pendingRequests', { ns: 'industry' })}
            animated
          />
          <PremiumStatCard
            title={t('dashboard.stats.completed', { ns: 'industry' })}
            value={completedCount}
            icon={CheckCircle}
            gradient="success"
            trend={completedCount > 0 ? 22 : undefined}
            subtext={t('dashboard.stats.completed', { ns: 'industry' })}
            animated
          />
          <PremiumStatCard
            title={t('dashboard.stats.biomassProcured', { ns: 'industry' })}
            value={totalBiomass}
            icon={Wheat}
            gradient="primary"
            trend={totalBiomass > 0 ? 18 : undefined}
            subtext={t('dashboard.stats.biomassProcured', { ns: 'industry' })}
            animated
          />
          <PremiumStatCard
            title={t('dashboard.stats.totalSpent', { ns: 'industry' })}
            value={totalSpent}
            icon={IndianRupee}
            gradient="destructive"
            trend={totalSpent > 0 ? 28 : undefined}
            subtext={`₹${totalSpent.toLocaleString()}`}
            animated
          />
        </div>

        {/* Quick access cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ translateY: -2 }}
            className="relative overflow-hidden rounded-2xl border border-primary/20 transition-all duration-300 cursor-pointer group p-6 bg-card/60"
            asChild
          >
            <Link to="/industry/browse">
              <div className="absolute inset-0 backdrop-blur-xl bg-card/30" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <motion.div
                    className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center transition-transform"
                    whileHover={{ scale: 1.03 }}
                  >
                    <ShoppingCart className="w-6 h-6 text-primary" />
                  </motion.div>
                  <ArrowRight className="w-4 h-4 text-primary/80" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{t('dashboard.browseTitle', { ns: 'industry' })}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t('dashboard.browseDescription', { ns: 'industry', count: availableCount })}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-primary">{t('dashboard.browseDescription', { ns: 'industry', count: availableCount })}</p>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ translateY: -2 }}
            className="relative overflow-hidden rounded-2xl border border-accent/20 transition-all duration-300 cursor-pointer group p-6 bg-card/60"
            asChild
          >
            <Link to="/industry/requests">
              <div className="absolute inset-0 backdrop-blur-xl bg-card/30" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <motion.div
                    className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center transition-transform"
                    whileHover={{ scale: 1.03 }}
                  >
                    <Factory className="w-6 h-6 text-accent" />
                  </motion.div>
                  <ArrowRight className="w-4 h-4 text-accent/80" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{t('dashboard.requestsTitle', { ns: 'industry' })}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t('dashboard.requestsDescription', { ns: 'industry', total: transactions.length, pending: pendingCount })}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-accent">{t('dashboard.requestsDescription', { ns: 'industry', total: transactions.length, pending: pendingCount })}</p>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Gamification */}
        <GamificationCard />
      </div>
    </DashboardLayout>
  );
};

export default IndustryDashboard;
