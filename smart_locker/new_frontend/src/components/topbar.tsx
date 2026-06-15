import { Menu, LogOut } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";

export function Topbar({ onMenu }: { onMenu: () => void }) {
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
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur border-b border-border flex items-center gap-3 px-4 lg:px-8">
      <button onClick={onMenu} className="lg:hidden h-10 w-10 grid place-items-center rounded-xl hover:bg-muted">
        <Menu className="h-5 w-5" />
      </button>

      <div className="ml-auto flex items-center gap-4">
        {user && (
          <>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.role}</p>
            </div>
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="h-9 w-9 rounded-xl object-cover shrink-0 border border-border" />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground text-sm font-semibold shrink-0">
                {user.name?.substring(0, 2).toUpperCase() || 'U'}
              </div>
            )}
          </>
        )}
        <Link
          to="/"
          onClick={handleLogout}
          className="h-9 w-9 grid place-items-center rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4.5 w-4.5" />
        </Link>
      </div>
    </header>
  );
}
