import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface PremiumStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number; // percentage change
  subtext?: string;
  gradient?: 'primary' | 'accent' | 'success' | 'destructive';
  animated?: boolean;
  onClick?: () => void;
}

const gradientClasses = {
  primary: 'from-primary/20 via-primary/10 to-background',
  accent: 'from-accent/20 via-accent/10 to-background',
  success: 'from-success/20 via-success/10 to-background',
  destructive: 'from-destructive/20 via-destructive/10 to-background',
};

const iconColors = {
  primary: 'text-primary bg-primary/20',
  accent: 'text-accent bg-accent/20',
  success: 'text-success bg-success/20',
  destructive: 'text-destructive bg-destructive/20',
};

const borderColors = {
  primary: 'border-primary/25 hover:border-primary/35',
  accent: 'border-accent/25 hover:border-accent/35',
  success: 'border-success/25 hover:border-success/35',
  destructive: 'border-destructive/25 hover:border-destructive/35',
};

export default function PremiumStatCard({
  title,
  value,
  icon: Icon,
  trend,
  subtext,
  gradient = 'primary',
  animated = true,
  onClick,
}: PremiumStatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
      }
    });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || !animated || typeof value !== 'number') return;

    const startTime = performance.now();
    const duration = 2000;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [isVisible, value, animated]);

  const displayText = animated && typeof value === 'number' ? displayValue : value;
  const isTrendPositive = trend && trend > 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
      whileHover={{ translateY: -2 }}
      className={`relative overflow-hidden rounded-2xl border ${borderColors[gradient]} transition-all duration-300 cursor-pointer group`}
      onClick={onClick}
    >
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientClasses[gradient]} opacity-40`} />

      {/* Animated Backdrop Blur Background */}
      <div className="absolute inset-0 backdrop-blur-xl bg-card/30" />

      {/* Content */}
      <div className="relative p-6 flex flex-col h-full">
        {/* Header: Icon and Title */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              {title}
            </p>
          </div>
          <motion.div
            className={`p-2.5 rounded-lg ${iconColors[gradient]}`}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
          >
            <Icon className="w-5 h-5" />
          </motion.div>
        </div>

        {/* Value */}
        <div className="flex items-end justify-between flex-grow">
          <div>
            <motion.p
              className="text-3xl font-bold text-foreground"
              key={displayText}
            >
              {displayText}
            </motion.p>
            {subtext && (
              <p className="text-xs text-muted-foreground mt-1">
                {subtext}
              </p>
            )}
          </div>

          {/* Trend Indicator */}
          {trend !== undefined && (
            <motion.div
              className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                isTrendPositive
                  ? 'bg-success/20 text-success'
                  : 'bg-destructive/20 text-destructive'
              }`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {isTrendPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="text-xs font-semibold">
                {Math.abs(trend)}%
              </span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
