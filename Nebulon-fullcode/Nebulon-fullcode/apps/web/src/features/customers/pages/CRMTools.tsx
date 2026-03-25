import { useEffect, useState } from "react";
import { API_BASE, fetchCustomers, fetchReminderTemplates } from "@/lib/api-crm";

export default function CRMTools() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [customMsg, setCustomMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    Promise.all([fetchCustomers(), fetchReminderTemplates()])
      .then(([custData, tempData]) => {
        setCustomers(custData.customers || []);
        setTemplates(tempData.templates || []);
      })
      .catch(console.error);
  }, []);

  const toggleCustomer = (id: string) => {
    const next = new Set(selectedCustomers);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCustomers(next);
  };

  const handleSend = async () => {
    if (selectedCustomers.size === 0) return;
    
    setLoading(true);
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/reminders/messages/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerIds: Array.from(selectedCustomers),
          templateId: selectedTemplate,
          customMessage: customMsg
        })
      });
      const data = await res.json();
      setSuccessMsg(`Successfully sent ${data.sentCount} message(s) via WhatsApp!`);
      setSelectedCustomers(new Set());
      setCustomMsg("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeTemplateStr = templates.find(t => t.id === selectedTemplate)?.template || "";

  const displayMessageFromTemplate = (() => {
    if (customMsg) return customMsg; 
    if (!activeTemplateStr) return "";
    
    const firstSelectedId = Array.from(selectedCustomers)[0];
    const previewCust = customers.find(c => c.id === firstSelectedId);
    
    if (previewCust) {
       return activeTemplateStr
          .replace(/\{\{name\}\}/g, previewCust.name)
          .replace(/\{\{amount\}\}/g, `₹${previewCust.outstandingBalance}`);
    }
    return activeTemplateStr;
  })();

  const preview = (() => {
    const t = displayMessageFromTemplate;
    // Fallback replacing remaining placeholders for preview if no user is selected
    return t.replace(/\{\{name\}\}/g, "[Customer Name]")
            .replace(/\{\{amount\}\}/g, "[Amount]");
  })();

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">WhatsApp CRM Outreach</h2>
        <p className="text-zinc-500 mt-1">Send personalized payment reminders and marketing campaigns.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Campaign Editor */}
        <div className="space-y-6">
           <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
             <h3 className="font-semibold text-lg mb-4">1. Select Template</h3>
             <select 
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:border-green-500"
                value={selectedTemplate}
                onChange={e => {
                  setSelectedTemplate(e.target.value);
                  setCustomMsg("");
                }}
             >
               <option value="">Start from scratch...</option>
               {templates.map(t => (
                 <option key={t.id} value={t.id}>{t.name}</option>
               ))}
             </select>

             <div className="mt-4">
               <label className="block text-sm font-medium text-zinc-400 mb-2">Message Body (placeholders: {"{{name}}, {{amount}}"})</label>
               <textarea 
                 value={displayMessageFromTemplate || activeTemplateStr || ""}
                 onChange={e => setCustomMsg(e.target.value)}
                 rows={4}
                 className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:border-green-500 resize-none"
                 placeholder="Type your message here..."
               />
             </div>
           </div>

           <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
             <h3 className="font-semibold text-lg mb-4">2. Message Preview</h3>
             <div className="relative max-w-sm mx-auto p-4 bg-[#EFE6DD] rounded-xl min-h-[100px] shadow-inner text-zinc-800 before:absolute before:w-4 before:h-4 before:bg-[#EFE6DD] before:-left-1 before:top-4 before:rotate-45">
               <p className="whitespace-pre-wrap font-sans text-[15px]">{preview}</p>
               <div className="text-[10px] text-zinc-500 text-right mt-2">10:42 AM</div>
             </div>
           </div>
        </div>

        {/* Recipient Selection */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col">
          <div className="flex justify-between items-end mb-4">
            <h3 className="font-semibold text-lg">3. Select Recipients</h3>
            <span className="text-sm text-zinc-400 font-medium">{selectedCustomers.size} selected</span>
          </div>

          <div className="flex-1 overflow-auto border border-zinc-800/50 rounded-xl bg-zinc-950 p-2 space-y-1 mb-6 max-h-96">
            {customers.map(c => (
              <label key={c.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-900 cursor-pointer transition-colors">
                <input 
                  type="checkbox" 
                  checked={selectedCustomers.has(c.id)}
                  onChange={() => toggleCustomer(c.id)}
                  className="w-5 h-5 rounded border-zinc-700 text-green-500 focus:ring-green-500 bg-zinc-800"
                />
                <div>
                  <div className="font-medium text-zinc-200">{c.name}</div>
                  <div className="text-xs text-zinc-500">{c.contactNumber} • Risk: {c.riskStatus}</div>
                </div>
              </label>
            ))}
          </div>

          {successMsg && <div className="p-3 mb-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium">{successMsg}</div>}

          <button 
            onClick={handleSend}
            disabled={loading || selectedCustomers.size === 0}
            className="w-full py-4 bg-[#25D366] hover:bg-[#1DA851] text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(37,211,102,0.3)] flex items-center justify-center gap-2"
          >
            {loading ? "Sending..." : "Send via WhatsApp"}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
