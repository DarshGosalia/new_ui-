import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CreditCard,
  BarChart3,
  Package,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/anti', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/anti/suppliers', label: 'Suppliers', icon: Users },
  { to: '/anti/calendar', label: 'Payment Calendar', icon: CalendarDays },
  { to: '/anti/payments', label: 'Payment History', icon: CreditCard },
  { to: '/anti/comparison', label: 'AI Insights', icon: BarChart3 },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const getLinkClasses = (path) => {
    const active = pathname === path;
    return `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
      active
        ? 'bg-gradient-to-r from-primary-600/30 to-primary-700/10 text-primary-300 shadow-lg shadow-primary-900/20 border border-primary-700/30'
        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
    }`;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 flex flex-col border-r border-gray-800/60 bg-gradient-to-b from-surface-900 via-surface-950 to-surface-950 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-800/40">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-900/40">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">SupplyIQ</h1>
            <p className="text-[10px] font-medium text-primary-400 tracking-widest uppercase">Supplier Intelligence</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 mb-3">
            Navigation
          </p>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={getLinkClasses(item.to)}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-4.5 h-4.5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {pathname === item.to && (
                <ChevronRight className="w-4 h-4 text-primary-400 opacity-60" />
              )}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800/40">
          <div className="glass-card p-3.5 rounded-xl">
            <p className="text-xs font-semibold text-gray-300">SupplyIQ v1.0</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Retail Kirana SaaS Platform</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-gray-800/40 bg-surface-950/80 backdrop-blur-md shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <span className="text-xs font-medium text-emerald-400">Firebase Live</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-xs font-bold text-white">
              A
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
