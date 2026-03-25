import { Router } from "express";
import "dotenv/config";

type Role = "user" | "assistant";

type ChatMessage = {
  role: Role;
  content: string;
};

type BusinessData = {
  businessProfile: {
    name: string;
    industry: string;
    ownerLanguage: string;
    monthlyRevenueTarget: number;
  };
  advisorParagraph: string;
  summary: {
    revenue: number;
    expenses: number;
    netProfit: number;
    receivables: number;
    cashFlow: number;
  };
  monthlyProfit: Array<{ month: string; profit: number }>;
  expensesByCategory: Array<{ category: string; amount: number }>;
  debtors: Array<{ name: string; amount: number }>;
  weeklyMetrics: {
    revenue: number;
    topExpense: string;
    financialWin: string;
    financialRisk: string;
    recommendedAction: string;
  };
  benchmark: {
    industry: string;
    cogsRatio: number;
    typicalCogsRatio: number;
  };
  courierSpend: Array<{ vendor: string; amount: number }>;
};

const initialData: BusinessData = {
  businessProfile: {
    name: "Shree Ganesh Mart",
    industry: "Grocery",
    ownerLanguage: "en",
    monthlyRevenueTarget: 250000,
  },
  advisorParagraph:
    "My grocery shop has decent sales but profit is low because inventory and delivery costs are high. I want practical profit and cash-flow advice.",
  summary: {
    revenue: 212000,
    expenses: 167500,
    netProfit: 44500,
    receivables: 65200,
    cashFlow: 38100,
  },
  monthlyProfit: [
    { month: "January", profit: 29500 },
    { month: "February", profit: 33800 },
    { month: "March", profit: 44500 },
  ],
  expensesByCategory: [
    { category: "Inventory", amount: 92000 },
    { category: "Logistics", amount: 17400 },
    { category: "Staff", amount: 28000 },
    { category: "Rent", amount: 15000 },
    { category: "Utilities", amount: 7100 },
    { category: "Marketing", amount: 8000 },
  ],
  debtors: [
    { name: "Mehta Stores", amount: 14500 },
    { name: "Kumar Snacks", amount: 11900 },
    { name: "Jai Agency", amount: 9600 },
  ],
  weeklyMetrics: {
    revenue: 54800,
    topExpense: "Inventory restocking at Rs 23,000",
    financialWin: "Collection efficiency improved after two overdue invoices were cleared.",
    financialRisk: "Courier costs rose week over week.",
    recommendedAction: "Collect top overdue invoices before Friday.",
  },
  benchmark: {
    industry: "Grocery stores in your revenue range",
    cogsRatio: 36,
    typicalCogsRatio: 28,
  },
  courierSpend: [
    { vendor: "Fast Courier", amount: 3200 },
    { vendor: "City Express", amount: 2800 },
    { vendor: "Prime Delivery", amount: 4100 },
  ],
};

let activeData: BusinessData = structuredClone(initialData);

const router = Router();

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function deepMerge<T>(base: T, patch: Partial<T>): T {
  if (Array.isArray(patch)) return patch as T;
  if (typeof base !== "object" || base === null) return patch as T;
  if (typeof patch !== "object" || patch === null) return base;

  const merged: any = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    merged[key] = deepMerge((merged as any)[key], value as any);
  }
  return merged as T;
}

function getTopDebtor() {
  return [...activeData.debtors].sort((a, b) => b.amount - a.amount)[0] ?? null;
}

function getBestMonth() {
  return [...activeData.monthlyProfit].sort((a, b) => b.profit - a.profit)[0] ?? null;
}

function getDashboard(language = "en") {
  const topDebtor = getTopDebtor();
  const topDebtorName = topDebtor?.name ?? "priority customer";
  const topDebtorAmount = topDebtor?.amount ?? 0;
  const projectionRatio = activeData.summary.revenue / Math.max(1, activeData.businessProfile.monthlyRevenueTarget);
  const projectionLabel = `${Math.round(projectionRatio * 100)}% of target`;

  return {
    language,
    summary: {
      revenue: formatCurrency(activeData.summary.revenue),
      netProfit: formatCurrency(activeData.summary.netProfit),
      receivables: formatCurrency(activeData.summary.receivables),
    },
    goalTracker: {
      status: projectionRatio >= 0.8 ? "On track" : "Needs attention",
      projectionLabel,
      summary: `Current revenue is ${formatCurrency(activeData.summary.revenue)} against target ${formatCurrency(activeData.businessProfile.monthlyRevenueTarget)}.`,
      recommendation:
        projectionRatio >= 0.8
          ? "Maintain collections and protect margins on high-volume items."
          : "Increase collections and reduce low-return spending this week.",
    },
    weeklyActionCards: [
      {
        title: `Collect ${topDebtorName}'s ${formatCurrency(topDebtorAmount)}`,
        description: "Collecting this overdue amount can improve cash flow immediately.",
      },
      {
        title: "Consolidate courier vendors",
        description: "Negotiating one preferred courier can reduce logistics spend.",
      },
      {
        title: "Push high-margin bundles",
        description: "Prioritize products with stronger contribution margin.",
      },
    ],
    benchmarks: {
      headline: `${activeData.benchmark.industry} typically spend ${activeData.benchmark.typicalCogsRatio}% on COGS. You are at ${activeData.benchmark.cogsRatio}%.`,
      recommendation: "Renegotiate top supplier items and tighten reorder logic.",
    },
    weeklyHealthReport: [
      `Revenue this week: ${formatCurrency(activeData.weeklyMetrics.revenue)}.`,
      `Top expense: ${activeData.weeklyMetrics.topExpense}.`,
      `Financial win: ${activeData.weeklyMetrics.financialWin}`,
      `Financial risk: ${activeData.weeklyMetrics.financialRisk}`,
      `Recommended step: ${activeData.weeklyMetrics.recommendedAction}`,
    ],
  };
}

