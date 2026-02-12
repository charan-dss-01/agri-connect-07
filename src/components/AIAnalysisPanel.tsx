import { useState, useEffect } from 'react';
import { Cpu, Droplets, Award, Gauge, FileText } from 'lucide-react';
import { adjustPriceForQuality, CROP_PRICES } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';

interface AIAnalysisPanelProps {
  cropType: string;
  onAnalysisComplete: (result: { moisture: number; grade: 'A' | 'B' | 'C'; confidence: number; adjustedPrice: number; detectedCropType?: string; analysis?: string }) => void;
  trigger: number;
  imageFile?: File | null;
}

export default function AIAnalysisPanel({ cropType, onAnalysisComplete, trigger, imageFile }: AIAnalysisPanelProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ moisture: number; grade: 'A' | 'B' | 'C'; confidence: number; adjustedPrice: number; detectedCropType?: string; analysis?: string } | null>(null);
  const [analysisStep, setAnalysisStep] = useState(0);

  useEffect(() => {
    if (trigger === 0) return;
    setAnalyzing(true);
    setResult(null);
    setAnalysisStep(0);

    const stepTimer1 = setTimeout(() => setAnalysisStep(1), 500);
    const stepTimer2 = setTimeout(() => setAnalysisStep(2), 1200);
    const stepTimer3 = setTimeout(() => setAnalysisStep(3), 1800);

    const analyzeWithAI = async () => {
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

        const adjustedPrice = adjustPriceForQuality(
          CROP_PRICES[aiResult.cropType] || CROP_PRICES[cropType] || 1500,
          aiResult.cropType || cropType,
          aiResult.moisture,
          aiResult.qualityGrade
        );

        const res = {
          moisture: aiResult.moisture,
          grade: aiResult.qualityGrade,
          confidence: aiResult.confidence,
          adjustedPrice,
          detectedCropType: aiResult.cropType,
          analysis: aiResult.analysis,
        };

        setResult(res);
        setAnalyzing(false);
        onAnalysisComplete(res);
      } catch (err) {
        console.error('AI analysis error:', err);
        // Fallback to basic analysis
        const moisture = Math.floor(Math.random() * 15) + 12;
        const grades: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
        const grade = grades[Math.floor(Math.random() * 3)];
        const confidence = Math.floor(Math.random() * 11) + 75;
        const adjustedPrice = adjustPriceForQuality(CROP_PRICES[cropType] || 1500, cropType, moisture, grade);
        const res = { moisture, grade, confidence, adjustedPrice, analysis: 'Fallback analysis used.' };
        setResult(res);
        setAnalyzing(false);
        onAnalysisComplete(res);
      }
    };

    // Start AI analysis (min 2s for UX)
    const minDelay = new Promise(resolve => setTimeout(resolve, 2500));
    Promise.all([analyzeWithAI(), minDelay]);

    return () => {
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
        {imageFile && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">🖼 Image detected</span>}
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
              ⚡ Price adjusted to <strong>₹{result.adjustedPrice}/ton</strong> based on quality analysis
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
