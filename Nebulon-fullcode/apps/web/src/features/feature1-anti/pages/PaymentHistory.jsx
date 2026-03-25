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
      headStyles: { fillColor: [45, 95, 93] },
    });
    doc.save('payment_history.pdf');
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#E8EDE5] flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-[#C5A03F]" />
            Payment History
          </h1>
          <p className="text-sm text-[#5A706E] mt-1">{filtered.length} transactions · Total: ₹{totalAmount.toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-[#C5A03F]/15 text-[#C5A03F] hover:bg-[#C5A03F]/25 border border-[#C5A03F]/30 text-sm font-medium rounded-xl transition"
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-[#D94F4F]/15 text-[#E06060] hover:bg-[#D94F4F]/25 border border-[#D94F4F]/30 text-sm font-medium rounded-xl transition"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#0F1E1D] border border-[#2A4A48] rounded-xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A706E]" />
            <input
              type="text"
              placeholder="Search by supplier, method, or amount..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-[#2A4A48]/60 rounded-xl text-sm text-[#E8EDE5] placeholder-[#5A706E] focus:outline-none focus:border-[#2D5F5D]/50 transition"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5A706E]" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="pl-9 pr-3 py-2.5 bg-white/5 border border-[#2A4A48]/60 rounded-xl text-sm text-[#E8EDE5] focus:outline-none focus:border-[#2D5F5D]/50 transition"
              />
            </div>
            <span className="text-[#5A706E]">to</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5A706E]" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="pl-9 pr-3 py-2.5 bg-white/5 border border-[#2A4A48]/60 rounded-xl text-sm text-[#E8EDE5] focus:outline-none focus:border-[#2D5F5D]/50 transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0F1E1D] border border-[#2A4A48] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A4A48]/60 bg-white/[0.02]">
                <th className="text-left py-3.5 px-5 text-xs font-semibold text-[#5A706E] uppercase tracking-wider">Supplier Name</th>
                <th className="text-left py-3.5 px-5 text-xs font-semibold text-[#5A706E] uppercase tracking-wider">Date</th>
                <th className="text-right py-3.5 px-5 text-xs font-semibold text-[#5A706E] uppercase tracking-wider">Amount Paid</th>
                <th className="text-center py-3.5 px-5 text-xs font-semibold text-[#5A706E] uppercase tracking-wider">Method</th>
                <th className="text-left py-3.5 px-5 text-xs font-semibold text-[#5A706E] uppercase tracking-wider hidden sm:table-cell">Invoice Ref</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => (
                <tr key={p.id} className="border-b border-[#2A4A48]/30 hover:bg-white/[0.02] transition">
                  <td className="py-3.5 px-5 font-medium text-[#E8EDE5]">{p.supplierName}</td>
                  <td className="py-3.5 px-5 text-[#8FA9A6]">{p.date}</td>
                  <td className="py-3.5 px-5 text-right font-semibold text-[#C5A03F]">₹{p.amount.toLocaleString()}</td>
                  <td className="py-3.5 px-5 text-center">
                    <span className="px-2.5 py-1 bg-white/5 text-[#8FA9A6] text-xs rounded-full">{p.method}</span>
                  </td>
                  <td className="py-3.5 px-5 text-[#5A706E] text-xs font-mono hidden sm:table-cell">{p.invoiceRef || '—'}</td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#5A706E]">No payments found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#2A4A48]/40">
            <span className="text-xs text-[#5A706E]">
              Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-white/5 text-[#8FA9A6] disabled:opacity-30 transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 rounded-lg text-xs font-medium transition ${page === i + 1 ? 'bg-[#2D5F5D] text-white' : 'hover:bg-white/5 text-[#8FA9A6]'}`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-white/5 text-[#8FA9A6] disabled:opacity-30 transition">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
