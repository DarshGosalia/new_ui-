import { useEffect, useRef, useState } from "react";

import "./business-chatbot.css";

type Role = "user" | "assistant";

type Message = {
  role: Role;
  content: string;
};

type DashboardData = {
  summary?: { revenue?: string; netProfit?: string; receivables?: string };
  goalTracker?: { projectionLabel?: string };
  weeklyActionCards?: Array<{ title: string; description: string }>;
  benchmarks?: { headline?: string; recommendation?: string };
  weeklyHealthReport?: string[];
};

const API_BASE = "/api/business-chatbot";

const initialMessage: Message = {
  role: "assistant",
  content:
    "I am your AI business copilot. Enter your business numbers on the left, then ask me anything about profit, growth, cash flow, pricing, cost cutting, or general business strategy.",
};

const quickPrompts = [
  "Why is my profit low?",
  "How can I boost sales this month?",
  "Who owes me the most money?",
  "What should I do this week to improve cash flow?",
  "How do I reduce logistics costs?",
  "What if I raise prices by 10%?",
];

const sampleBusinessJson = `{
  "businessProfile": {
    "name": "Shree Ganesh Mart",
    "industry": "Grocery",
    "ownerLanguage": "en",
    "monthlyRevenueTarget": 300000
  },
  "summary": {
    "revenue": 265000,
    "expenses": 205000,
    "netProfit": 60000,
    "receivables": 83000,
    "cashFlow": 51000
  },
  "advisorParagraph": "My grocery shop has decent sales but profit is low because inventory and delivery expenses are high."
}`;

const manualEntryDefaults = {
  businessName: "Shree Ganesh Mart",
  industry: "Grocery",
  advisorParagraph:
    "My grocery shop has decent sales but profit is low because inventory cost and delivery expenses are high. Many customers buy on credit, so cash flow gets delayed. I want advice focused on improving profit, faster collections, better pricing, and reducing waste.",
  monthlyRevenueTarget: "300000",
  revenue: "265000",
  expenses: "205000",
  netProfit: "60000",
  receivables: "83000",
  cashFlow: "51000",
  logistics: "22000",
  inventory: "118000",
  staff: "32000",
  rent: "15000",
  topDebtorName: "Mehta Stores",
  topDebtorAmount: "24500",
};

type ManualEntry = typeof manualEntryDefaults;

