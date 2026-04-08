import { Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CARBON_FACTOR, CARBON_CREDIT_PER_TON, getGreenFarmerLevel } from '@/data/mockData';

interface CarbonCreditsCardProps {
  totalBiomass: number;
}

export default function CarbonCreditsCard({ totalBiomass }: CarbonCreditsCardProps) {
  const { t } = useTranslation('farmer');
  const co2Saved = totalBiomass * CARBON_FACTOR;
  const credits = totalBiomass * CARBON_CREDIT_PER_TON;
  const level = getGreenFarmerLevel(totalBiomass);
  const nextLevel = level.level < 3 ? (level.level === 1 ? 20 : 50) : null;
  const progress = nextLevel ? Math.min((totalBiomass / nextLevel) * 100, 100) : 100;

  const levelTitle =
    level.level === 3
      ? t('carbonCard.levels.champion')
      : level.level === 2
      ? t('carbonCard.levels.warrior')
      : t('carbonCard.levels.starter');

  return (
    <div className="bg-card rounded-xl p-5 shadow-card animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm">{t('carbonCard.title')}</h3>
        </div>
        <span className="text-lg">{level.emoji}</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-success/10 rounded-lg">
          <p className="text-lg font-bold text-success">{co2Saved.toFixed(1)}t</p>
          <p className="text-[10px] text-muted-foreground">{t('carbonCard.co2Saved')}</p>
        </div>
        <div className="text-center p-2 bg-primary/10 rounded-lg">
          <p className="text-lg font-bold text-primary">{credits}</p>
          <p className="text-[10px] text-muted-foreground">{t('carbonCard.creditPoints')}</p>
        </div>
        <div className="text-center p-2 bg-accent/10 rounded-lg">
          <p className="text-lg font-bold text-accent">
            {t('carbonCard.levelPrefix')}
            {level.level}
          </p>
          <p className="text-[10px] text-muted-foreground">{levelTitle}</p>
        </div>
      </div>

      {nextLevel && (
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>{levelTitle}</span>
            <span>{t('carbonCard.progress', { current: totalBiomass, target: nextLevel })}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
