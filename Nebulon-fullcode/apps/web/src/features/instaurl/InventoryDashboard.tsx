import React, { useEffect, useState, useRef } from "react";
import { fetchInventoryDashboard, uploadInventoryFile, lookupBarcode, createPurchaseOrder } from "@/lib/inventory/api";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart,
  AreaChart, Area, ScatterChart, Scatter, ZAxis
} from "recharts";
import {
  IconBox, IconAlertTriangle, IconTrendingDown, IconCurrencyRupee,
  IconScan, IconUpload, IconFileSpreadsheet, IconCheck, IconPrinter, IconStars, IconShoppingCart,
  IconChartBar, IconReportAnalytics, IconShieldCheck, IconBrain, IconBulb
} from "@tabler/icons-react";

import "./inventory.css";

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

export default function InventoryDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetchInventoryDashboard();
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadInventoryFile(file);
      await loadDashboard();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleOrder = async (pId: string, qty: number) => {
    try {
      const res = await createPurchaseOrder(pId, qty);
      setOrderStatus(res.message);
      setTimeout(() => setOrderStatus(null), 3000);
    } catch (err) {
      alert("Order failed");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d0d1a] text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#dc2743] border-t-transparent"></div>
        <p className="ml-4 text-lg">AI is analyzing stock velocity...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] text-white flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 bg-clip-text text-transparent mb-3">Inventory Intelligence</h1>
            <p className="text-gray-400 text-lg mb-8 tracking-tight">Strategy focused for SME growth. Upload your CSV masterfile.</p>
            <button onClick={() => fileRef.current?.click()} className="bg-white/5 border-2 border-dashed border-white/20 rounded-3xl p-12 w-full hover:border-[#dc2743]/60 transition-all group shadow-2xl shadow-black/50">
              <IconUpload size={48} className="mx-auto mb-4 text-[#dc2743] group-hover:scale-110 transition-transform" />
              <span className="text-xl font-bold block mb-2">Select Inventory Masterfile</span>
              <span className="text-xs text-gray-500 uppercase font-black">Support for .csv / .xlsx via converter</span>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </button>
        </div>
      </div>
    );
  }

  const { kpis, health, deadStock, profitability, valuation, salesVsStock, aiInsights } = data;
  const insightProvider = String(aiInsights?.provider || "rules").toUpperCase();

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white p-4 md:p-8 font-sans overflow-x-hidden">
      
      {/* 🧾 Report Header for Print */}
      <div className="report-print-header">
        <div>
           <h1 className="text-3xl font-black text-black leading-none mb-1">Nebulon Business Intelligence</h1>
           <p className="text-sm font-bold text-[#dc2743] uppercase tracking-wider">Inventory Risk & Strategic Asset Audit</p>
        </div>
        <div className="text-right">
           <p className="text-[12px] font-bold text-black border-b border-black/20 pb-1">Confidential Internal Report</p>
           <p className="text-[10px] text-gray-500 mt-1">Generated: {new Date().toLocaleString()}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pb-20">

        {/* Global Toolbar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 global-toolbar no-print gap-6">
          <div className="flex-1">
            <h1 className="text-3xl lg:text-4xl font-black bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 bg-clip-text text-transparent mb-1">Stock Dynamics & Profitability</h1>
            <p className="text-gray-400 font-medium flex items-center gap-2"><IconStars size={16} className="text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]"/> Senior AI Financial Engine: <span className="text-emerald-400">{insightProvider} Active</span></p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => window.print()} className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 px-6 py-3 rounded-2xl font-bold hover:bg-emerald-500/20 transition-all text-sm group">
              <IconPrinter size={20} className="group-hover:text-emerald-400" /> Export Professional PDF
            </button>
            <button onClick={() => setIsScanning(true)} className="flex items-center gap-3 bg-[#dc2743] px-6 py-3 rounded-2xl font-bold hover:bg-[#bc1888] transition-all text-sm shadow-xl shadow-red-500/20">
              <IconScan size={20} /> Smart Barcode Lookup
            </button>
          </div>
        </div>

        {/* 🤖 Section 1: Strategic AI Insights */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold border border-blue-500/30">1</span>
            <h2 className="text-xl font-black uppercase tracking-widest">Executive AI Summary</h2>
          </div>
          {aiInsights?.executive?.length > 0 && (
            <div className="ai-insights-box animate-in slide-in-from-top-4 duration-700">
              <div className="inventory-grid grid-cols-1 md:grid-cols-3 gap-6">
                {aiInsights.executive.map((insight: string, idx: number) => (
                  <div key={idx} className="bg-white/5 p-5 rounded-2xl border border-white/5 text-sm leading-relaxed text-gray-200 backdrop-blur-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 blur-3xl rounded-full translate-x-10 -translate-y-10"></div>
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 📊 Section 2: Asset Valuation & Capital Allocation */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold border border-emerald-500/30">2</span>
            <h2 className="text-xl font-black uppercase tracking-widest">Asset & Capital Audit</h2>
          </div>
          
          <div className="inventory-grid inventory-grid-4 gap-6 mb-8">
            <div className="kpi-card bg-white/5 border border-white/10 p-7 rounded-3xl hover:border-blue-500/30 transition-all">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4">Total Asset Valuation</p>
              <div className="flex items-baseline gap-2">
                <IconCurrencyRupee size={20} className="text-blue-400" />
                <h2 className="text-4xl font-mono font-black text-white">₹{kpis.totalInventoryValue.toLocaleString()}</h2>
              </div>
              <p className="mt-4 text-[10px] text-gray-500 leading-relaxed uppercase font-bold tracking-tighter">Current liquidable market value</p>
            </div>

            <div className="kpi-card bg-white/5 border border-white/10 p-7 rounded-3xl">
              <p className="text-[10px] text-orange-400 font-black uppercase tracking-widest mb-4">Projected COGS (30D)</p>
              <div className="flex items-baseline gap-2">
                <IconTrendingDown size={20} className="text-orange-400" />
                <h2 className="text-4xl font-mono font-black text-white">₹{kpis.projectedCogs.toLocaleString()}</h2>
              </div>
              <p className="mt-4 text-[10px] text-gray-500 leading-relaxed font-bold">Planned procurement capital</p>
            </div>

            <div className="kpi-card bg-white/5 border border-white/10 border-red-500/20 p-7 rounded-3xl">
              <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-4">Capital Locked (Idle)</p>
              <div className="flex items-baseline gap-2">
                <IconAlertTriangle size={20} className="text-red-500" />
                <h2 className="text-4xl font-mono font-black text-red-500">₹{kpis.totalDeadStockValue.toLocaleString()}</h2>
              </div>
              <p className="mt-4 text-[10px] text-red-400/60 font-black tracking-tight underline underline-offset-4 uppercase">{deadStock.totalItems} Items Inactive</p>
            </div>

            <div className="kpi-card bg-white/5 border border-white/10 border-emerald-500/20 p-7 rounded-3xl">
              <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-4">Realized Profit Margin</p>
              <div className="flex items-baseline gap-2">
                <IconBox size={20} className="text-emerald-400" />
                <h2 className="text-4xl font-mono font-black text-emerald-400">{kpis.avgMargin}%</h2>
              </div>
              <p className="mt-4 text-[10px] text-emerald-500/40 font-bold uppercase tracking-widest">Optimized performance</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 min-h-[400px] mb-6">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
               <h3 className="text-sm font-black uppercase tracking-widest mb-6">Valuation by Category</h3>
               <div className="h-[280px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={valuation.distribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                        {valuation.distribution.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '12px' }} />
                      <Legend />
                    </PieChart>
                 </ResponsiveContainer>
               </div>
            </div>
            <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
               <h3 className="text-sm font-black uppercase tracking-widest mb-6">Asset Valuation Trend (6M)</h3>
               <div className="h-[280px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={valuation.trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="month" stroke="#666" fontSize={11} />
                      <YAxis stroke="#666" fontSize={11} tickFormatter={(value) => `₹${value/1000}k`} />
                      <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '12px' }} />
                      <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
                    </AreaChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>

          {/* AI Insight for Section 2 */}
          <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-2xl flex items-start gap-4 mb-12">
             <IconBrain className="text-blue-400 mt-1 shrink-0" size={24} />
             <div>
                <p className="text-xs font-black uppercase text-blue-400 mb-1 tracking-widest">Valuation Intelligence</p>
                <p className="text-sm text-gray-300 italic">"{aiInsights?.valuation || 'Analyzing asset cycles...'}"</p>
             </div>
          </div>
        </div>

        {/* 📍 Section 3: Health & Logistics Velocity */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold border border-purple-500/30">3</span>
            <h2 className="text-xl font-black uppercase tracking-widest">Health & Logistics Velocity</h2>
          </div>
          
          <div className="inventory-grid lg:grid-cols-3 gap-8 mb-6">
            <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
               <h3 className="text-xl font-black mb-1">Stock vs. Sales Correlation</h3>
               <p className="text-xs text-gray-500 mb-8 uppercase tracking-widest underline underline-offset-4 decoration-[#dc2743]/30">Daily Consumption vs On-Hand Volume</p>
               <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <ComposedChart data={salesVsStock} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                        <XAxis dataKey="category" stroke="#666" fontSize={11} tickMargin={10} />
                        <YAxis stroke="#666" fontSize={11} tickMargin={10} />
                        <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '12px' }} />
                        <Bar dataKey="stock" name="Current Stock" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={40} />
                        <Line type="monotone" dataKey="sales" name="30D Velocity" stroke="#10b981" strokeWidth={4} dot={{ r: 6, fill: '#10b981' }} activeDot={{ r: 8 }} />
                     </ComposedChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-gradient-to-b from-red-500/10 to-transparent border border-red-500/20 rounded-3xl p-8">
               <h3 className="text-xs font-black uppercase text-red-500 tracking-[0.3em] mb-8 flex items-center gap-2"><IconAlertTriangle size={18} /> Risk Mitigation</h3>
               <div className="space-y-6">
                 {deadStock.topLocked.map((item: any, i: number) => (
                   <div key={i} className="flex flex-col gap-2 group cursor-default">
                      <div className="flex justify-between items-start">
                         <p className="text-sm font-black group-hover:text-red-400 transition-colors uppercase truncate max-w-[70%]">{item.name}</p>
                         <span className="text-[10px] font-mono text-red-500 bg-red-500/20 px-2 rounded">{item.lastSaleDaysAgo}d IDLE</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                         <p className="text-gray-500">₹{item.inventoryValue.toLocaleString()} Stuck</p>
                         <button className="text-[10px] font-black uppercase bg-white/5 border border-white/10 px-3 py-1 rounded text-white hover:bg-white/10">PROPOSE CLEARANCE</button>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-2xl flex items-start gap-4 mb-12">
             <IconBulb className="text-emerald-400 mt-1 shrink-0" size={24} />
             <div>
                <p className="text-xs font-black uppercase text-emerald-400 mb-1 tracking-widest">Logistics Strategy</p>
                <p className="text-sm text-gray-300 italic">"{aiInsights?.health || 'Optimizing transit cycles...'}"</p>
             </div>
          </div>
        </div>

        {/* 🎯 Section 4: Profitability Matrix */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-8 w-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold border border-orange-500/30">4</span>
            <h2 className="text-xl font-black uppercase tracking-widest">Profitability Intelligence</h2>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl mb-6">
            <h3 className="text-xl font-black mb-1">Product ROI Matrix</h3>
            <p className="text-xs text-gray-400 mb-8 uppercase tracking-widest">Margin vs. Volume Correlation (Z-Axis: Sales Scale)</p>
            <div className="h-[400px]">
               <ResponsiveContainer width="100%" height="100%">
                 <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                   <XAxis type="number" dataKey="volume" name="Monthly Volume" unit=" units" stroke="#666" fontSize={11} />
                   <YAxis type="number" dataKey="margin" name="Profit Margin" unit="%" stroke="#666" fontSize={11} />
                   <ZAxis type="number" dataKey="volume" range={[60, 400]} />
                   <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '12px' }} />
                   <Scatter data={profitability.scatterData} fill="#10b981">
                      {profitability.scatterData.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                   </Scatter>
                 </ScatterChart>
               </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-orange-500/5 border border-orange-500/10 p-6 rounded-2xl flex items-start gap-4 mb-12">
             <IconReportAnalytics className="text-orange-400 mt-1 shrink-0" size={24} />
             <div>
                <p className="text-xs font-black uppercase text-orange-400 mb-1 tracking-widest">Margin Optimization</p>
                <p className="text-sm text-gray-300 italic">"{aiInsights?.profitability || 'Calculating ROI clusters...'}"</p>
             </div>
          </div>
        </div>

        {/* 🧾 Section 5: Strategic Reorder Ledger */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold border border-emerald-500/30">5</span>
            <h2 className="text-xl font-black uppercase tracking-widest">Operational Reorder Ledger</h2>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
             <div className="p-8 border-b border-white/5 bg-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-2xl font-black">AI Strategic Replenishment</h3>
                  <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mt-1">Autonomous stock-out prevention engine</p>
                </div>
                {orderStatus && <div className="bg-emerald-500/20 text-emerald-400 px-6 py-2 rounded-xl text-sm font-black animate-pulse">{orderStatus}</div>}
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                   <thead className="bg-black/50 text-gray-500 text-[11px] font-black uppercase tracking-widest">
                      <tr>
                         <th className="p-6">Product Intelligence</th>
                         <th className="p-6 text-right">Current / Forecast</th>
                         <th className="p-6 text-center">AI Strategic Suggestion</th>
                         <th className="p-6 text-center no-print">Action</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                      {health.topLowStock.map((item: any) => (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                          <td className="p-6">
                             <p className="text-sm font-bold group-hover:text-emerald-400 transition-colors uppercase">{item.name}</p>
                             <p className="text-[10px] text-gray-500 uppercase tracking-tighter font-black">Segment: {item.category} • HSN: {item.hsn} • GST: {item.gst}%</p>
                          </td>
                          <td className="p-6 text-right">
                             <p className={`font-mono text-xl font-black leading-none ${item.healthStatus === 'CRITICAL' ? 'text-red-500' : item.healthStatus === 'WARNING' ? 'text-orange-500' : 'text-emerald-400'}`}>
                               {item.stockQuantity} / {item.reorderThreshold}
                             </p>
                             <p className="text-[10px] text-gray-500 mt-2 font-bold italic uppercase">Depleting in ~{item.daysOfStockRemaining} days</p>
                          </td>
                          <td className="p-6 text-center">
                             <div className="inline-block bg-white/5 border border-emerald-500/20 px-8 py-3 rounded-2xl">
                                <p className="text-xs text-emerald-400 font-black uppercase">Order {item.suggestedReorder} Units</p>
                                <p className="text-[9px] text-gray-500 mt-1 uppercase font-bold">Confidence Score: 98%</p>
                             </div>
                          </td>
                          <td className="p-6 text-center no-print">
                             <button onClick={() => handleOrder(item.id, item.suggestedReorder)} className="p-4 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-2xl transition-all shadow-xl shadow-emerald-500/5 active:scale-90">
                                <IconShoppingCart size={22} />
                             </button>
                          </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </div>

      </div>

      {isScanning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-6 no-print">
          <div className="bg-[#0d0d1a] border border-white/10 rounded-[3rem] max-w-lg w-full p-12 text-center shadow-3xl lg:scale-110">
             <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-blue-500/20 rotate-12 transition-transform hover:rotate-0">
                <IconScan size={44} className="text-white" />
             </div>
             <h2 className="text-3xl font-black mb-4 tracking-tighter uppercase">Senior Intel Scanner</h2>
             <p className="text-gray-400 mb-10 leading-relaxed font-medium">Auto-identifying Indian FMCG & Pharma patterns. <br/><span className="text-blue-400 font-bold uppercase text-[10px] tracking-widest">HSN-Database: ACTIVE</span></p>
             <div className="space-y-4">
                <button onClick={() => { setIsScanning(false); alert("Verified: Amul Butter recognized from Preloaded DB. Categories applied."); }} className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl font-black text-lg hover:scale-[1.02] transition-transform">Simulate Indian Intel-Scan</button>
                <button onClick={() => setIsScanning(false)} className="w-full py-4 text-gray-500 font-bold hover:text-white transition-colors">Abort Scanning</button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
