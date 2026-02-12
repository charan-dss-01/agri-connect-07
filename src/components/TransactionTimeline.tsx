import { CheckCircle, Clock, Truck, Factory, Wheat, Package } from 'lucide-react';
import type { Transaction } from '@/data/mockData';

const steps = [
  { key: 'listed', label: 'Listed', icon: Wheat },
  { key: 'matched', label: 'Industry Matched', icon: Factory },
  { key: 'accepted', label: 'Accepted', icon: CheckCircle },
  { key: 'pickup', label: 'Pickup Scheduled', icon: Truck },
  { key: 'completed', label: 'Completed', icon: Package },
];

function getActiveStep(status: string, hasPickup: boolean): number {
  if (status === 'completed') return 5;
  if (status === 'accepted' && hasPickup) return 4;
  if (status === 'accepted') return 3;
  if (status === 'pending') return 2;
  if (status === 'rejected') return 0;
  return 1;
}

export default function TransactionTimeline({ transaction }: { transaction: Transaction }) {
  const active = getActiveStep(transaction.status, !!transaction.pickupDate);
  const isRejected = transaction.status === 'rejected';

  return (
    <div className="flex items-center gap-1 w-full overflow-x-auto py-2">
      {steps.map((step, i) => {
        const done = i < active;
        const current = i === active - 1;
        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                isRejected ? 'bg-destructive/15 text-destructive' :
                done ? 'bg-success text-success-foreground' :
                current ? 'bg-primary text-primary-foreground animate-pulse' :
                'bg-muted text-muted-foreground'
              }`}>
                <step.icon className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[9px] text-center leading-tight ${done ? 'text-success font-medium' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 rounded-full min-w-[16px] ${done ? 'bg-success' : 'bg-muted'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
