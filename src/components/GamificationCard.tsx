import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Flame, Trophy, Leaf, Star, TrendingUp } from 'lucide-react';
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
    supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setStats(data as unknown as UserStats);
        else setStats({ total_points: 0, total_co2_saved: 0, total_transactions: 0, current_streak: 0, longest_streak: 0 });
      });
  }, [user?.id]);

  if (!stats) return null;

  const level = getTrustLevel(stats.total_points);
  const nextLevel = getNextLevel(stats.total_points);
  const progressToNext = nextLevel
    ? ((stats.total_points - level.min) / (nextLevel.min - level.min)) * 100
    : 100;

  return (
    <div className="space-y-4">
      {/* Points & Trust Level */}
      <div className="bg-card rounded-xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />
            <h3 className="font-semibold text-sm">Trust Level & Points</h3>
          </div>
          <span className="text-2xl">{level.emoji}</span>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <span className={`text-lg font-bold ${level.color}`}>{level.label}</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            <Star className="w-3 h-3 inline mr-1" />{stats.total_points.toLocaleString()} pts
          </span>
        </div>
        {nextLevel && (
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{level.label}</span>
              <span>{nextLevel.label} ({nextLevel.min.toLocaleString()} pts)</span>
            </div>
            <Progress value={progressToNext} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-1">
              {(nextLevel.min - stats.total_points).toLocaleString()} points to next level
            </p>
          </div>
        )}
        {!nextLevel && (
          <p className="text-xs text-success font-medium">🏆 Maximum level reached!</p>
        )}
      </div>

      {/* CO2 & Transactions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-4 shadow-card">
          <Leaf className="w-5 h-5 text-primary mb-2" />
          <p className="text-lg font-bold">{(stats.total_co2_saved / 1000).toFixed(1)}t</p>
          <p className="text-xs text-muted-foreground">CO₂ Saved</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card">
          <TrendingUp className="w-5 h-5 text-info mb-2" />
          <p className="text-lg font-bold">{stats.total_transactions}</p>
          <p className="text-xs text-muted-foreground">Completed Trades</p>
        </div>
      </div>

      {/* Streak */}
      <div className="bg-card rounded-xl p-5 shadow-card">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-5 h-5 text-destructive" />
          <h3 className="font-semibold text-sm">Green Streak</h3>
        </div>
        <div className="flex items-center gap-4">
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
          <p className="text-xs text-destructive font-medium mt-2">
            🔥 {stats.current_streak} Day Green Streak!
          </p>
        )}
      </div>
    </div>
  );
}
