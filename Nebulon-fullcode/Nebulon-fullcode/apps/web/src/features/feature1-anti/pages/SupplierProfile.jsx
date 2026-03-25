import { useState, useEffect } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import {
  ArrowLeft, Phone, MapPin, CreditCard, TrendingUp, Package, Plus, X, Check, Edit2,
} from 'lucide-react';
import {
  getSupplier, getSupplierStats, getPurchasesBySupplier, getPaymentsBySupplier,
  addPurchase, addPayment, updateSupplier,
} from '../data/store';

export default function SupplierProfile() {
  const { id } = useParams({ from: '/anti/suppliers/$id' });
  const [supplier, setSupplier] = useState(null);
  const [stats, setStats] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tab, setTab] = useState('purchases');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [expandedPurchase, setExpandedPurchase] = useState(null);
  const [purchaseForm, setPurchaseForm] = useState({ items: [{ name: '', quantity: '', pricePerUnit: '', unit: 'kg' }] });
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'UPI', invoiceRef: '' });
  const [editForm, setEditForm] = useState({ name: '', phone: '', address: '', creditTerms: '' });

  const refresh = () => {
    const s = getSupplier(id);
    setSupplier(s);
    if (s) {
      setStats(getSupplierStats(id));
      setPurchases(getPurchasesBySupplier(id).sort((a, b) => new Date(b.date) - new Date(a.date)));
      setPayments(getPaymentsBySupplier(id).sort((a, b) => new Date(b.date) - new Date(a.date)));
    }
  };

  useEffect(() => { refresh(); }, [id]);

  const handleAddPurchaseItem = () => {
    setPurchaseForm({
      ...purchaseForm,
      items: [...purchaseForm.items, { name: '', quantity: '', pricePerUnit: '', unit: 'kg' }],
    });
  };

  const handlePurchaseItemChange = (idx, field, value) => {
    const items = [...purchaseForm.items];
    items[idx] = { ...items[idx], [field]: value };
    setPurchaseForm({ ...purchaseForm, items });
  };

  const handleRemovePurchaseItem = (idx) => {
    const items = purchaseForm.items.filter((_, i) => i !== idx);
    setPurchaseForm({ ...purchaseForm, items: items.length ? items : [{ name: '', quantity: '', pricePerUnit: '', unit: 'kg' }] });
  };

  const handlePurchaseSubmit = (e) => {
    e.preventDefault();
    const items = purchaseForm.items.map((i) => ({
      name: i.name,
      quantity: Number(i.quantity),
      pricePerUnit: Number(i.pricePerUnit),
      unit: i.unit,
    })).filter((i) => i.name && i.quantity && i.pricePerUnit);
    if (!items.length) return;
    addPurchase({ supplierId: id, items });
    setPurchaseForm({ items: [{ name: '', quantity: '', pricePerUnit: '', unit: 'kg' }] });
    setShowPurchaseModal(false);
    refresh();
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    addPayment({
      supplierId: id,
      amount: Number(paymentForm.amount),
      method: paymentForm.method,
      invoiceRef: paymentForm.invoiceRef || undefined,
    });
    setPaymentForm({ amount: '', method: 'UPI', invoiceRef: '' });
    setShowPaymentModal(false);
    refresh();
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateSupplier(id, editForm);
    setShowEditModal(false);
    refresh();
  };

  const openEdit = () => {
    setEditForm({ name: supplier.name, phone: supplier.phone, address: supplier.address, creditTerms: supplier.creditTerms });
    setShowEditModal(true);
  };

  if (!supplier) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-500">Supplier not found.</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Back Link */}
      <Link to="/anti/suppliers" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-teal-300 transition">
        <ArrowLeft className="w-4 h-4" /> Back to Suppliers
      </Link>

      {/* Profile Header */}
      <div className="bg-[#111113] border border-zinc-800 rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-xl font-bold text-white shadow-lg shrink-0">
              {supplier.name[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{supplier.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-400">
                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{supplier.phone}</span>
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{supplier.address}</span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="px-2.5 py-1 bg-teal-500/15 text-teal-300 text-xs font-semibold rounded-full">{supplier.creditTerms}</span>
                <span className="text-xs text-gray-500">Since {supplier.createdAt}</span>
              </div>
            </div>
          </div>
          <button
            onClick={openEdit}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-gray-700/50 rounded-xl text-sm text-gray-300 transition"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Spent', value: `₹${stats?.totalSpent.toLocaleString()}`, color: 'text-teal-300' },
          { label: 'Total Paid', value: `₹${stats?.totalPaid.toLocaleString()}`, color: 'text-accent-400' },
          { label: 'Outstanding', value: `₹${stats?.outstanding.toLocaleString()}`, color: stats?.outstanding > 0 ? 'text-warning-400' : 'text-accent-400' },
          { label: 'Purchases', value: stats?.purchaseCount, color: 'text-gray-200' },
        ].map((item) => (
          <div key={item.label} className="bg-[#111113] border border-zinc-800 rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{item.label}</p>
            <p className={`text-xl font-bold mt-1 ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.03] rounded-xl border border-gray-800/40 w-fit">
        {['purchases', 'payments'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition ${
              tab === t ? 'bg-teal-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Purchase History */}
      {tab === 'purchases' && (
        <div className="bg-[#111113] border border-zinc-800 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/40">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-teal-400" /> Purchase History
            </h2>
            <button
              onClick={() => setShowPurchaseModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white text-xs font-semibold rounded-lg shadow transition-all hover:-translate-y-0.5"
            >
              <Plus className="w-3.5 h-3.5" /> New Purchase
            </button>
          </div>
          <div className="divide-y divide-gray-800/30">
            {purchases.map((p) => (
              <div key={p.id}>
                <button
                  onClick={() => setExpandedPurchase(expandedPurchase === p.id ? null : p.id)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${p.status === 'paid' ? 'bg-accent-400' : 'bg-warning-400'}`}></span>
                    <span className="text-sm text-gray-300">{p.date}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-gray-200">₹{p.total.toLocaleString()}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${p.status === 'paid' ? 'bg-accent-500/15 text-accent-400' : 'bg-warning-500/15 text-warning-400'}`}>
                      {p.status}
                    </span>
                  </div>
                </button>
                {expandedPurchase === p.id && (
                  <div className="px-5 pb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800/40">
                          <th className="text-left py-2 px-3 text-xs text-gray-500">Item</th>
                          <th className="text-right py-2 px-3 text-xs text-gray-500">Qty</th>
                          <th className="text-right py-2 px-3 text-xs text-gray-500">Price/Unit</th>
                          <th className="text-right py-2 px-3 text-xs text-gray-500">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.items.map((item, i) => (
                          <tr key={i} className="border-b border-gray-800/20">
                            <td className="py-2 px-3 text-gray-300">{item.name}</td>
                            <td className="py-2 px-3 text-right text-gray-400">{item.quantity} {item.unit}</td>
                            <td className="py-2 px-3 text-right text-gray-400">₹{item.pricePerUnit}</td>
                            <td className="py-2 px-3 text-right font-medium text-gray-200">₹{(item.quantity * item.pricePerUnit).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
            {purchases.length === 0 && (
              <div className="py-12 text-center text-gray-500">No purchases recorded yet.</div>
            )}
          </div>
        </div>
      )}

      {/* Payment History */}
      {tab === 'payments' && (
        <div className="bg-[#111113] border border-zinc-800 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/40">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-accent-400" /> Payment History
            </h2>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-accent-500 to-emerald-700 hover:from-accent-400 hover:to-emerald-600 text-white text-xs font-semibold rounded-lg shadow transition-all hover:-translate-y-0.5"
            >
              <Plus className="w-3.5 h-3.5" /> Record Payment
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800/40 bg-white/[0.02]">
                <th className="text-left py-3 px-5 text-xs text-gray-500 uppercase">Date</th>
                <th className="text-right py-3 px-5 text-xs text-gray-500 uppercase">Amount</th>
                <th className="text-center py-3 px-5 text-xs text-gray-500 uppercase">Method</th>
                <th className="text-left py-3 px-5 text-xs text-gray-500 uppercase hidden sm:table-cell">Invoice Ref</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((pay) => (
                <tr key={pay.id} className="border-b border-gray-800/20 hover:bg-white/[0.02] transition">
                  <td className="py-3 px-5 text-gray-300">{pay.date}</td>
                  <td className="py-3 px-5 text-right font-semibold text-accent-400">₹{pay.amount.toLocaleString()}</td>
                  <td className="py-3 px-5 text-center">
                    <span className="px-2.5 py-1 bg-white/5 text-gray-300 text-xs rounded-full">{pay.method}</span>
                  </td>
                  <td className="py-3 px-5 text-gray-500 text-xs hidden sm:table-cell">{pay.invoiceRef || '—'}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={4} className="py-12 text-center text-gray-500">No payments recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowPurchaseModal(false)} />
          <div className="relative w-full max-w-lg bg-[#111113] border border-zinc-800 rounded-xl shadow-sm p-6 animate-fade-in-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Add Purchase</h3>
              <button onClick={() => setShowPurchaseModal(false)} className="text-gray-400 hover:text-white p-1"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handlePurchaseSubmit} className="space-y-4">
              {purchaseForm.items.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-white/[0.03] border border-gray-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400">Item {idx + 1}</span>
                    {purchaseForm.items.length > 1 && (
                      <button type="button" onClick={() => handleRemovePurchaseItem(idx)} className="text-danger-400 hover:text-danger-300 text-xs">Remove</button>
                    )}
                  </div>
                  <input placeholder="Item name" value={item.name} onChange={(e) => handlePurchaseItemChange(idx, 'name', e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-gray-800/60 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-600/50" />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => handlePurchaseItemChange(idx, 'quantity', e.target.value)} className="px-3 py-2 bg-white/5 border border-gray-800/60 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-600/50" />
                    <input type="number" placeholder="Price/unit" value={item.pricePerUnit} onChange={(e) => handlePurchaseItemChange(idx, 'pricePerUnit', e.target.value)} className="px-3 py-2 bg-white/5 border border-gray-800/60 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-600/50" />
                    <select value={item.unit} onChange={(e) => handlePurchaseItemChange(idx, 'unit', e.target.value)} className="px-3 py-2 bg-white/5 border border-gray-800/60 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-teal-600/50">
                      <option value="kg" className="bg-surface-900">kg</option>
                      <option value="litre" className="bg-surface-900">litre</option>
                      <option value="piece" className="bg-surface-900">piece</option>
                      <option value="pack" className="bg-surface-900">pack</option>
                    </select>
                  </div>
                </div>
              ))}
              <button type="button" onClick={handleAddPurchaseItem} className="w-full py-2 border border-dashed border-gray-700 rounded-xl text-sm text-gray-400 hover:text-teal-300 hover:border-teal-700 transition">
                + Add another item
              </button>
              <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 text-white text-sm font-semibold rounded-xl shadow transition-all hover:-translate-y-0.5">
                <Check className="w-4 h-4 inline mr-1" /> Save Purchase
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)} />
          <div className="relative w-full max-w-md bg-[#111113] border border-zinc-800 rounded-xl shadow-sm p-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Record Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-white p-1"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Amount *</label>
                <input required type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="w-full px-4 py-2.5 bg-white/5 border border-gray-800/60 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-teal-600/50" placeholder="e.g. 15000" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Payment Method</label>
                <select value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })} className="w-full px-4 py-2.5 bg-white/5 border border-gray-800/60 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-teal-600/50">
                  <option value="UPI" className="bg-surface-900">UPI</option>
                  <option value="Bank Transfer" className="bg-surface-900">Bank Transfer</option>
                  <option value="Cash" className="bg-surface-900">Cash</option>
                  <option value="Cheque" className="bg-surface-900">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Invoice Reference (optional)</label>
                <select value={paymentForm.invoiceRef} onChange={(e) => setPaymentForm({ ...paymentForm, invoiceRef: e.target.value })} className="w-full px-4 py-2.5 bg-white/5 border border-gray-800/60 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-teal-600/50">
                  <option value="" className="bg-surface-900">None</option>
                  {purchases.filter((p) => p.status === 'pending').map((p) => (
                    <option key={p.id} value={p.id} className="bg-surface-900">{p.date} — ₹{p.total.toLocaleString()}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-accent-500 to-emerald-700 text-white text-sm font-semibold rounded-xl shadow transition-all hover:-translate-y-0.5">
                <Check className="w-4 h-4 inline mr-1" /> Record Payment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="relative w-full max-w-md bg-[#111113] border border-zinc-800 rounded-xl shadow-sm p-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Edit Supplier</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white p-1"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Name</label>
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-4 py-2.5 bg-white/5 border border-gray-800/60 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-teal-600/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Phone</label>
                <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-4 py-2.5 bg-white/5 border border-gray-800/60 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-teal-600/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Address</label>
                <input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="w-full px-4 py-2.5 bg-white/5 border border-gray-800/60 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-teal-600/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Credit Terms</label>
                <select value={editForm.creditTerms} onChange={(e) => setEditForm({ ...editForm, creditTerms: e.target.value })} className="w-full px-4 py-2.5 bg-white/5 border border-gray-800/60 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-teal-600/50">
                  <option value="Net 7" className="bg-surface-900">Net 7</option>
                  <option value="Net 15" className="bg-surface-900">Net 15</option>
                  <option value="Net 30" className="bg-surface-900">Net 30</option>
                </select>
              </div>
              <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 text-white text-sm font-semibold rounded-xl shadow transition-all hover:-translate-y-0.5">
                <Check className="w-4 h-4 inline mr-1" /> Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

