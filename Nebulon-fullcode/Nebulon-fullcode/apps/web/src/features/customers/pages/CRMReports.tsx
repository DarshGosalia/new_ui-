import { useEffect, useState } from "react";
import { API_BASE, fetchCustomers } from "@/lib/api-crm";
import { Download, FileText, Receipt, FileSpreadsheet } from "lucide-react";

export default function CRMReports() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Invoice Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [invCustomer, setInvCustomer] = useState("");
  const [invDesc, setInvDesc] = useState("Services Rendered");
  const [invAmount, setInvAmount] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchCustomers()
      .then((data) => setCustomers(data.customers || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadStatement = (customerId: string) => {
    window.location.href = `${API_BASE}/reports/statement/${customerId}`;
  };

  const handleExport = (format: "csv" | "excel" | "pdf") => {
    window.location.href = `${API_BASE}/reports/export/${format}`;
  };

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invCustomer || !invAmount) return;

    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/reports/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: invCustomer,
          amount: parseFloat(invAmount),
          items: [{ name: invDesc, price: parseFloat(invAmount) }]
        })
      });

      if (!res.ok) throw new Error("Failed to generate invoice");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invCustomer}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      setIsModalOpen(false);
      setInvAmount("");
      setInvCustomer("");
    } catch (err) {
      console.error(err);
      alert("Error generating invoice PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Statements & Reports</h2>
        <p className="text-zinc-500 mt-1">Export transaction histories and generate GST invoices.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-8 rounded-2xl bg-gradient-to-br from-teal-500/10 to-purple-500/10 border border-teal-500/20 backdrop-blur-md">
           <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center mb-6 border border-teal-500/30">
             <FileText className="w-6 h-6 text-teal-400" />
           </div>
           <h3 className="text-xl font-bold mb-2">Customer Statements</h3>
           <p className="text-zinc-400 text-sm mb-6">Generate full page PDF statements showing all transactions and current outstanding balance for a specific customer.</p>
           
           <div className="space-y-3">
             {loading ? <div className="animate-pulse h-10 bg-zinc-800 rounded"></div> : (
               <select className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:border-teal-500" onChange={(e) => {
                 if(e.target.value) handleDownloadStatement(e.target.value);
               }}>
                 <option value="">Select customer to download...</option>
                 {customers.map(c => <option key={c.id} value={c.id}>{c.name} - Bal: ₹{c.outstandingBalance}</option>)}
               </select>
             )}
           </div>
        </div>

        <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 backdrop-blur-md relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-32 h-32 bg-emerald-500/20 blur-3xl group-hover:bg-emerald-500/30 transition-all rounded-full"></div>
           
           <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-6 border border-emerald-500/30">
             <Receipt className="w-6 h-6 text-emerald-400" />
           </div>
           <h3 className="text-xl font-bold mb-2">GST Invoicing</h3>
           <p className="text-zinc-400 text-sm mb-6">Create compliant GST invoices with breakdown of CGST/SGST. Ideal for B2B clients or larger bulk purchases.</p>
           
           <button 
             onClick={() => setIsModalOpen(true)}
             className="w-full py-3 px-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-medium rounded-xl border border-emerald-500/30 transition-all text-left flex justify-between items-center"
           >
             <span>+ Generate New Invoice</span>
             <span>&rarr;</span>
           </button>
        </div>

        {/* New Database Export Card */}
        <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 backdrop-blur-md relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-32 h-32 bg-emerald-500/20 blur-3xl group-hover:bg-emerald-500/30 transition-all rounded-full"></div>
           
           <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-6 border border-emerald-500/30">
             <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
           </div>
           <h3 className="text-xl font-bold mb-2">Export Database</h3>
           <p className="text-zinc-400 text-sm mb-6">Download your entire raw transactional ledger natively for accounting or backup purposes.</p>
           
           <div className="flex flex-col gap-3">
             <button onClick={() => handleExport("csv")} className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium rounded-xl border border-zinc-700 transition-all flex justify-center items-center gap-2">
               Download as CSV <Download className="w-4 h-4" />
             </button>
             <button onClick={() => handleExport("excel")} className="w-full py-2.5 px-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-medium rounded-xl border border-emerald-500/30 transition-all flex justify-center items-center gap-2">
               Download as Excel <Download className="w-4 h-4" />
             </button>
             <button onClick={() => handleExport("pdf")} className="w-full py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-medium rounded-xl border border-rose-500/30 transition-all flex justify-center items-center gap-2">
               Download as PDF <Download className="w-4 h-4" />
             </button>
           </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-[#111113] border border-emerald-900/40 rounded-2xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none"></div>
            <h3 className="text-xl font-bold mb-4 text-emerald-400">Generate GST Invoice</h3>
            
            <form onSubmit={handleGenerateInvoice} className="space-y-4 relative z-10">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Customer</label>
                <select required value={invCustomer} onChange={e => setInvCustomer(e.target.value)} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200">
                  <option value="">Select customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Description / Item</label>
                <input required value={invDesc} onChange={e => setInvDesc(e.target.value)} type="text" className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200" placeholder="Product / Service" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Total Amount (₹)</label>
                <input required value={invAmount} onChange={e => setInvAmount(e.target.value)} type="number" className="w-full px-4 py-3 bg-emerald-950/20 border border-emerald-900/50 rounded-xl text-emerald-200 placeholder:text-emerald-900/40" placeholder="0.00" />
              </div>
              
              <div className="flex gap-3 justify-end mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={isGenerating} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-emerald-600/20">
                  {isGenerating ? "Downloading..." : "Create & Download PDF"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
