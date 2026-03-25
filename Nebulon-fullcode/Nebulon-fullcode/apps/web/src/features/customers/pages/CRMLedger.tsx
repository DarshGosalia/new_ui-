import { useEffect, useState, useRef } from "react";
import {
  addTransaction,
  fetchCustomers,
  fetchDashboard,
  fetchLedger,
  uploadBatch,
  uploadStatement,
} from "@/lib/api-crm";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { toast } from "sonner";
import * as XLSX from "xlsx";

function parseCsvRows(csvText: string): Record<string, string>[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? "";
      return acc;
    }, {});
  });
}

export default function CRMLedger() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const totalPages = Math.ceil(transactions.length / itemsPerPage) || 1;
  const currentTransactions = transactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"CREDIT" | "PAYMENT">("CREDIT");
  const [notes, setNotes] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Import Preview State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [fullParsedData, setFullParsedData] = useState<any[]>([]);

  const loadData = () => {
    setLoading(true);
    Promise.all([fetchLedger(), fetchCustomers(), fetchDashboard(30)])
      .then(([ledgerData, custData, dashData]) => {
        setTransactions(ledgerData.transactions || []);
        setCustomers(custData.customers || []);
        setDashboardData(dashData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !amount) return;

    try {
      await addTransaction({
        customerId: selectedCustomer,
        type,
        amount: parseFloat(amount),
        notes,
      });
      
      // Reset and reload (No redirect)
      setAmount("");
      setNotes("");
      toast.success(type === "CREDIT" ? "Credit recorded successfully!" : "Payment received successfully!");
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to record transaction.");
    }
  };

  const processExtractedRecords = (records: any[]) => {
    // Standardize the shape for backend
    const standardized = records.map(row => {
      const getValStartsWith = (keys: string[]) => {
        const foundKey = Object.keys(row).find(k => keys.some(match => k.toLowerCase().includes(match)));
        return foundKey ? row[foundKey] : undefined;
      };

      const dateStr = getValStartsWith(["date", "txn", "value"]) || new Date().toISOString();
      const name = getValStartsWith(["name", "description", "narration", "particulars", "party"]);
      const contact = getValStartsWith(["contact", "phone", "mobile"]);
      const debitStr = getValStartsWith(["debit", "withdrawal"]);
      const creditStr = getValStartsWith(["credit", "deposit"]);
      let amountStr = getValStartsWith(["amount", "value"]);
      let typeStr = getValStartsWith(["type"]);

      let amt = 0;
      let type: "CREDIT" | "PAYMENT" = "CREDIT";

      if (debitStr && parseFloat(debitStr) > 0) {
        amt = parseFloat(debitStr);
        type = "CREDIT";
      } else if (creditStr && parseFloat(creditStr) > 0) {
        amt = parseFloat(creditStr);
        type = "PAYMENT";
      } else if (amountStr) {
        amt = parseFloat(amountStr);
        type = typeStr && typeStr.toLowerCase().includes("payment") ? "PAYMENT" : "CREDIT";
      }

      return {
        name: name?.trim(),
        contact: contact?.toString().trim(),
        amount: amt,
        type,
        date: dateStr
      };
    }).filter(r => r.name && !isNaN(r.amount) && r.amount > 0);

    setFullParsedData(standardized);
    setPreviewData(standardized.slice(0, 5));
    setShowPreviewModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.pdf')) {
      // PDF Parsing must be done on backend due to pdf-parse library limitations
      setUploading(true);
      try {
        const res = await uploadStatement(file);
        toast.success(`Imported ${res.importedCount} transactions seamlessly.`);
        loadData();
      } catch (err) {
        console.error(err);
        toast.error("Failed to upload PDF statement.");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      return;
    }

    // CSV & Excel handled locally
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      if (file.name.toLowerCase().endsWith('.csv')) {
        try {
          processExtractedRecords(parseCsvRows((bstr as string) || ""));
        } catch {
          toast.error("Failed to parse CSV client-side.");
        }
      } else {
        // XLSX
        try {
          const pb = XLSX.read(bstr, { type: 'binary' });
          const wsname = pb.SheetNames[0];
          const ws = pb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          processExtractedRecords(data);
        } catch (err) {
          toast.error("Failed to parse Excel file.");
        }
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    if (file.name.toLowerCase().endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const confirmBatchImport = async () => {
    setUploading(true);
    try {
      const res = await uploadBatch(fullParsedData);
      toast.success(`Batch imported ${res.importedCount} records securely.`);
      setShowPreviewModal(false);
      loadData();
    } catch (err) {
      toast.error("Batch import failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Credit Ledger</h2>
          <p className="text-zinc-500 mt-1">Record Udhaar (credit) and received payments.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <input type="file" accept=".csv,.xlsx,.xls,.pdf" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
           <button 
             disabled={uploading}
             onClick={() => fileInputRef.current?.click()}
             className="px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 font-medium rounded-lg transition-colors flex items-center gap-2"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
             {uploading ? "Uploading..." : "Import CSV/Excel/PDF Statement"}
           </button>
        </div>
      </header>

      {/* Ledger Visualizations */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
         <h3 className="text-xl font-semibold mb-4">Ledger Timeline (30 Days)</h3>
         <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={dashboardData?.trendData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#52525b" tick={{fill: '#a1a1aa', fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis stroke="#52525b" tick={{fill: '#a1a1aa', fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} domain={[0, (dataMax: number) => Math.max(dataMax, 100)]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.5rem' }}
                    itemStyle={{ color: '#e4e4e7' }}
                    cursor={{fill: '#27272a', opacity: 0.4}}
                    formatter={(value: any) => [`₹${value}`, undefined]}
                  />
                  <Bar dataKey="given" name="Credit Given" fill="#f97316" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="received" name="Payments Recv." fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
               </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Transaction Form Engine */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm sticky top-8">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <span className="text-teal-400">✦</span> New Transaction
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Customer</label>
                <select 
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  value={selectedCustomer}
                  onChange={e => setSelectedCustomer(e.target.value)}
                  required
                >
                  <option value="">Select customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.contactNumber})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setType("CREDIT")}
                  className={`py-3 rounded-xl font-medium transition-all ${
                    type === "CREDIT" 
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.15)]" 
                      : "bg-zinc-950 text-zinc-500 border border-zinc-800 hover:bg-zinc-900"
                  }`}
                >
                  Give Credit
                </button>
                <button
                  type="button"
                  onClick={() => setType("PAYMENT")}
                  className={`py-3 rounded-xl font-medium transition-all ${
                    type === "PAYMENT" 
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
                      : "bg-zinc-950 text-zinc-500 border border-zinc-800 hover:bg-zinc-900"
                  }`}
                >
                  Payment Received
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Amount (₹)</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 text-lg font-medium focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all placeholder:font-normal placeholder:text-zinc-600"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Notes</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:border-teal-500 transition-colors"
                  placeholder="E.g. Groceries"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-4 mt-6 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 active:translate-y-0"
              >
                Record {type === "CREDIT" ? "Credit" : "Payment"}
              </button>
            </div>
          </form>
        </div>

        {/* Ledger History List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            Recent Transactions
          </h3>
          
          {loading ? (
             <div className="animate-pulse space-y-4">
               {[...Array(4)].map((_, i) => (
                 <div key={i} className="h-24 bg-zinc-900/50 rounded-2xl w-full border border-zinc-800/50"></div>
               ))}
             </div>
          ) : (
            <div className="space-y-4">
              {currentTransactions.map(t => {
                const customer = customers.find(c => c.id === t.customerId);
                const isCredit = t.type === "CREDIT";
                
                return (
                  <div key={t.id} className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between hover:bg-zinc-800/40 transition-colors group">
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                        isCredit ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      }`}>
                        {isCredit ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-lg text-zinc-100 group-hover:text-white transition-colors">
                          {customer?.name || "Unknown"}
                        </div>
                        <div className="text-sm text-zinc-500 mt-0.5 flex items-center gap-2">
                          <span>{new Date(t.date).toLocaleDateString()}</span>
                          <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                          <span>{t.notes || t.type}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-xl font-bold tracking-tight ${isCredit ? 'text-orange-400' : 'text-emerald-400'}`}>
                        {isCredit ? '+' : '-'}₹{t.amount}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        Bal: ₹{t.runningBalance}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {transactions.length > 0 && totalPages > 1 && (
                <div className="flex justify-between items-center px-2 py-4 border-t border-zinc-800">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-md transition-colors">Previous</button>
                  <span className="text-sm text-zinc-500">Page {currentPage} of {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-md transition-colors">Next</button>
                </div>
              )}
              
              {transactions.length === 0 && (
                <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                  No transactions yet. Start by giving credit or receiving a payment.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Data Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                  Data Preview ({fullParsedData.length} records detected)
                </h3>
                <p className="text-sm text-zinc-500 mt-1">Reviewing first 5 rows before finalizing import.</p>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-zinc-400 border-b border-zinc-800">
                    <th className="pb-3 font-semibold text-zinc-300">Date</th>
                    <th className="pb-3 font-semibold text-zinc-300">Name</th>
                    <th className="pb-3 font-semibold text-zinc-300">Amount (₹)</th>
                    <th className="pb-3 font-semibold text-zinc-300">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {previewData.map((row, i) => (
                    <tr key={i} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="py-3 text-zinc-400">{new Date(row.date).toLocaleDateString()}</td>
                      <td className="py-3 font-medium text-zinc-200">{row.name}</td>
                      <td className="py-3 font-medium text-white">₹{row.amount}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${row.type === 'CREDIT' ? 'bg-orange-500/10 text-orange-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {row.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {fullParsedData.length > 5 && (
                <div className="text-center text-zinc-500 mt-4 text-sm">
                  + {fullParsedData.length - 5} more records hidden...
                </div>
              )}
            </div>
            <div className="p-6 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-950/50">
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="px-5 py-2.5 rounded-xl font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                disabled={uploading}
              >
                Cancel
              </button>
              <button 
                onClick={confirmBatchImport}
                disabled={uploading}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Processing...
                  </>
                ) : (
                  `Confirm Import (${fullParsedData.length})`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
