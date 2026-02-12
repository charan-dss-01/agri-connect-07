import { Zap, ZapOff } from 'lucide-react';
import { useDemo } from '@/contexts/DemoContext';

export default function DemoToggle() {
  const { demoMode, toggleDemo } = useDemo();

  return (
    <button
      onClick={toggleDemo}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        demoMode
          ? 'bg-accent text-accent-foreground shadow-card animate-pulse'
          : 'bg-muted text-muted-foreground hover:bg-secondary'
      }`}
    >
      {demoMode ? <Zap className="w-3 h-3" /> : <ZapOff className="w-3 h-3" />}
      {demoMode ? 'Demo Live' : 'Demo Mode'}
    </button>
  );
}