function buildPayloadFromManualEntry(form: ManualEntry, language: string) {
  return {
    businessProfile: {
      name: form.businessName || "Business",
      industry: form.industry || "General",
      ownerLanguage: language,
      monthlyRevenueTarget: Number(form.monthlyRevenueTarget || 0),
    },
    advisorParagraph: form.advisorParagraph || "",
    summary: {
      revenue: Number(form.revenue || 0),
      expenses: Number(form.expenses || 0),
      netProfit: Number(form.netProfit || 0),
      receivables: Number(form.receivables || 0),
      cashFlow: Number(form.cashFlow || 0),
    },
    monthlyProfit: [
      { month: "January", profit: Math.round(Number(form.netProfit || 0) * 0.72) },
      { month: "February", profit: Math.round(Number(form.netProfit || 0) * 0.87) },
      { month: "March", profit: Number(form.netProfit || 0) },
    ],
    expensesByCategory: [
      { category: "Inventory", amount: Number(form.inventory || 0) },
      { category: "Logistics", amount: Number(form.logistics || 0) },
      { category: "Staff", amount: Number(form.staff || 0) },
      { category: "Rent", amount: Number(form.rent || 0) },
    ],
    debtors: [
      {
        name: form.topDebtorName || "Top Debtor",
        amount: Number(form.topDebtorAmount || 0),
      },
    ],
    weeklyMetrics: {
      revenue: Math.round(Number(form.revenue || 0) / 4),
      topExpense: `Inventory at Rs ${Number(form.inventory || 0).toLocaleString("en-IN")}`,
      financialWin: "Collections have improved after closer follow-ups.",
      financialRisk: "Margins remain under pressure from operating costs.",
      recommendedAction: "Review collections and the two biggest expense buckets this week.",
    },
    benchmark: {
      industry: `${form.industry || "Businesses"} in your revenue range`,
      cogsRatio:
        Number(form.revenue || 0) > 0
          ? Math.round((Number(form.inventory || 0) / Number(form.revenue || 1)) * 100)
          : 0,
      typicalCogsRatio: 28,
    },
    courierSpend: [{ vendor: "Primary Logistics Vendor", amount: Number(form.logistics || 0) }],
  };
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-pill">
      <span className="stat-pill-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function BusinessChatbotPage() {
  const [language, setLanguage] = useState("en");
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [chatInput, setChatInput] = useState("");
  const [dashboard, setDashboard] = useState<DashboardData>({});
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [businessJson, setBusinessJson] = useState(sampleBusinessJson);
  const [manualEntry, setManualEntry] = useState<ManualEntry>(manualEntryDefaults);
  const [manualText, setManualText] = useState(
    "My business has stable revenue but low margins due to inventory and logistics costs. I need cash-flow focused advice.",
  );
  const [ingestStatus, setIngestStatus] = useState("");
  const [ingestError, setIngestError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const chatLogRef = useRef<HTMLDivElement>(null);

  const languageOptions = [
    { code: "en", label: "English", locale: "en-US" },
    { code: "hi", label: "Hindi", locale: "hi-IN" },
    { code: "mr", label: "Marathi", locale: "mr-IN" },
    { code: "ta", label: "Tamil", locale: "ta-IN" },
    { code: "te", label: "Telugu", locale: "te-IN" },
    { code: "kn", label: "Kannada", locale: "kn-IN" },
  ];

  function getLanguageMeta(code: string) {
    return languageOptions.find((item) => item.code === code) || languageOptions[0];
  }

  async function loadDashboard(selectedLanguage = language) {
    setLoadingDashboard(true);
    try {
      const response = await fetch(`${API_BASE}/dashboard?language=${selectedLanguage}`);
      const data = await response.json();
      setDashboard(data || {});
    } catch {
      setDashboard({});
    } finally {
      setLoadingDashboard(false);
    }
  }

  useEffect(() => {
    loadDashboard(language);
  }, [language]);

  useEffect(() => {
    const Recognition =
      typeof window === "undefined"
        ? null
        : (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

    if (!Recognition) {
      setVoiceSupported(false);
      return;
    }

    setVoiceSupported(true);
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.lang = getLanguageMeta(language).locale;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setChatInput((current) => [current, transcript].filter(Boolean).join(" ").trim());
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [language]);

  useEffect(() => {
    if (!chatLogRef.current) return;
    chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
  }, [messages, chatLoading]);

  async function handleAsk(promptOverride?: string) {
    const prompt = (promptOverride ?? chatInput).trim();
    if (!prompt) return;

    const nextMessages = [...messages, { role: "user" as const, content: prompt }];
    setMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, language, history: nextMessages }),
      });
      const data = await response.json();

      const answer = data?.answer || "I could not generate a response right now.";
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: answer,
        },
      ]);
      if (typeof window !== "undefined" && window.speechSynthesis && voiceEnabled) {
        const utterance = new SpeechSynthesisUtterance(answer);
        utterance.lang = getLanguageMeta(language).locale;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "I could not answer right now. Please check server connectivity and try again.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function ingestBusinessData(payload: Record<string, unknown>, successMessage: string) {
    setIngestStatus("");
    setIngestError("");

    try {
      const response = await fetch(`${API_BASE}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessData: payload }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Business data update failed");
      }

      setIngestStatus(successMessage);
      setMessages([
        initialMessage,
        {
          role: "assistant",
          content: "Business data loaded. Ask anything about margins, growth, cash flow, and operations.",
        },
      ]);
      await loadDashboard(language);
    } catch (error: any) {
      setIngestError(error?.message || "Invalid business data");
    }
  }

  async function handleManualSave() {
    const payload = buildPayloadFromManualEntry(manualEntry, language);
    setBusinessJson(JSON.stringify(payload, null, 2));
    await ingestBusinessData(payload, "Manual business entry saved. The copilot is now analyzing those numbers.");
  }

  async function handleJsonLoad() {
    try {
      const payload = JSON.parse(businessJson);
      await ingestBusinessData(payload, "JSON business data loaded.");
    } catch {
      setIngestError("Invalid JSON format");
    }
  }

  async function resetBusinessData() {
    setIngestStatus("");
    setIngestError("");
    await fetch(`${API_BASE}/reset`, { method: "POST" });
    setManualEntry(manualEntryDefaults);
    setBusinessJson(sampleBusinessJson);
    setManualText(
      "My business has stable revenue but low margins due to inventory and logistics costs. I need cash-flow focused advice.",
    );
    setMessages([initialMessage]);
    setIngestStatus("Reset to default sample data.");
    await loadDashboard(language);
  }

  function startVoiceInput() {
    if (!recognitionRef.current) return;
    recognitionRef.current.lang = getLanguageMeta(language).locale;
    recognitionRef.current.start();
  }

  function stopVoiceInput() {
    recognitionRef.current?.stop();
  }

  function updateManualField(field: keyof ManualEntry, value: string) {
    setManualEntry((current) => ({ ...current, [field]: value }));
  }

  return (
    <main className="copilot-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">AI Business Copilot</p>
          <h1>GPT-style advisor for your business.</h1>
          <p className="muted">
            Enter your numbers manually or paste JSON, then ask anything about profit, growth, pricing, cash flow, or operations in your own language.
          </p>
        </div>

        <div className="sidebar-card">
          <label className="field-label" htmlFor="language">
            Language
          </label>
          <select id="language" value={language} onChange={(event) => setLanguage(event.target.value)}>
            {languageOptions.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
          <div className="toggle-row">
            <button
              className={voiceEnabled ? "toggle-button active-toggle" : "toggle-button"}
              onClick={() => setVoiceEnabled((current) => !current)}
              type="button"
            >
              {voiceEnabled ? "Voice reply on" : "Voice reply off"}
            </button>
            <span className="muted">{voiceSupported ? "Mic supported" : "Mic not supported in this browser"}</span>
          </div>
        </div>

        <div className="sidebar-card">
          <p className="sidebar-title">Manual Entry</p>
          <div className="form-grid">
            <input value={manualEntry.businessName} onChange={(event) => updateManualField("businessName", event.target.value)} placeholder="Business name" />
            <input value={manualEntry.industry} onChange={(event) => updateManualField("industry", event.target.value)} placeholder="Industry" />
            <input type="number" value={manualEntry.monthlyRevenueTarget} onChange={(event) => updateManualField("monthlyRevenueTarget", event.target.value)} placeholder="Revenue target" />
            <input type="number" value={manualEntry.revenue} onChange={(event) => updateManualField("revenue", event.target.value)} placeholder="Monthly revenue" />
            <input type="number" value={manualEntry.expenses} onChange={(event) => updateManualField("expenses", event.target.value)} placeholder="Monthly expenses" />
            <input type="number" value={manualEntry.netProfit} onChange={(event) => updateManualField("netProfit", event.target.value)} placeholder="Net profit" />
            <input type="number" value={manualEntry.cashFlow} onChange={(event) => updateManualField("cashFlow", event.target.value)} placeholder="Cash flow" />
            <input type="number" value={manualEntry.receivables} onChange={(event) => updateManualField("receivables", event.target.value)} placeholder="Receivables" />
            <input type="number" value={manualEntry.inventory} onChange={(event) => updateManualField("inventory", event.target.value)} placeholder="Inventory cost" />
            <input type="number" value={manualEntry.logistics} onChange={(event) => updateManualField("logistics", event.target.value)} placeholder="Logistics cost" />
            <input type="number" value={manualEntry.staff} onChange={(event) => updateManualField("staff", event.target.value)} placeholder="Staff cost" />
            <input type="number" value={manualEntry.rent} onChange={(event) => updateManualField("rent", event.target.value)} placeholder="Rent" />
            <input value={manualEntry.topDebtorName} onChange={(event) => updateManualField("topDebtorName", event.target.value)} placeholder="Top debtor name" />
            <input type="number" value={manualEntry.topDebtorAmount} onChange={(event) => updateManualField("topDebtorAmount", event.target.value)} placeholder="Top debtor amount" />
          </div>
          <textarea rows={7} value={manualEntry.advisorParagraph} onChange={(event) => updateManualField("advisorParagraph", event.target.value)} placeholder="Write one business paragraph here. The assistant will use this as your business context." />
          <button onClick={handleManualSave}>Save manual data</button>
        </div>

        <div className="sidebar-card">
          <p className="sidebar-title">Optional JSON Input</p>
          <textarea rows={12} value={businessJson} onChange={(event) => setBusinessJson(event.target.value)} placeholder="Paste business JSON" />
          <div className="sidebar-actions">
            <button onClick={handleJsonLoad}>Load JSON</button>
            <button className="secondary-button" onClick={resetBusinessData}>
              Reset
            </button>
          </div>
          {ingestStatus ? <p className="success-text">{ingestStatus}</p> : null}
          {ingestError ? <p className="error-text">{ingestError}</p> : null}
        </div>

        <div className="sidebar-card">
          <p className="sidebar-title">Current Snapshot</p>
          <div className="stat-column">
            <StatPill label="Revenue" value={dashboard?.summary?.revenue || "Loading..."} />
            <StatPill label="Net profit" value={dashboard?.summary?.netProfit || "Loading..."} />
            <StatPill label="Receivables" value={dashboard?.summary?.receivables || "Loading..."} />
            <StatPill label="Goal projection" value={dashboard?.goalTracker?.projectionLabel || "Loading..."} />
          </div>
        </div>
      </aside>

      <section className="chat-area">
        <div className="chat-header">
          <div>
            <p className="eyebrow">Business Chat</p>
            <h2>Ask like GPT. Get business-specific answers.</h2>
            <p className="muted">Ask about low profit, how to grow, pricing, staffing, supplier costs, GST, or anything operational. If your data is loaded, the reply uses it.</p>
          </div>
          <div className="quick-prompt-grid">
            {quickPrompts.map((prompt) => (
              <button key={prompt} className="prompt-chip" onClick={() => handleAsk(prompt)} type="button">
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="chat-panel-main">
          <div className="chat-log modern-chat-log" ref={chatLogRef}>
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`message-row ${message.role}`}>
                <div className={`avatar-badge ${message.role}`}>{message.role === "assistant" ? "AI" : "You"}</div>
                <div className="message-card">
                  <p>{message.content}</p>
                </div>
              </div>
            ))}
            {chatLoading ? (
              <div className="message-row assistant">
                <div className="avatar-badge assistant">AI</div>
                <div className="message-card">
                  <p>Thinking through your business data and business context...</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="composer-box">
            <textarea rows={4} value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask anything: Why is my profit low, how can I grow faster, should I hire, what expenses should I cut..." />
            <div className="composer-actions">
              <div className="voice-actions">
                <button className="secondary-button" onClick={isListening ? stopVoiceInput : startVoiceInput} type="button" disabled={!voiceSupported}>
                  {isListening ? "Stop mic" : "Start mic"}
                </button>
                <span className="muted">{isListening ? `Listening in ${getLanguageMeta(language).label}` : "Voice input available in supported browsers"}</span>
              </div>
              <button onClick={() => handleAsk()} type="button">
                Send
              </button>
            </div>
          </div>
        </div>

        <div className="insight-strip">
          <div className="mini-panel">
            <p className="eyebrow">Weekly Actions</p>
            {loadingDashboard ? (
              <p className="muted">Loading...</p>
            ) : (
              dashboard?.weeklyActionCards?.slice(0, 2).map((card) => (
                <div key={card.title} className="mini-item">
                  <strong>{card.title}</strong>
                  <span>{card.description}</span>
                </div>
              ))
            )}
          </div>
          <div className="mini-panel">
            <p className="eyebrow">Benchmark</p>
            <strong>{dashboard?.benchmarks?.headline || "Loading benchmark..."}</strong>
            <span>{dashboard?.benchmarks?.recommendation || ""}</span>
          </div>
          <div className="mini-panel">
            <p className="eyebrow">Risk Watch</p>
            {dashboard?.weeklyHealthReport?.slice(2, 5).map((item, index) => (
              <div key={index} className="mini-item">
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
