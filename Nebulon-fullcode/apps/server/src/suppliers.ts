import { Router } from "express";
import "dotenv/config";

type SupplierComparisonInput = {
  itemName?: string;
  unit?: string;
  bestSupplier?: string;
  bestPrice?: number;
  suppliers?: Array<{
    supplierName?: string;
    avgPrice?: number;
    latestPrice?: number;
    totalQty?: number;
  }>;
};

type InsightItem = {
  itemName: string;
  message: string;
  savings: number;
  from: string;
  to: string;
};

const router = Router();

function cleanJsonText(text: string) {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

async function generateWithGroq(prompt: string) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    throw new Error("GROQ_API_KEY missing");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a procurement analyst for Indian retail SMEs. Return only JSON with concise actionable guidance.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "Unknown Groq error");
    throw new Error(err);
  }

  const json: any = await response.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Invalid Groq response");
  }

  return cleanJsonText(text);
}

function buildRuleFallback(comparisons: SupplierComparisonInput[]): InsightItem[] {
  const fallback: InsightItem[] = [];

  for (const comp of comparisons) {
    const suppliers = (comp.suppliers || []).filter((s) => typeof s?.avgPrice === "number");
    if (suppliers.length < 2) continue;

    const sorted = [...suppliers].sort((a, b) => (a.avgPrice || 0) - (b.avgPrice || 0));
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (!best || !worst || !best.avgPrice || !worst.avgPrice || !comp.itemName) continue;

    const estimatedQty = Math.max(
      1,
      Math.round(
        suppliers.reduce((sum, s) => sum + (s.totalQty || 0), 0) / 3,
      ),
    );

    const savings = Math.max(0, Math.round((worst.avgPrice - best.avgPrice) * estimatedQty));
    if (savings <= 0) continue;

    fallback.push({
      itemName: comp.itemName,
      message: `Switching ${comp.itemName} from ${worst.supplierName || "higher-cost supplier"} to ${best.supplierName || "best supplier"} can reduce monthly purchase cost by about Rs ${savings}.`,
      savings,
      from: worst.supplierName || "Higher-cost supplier",
      to: best.supplierName || "Best supplier",
    });
  }

  return fallback;
}

router.post("/insights", async (req, res) => {
  try {
    const comparisons: SupplierComparisonInput[] = Array.isArray(req.body?.comparisons)
      ? req.body.comparisons
      : [];

    if (comparisons.length === 0) {
      return res.status(400).json({ success: false, error: "comparisons array is required" });
    }

    const compact = comparisons.slice(0, 30).map((c) => ({
      itemName: c.itemName,
      unit: c.unit,
      bestSupplier: c.bestSupplier,
      bestPrice: c.bestPrice,
      suppliers: (c.suppliers || []).slice(0, 8).map((s) => ({
        supplierName: s.supplierName,
        avgPrice: s.avgPrice,
        latestPrice: s.latestPrice,
        totalQty: s.totalQty,
      })),
    }));

    const prompt = `Analyze supplier price comparisons and return JSON with this exact shape: {"insights":[{"itemName":"string","message":"string","savings":number,"from":"string","to":"string"}],"summary":"string"}. Keep insight messages under 25 words and focused on procurement action. DATA: ${JSON.stringify(compact)}`;

    try {
      const groqText = await generateWithGroq(prompt);
      const parsed = JSON.parse(groqText);
      const insights = Array.isArray(parsed?.insights) ? parsed.insights : [];

      return res.json({
        success: true,
        provider: "groq",
        summary: typeof parsed?.summary === "string" ? parsed.summary : "AI insights generated from supplier pricing data.",
        insights,
      });
    } catch (groqErr: any) {
      console.warn("Supplier insight generation failed on Groq:", groqErr?.message || groqErr);
      const fallbackInsights = buildRuleFallback(comparisons);
      return res.json({
        success: true,
        provider: "rules",
        summary: "Using local fallback insights because Groq call failed.",
        insights: fallbackInsights,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Unexpected server error" });
  }
});

export default router;
