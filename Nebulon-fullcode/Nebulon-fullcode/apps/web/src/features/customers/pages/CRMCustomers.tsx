import { useEffect, useState } from "react";
import { fetchCustomers, addCustomer, fetchCustomer } from "@/lib/api-crm";

type RiskFilter = "All" | "Green" | "Amber" | "Red";
type OutstandingFilter = "All" | "Has Outstanding" | "No Outstanding";
type SortMode = "name-asc" | "outstanding-desc" | "outstanding-asc";

export default function CRMCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Pagination & Search State
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("All");
  const [outstandingFilter, setOutstandingFilter] = useState<OutstandingFilter>("All");
  const [sortMode, setSortMode] = useState<SortMode>("outstanding-desc");
  const itemsPerPage = 8;

  // Profile View State
  const [viewCustomerId, setViewCustomerId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<{customer: any, transactions: any[]}>({ customer: null, transactions: [] });
  const [loadingProfile, setLoadingProfile] = useState(false);

  const loadData = () => {
    setLoading(true);
    fetchCustomers()
      .then((data) => setCustomers(data.customers || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newContact) return;
    
    setIsSaving(true);
    setErrorMsg("");
    try {
      await addCustomer({ name: newName, contactNumber: newContact, initialPurchase: parseFloat(newAmount) || 0 });
      setIsModalOpen(false);
      setNewName("");
      setNewContact("");
      setNewAmount("");
      loadData();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to add customer.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewProfile = async (id: string) => {
    setViewCustomerId(id);
    setLoadingProfile(true);
    try {
      const data = await fetchCustomer(id);
      setProfileData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const exportCsv = () => {
    const rows = filteredCustomers.map((c) => ({
      name: c.name,
      contactNumber: c.contactNumber,
      outstandingBalance: c.outstandingBalance,
      creditLimit: c.creditLimit,
      riskStatus: c.riskStatus,
    }));
    const header = "Name,Contact Number,Outstanding Balance,Credit Limit,Risk Status";
    const body = rows
      .map((r) =>
        [r.name, r.contactNumber, r.outstandingBalance, r.creditLimit, r.riskStatus]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const csv = `${header}\n${body}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "customers.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // Compute Pagination
  const filteredCustomers = customers
    .filter((c) => {
      const name = String(c.name || "").toLowerCase();
      const contact = String(c.contactNumber || "");
      const matchesSearch =
        name.includes(searchTerm.toLowerCase()) || contact.includes(searchTerm);
      const matchesRisk = riskFilter === "All" || c.riskStatus === riskFilter;
      const hasOutstanding = Number(c.outstandingBalance || 0) > 0;
      const matchesOutstanding =
        outstandingFilter === "All" ||
        (outstandingFilter === "Has Outstanding" && hasOutstanding) ||
        (outstandingFilter === "No Outstanding" && !hasOutstanding);
      return matchesSearch && matchesRisk && matchesOutstanding;
    })
    .sort((a, b) => {
      if (sortMode === "name-asc") {
        return String(a.name || "").localeCompare(String(b.name || ""));
      }
      const aOut = Number(a.outstandingBalance || 0);
      const bOut = Number(b.outstandingBalance || 0);
      return sortMode === "outstanding-asc" ? aOut - bOut : bOut - aOut;
    });
  
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const currentCustomers = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalOutstanding = customers.reduce(
    (sum, c) => sum + Number(c.outstandingBalance || 0),
    0,
  );
  const withOutstandingCount = customers.filter(
    (c) => Number(c.outstandingBalance || 0) > 0,
  ).length;
  const redRiskCount = customers.filter((c) => c.riskStatus === "Red").length;
  const greenRiskCount = customers.filter((c) => c.riskStatus === "Green").length;

  // Profile Modal Pagination
  const [profilePage, setProfilePage] = useState(1);
  const profileItemsPerPage = 5;
  const totalProfilePages = Math.ceil(profileData.transactions.length / profileItemsPerPage) || 1;
  const currentProfileTransactions = profileData.transactions.slice((profilePage - 1) * profileItemsPerPage, profilePage * profileItemsPerPage);

  // Reset page on search change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, riskFilter, outstandingFilter, sortMode]);
  // Reset profile page when viewing new profile
  useEffect(() => { setProfilePage(1); }, [viewCustomerId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <header>
          <h2 className="text-3xl font-bold tracking-tight">Customers Profiles</h2>
          <p className="text-zinc-500 mt-1">Manage all your contacts and view their credit standing.</p>
        </header>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-lg transition-colors"
          >
            Export CSV
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-teal-500/20"
          >
            + Add Customer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase">Total Customers</p>
          <p className="text-2xl font-bold mt-1">{customers.length}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase">Total Outstanding</p>
          <p className="text-2xl font-bold mt-1 text-orange-400">₹{totalOutstanding}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase">Need Collection</p>
          <p className="text-2xl font-bold mt-1 text-amber-400">{withOutstandingCount}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase">Risk Mix</p>
          <p className="text-sm mt-2 text-zinc-300">Red: <span className="text-red-400 font-semibold">{redRiskCount}</span> • Green: <span className="text-emerald-400 font-semibold">{greenRiskCount}</span></p>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-4 border-b border-zinc-800 flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
          <input 
            type="text" 
            placeholder="Search customers by name or contact..." 
            className="w-full max-w-sm px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 focus:outline-none focus:border-teal-500 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as RiskFilter)}
            >
              <option value="All">All Risk</option>
              <option value="Green">Green</option>
              <option value="Amber">Amber</option>
              <option value="Red">Red</option>
            </select>
            <select
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300"
              value={outstandingFilter}
              onChange={(e) => setOutstandingFilter(e.target.value as OutstandingFilter)}
            >
              <option value="All">All Balances</option>
              <option value="Has Outstanding">Has Outstanding</option>
              <option value="No Outstanding">No Outstanding</option>
            </select>
            <select
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
            >
              <option value="outstanding-desc">Sort: Outstanding High-Low</option>
              <option value="outstanding-asc">Sort: Outstanding Low-High</option>
              <option value="name-asc">Sort: Name A-Z</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-zinc-500 animate-pulse">Loading customers...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-900/80 text-zinc-400 text-sm">
                <tr>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Contact Number</th>
                  <th className="px-6 py-4 font-medium">Debt / Credit Limit</th>
                  <th className="px-6 py-4 font-medium">Risk Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {currentCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-6 py-4 font-medium text-zinc-200">{c.name}</td>
                    <td className="px-6 py-4 text-zinc-400">{c.contactNumber}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={`font-semibold ${c.outstandingBalance > 0 ? 'text-orange-400' : 'text-zinc-300'}`}>
                          ₹{c.outstandingBalance}
                        </span>
                        <span className="text-xs text-zinc-600">Limit: ₹{c.creditLimit}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`px-3 py-1 rounded-full text-xs font-medium border
                        ${c.riskStatus === 'Green' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                          c.riskStatus === 'Amber' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                          'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {c.riskStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                         onClick={() => handleViewProfile(c.id)}
                         className="text-sm font-medium text-teal-400 hover:text-teal-300 px-3 py-1 rounded-md bg-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
                {currentCustomers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">No customers found matching your search.</td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/40">
              <span className="text-sm text-zinc-500">
                Showing <span className="font-medium text-zinc-300">{filteredCustomers.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-medium text-zinc-300">{Math.min(currentPage * itemsPerPage, filteredCustomers.length)}</span> of <span className="font-medium text-zinc-300">{filteredCustomers.length}</span> results
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:hover:bg-zinc-800 rounded-md transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button 
                      key={i} 
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 flex items-center justify-center text-sm rounded-md transition-colors ${currentPage === i + 1 ? 'bg-teal-600/20 text-teal-400 font-medium border border-teal-500/30' : 'text-zinc-500 hover:bg-zinc-800'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:hover:bg-zinc-800 rounded-md transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-[#111113] border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Add New Customer</h3>
            {errorMsg && <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">{errorMsg}</div>}
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Name</label>
                <input required value={newName} onChange={e => setNewName(e.target.value)} type="text" className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200" placeholder="E.g. Ramesh" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Contact Number</label>
                <input required value={newContact} onChange={e => setNewContact(e.target.value)} type="text" className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200" placeholder="+91..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Initial Purchase Amount (Optional)</label>
                <input value={newAmount} onChange={e => setNewAmount(e.target.value)} type="number" className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200" placeholder="0.00" />
              </div>
              
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
                  {isSaving ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewCustomerId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-[#111113] border border-zinc-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col">
            {loadingProfile || !profileData.customer ? (
              <div className="p-12 text-center text-zinc-500 animate-pulse">Loading Profile...</div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-6 border-b border-zinc-800 pb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-zinc-100">{profileData.customer.name}</h3>
                    <p className="text-zinc-500">{profileData.customer.contactNumber}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-zinc-500">Outstanding Balance</div>
                    <div className={`text-2xl font-bold ${profileData.customer.outstandingBalance > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                      ₹{profileData.customer.outstandingBalance}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                  <h4 className="font-semibold text-zinc-300">Recent Transactions</h4>
                  {profileData.transactions.length === 0 ? (
                    <div className="text-zinc-500 text-sm">No transactions recorded yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {currentProfileTransactions.map((t: any) => (
                        <div key={t.id} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 flex justify-between items-center">
                          <div>
                            <div className="font-medium text-zinc-200">{t.notes || t.type}</div>
                            <div className="text-xs text-zinc-500">{new Date(t.date).toLocaleDateString()}</div>
                          </div>
                          <div className={`font-bold ${t.type === 'CREDIT' ? 'text-orange-400' : 'text-emerald-400'}`}>
                            {t.type === 'CREDIT' ? '+' : '-'}₹{t.amount}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {totalProfilePages > 1 && (
                    <div className="flex justify-between items-center pt-2">
                      <button onClick={() => setProfilePage(p => Math.max(1, p - 1))} disabled={profilePage === 1} className="text-xs text-zinc-400 disabled:opacity-50">Prev</button>
                      <span className="text-xs text-zinc-600">Page {profilePage} of {totalProfilePages}</span>
                      <button onClick={() => setProfilePage(p => Math.min(totalProfilePages, p + 1))} disabled={profilePage === totalProfilePages} className="text-xs text-zinc-400 disabled:opacity-50">Next</button>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end">
                  <button onClick={() => setViewCustomerId(null)} className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors">
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