async function generateGroqReply(prompt: string, language: string, history: ChatMessage[]) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return null;

  const historyText = history
    .slice(-8)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

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
        {
          role: "system",
          content:
            "You are a GPT-style AI business copilot for Indian SMEs. Use provided data as source of truth and answer concisely with practical actions.",
        },
        {
          role: "user",
          content: `Language: ${language}\nBusiness data: ${JSON.stringify(activeData)}\nHistory:\n${historyText}\n\nQuestion: ${prompt}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const json: any = await response.json();
  return json?.choices?.[0]?.message?.content?.trim() || null;
}

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "business-chatbot" });
});

router.get("/dashboard", (req, res) => {
  const language = typeof req.query.language === "string" ? req.query.language : "en";
  res.json(getDashboard(language));
});

router.post("/chat", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message : "";
  const language = typeof req.body?.language === "string" ? req.body.language : "en";
  const history = Array.isArray(req.body?.history) ? (req.body.history as ChatMessage[]) : [];

  try {
    const bestMonth = getBestMonth();
    const topDebtor = getTopDebtor();
    const topDebtorText = topDebtor
      ? `${topDebtor.name} (${formatCurrency(topDebtor.amount)})`
      : "no current debtor data";
    const bestMonthText = bestMonth ? bestMonth.month : "no recent month data";
    const fallback = `Current monthly revenue is ${formatCurrency(activeData.summary.revenue)}, net profit is ${formatCurrency(activeData.summary.netProfit)}, and top debtor is ${topDebtorText}. Best recent month was ${bestMonthText}. Focus on collections, pricing, and logistics control.`;

    const llmAnswer = await generateGroqReply(message, language, history);
    return res.json({
      answer: llmAnswer || fallback,
      sourceMode: llmAnswer ? "live-groq-llm" : "rules",
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Chat request failed", details: err?.message || "Unknown error" });
  }
});

router.post("/scenario", async (req, res) => {
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt : "";

  const input = prompt.toLowerCase();
  const baseProfit = activeData.summary.netProfit;
  const baseCashFlow = activeData.summary.cashFlow;

  let profitDelta = Math.round(baseProfit * 0.08);
  let cashFlowDelta = Math.round(baseCashFlow * 0.05);
  let title = "Scenario projection";

  if (input.includes("price") && input.includes("10")) {
    title = "Price increase scenario";
    profitDelta = Math.round(activeData.summary.revenue * 0.1 * 0.6);
    cashFlowDelta = Math.round(activeData.summary.revenue * 0.1 * 0.5);
  } else if (input.includes("hire") || input.includes("staff")) {
    title = "New staff scenario";
    profitDelta = -18000;
    cashFlowDelta = -18000;
  }

  return res.json({
    title,
    summary: `Projected monthly net profit: ${formatCurrency(baseProfit + profitDelta)} and cash flow: ${formatCurrency(baseCashFlow + cashFlowDelta)}.`,
    details: `Change vs current: profit ${formatCurrency(Math.abs(profitDelta))} ${profitDelta >= 0 ? "gain" : "drop"}, cash flow ${formatCurrency(Math.abs(cashFlowDelta))} ${cashFlowDelta >= 0 ? "gain" : "drop"}.`,
  });
});

router.post("/ocr", (req, res) => {
  const rawText = typeof req.body?.rawText === "string" ? req.body.rawText : "";

  const vendor = rawText.match(/vendor:\s*([^,\n]+)/i)?.[1]?.trim() || "Unknown vendor";
  const amount = rawText.match(/amount:\s*([^,\n]+)/i)?.[1]?.trim() || "0";
  const date = rawText.match(/date:\s*([^,\n]+)/i)?.[1]?.trim() || "Unknown date";
  const category = rawText.match(/category:\s*([^,\n]+)/i)?.[1]?.trim() || "Uncategorized";

  return res.json({
    headline: "Document extracted",
    summary: `Detected vendor ${vendor}, amount Rs ${amount}, date ${date}, category ${category}.`,
    confirmationPrompt: "Please confirm before logging this transaction.",
  });
});

router.post("/goal-tracker", (req, res) => {
  const monthlyTarget = Number(req.body?.monthlyTarget || activeData.businessProfile.monthlyRevenueTarget);
  const projection = activeData.summary.revenue / Math.max(1, monthlyTarget);

  return res.json({
    status: projection >= 0.8 ? "On track" : "Needs attention",
    projectionLabel: `${Math.round(projection * 100)}% of target`,
    summary: `Current revenue ${formatCurrency(activeData.summary.revenue)} vs target ${formatCurrency(monthlyTarget)}.`,
  });
});

router.post("/ingest", (req, res) => {
  const businessData = req.body?.businessData;
  if (!businessData || typeof businessData !== "object") {
    return res.status(400).json({ error: "businessData object is required" });
  }

  activeData = deepMerge(activeData, businessData as Partial<BusinessData>);
  return res.json({ message: "Business data updated successfully", updatedData: activeData });
});

router.post("/reset", (_req, res) => {
  activeData = structuredClone(initialData);
  return res.json({ message: "Business data reset to defaults", updatedData: activeData });
});

export default router;
