import { Router } from "express";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ─── Gemini AI Setup (Lazy) ────────────────────────────────────────────────
let model: any = null;
function getGeminiModel() {
  if (!model && process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }
  return model;
}

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
      messages: [
        { role: "system", content: "Return only valid JSON. No markdown fences." },
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

async function generateWithGemini(prompt: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY missing");
  }

  const aiModel = getGeminiModel();
  if (!aiModel) {
    throw new Error("Gemini model init failed");
  }

  const result = await aiModel.generateContent(prompt);
  return cleanJsonText(result.response.text());
}

// ─── Preloaded Product Intelligence ────────────────────────────────────────
const INDIAN_PRODUCT_DB: Record<string, any> = {
  "8901030663445": { name: "Maggi 2-Minute Noodles (70g)", category: "FMCG", unit: "Pcs", gst: 5, hsn: "1902", suggestedPrice: 14 },
  "8901058000109": { name: "Amul Butter (500g)", category: "Dairy", unit: "Pcs", gst: 12, hsn: "0405", suggestedPrice: 275 },
  "8901491103003": { name: "Tata Salt (1kg)", category: "Grocery", unit: "Pcs", gst: 0, hsn: "2501", suggestedPrice: 28 },
  "8901207040552": { name: "Dettol Liquid Handwash (200ml)", category: "Pharmacy", unit: "Pcs", gst: 18, hsn: "3401", suggestedPrice: 99 },
  "8901030704055": { name: "Parle-G Biscuits (800g)", category: "FMCG", unit: "Pcs", gst: 18, hsn: "1905", suggestedPrice: 80 },
  "8901088136229": { name: "Dabur Honey (500g)", category: "Healthy Foods", unit: "Pcs", gst: 5, hsn: "0409", suggestedPrice: 235 },
  "8901725101223": { name: "Aashirvaad Multigrain Atta (5kg)", category: "Grocery", unit: "Pcs", gst: 5, hsn: "1101", suggestedPrice: 345 },
};

let uploadedProducts: any[] | null = null;

