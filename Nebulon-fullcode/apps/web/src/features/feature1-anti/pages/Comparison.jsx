import { useState, useEffect } from 'react';
import { BarChart3, Lightbulb, ArrowDown, TrendingDown, Award } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell,
} from 'recharts';
import { getSupplierComparison } from '../data/store';

const CHART_COLORS = ['#4EA896', '#2D5F5D', '#C5A03F', '#75C3B7', '#A3D7CF', '#D4A843', '#1E3F3D'];

export default function Comparison() {
  const [comparisons, setComparisons] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [aiSummary, setAiSummary] = useState('');
  const [aiProvider, setAiProvider] = useState('rules');
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    setComparisons(getSupplierComparison());
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchAiInsights = async () => {
      if (!comparisons.length) {
        setAiInsights([]);
        setAiSummary('');
        setAiProvider('rules');
        return;
      }

      setLoadingAi(true);
      try {
        const response = await fetch('/api/suppliers/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comparisons }),
        });
        const result = await response.json();

        if (!cancelled && response.ok && result?.success) {
          setAiInsights(Array.isArray(result.insights) ? result.insights : []);
          setAiSummary(typeof result.summary === 'string' ? result.summary : '');
          setAiProvider(result.provider || 'rules');
          return;
        }
      } catch {
        // Fallback below keeps existing behavior when API is unavailable.
      }

      if (!cancelled) {
        const fallbackInsights = comparisons.flatMap((c) => c.insights || []);
        setAiInsights(fallbackInsights);
        setAiSummary('Using local supplier insight rules. Start server with GROQ_API_KEY for AI responses.');
        setAiProvider('rules');
      }
    };

    fetchAiInsights().finally(() => {
      if (!cancelled) setLoadingAi(false);
    });

    return () => {
      cancelled = true;
    };
  }, [comparisons]);

  const allInsights = aiInsights.length ? aiInsights : comparisons.flatMap((c) => c.insights || []);
  const totalSavings = allInsights.reduce((s, i) => s + i.savings, 0);

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-[#E8EDE5] flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-[#4EA896]" />
          Supplier Comparison
        </h1>
        <p className="text-sm text-[#5A706E] mt-1">AI-powered insights for smarter purchasing decisions</p>
        <p className="text-xs text-[#5A706E] mt-2">
          Insight source: <span className="font-semibold text-[#4EA896] uppercase">{aiProvider}</span>
          {loadingAi ? ' (refreshing...)' : ''}
        </p>
        {aiSummary && <p className="text-xs text-[#5A706E] mt-1">{aiSummary}</p>}
      </div>

      {/* Savings Summary Banner */}
      {totalSavings > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#C5A03F]/15 via-[#C5A03F]/5 to-[#2D5F5D]/10 border border-[#C5A03F]/30">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#C5A03F]/20 flex items-center justify-center shrink-0">
                <Lightbulb className="w-6 h-6 text-[#C5A03F]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#E8EDE5]">Potential Monthly Savings</h2>
                <p className="text-3xl font-extrabold text-[#C5A03F] mt-1">₹{totalSavings.toLocaleString()}/month</p>
                <p className="text-sm text-[#8FA9A6] mt-2">
                  By switching to the best-priced suppliers across {comparisons.length} items, you could save ₹{(totalSavings * 12).toLocaleString()} annually.
                </p>
              </div>
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-[#C5A03F]/5 rounded-full blur-3xl pointer-events-none"></div>
        </div>
      )}

      {/* Smart Insights */}
      {allInsights.length > 0 && (
        <div className="bg-[#0F1E1D] border border-[#2A4A48] rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#E8EDE5] flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-[#C5A03F]" /> Smart Cost Savings
          </h2>
          <div className="space-y-3">
            {allInsights.map((insight, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.03] border border-[#2A4A48]/40 hover:border-[#C5A03F]/40 transition"
              >
                <div className="w-8 h-8 rounded-lg bg-[#C5A03F]/15 flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowDown className="w-4 h-4 text-[#C5A03F]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#E8EDE5]">{insight.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="px-2.5 py-1 bg-[#C5A03F]/15 text-[#C5A03F] text-xs font-bold rounded-full">
                      Save ₹{insight.savings.toLocaleString()}/mo
                    </span>
                    <span className="text-xs text-[#5A706E]">
                      Switch: {insight.from} → {insight.to}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison Tables */}
      {comparisons.map((comp) => {
        const chartData = comp.suppliers.map((s) => ({
          name: s.supplierName.split(' ')[0],
          avgPrice: s.avgPrice,
          latestPrice: s.latestPrice,
        }));

        return (
          <div key={comp.itemName} className="bg-[#0F1E1D] border border-[#2A4A48] rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#2A4A48]/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-[#E8EDE5]">{comp.itemName}</h3>
                <span className="text-xs text-[#5A706E]">({comp.unit})</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#C5A03F]" />
                <span className="text-xs text-[#C5A03F] font-semibold">Best: {comp.bestSupplier} @ ₹{comp.bestPrice}/{comp.unit}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2A4A48]/40 bg-white/[0.02]">
                      <th className="text-left py-3 px-5 text-xs text-[#5A706E] uppercase">Supplier</th>
                      <th className="text-right py-3 px-5 text-xs text-[#5A706E] uppercase">Avg Price</th>
                      <th className="text-right py-3 px-5 text-xs text-[#5A706E] uppercase">Latest Price</th>
                      <th className="text-right py-3 px-5 text-xs text-[#5A706E] uppercase">Total Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comp.suppliers.map((s, i) => (
                      <tr key={s.supplierId} className="border-b border-[#2A4A48]/20 hover:bg-white/[0.02] transition">
                        <td className="py-3 px-5 font-medium text-[#E8EDE5] flex items-center gap-2">
                          {s.avgPrice === comp.bestPrice && <Award className="w-3.5 h-3.5 text-[#C5A03F]" />}
                          {s.supplierName}
                        </td>
                        <td className={`py-3 px-5 text-right font-semibold ${s.avgPrice === comp.bestPrice ? 'text-[#C5A03F]' : 'text-[#8FA9A6]'}`}>
                          ₹{s.avgPrice}/{comp.unit}
                        </td>
                        <td className="py-3 px-5 text-right text-[#5A706E]">₹{s.latestPrice}/{comp.unit}</td>
                        <td className="py-3 px-5 text-right text-[#5A706E]">{s.totalQty} {comp.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Chart */}
              <div className="p-4 border-l border-[#2A4A48]/40 flex items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A4A48" />
                    <XAxis dataKey="name" stroke="#5A706E" fontSize={11} />
                    <YAxis stroke="#5A706E" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F1E1D', border: '1px solid #2A4A48', borderRadius: '12px', color: '#E8EDE5' }}
                      formatter={(v) => [`₹${v}`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="avgPrice" name="Avg Price" radius={[6, 6, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );
      })}

      {comparisons.length === 0 && (
        <div className="bg-[#0F1E1D] border border-[#2A4A48] rounded-xl shadow-sm p-12 text-center">
          <BarChart3 className="w-12 h-12 text-[#5A706E] mx-auto mb-3" />
          <p className="text-[#8FA9A6]">No items with multiple suppliers found.</p>
          <p className="text-sm text-[#5A706E] mt-1">Purchase the same item from different suppliers to see comparisons.</p>
        </div>
      )}
    </div>
  );
}
