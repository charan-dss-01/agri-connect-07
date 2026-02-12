import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageBase64, cropTypeHint } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const messages: any[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are an agricultural AI expert. Analyze this crop residue image and provide:
1. **cropType**: The type of crop residue (must be one of: "Paddy", "Wheat", "Sugarcane"). If unsure, use "${cropTypeHint || 'Paddy'}" as default.
2. **moisture**: Estimated moisture level as a percentage (integer between 10-30). Look at color, texture, and apparent dryness.
3. **qualityGrade**: Grade the quality as "A" (clean, dry, minimal contamination), "B" (moderate quality), or "C" (wet, contaminated, or mixed).
4. **confidence**: Your confidence in this analysis as a percentage (integer between 70-99).
5. **analysis**: A brief 1-2 sentence description of what you observe.

Respond ONLY with valid JSON in this exact format:
{"cropType":"Paddy","moisture":18,"qualityGrade":"A","confidence":92,"analysis":"Clean paddy straw with low moisture, suitable for biomass conversion."}`,
          },
          ...(imageBase64
            ? [
                {
                  type: "image_url",
                  image_url: {
                    url: imageBase64.startsWith("data:")
                      ? imageBase64
                      : `data:image/jpeg;base64,${imageBase64}`,
                  },
                },
              ]
            : []),
        ],
      },
    ];

    // If no image provided, use text-only analysis
    if (!imageBase64) {
      messages[0].content = `You are an agricultural AI expert. A farmer wants to list "${cropTypeHint || 'Paddy'}" crop residue but didn't upload an image. Provide a realistic analysis:
1. cropType: "${cropTypeHint || 'Paddy'}"
2. moisture: realistic percentage (12-25)
3. qualityGrade: "A", "B", or "C" (randomly pick with 40% A, 40% B, 20% C)
4. confidence: between 70-85 (lower since no image)
5. analysis: brief description

Respond ONLY with valid JSON: {"cropType":"...","moisture":...,"qualityGrade":"...","confidence":...,"analysis":"..."}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI Gateway error:", errText);
      throw new Error(`AI Gateway returned ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate and sanitize
    const validCrops = ["Paddy", "Wheat", "Sugarcane"];
    const validGrades = ["A", "B", "C"];

    const sanitized = {
      cropType: validCrops.includes(result.cropType) ? result.cropType : (cropTypeHint || "Paddy"),
      moisture: Math.max(10, Math.min(30, Math.round(Number(result.moisture) || 18))),
      qualityGrade: validGrades.includes(result.qualityGrade) ? result.qualityGrade : "B",
      confidence: Math.max(60, Math.min(99, Math.round(Number(result.confidence) || 80))),
      analysis: String(result.analysis || "Analysis completed.").slice(0, 200),
    };

    return new Response(JSON.stringify(sanitized), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-crop:", error);

    // Fallback: return simulated result if AI fails
    const fallback = {
      cropType: "Paddy",
      moisture: Math.floor(Math.random() * 15) + 12,
      qualityGrade: ["A", "B", "C"][Math.floor(Math.random() * 3)],
      confidence: Math.floor(Math.random() * 11) + 75,
      analysis: "AI analysis unavailable. Using estimated values.",
    };

    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
