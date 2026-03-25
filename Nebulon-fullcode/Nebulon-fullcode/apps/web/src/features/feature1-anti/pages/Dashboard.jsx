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

const COLORS = ['#14e0c4', '#3be8d1', '#73ffe3', '#a2ffeb', '#00f5d4'];

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
    { label: 'Total Payables', value: `₹${stats.totalPayables.toLocaleString()}`, icon: DollarSign, color: 'from-teal-600 to-teal-800', textColor: 'text-teal-300' },
    { label: 'Upcoming Payments', value: stats.upcomingPayments, icon: Clock, color: 'from-warning-500 to-orange-700', textColor: 'text-warning-400' },
    { label: 'Overdue Payments', value: stats.overduePayments, icon: AlertCircle, color: 'from-danger-500 to-red-800', textColor: 'text-danger-400' },
    { label: 'Total Suppliers', value: stats.supplierCount, icon: Users, color: 'from-accent-500 to-emerald-700', textColor: 'text-accent-400' },
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
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Supplier intelligence at a glance</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metricCards.map((card, i) => (
          <div
            key={card.label}
            className="bg-[#111113] border border-zinc-800 rounded-xl shadow-sm hover:border-teal-500/50 hover:bg-zinc-800/50 transition-all p-5 animate-fade-in-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{card.label}</p>
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
        <div className="bg-[#111113] border border-zinc-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-warning-500/20 flex items-center justify-center">
              <Bell className="w-4 h-4 text-warning-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Price Change Alerts</h2>
            <span className="ml-2 px-2 py-0.5 bg-warning-500/20 text-warning-400 text-xs font-bold rounded-full">
              {alerts.length}
            </span>
          </div>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-gray-800/40 hover:border-warning-700/40 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-danger-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <TrendingUp className="w-4 h-4 text-danger-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200">{alert.message}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-gray-500">{alert.date}</span>
                    <span className="text-xs px-2 py-0.5 bg-danger-500/15 text-danger-400 rounded-full font-medium">
                      +₹{alert.diff}/{alert.unit}
                    </span>
                    <span className="text-xs text-gray-500">
                      ₹{alert.oldPrice} → ₹{alert.newPrice}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDismissAlert(alert.id)}
                  className="text-gray-600 hover:text-gray-300 p-1 rounded-lg hover:bg-white/5 transition opacity-0 group-hover:opacity-100"
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
        <div className="bg-[#111113] border border-zinc-800 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Top Suppliers by Spend</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSuppliersChart} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#e2e8f0' }}
                  formatter={(v) => [`₹${v.toLocaleString()}`, 'Spend']}
                />
                <Bar dataKey="spend" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3be8d1" />
                    <stop offset="100%" stopColor="#00f5d4" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart - Spend Distribution */}
        <div className="bg-[#111113] border border-zinc-800 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Spend Distribution</h2>
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
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#e2e8f0' }}
                  formatter={(v) => [`₹${v.toLocaleString()}`, 'Spend']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {pieData.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <span className="text-xs text-gray-400">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Suppliers Table */}
      <div className="bg-[#111113] border border-zinc-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Top Suppliers</h2>
          <Link
            to="/anti/suppliers"
            className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 font-medium transition"
          >
            View All <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800/60">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Spend</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Rank</th>
              </tr>
            </thead>
            <tbody>
              {stats.topSuppliers.map((s, i) => (
                <tr key={s.id} className="border-b border-gray-800/30 hover:bg-white/[0.02] transition">
                  <td className="py-3 px-4">
                    <Link to="/anti/suppliers/$id" params={{ id: s.id }} className="text-gray-200 hover:text-teal-300 font-medium transition">
                      {s.name}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-300 font-semibold">₹{s.totalSpent.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right hidden sm:table-cell">
                    <span className="px-2.5 py-1 bg-teal-500/15 text-teal-300 text-xs font-bold rounded-full">
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

