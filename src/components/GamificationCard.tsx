import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Flame, Trophy, Leaf, Star, TrendingUp, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

interface UserStats {
  total_points: number;
  total_co2_saved: number;
  total_transactions: number;
  current_streak: number;
  longest_streak: number;
}

const TRUST_LEVELS = [
  { min: 0, max: 1000, label: 'Beginner', emoji: '🌱', color: 'text-muted-foreground' },
  { min: 1000, max: 5000, label: 'Green Contributor', emoji: '🌿', color: 'text-success' },
  { min: 5000, max: 10000, label: 'Eco Champion', emoji: '🌳', color: 'text-primary' },
  { min: 10000, max: Infinity, label: 'Sustainability Leader', emoji: '🌍', color: 'text-warning' },
];

function getTrustLevel(points: number) {
  return TRUST_LEVELS.find(l => points >= l.min && points < l.max) || TRUST_LEVELS[0];
}

function getNextLevel(points: number) {
  const idx = TRUST_LEVELS.findIndex(l => points >= l.min && points < l.max);
  return idx < TRUST_LEVELS.length - 1 ? TRUST_LEVELS[idx + 1] : null;
}

export default function GamificationCard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const loadStats = async () => {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error?.code === 'PGRST205') {
        setStats({ total_points: 0, total_co2_saved: 0, total_transactions: 0, current_streak: 0, longest_streak: 0 });
        return;
      }

      if (data) {
        setStats(data as unknown as UserStats);
        return;
      }

      setStats({ total_points: 0, total_co2_saved: 0, total_transactions: 0, current_streak: 0, longest_streak: 0 });
    };

    void loadStats();
  }, [user?.id]);

  if (!stats) return null;

  const level = getTrustLevel(stats.total_points);
  const nextLevel = getNextLevel(stats.total_points);
  const progressToNext = nextLevel
    ? ((stats.total_points - level.min) / (nextLevel.min - level.min)) * 100
    : 100;

  return (
    <div className="space-y-5">
      {/* Points & Trust Level */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-2xl border border-warning/30 p-5"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-warning/20 via-warning/10 to-background opacity-60" />
        <div className="absolute inset-0 backdrop-blur-xl bg-card/40" />
        <div className="relative z-10 flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />
            <h3 className="font-semibold text-sm">Trust Level & Points</h3>
          </div>
          <span className="text-2xl drop-shadow-sm">{level.emoji}</span>
        </div>
        <div className="relative z-10 flex items-center gap-3 mb-3">
          <span className={`text-lg font-bold ${level.color}`}>{level.label}</span>
          <span className="text-xs bg-primary/15 text-primary px-2.5 py-1 rounded-full font-semibold border border-primary/20">
            <Star className="w-3 h-3 inline mr-1" />{stats.total_points.toLocaleString()} pts
          </span>
        </div>
        {nextLevel && (
          <div className="relative z-10">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>{level.label}</span>
              <span>{nextLevel.label} ({nextLevel.min.toLocaleString()} pts)</span>
            </div>
            <Progress value={progressToNext} className="h-2.5 bg-muted/60" />
            <p className="text-[11px] text-muted-foreground mt-2">
              {(nextLevel.min - stats.total_points).toLocaleString()} points to next level
            </p>
          </div>
        )}
        {!nextLevel && (
          <p className="relative z-10 text-xs text-success font-semibold inline-flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" /> Maximum level reached!
          </p>
        )}
      </motion.div>

      {/* CO2 & Transactions */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.05 }}
          whileHover={{ y: -2 }}
          className="relative overflow-hidden rounded-2xl border border-primary/25 p-4"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-transparent" />
          <div className="relative z-10">
          <Leaf className="w-5 h-5 text-primary mb-2" />
          <p className="text-lg font-bold">{(stats.total_co2_saved / 1000).toFixed(1)}t</p>
          <p className="text-xs text-muted-foreground">CO₂ Saved</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          whileHover={{ y: -2 }}
          className="relative overflow-hidden rounded-2xl border border-info/25 p-4"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-info/15 to-transparent" />
          <div className="relative z-10">
          <TrendingUp className="w-5 h-5 text-info mb-2" />
          <p className="text-lg font-bold">{stats.total_transactions}</p>
          <p className="text-xs text-muted-foreground">Completed Trades</p>
          </div>
        </motion.div>
      </div>

      {/* Streak */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45, delay: 0.15 }}
        className="relative overflow-hidden rounded-2xl border border-destructive/25 p-5"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-destructive/12 to-transparent" />
        <div className="relative z-10 flex items-center gap-2 mb-2">
          <Flame className="w-5 h-5 text-destructive" />
          <h3 className="font-semibold text-sm">Green Streak</h3>
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <div>
            <p className="text-2xl font-bold">{stats.current_streak}</p>
            <p className="text-xs text-muted-foreground">Current Streak</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="text-2xl font-bold text-warning">{stats.longest_streak}</p>
            <p className="text-xs text-muted-foreground">Best Streak</p>
          </div>
        </div>
        {stats.current_streak > 0 && (
          <p className="relative z-10 text-xs text-destructive font-semibold mt-3 inline-flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> {stats.current_streak} Day Green Streak!
          </p>
        )}
      </motion.div>
    </div>
  );
}
