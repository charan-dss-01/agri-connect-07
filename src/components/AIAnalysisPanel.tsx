import { useEffect, useState } from 'react';
import { Cpu, Droplets, Award, Gauge, FileText } from 'lucide-react';
import { adjustPriceForQuality, CROP_PRICES } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';

interface AIAnalysisResult {
  moisture: number;
  grade: 'A' | 'B' | 'C';
  confidence: number;
  adjustedPrice: number;
  detectedCropType?: string;
  analysis?: string;
}

interface AIAnalysisPanelProps {
  cropType: string;
  onAnalysisComplete: (result: AIAnalysisResult) => void;
  trigger: number;
  imageFile?: File | null;
}

function buildFallbackResult(cropType: string): AIAnalysisResult {
  return {
    moisture: 18,
    grade: 'B',
    confidence: 0,
    adjustedPrice: CROP_PRICES[cropType] || 1500,
    detectedCropType: cropType,
    analysis: 'AI analysis is unavailable. Default pricing is being used, so please review before submitting.',
  };
}

export default function AIAnalysisPanel({ cropType, onAnalysisComplete, trigger, imageFile }: AIAnalysisPanelProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [analysisStep, setAnalysisStep] = useState(0);

  useEffect(() => {
    if (trigger === 0) return;

    setAnalyzing(true);
    setResult(null);
    setAnalysisStep(0);

    const stepTimer1 = setTimeout(() => setAnalysisStep(1), 500);
    const stepTimer2 = setTimeout(() => setAnalysisStep(2), 1200);
    const stepTimer3 = setTimeout(() => setAnalysisStep(3), 1800);
    let cancelled = false;

    const analyzeWithAI = async (): Promise<AIAnalysisResult> => {
      try {
        let imageBase64: string | null = null;

        if (imageFile) {
          const reader = new FileReader();
          imageBase64 = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(imageFile);
          });
        }

        const { data, error } = await supabase.functions.invoke('analyze-crop', {
          body: {
            imageBase64,
            cropTypeHint: cropType,
          },
        });

        if (error) throw error;

        const aiResult = data as {
          cropType: string;
          moisture: number;
          qualityGrade: 'A' | 'B' | 'C';
          confidence: number;
          analysis: string;
        };

        return {
          moisture: aiResult.moisture,
          grade: aiResult.qualityGrade,
          confidence: aiResult.confidence,
          adjustedPrice: adjustPriceForQuality(
            CROP_PRICES[aiResult.cropType] || CROP_PRICES[cropType] || 1500,
            aiResult.cropType || cropType,
            aiResult.moisture,
            aiResult.qualityGrade
          ),
          detectedCropType: aiResult.cropType,
          analysis: aiResult.analysis,
        };
      } catch (err) {
        console.error('AI analysis error:', err);
        return buildFallbackResult(cropType);
      }
    };

    void (async () => {
      const [analysisResult] = await Promise.all([
        analyzeWithAI(),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);

      if (cancelled) return;

      setResult(analysisResult);
      setAnalyzing(false);
      onAnalysisComplete(analysisResult);
    })();

    return () => {
      cancelled = true;
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
    };
  }, [trigger]);

  if (!analyzing && !result) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 animate-scale-in">
      <div className="flex items-center gap-2 mb-3">
        <Cpu className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-primary">AI Crop Analysis</span>
        {imageFile && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">Image detected</span>}
      </div>

      {analyzing ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">
              {analysisStep === 0 && 'Uploading image to AI...'}
              {analysisStep === 1 && 'Detecting crop type...'}
              {analysisStep === 2 && 'Measuring moisture level...'}
              {analysisStep === 3 && 'Grading biomass quality...'}
            </span>
          </div>
          <div className="space-y-2">
            {['Detecting crop type...', 'Measuring moisture level...', 'Grading biomass quality...'].map((step, i) => (
              <div key={i} className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${analysisStep > i ? 'bg-primary' : 'bg-primary/40 animate-pulse'}`}
                  style={{ width: analysisStep > i ? '100%' : `${30 + i * 25}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      ) : result ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 bg-card rounded-lg p-2.5">
              <Cpu className="w-4 h-4 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">Detected Crop</p>
                <p className="text-sm font-bold">{result.detectedCropType || cropType}</p>
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
          </div>

          {result.analysis && (
            <div className="flex items-start gap-2 bg-card rounded-lg p-2.5">
              <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">AI Analysis</p>
                <p className="text-xs leading-relaxed">{result.analysis}</p>
              </div>
            </div>
          )}

          {result.adjustedPrice !== (CROP_PRICES[result.detectedCropType || cropType] || CROP_PRICES[cropType]) && (
            <div className="text-xs bg-warning/10 text-warning rounded-lg p-2 text-center">
              Price adjusted to <strong>Rs {result.adjustedPrice}/ton</strong> based on quality analysis
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
