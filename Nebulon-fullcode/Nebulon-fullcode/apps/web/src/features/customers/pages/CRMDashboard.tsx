import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Settings2, CalendarDays, AlertTriangle } from "lucide-react";

import { fetchDashboard } from "@/lib/api-crm";

export default function CRMDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState<number>(7);
  const [chartType, setChartType] = useState<"Trend" | "Customer">("Trend");

  useEffect(() => {
    setLoading(true);
    fetchDashboard(daysFilter)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [daysFilter]);

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-32 bg-zinc-900 rounded-xl w-full"></div>
      <div className="h-64 bg-zinc-900 rounded-xl w-full"></div>
    </div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
          <p className="text-zinc-500 mt-1">Monitor your credit ledger and risk metrics.</p>
        </div>
        <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
          <button 
            onClick={() => setDaysFilter(7)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${daysFilter === 7 ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            7 Days
          </button>
          <button 
            onClick={() => setDaysFilter(30)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${daysFilter === 30 ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            30 Days
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Credit Given" value={`₹${data?.totalCredit || 0}`}  trend="+2.5%" trendUp={true} />
        <StatCard title="Overdue Payments" value={`₹${data?.overduePayments || 0}`} trend="-1.2%" trendUp={false} isAlert />
        <StatCard title="At-Risk Customers" value={data?.atRiskCount || 0} subtitle="Potential churn" trend="Need attention" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dynamic Chart (spans 2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 backdrop-blur-md flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">
              {chartType === "Trend" ? `Credit vs Payments (${daysFilter} Days)` : "Top Customer Outstanding"}
            </h3>
            <div className="flex gap-2">
              <button onClick={() => setChartType("Trend")} className={`p-2 rounded-md ${chartType === "Trend" ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <CalendarDays className="w-4 h-4" />
              </button>
              <button onClick={() => setChartType("Customer")} className={`p-2 rounded-md ${chartType === "Customer" ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="h-72 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "Trend" ? (
                <AreaChart data={data?.trendData || []}>
                  <defs>
                    <linearGradient id="colorGiven" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#52525b" tick={{fill: '#a1a1aa', fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis stroke="#52525b" tick={{fill: '#a1a1aa', fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} domain={[0, (dataMax: number) => Math.max(dataMax, 100)]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.5rem' }}
                    itemStyle={{ color: '#e4e4e7' }}
                    formatter={(value: any) => [`₹${value}`, undefined]}
                  />
                  <Area type="monotone" dataKey="given" name="Credit Given" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorGiven)" />
                  <Area type="monotone" dataKey="received" name="Payments Recv." stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorReceived)" />
                </AreaChart>
              ) : (
                <BarChart data={data?.customerChartData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#52525b" tick={{fill: '#a1a1aa', fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis stroke="#52525b" tick={{fill: '#a1a1aa', fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} domain={[0, (dataMax: number) => Math.max(dataMax, 100)]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.5rem' }}
                    itemStyle={{ color: '#e4e4e7' }}
                    cursor={{fill: '#27272a', opacity: 0.4}}
                    formatter={(value: any) => [`₹${value}`, undefined]}
                  />
                  <Bar dataKey="outstanding" name="Outstanding Balance" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Pie Chart */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 backdrop-blur-md flex flex-col items-center justify-center">
          <h3 className="text-xl font-semibold w-full mb-2">Risk Distribution</h3>
          {(!data?.riskDistribution || data.riskDistribution.length === 0) ? (
             <div className="text-zinc-500 flex-1 flex items-center justify-center text-sm">No risk data available</div>
          ) : (
            <>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.riskDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {data.riskDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.5rem' }}
                      itemStyle={{ color: '#e4e4e7' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                 {data.riskDistribution.map((entry: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-zinc-400 font-medium whitespace-nowrap">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }}></div>
                      {entry.name.split(" ")[0]}: {entry.value}
                    </div>
                 ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top Customers Leaderboard */}
      <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="text-xl font-semibold">Top Customers</h3>
          <Link to="/customers/customers" className="text-sm text-teal-400 hover:text-teal-300 transition-colors">View All &rarr;</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-900/80 text-zinc-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Customer Info</th>
                <th className="px-6 py-4 font-medium">Total Spend</th>
                <th className="px-6 py-4 font-medium">Outstanding</th>
                <th className="px-6 py-4 font-medium">Risk Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {data?.topCustomers?.map((c: any) => (
                <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors group cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="font-medium text-zinc-200">{c.name}</div>
                    <div className="text-xs text-zinc-500 mt-1">{c.contactNumber}</div>
                  </td>
                  <td className="px-6 py-4 text-zinc-300">₹{c.totalPurchases}</td>
                  <td className="px-6 py-4 font-medium text-zinc-300">
                    {c.outstandingBalance > 0 ? `₹${c.outstandingBalance}` : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <RiskBadge status={c.riskStatus} />
                  </td>
                </tr>
              ))}
              {(!data?.topCustomers || data.topCustomers.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">No customers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, subtitle, trend, trendUp, isAlert }: any) {
  return (
    <div className={`p-6 rounded-2xl border backdrop-blur-md transition-all hover:scale-[1.02] ${isAlert ? 'bg-red-950/20 border-red-900/30' : 'bg-zinc-900/40 border-zinc-800'}`}>
      <h3 className="text-sm font-medium text-zinc-400">{title}</h3>
      <div className={`text-4xl font-bold mt-2 tracking-tight ${isAlert ? 'text-red-400' : 'text-zinc-100'}`}>{value}</div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-zinc-500">{subtitle}</span>
        {trend && (
          <span className={`px-2 py-1 rounded-md text-xs font-semibold ${trendUp ? 'bg-emerald-500/10 text-emerald-400' : isAlert ? 'bg-red-500/10 text-red-400' : 'bg-orange-500/10 text-orange-400'}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

function RiskBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Amber: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    Red: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[status] || "bg-zinc-800 text-zinc-400"}`}>
      {status}
    </span>
  );
}
