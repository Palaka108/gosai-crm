import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Building2, Handshake,
  FolderKanban, CheckSquare, Settings, Zap, LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/deals", label: "Deals", icon: Handshake },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
];

export function Sidebar() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 border-r border-border/50 glass flex flex-col z-40 animate-slide-in-left">
      {/* Logo */}
      <div className="p-5 border-b border-border/50">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow duration-300">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">GOSAI</span>
            <span className="text-[10px] text-primary ml-1.5 font-semibold uppercase tracking-widest">CRM</span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item, i) => (
          <Link
            key={item.href}
            to={item.href}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 animate-slide-in-left delay-${i + 1} ${
              isActive(item.href)
                ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-sm shadow-primary/10 border border-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            <item.icon size={18} className={`transition-transform duration-200 group-hover:scale-110 ${isActive(item.href) ? "drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]" : ""}`} />
            {item.label}
            {isActive(item.href) && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-sm shadow-primary/50" />
            )}
          </Link>
        ))}
        <div className="my-3 border-t border-border/30" />
        <Link
          to="/settings"
          className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 animate-slide-in-left delay-7 ${
            isActive("/settings")
              ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-sm shadow-primary/10 border border-primary/10"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          }`}
        >
          <Settings size={18} className="transition-transform duration-200 group-hover:rotate-90" />
          Settings
        </Link>
      </nav>

      {/* User + Sign Out */}
      <div className="p-3 border-t border-border/30 animate-fade-in">
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1 rounded-xl bg-muted/20">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0 ring-2 ring-primary/10">
            {user?.email?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <span className="text-xs text-muted-foreground truncate">
            {user?.email}
          </span>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all duration-200 cursor-pointer group"
        >
          <LogOut size={16} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
