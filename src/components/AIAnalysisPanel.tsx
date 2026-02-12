import { useState, useEffect } from 'react';
import { Cpu, Droplets, Award, Gauge } from 'lucide-react';
import { simulateAIAnalysis, adjustPriceForQuality, CROP_PRICES } from '@/data/mockData';

interface AIAnalysisPanelProps {
  cropType: string;
  onAnalysisComplete: (result: { moisture: number; grade: 'A' | 'B' | 'C'; confidence: number; adjustedPrice: number }) => void;
  trigger: number; // increment to re-trigger
}

export default function AIAnalysisPanel({ cropType, onAnalysisComplete, trigger }: AIAnalysisPanelProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ moisture: number; grade: 'A' | 'B' | 'C'; confidence: number; adjustedPrice: number } | null>(null);

  useEffect(() => {
    if (trigger === 0) return;
    setAnalyzing(true);
    setResult(null);
    const timer = setTimeout(() => {
      const ai = simulateAIAnalysis(cropType);
      const adjustedPrice = adjustPriceForQuality(CROP_PRICES[cropType] || 1500, cropType, ai.moisture, ai.grade);
      const res = { moisture: ai.moisture, grade: ai.grade, confidence: ai.confidence, adjustedPrice };
      setResult(res);
      setAnalyzing(false);
      onAnalysisComplete(res);
    }, 2000);
    return () => clearTimeout(timer);
  }, [trigger, cropType]);

  if (!analyzing && !result) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 animate-scale-in">
      <div className="flex items-center gap-2 mb-3">
        <Cpu className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-primary">AI Crop Analysis</span>
      </div>

      {analyzing ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Analyzing image...</span>
          </div>
          <div className="space-y-2">
            {['Detecting crop type...', 'Measuring moisture level...', 'Grading biomass quality...'].map((step, i) => (
              <div key={i} className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary/40 rounded-full animate-pulse" style={{ width: `${30 + i * 25}%`, animationDelay: `${i * 300}ms` }} />
              </div>
            ))}
          </div>
        </div>
      ) : result ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 bg-card rounded-lg p-2.5">
            <Cpu className="w-4 h-4 text-primary" />
            <div>
              <p className="text-[10px] text-muted-foreground">Detected Crop</p>
              <p className="text-sm font-bold">{cropType}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-card rounded-lg p-2.5">
            <Gauge className="w-4 h-4 text-info" />
            <div>
              <p className="text-[10px] text-muted-foreground">AI Confidence</p>
              <p className="text-sm font-bold text-info">{result.confidence}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-card rounded-lg p-2.5">
            <Droplets className="w-4 h-4 text-info" />
            <div>
              <p className="text-[10px] text-muted-foreground">Moisture Level</p>
              <p className={`text-sm font-bold ${result.moisture > 20 ? 'text-warning' : 'text-success'}`}>{result.moisture}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-card rounded-lg p-2.5">
            <Award className="w-4 h-4 text-accent" />
            <div>
              <p className="text-[10px] text-muted-foreground">Quality Grade</p>
              <p className={`text-sm font-bold ${result.grade === 'A' ? 'text-success' : result.grade === 'B' ? 'text-warning' : 'text-destructive'}`}>
                Grade {result.grade}
              </p>
            </div>
          </div>
          {result.adjustedPrice !== CROP_PRICES[cropType] && (
            <div className="col-span-2 text-xs bg-warning/10 text-warning rounded-lg p-2 text-center">
              ⚡ Price adjusted to <strong>₹{result.adjustedPrice}/ton</strong> based on quality analysis
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
