import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Store, BarChart3, User, HelpCircle, Settings, LogOut, LockKeyhole, ListOrdered, Receipt, Package, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const items = [
  { title: "Home", url: "/dashboard", icon: Home, roles: null },
  { title: "Store", url: "/store", icon: Store, roles: null },
  { title: "My Orders", url: "/orders", icon: Package, roles: null },
  { title: "Queue", url: "/queue", icon: ListOrdered, roles: null },
  { title: "Analytics", url: "/analytics", icon: BarChart3, roles: null },
  { title: "Overdue Payments", url: "/overdue", icon: Receipt, roles: ["SUB_ADMIN", "SUPER_ADMIN"] },
  { title: "Activation Keys", url: "/activation-keys", icon: KeyRound, roles: ["SUPER_ADMIN"] },
  { title: "My Account", url: "/account", icon: User, roles: null },
  { title: "Help", url: "/help", icon: HelpCircle, roles: null },
  { title: "Settings", url: "/settings", icon: Settings, roles: null },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadUser = () => {
      const uStr = localStorage.getItem('user');
      if (uStr) setUser(JSON.parse(uStr));
    };
    loadUser();

    window.addEventListener('userUpdated', loadUser);
    return () => window.removeEventListener('userUpdated', loadUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onNavigate?.();
  };

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border">
      <div className="px-6 py-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl overflow-hidden gradient-primary grid place-items-center text-primary-foreground shadow-md">
          <img src="/logo.jpg" alt="LOX Logo" className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="text-base font-bold tracking-tight">LOX</p>
          <p className="text-[11px] text-muted-foreground -mt-0.5">Smart Locker Platform</p>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        <p className="px-3 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Workspace</p>
        {items.filter(item => !item.roles || item.roles.includes(user?.role)).map((item, i) => {
          const active = pathname === item.url || (item.url !== "/dashboard" && pathname.startsWith(item.url));
          return (
            <motion.div
              key={item.url}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link
                to={item.url}
                onClick={onNavigate}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/70 hover:bg-sidebar-accent hover:text-foreground"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="active-pill"
                    className="absolute inset-0 -z-10 rounded-xl bg-primary/10"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={cn("h-4.5 w-4.5 shrink-0", active ? "text-primary" : "")} />
                <span>{item.url === "/orders" && user?.role === 'SUPER_ADMIN' ? "View Orders" : item.title}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <Link
          to="/"
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4.5 w-4.5" />
          Logout
        </Link>
        {user && (
          <div className="mt-3 flex items-center gap-3 p-3 rounded-2xl bg-muted/60">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="h-10 w-10 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground text-sm font-semibold shrink-0">
                {user.name?.substring(0, 2).toUpperCase() || 'U'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
