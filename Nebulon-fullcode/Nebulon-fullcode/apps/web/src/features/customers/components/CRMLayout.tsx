import {
  Link,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, ChevronRight, LogOut } from "lucide-react";
import { useAuth } from "@/lib/instaurl/AuthContext";
import CRMDashboard from "@/features/customers/pages/CRMDashboard";
import CRMCustomers from "@/features/customers/pages/CRMCustomers";
import CRMLedger from "@/features/customers/pages/CRMLedger";
import CRMReports from "@/features/customers/pages/CRMReports";
import CRMTools from "@/features/customers/pages/CRMTools";

const navGroups = [
  {
    title: "1. Customer Ledger & CRM",
    items: [
      { name: "customers dashboard", href: "/customers" },
      { name: "Customers", href: "/customers/customers" },
      { name: "Ledger", href: "/customers/ledger" },
      { name: "CRM Tools", href: "/customers/tools" },
      { name: "Reports", href: "/customers/reports" },
    ]
  }
];

export default function CRMLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "1. Customer Ledger & CRM": true,
  });

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const handleSignOut = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  const renderPage = () => {
    if (pathname === "/customers" || pathname === "/customers/") {
      return <CRMDashboard />;
    }
    if (pathname === "/customers/customers") {
      return <CRMCustomers />;
    }
    if (pathname === "/customers/ledger") {
      return <CRMLedger />;
    }
    if (pathname === "/customers/tools") {
      return <CRMTools />;
    }
    if (pathname === "/customers/reports") {
      return <CRMReports />;
    }
    return <CRMDashboard />;
  };

  return (
    <div className="flex h-screen bg-[#0A0A0B] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-zinc-800 bg-[#111113]">
        <div className="h-16 flex items-center px-6 border-b border-zinc-800">
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
            Customer Ledger
          </h1>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <button
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors"
              >
                <span>{group.title}</span>
                {expandedGroups[group.title] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {expandedGroups[group.title] && (
                <div className="space-y-1 mt-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || 
                                     (item.href !== "/customers" && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 ${
                          isActive
                            ? "bg-teal-500/10 text-teal-400"
                            : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                        }`}
                      >
                        <span className="font-medium text-sm">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
        {/* User Info & Sign Out */}
        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-purple-600 flex items-center justify-center font-bold text-sm shadow-lg shrink-0">
              {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.displayName || "User"}</p>
              <p className="text-xs text-zinc-500 truncate">{user?.email || ""}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute top-0 right-0 p-32 bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="flex-1 overflow-auto z-10 p-8">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
