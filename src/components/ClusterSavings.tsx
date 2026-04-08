import { Users, TrendingDown, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CLUSTER_DISCOUNT } from '@/data/mockData';

interface ClusterSavingsProps {
  isClusterEligible: boolean;
  originalCost: number;
  distance: number;
}

export default function ClusterSavings({ isClusterEligible, originalCost }: ClusterSavingsProps) {
  const { t } = useTranslation('farmer');

  if (!isClusterEligible) return null;

  const savings = originalCost * CLUSTER_DISCOUNT;
  const reducedCost = originalCost - savings;

  return (
    <div className="mt-2 rounded-lg border border-success/30 bg-success/5 p-3 animate-fade-in">
      <div className="flex items-center gap-1.5 mb-2">
        <Users className="w-3.5 h-3.5 text-success" />
        <span className="text-[11px] font-semibold text-success">
          {t('cluster.eligible')} • {t('cluster.sharedTransport')}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div className="text-center">
          <Truck className="w-3 h-3 mx-auto text-muted-foreground mb-0.5" />
          <p className="text-muted-foreground line-through">Rs {originalCost.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground">{t('cluster.before')}</p>
        </div>
        <div className="text-center">
          <Truck className="w-3 h-3 mx-auto text-success mb-0.5" />
          <p className="font-bold text-success">Rs {reducedCost.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground">{t('cluster.after')}</p>
        </div>
        <div className="text-center">
          <TrendingDown className="w-3 h-3 mx-auto text-primary mb-0.5" />
          <p className="font-bold text-primary">Rs {savings.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground">{t('cluster.saved')}</p>
        </div>
      </div>
    </div>
  );
}
