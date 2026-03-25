import { useState, useEffect, useMemo } from 'react';
import {
  Search, Plus, ChevronLeft, ChevronRight, Phone, MapPin, X, Check,
} from 'lucide-react';
import { getSuppliers, addSupplier, getSupplierStats, deleteSupplier } from '../data/store';

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', creditTerms: 'Net 30' });
  const [error, setError] = useState('');
  const perPage = 10;

  const refresh = () => setSuppliers(getSuppliers());

  useEffect(() => { refresh(); }, []);

  const enriched = useMemo(() =>
    suppliers.map((s) => ({ ...s, stats: getSupplierStats(s.id) })),
    [suppliers]
  );

  const filtered = useMemo(() =>
    enriched.filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search) ||
      s.address?.toLowerCase().includes(search.toLowerCase())
    ), [enriched, search]
  );

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    try {
      addSupplier(form);
      setForm({ name: '', phone: '', address: '', creditTerms: 'Net 30' });
      setShowModal(false);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      deleteSupplier(id);
      refresh();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Suppliers</h1>
          <p className="text-sm text-gray-400 mt-1">{suppliers.length} suppliers registered</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-teal-900/30 transition-all hover:shadow-teal-800/50 hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" /> Add Supplier
        </button>
      </div>

      {/* Search */}
      <div className="bg-[#111113] border border-zinc-800 rounded-xl shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name, phone, or address..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-gray-800/60 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-600/50 focus:ring-1 focus:ring-teal-600/20 transition"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111113] border border-zinc-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800/60 bg-white/[0.02]">
                <th className="text-left py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="text-left py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Contact</th>
                <th className="text-center py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Credit Terms</th>
                <th className="text-right py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Spent</th>
                <th className="text-right py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding</th>
                <th className="text-center py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((s) => (
                <tr key={s.id} className="border-b border-gray-800/30 hover:bg-white/[0.02] transition group">
                  <td className="py-3.5 px-5">
                    <a href={`/anti/suppliers/${encodeURIComponent(String(s.id))}`} className="font-medium text-gray-200 hover:text-teal-300 transition">
                      {s.name}
                    </a>
                  </td>
                  <td className="py-3.5 px-5 hidden md:table-cell">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-gray-400 flex items-center gap-1.5"><Phone className="w-3 h-3" />{s.phone}</span>
                      <span className="text-gray-500 flex items-center gap-1.5 text-xs"><MapPin className="w-3 h-3" />{s.address}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-center">
                    <span className="px-2.5 py-1 bg-teal-500/15 text-teal-300 text-xs font-semibold rounded-full">
                      {s.creditTerms}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right font-semibold text-gray-300">
                    ₹{s.stats.totalSpent.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <span className={`font-semibold ${s.stats.outstanding > 0 ? 'text-warning-400' : 'text-accent-400'}`}>
                      ₹{s.stats.outstanding.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <a
                        href={`/anti/suppliers/${encodeURIComponent(String(s.id))}`}
                        className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-gray-700/50 rounded-lg text-gray-300 transition"
                      >
                        View
                      </a>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="px-3 py-1.5 text-xs bg-danger-500/10 hover:bg-danger-500/20 border border-danger-800/30 rounded-lg text-danger-400 transition opacity-0 group-hover:opacity-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    {search ? 'No suppliers match your search.' : 'No suppliers yet. Add your first one!'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-800/40">
            <span className="text-xs text-gray-500">
              Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 disabled:opacity-30 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                    page === i + 1
                      ? 'bg-teal-600 text-white'
                      : 'hover:bg-white/5 text-gray-400'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 disabled:opacity-30 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Supplier Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-[#111113] border border-zinc-800 rounded-xl shadow-sm p-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Add Supplier</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            {error && (
              <div className="mb-4 p-3 bg-danger-500/15 border border-danger-800/40 rounded-xl text-sm text-danger-400">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Supplier Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-gray-800/60 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-600/50 transition"
                  placeholder="e.g. Sharma Traders"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-gray-800/60 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-600/50 transition"
                  placeholder="e.g. 9876543210"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Address</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-gray-800/60 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-600/50 transition"
                  placeholder="e.g. 12, Main Market, Delhi"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Credit Terms</label>
                <select
                  value={form.creditTerms}
                  onChange={(e) => setForm({ ...form, creditTerms: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-gray-800/60 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-teal-600/50 transition"
                >
                  <option value="Net 7" className="bg-surface-900">Net 7</option>
                  <option value="Net 15" className="bg-surface-900">Net 15</option>
                  <option value="Net 30" className="bg-surface-900">Net 30</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white text-sm font-semibold rounded-xl shadow-lg transition-all hover:-translate-y-0.5"
              >
                <Check className="w-4 h-4" /> Create Supplier
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

