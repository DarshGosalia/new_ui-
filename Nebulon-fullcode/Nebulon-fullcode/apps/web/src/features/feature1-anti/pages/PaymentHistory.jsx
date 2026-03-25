import { useState, useEffect, useMemo } from 'react';
import {
  Search, Download, CreditCard, ChevronLeft, ChevronRight, Calendar,
} from 'lucide-react';
import { getPayments, getSupplier } from '../data/store';
import ExcelJS from 'exceljs';

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 15;

  useEffect(() => {
    const all = getPayments().map((p) => ({
      ...p,
      supplierName: getSupplier(p.supplierId)?.name || 'Unknown',
    })).sort((a, b) => new Date(b.date) - new Date(a.date));
    setPayments(all);
  }, []);

  const filtered = useMemo(() =>
    payments.filter((p) => {
      const matchesSearch = !search ||
        p.supplierName.toLowerCase().includes(search.toLowerCase()) ||
        p.method.toLowerCase().includes(search.toLowerCase()) ||
        p.amount.toString().includes(search);
      const matchesFrom = !dateFrom || p.date >= dateFrom;
      const matchesTo = !dateTo || p.date <= dateTo;
      return matchesSearch && matchesFrom && matchesTo;
    }), [payments, search, dateFrom, dateTo]
  );

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalAmount = filtered.reduce((s, p) => s + p.amount, 0);

  const exportExcel = async () => {
    const data = filtered.map((p) => ({
      'Supplier Name': p.supplierName,
      'Date': p.date,
      'Amount Paid': p.amount,
      'Payment Method': p.method,
      'Invoice Reference': p.invoiceRef || '—',
    }));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Payment History');
    const headers = Object.keys(data[0] || {
      'Supplier Name': '',
      'Date': '',
      'Amount Paid': '',
      'Payment Method': '',
      'Invoice Reference': '',
    });

    sheet.addRow(headers);
    data.forEach((row) => {
      sheet.addRow(headers.map((header) => row[header]));
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payment_history.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Payment History Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 28);
    autoTable(doc, {
      startY: 35,
      head: [['Supplier', 'Date', 'Amount', 'Method', 'Invoice Ref']],
      body: filtered.map((p) => [
        p.supplierName,
        p.date,
        `₹${p.amount.toLocaleString()}`,
        p.method,
        p.invoiceRef || '—',
      ]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
    });
    doc.save('payment_history.pdf');
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-accent-400" />
            Payment History
          </h1>
          <p className="text-sm text-gray-400 mt-1">{filtered.length} transactions · Total: ₹{totalAmount.toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-accent-500/15 text-accent-400 hover:bg-accent-500/25 border border-accent-800/30 text-sm font-medium rounded-xl transition"
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-danger-500/15 text-danger-400 hover:bg-danger-500/25 border border-danger-800/30 text-sm font-medium rounded-xl transition"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#111113] border border-zinc-800 rounded-xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by supplier, method, or amount..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-gray-800/60 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-600/50 transition"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="pl-9 pr-3 py-2.5 bg-white/5 border border-gray-800/60 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-teal-600/50 transition"
              />
            </div>
            <span className="text-gray-600">to</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="pl-9 pr-3 py-2.5 bg-white/5 border border-gray-800/60 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-teal-600/50 transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111113] border border-zinc-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800/60 bg-white/[0.02]">
                <th className="text-left py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier Name</th>
                <th className="text-left py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-right py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount Paid</th>
                <th className="text-center py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Method</th>
                <th className="text-left py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Invoice Ref</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => (
                <tr key={p.id} className="border-b border-gray-800/30 hover:bg-white/[0.02] transition">
                  <td className="py-3.5 px-5 font-medium text-gray-200">{p.supplierName}</td>
                  <td className="py-3.5 px-5 text-gray-400">{p.date}</td>
                  <td className="py-3.5 px-5 text-right font-semibold text-accent-400">₹{p.amount.toLocaleString()}</td>
                  <td className="py-3.5 px-5 text-center">
                    <span className="px-2.5 py-1 bg-white/5 text-gray-300 text-xs rounded-full">{p.method}</span>
                  </td>
                  <td className="py-3.5 px-5 text-gray-500 text-xs font-mono hidden sm:table-cell">{p.invoiceRef || '—'}</td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">No payments found.</td>
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
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 disabled:opacity-30 transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 rounded-lg text-xs font-medium transition ${page === i + 1 ? 'bg-teal-600 text-white' : 'hover:bg-white/5 text-gray-400'}`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 disabled:opacity-30 transition">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