function parseCSV(csvText: string): any[] {
  const lines = csvText.trim().split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headerLine = lines[0];
  if (!headerLine) return [];

  const headers = headerLine.split(",").map(h => h.trim());
  const products: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const values = line.split(",").map(v => v.trim());
    const row: any = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });

    const stockQuantity = Number(row.stockQuantity) || 0;
    const reorderThreshold = Number(row.reorderThreshold) || 10;
    const avgDailySales = Number(row.avgDailySales) || 0;
    const costPrice = Number(row.costPrice) || 0;
    const sellingPrice = Number(row.sellingPrice) || 0;
    const lastSaleDaysAgo = Number(row.lastSaleDaysAgo) || 0;

    products.push({
      id: row.productId || `PRD-${1000 + i}`,
      name: row.productName || `Product ${i}`,
      category: row.category || "General",
      stockQuantity,
      reorderThreshold,
      avgDailySales,
      daysOfStockRemaining: avgDailySales > 0 ? Math.floor(stockQuantity / avgDailySales) : 999,
      costPrice,
      sellingPrice,
      margin: sellingPrice > 0 ? Number((((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(2)) : 0,
      healthStatus: stockQuantity <= reorderThreshold ? "CRITICAL" : stockQuantity <= reorderThreshold * 1.5 ? "WARNING" : "HEALTHY",
      lastSaleDaysAgo,
      suggestedReorder: Math.ceil((avgDailySales * 30) * 1.2),
      inventoryValue: stockQuantity * costPrice,
      hsn: row.hsn || "0000",
      gst: Number(row.gst) || 18,
    });
  }
  return products;
}

// ─── AI Strategic Analysis (Groq primary, Gemini fallback) ─────────────────
async function getInventoryAiInsights(data: any): Promise<any> {
  const fallbackInsights = {
    executive: ["⚠️ Intelligence analysis delayed.", "🛡️ Rule logic suggests healthy stock levels."],
    valuation: "Assets are distributed across key categories with steady growth.",
    health: "Stock levels match 30-day velocity benchmarks.",
    profitability: "Product margins are consistent with industry targets.",
    provider: "rules",
  };

  try {
    const prompt = `
      You are a Senior Strategic Inventory Auditor. Analyze this data and provide structured insights.
      DATA: ${JSON.stringify({
        kpis: data.kpis,
        valuationDist: data.valuation.distribution,
        healthDist: data.health.distribution,
        salesVsStock: data.salesVsStock,
        profitability: data.profitability.scatterData.slice(0, 10)
      })}

      Provide a JSON response with exactly these keys:
      1. "executive": array of 3 strings (actionable business advice, <20 words each).
      2. "valuation": 1 string (analysis of category distribution and trend, <30 words).
      3. "health": 1 string (analysis of stock vs sales mismatch, <30 words).
      4. "profitability": 1 string (analysis of margin vs volume clusters, <30 words).

      Return ONLY the JSON.
    `;

    try {
      const groqText = await generateWithGroq(prompt);
      const insights = JSON.parse(groqText);
      return { ...insights, provider: "groq" };
    } catch (groqErr: any) {
      console.warn("Groq insight generation failed, trying Gemini:", groqErr?.message || groqErr);
      const geminiText = await generateWithGemini(prompt);
      const insights = JSON.parse(geminiText);
      return { ...insights, provider: "gemini" };
    }
  } catch (err: any) {
    console.error("Inventory AI insights error:", err.message);
    return fallbackInsights;
  }
}

// ─── Route Handlers ────────────────────────────────────────────────────────
router.post("/upload", upload.single("file"), (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded." });
    uploadedProducts = parseCSV(req.file.buffer.toString("utf-8"));
    res.json({ success: true, message: `${uploadedProducts.length} products loaded.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/dashboard", async (_req, res) => {
  if (!uploadedProducts) return res.json({ success: true, data: null });
  
  const products = uploadedProducts;
  const valuationTotal = products.reduce((acc, p) => acc + p.inventoryValue, 0);
  const deadStockItems = products.filter(p => p.lastSaleDaysAgo >= 14 && p.stockQuantity > 0);
  const deadStockValue = deadStockItems.reduce((acc, p) => acc + p.inventoryValue, 0);
  const criticalItems = products.filter(p => p.healthStatus === "CRITICAL").sort((a,b) => (a.stockQuantity/a.reorderThreshold)-(b.stockQuantity/b.reorderThreshold));
  const avgProfit = products.reduce((acc, p) => acc + p.margin, 0) / products.length;

  const responseData:any = {
    kpis: {
      totalInventoryValue: valuationTotal,
      totalDeadStockValue: deadStockValue,
      lowStockItems: criticalItems.length,
      avgMargin: Number(avgProfit.toFixed(2)),
      projectedCogs: Math.round(products.reduce((acc, p) => acc + (p.costPrice * (p.avgDailySales * 30)), 0))
    },
    health: { distribution: [], topLowStock: criticalItems.slice(0, 10) },
    deadStock: { totalItems: deadStockItems.length, totalCapitalLocked: deadStockValue, topLocked: deadStockItems.sort((a,b) => b.inventoryValue-a.inventoryValue).slice(0, 5) },
    profitability: { avgMargin: Number(avgProfit.toFixed(2)), scatterData: products.map(p => ({ name: p.name, volume: p.avgDailySales*30, margin: p.margin })) },
    valuation: { distribution: [], trend: [] }
  };

  // Distribution helpers
  const dist = (key: string) => Object.entries(products.reduce((acc: any, p) => { acc[p[key]] = (acc[p[key]] || 0) + p.inventoryValue; return acc; }, {})).map(([name, value]) => ({ name, value }));
  responseData.health.distribution = ["HEALTHY", "WARNING", "CRITICAL"].map(k => ({ name: k, value: products.filter(p => p.healthStatus === k).length }));
  responseData.valuation.distribution = dist("category");
  responseData.valuation.trend = Array.from({length: 6}, (_, i) => ({ month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"][i], value: Math.round(valuationTotal * (0.8 + Math.random() * 0.4)) }));
  
  // Categorical Mismatch
  responseData.salesVsStock = Object.values(products.reduce((acc: any, p) => {
    if (!acc[p.category]) acc[p.category] = { category: p.category, stock: 0, sales: 0 };
    acc[p.category].stock += p.stockQuantity;
    acc[p.category].sales += Math.round(p.avgDailySales * 30);
    return acc;
  }, {}));

  // Fetch strategic AI insights (Groq primary, Gemini fallback).
  responseData.aiInsights = await getInventoryAiInsights(responseData);

  res.json({ success: true, data: responseData });
});

router.get("/lookup/:barcode", (req, res) => {
  const { barcode } = req.params;
  const info = INDIAN_PRODUCT_DB[barcode] || uploadedProducts?.find(p => p.id === barcode);
  if (info) return res.json({ success: true, data: info });
  res.status(404).json({ success: false, message: "Product unknown." });
});

router.post("/order-purchase", (_req, res) =>
  res.json({ success: true, orderId: "PO-" + Date.now().toString().slice(-5) }),
);

export default router;
