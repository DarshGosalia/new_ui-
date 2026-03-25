import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Clock,
  AlertCircle,
  Users,
  ArrowUpRight,
  Bell,
  X,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import { getDashboardStats, getAlerts, markAlertRead, getPurchases } from '../data/store';

const COLORS = ['#4EA896', '#2D5F5D', '#C5A03F', '#75C3B7', '#A3D7CF'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setStats(getDashboardStats());
    setAlerts(getAlerts().filter((a) => !a.read).slice(0, 10));
  }, [refreshKey]);

  const handleDismissAlert = (id) => {
    markAlertRead(id);
    setRefreshKey((k) => k + 1);
  };

  if (!stats) return null;

  const metricCards = [
    { label: 'Total Payables', value: `₹${stats.totalPayables.toLocaleString()}`, icon: DollarSign, color: 'from-[#2D5F5D] to-[#1E3F3D]', textColor: 'text-[#4EA896]' },
    { label: 'Upcoming Payments', value: stats.upcomingPayments, icon: Clock, color: 'from-[#C5A03F] to-[#A3882E]', textColor: 'text-[#C5A03F]' },
    { label: 'Overdue Payments', value: stats.overduePayments, icon: AlertCircle, color: 'from-[#D94F4F] to-[#A83B3B]', textColor: 'text-[#E06060]' },
    { label: 'Total Suppliers', value: stats.supplierCount, icon: Users, color: 'from-[#C5A03F] to-[#2D5F5D]', textColor: 'text-[#C5A03F]' },
  ];

  const topSuppliersChart = stats.topSuppliers.map((s) => ({
    name: s.name?.split(' ')[0] || 'Unknown',
    spend: s.totalSpent,
  }));

  const pieData = stats.topSuppliers.map((s) => ({
    name: s.name,
    value: s.totalSpent,
  }));

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-[#E8EDE5]">Dashboard</h1>
        <p className="text-sm text-[#5A706E] mt-1">Supplier intelligence at a glance</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metricCards.map((card, i) => (
          <div
            key={card.label}
            className="bg-[#0F1E1D] border border-[#2A4A48] rounded-xl shadow-sm hover:border-[#4EA896]/50 hover:bg-[#1E3533]/50 transition-all p-5 animate-fade-in-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#5A706E] uppercase tracking-wider">{card.label}</p>
                <p className={`text-2xl font-bold mt-2 ${card.textColor}`}>{card.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Price Change Alerts */}
      {alerts.length > 0 && (
        <div className="bg-[#0F1E1D] border border-[#2A4A48] rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#C5A03F]/20 flex items-center justify-center">
              <Bell className="w-4 h-4 text-[#C5A03F]" />
            </div>
            <h2 className="text-lg font-semibold text-[#E8EDE5]">Price Change Alerts</h2>
            <span className="ml-2 px-2 py-0.5 bg-[#C5A03F]/20 text-[#C5A03F] text-xs font-bold rounded-full">
              {alerts.length}
            </span>
          </div>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-[#2A4A48]/40 hover:border-[#C5A03F]/40 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#D94F4F]/15 flex items-center justify-center shrink-0 mt-0.5">
                  <TrendingUp className="w-4 h-4 text-[#E06060]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#E8EDE5]">{alert.message}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-[#5A706E]">{alert.date}</span>
                    <span className="text-xs px-2 py-0.5 bg-[#D94F4F]/15 text-[#E06060] rounded-full font-medium">
                      +₹{alert.diff}/{alert.unit}
                    </span>
                    <span className="text-xs text-[#5A706E]">
                      ₹{alert.oldPrice} → ₹{alert.newPrice}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDismissAlert(alert.id)}
                  className="text-[#5A706E] hover:text-[#E8EDE5] p-1 rounded-lg hover:bg-white/5 transition opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Top Suppliers */}
        <div className="bg-[#0F1E1D] border border-[#2A4A48] rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#E8EDE5] mb-4">Top Suppliers by Spend</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSuppliersChart} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A4A48" />
                <XAxis dataKey="name" stroke="#5A706E" fontSize={12} />
                <YAxis stroke="#5A706E" fontSize={12} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F1E1D', border: '1px solid #2A4A48', borderRadius: '12px', color: '#E8EDE5' }}
                  formatter={(v) => [`₹${v.toLocaleString()}`, 'Spend']}
                />
                <Bar dataKey="spend" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4EA896" />
                    <stop offset="100%" stopColor="#2D5F5D" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart - Spend Distribution */}
        <div className="bg-[#0F1E1D] border border-[#2A4A48] rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#E8EDE5] mb-4">Spend Distribution</h2>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F1E1D', border: '1px solid #2A4A48', borderRadius: '12px', color: '#E8EDE5' }}
                  formatter={(v) => [`₹${v.toLocaleString()}`, 'Spend']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {pieData.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <span className="text-xs text-[#8FA9A6]">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Suppliers Table */}
      <div className="bg-[#0F1E1D] border border-[#2A4A48] rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#E8EDE5]">Top Suppliers</h2>
          <Link
            to="/anti/suppliers"
            className="flex items-center gap-1 text-xs text-[#4EA896] hover:text-[#75C3B7] font-medium transition"
          >
            View All <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A4A48]/60">
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#5A706E] uppercase tracking-wider">Supplier</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-[#5A706E] uppercase tracking-wider">Total Spend</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-[#5A706E] uppercase tracking-wider hidden sm:table-cell">Rank</th>
              </tr>
            </thead>
            <tbody>
              {stats.topSuppliers.map((s, i) => (
                <tr key={s.id} className="border-b border-[#2A4A48]/30 hover:bg-white/[0.02] transition">
                  <td className="py-3 px-4">
                    <Link to="/anti/suppliers/$id" params={{ id: s.id }} className="text-[#E8EDE5] hover:text-[#4EA896] font-medium transition">
                      {s.name}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-right text-[#8FA9A6] font-semibold">₹{s.totalSpent.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right hidden sm:table-cell">
                    <span className="px-2.5 py-1 bg-[#2D5F5D]/15 text-[#4EA896] text-xs font-bold rounded-full">
                      #{i + 1}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
