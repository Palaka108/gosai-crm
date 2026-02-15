import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, UserPlus, Building2, Users, Target,
  Activity, Upload, Settings, Zap, LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: UserPlus },
  { href: "/accounts", label: "Accounts", icon: Building2 },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/opportunities", label: "Opportunities", icon: Target },
  { href: "/activities", label: "Activities", icon: Activity },
  { href: "/import", label: "Apollo Import", icon: Upload },
];

export function Sidebar() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 border-r border-border/80 bg-card/95 backdrop-blur-sm flex flex-col z-40">
      {/* Logo */}
      <div className="p-5 border-b border-border/60">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm shadow-primary/20">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <span className="text-base font-semibold tracking-tight">GOSAI</span>
            <span className="text-xs text-primary ml-1.5">CRM</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive(item.href)
                ? "bg-primary/10 text-primary border border-primary/10 shadow-sm shadow-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-surface/60"
            }`}
          >
            <item.icon size={18} />
            {item.label}
          </Link>
        ))}
        <div className="my-2 border-t border-border/50" />
        <Link
          to="/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            isActive("/settings")
              ? "bg-primary/10 text-primary border border-primary/10 shadow-sm shadow-primary/5"
              : "text-muted-foreground hover:text-foreground hover:bg-surface/60"
          }`}
        >
          <Settings size={18} />
          Settings
        </Link>
      </nav>

      {/* User + Sign Out */}
      <div className="p-3 border-t border-border/50">
        <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-medium text-primary shrink-0">
            {user?.email?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <span className="text-xs text-muted-foreground truncate">
            {user?.email}
          </span>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface/60 transition-all cursor-pointer"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
