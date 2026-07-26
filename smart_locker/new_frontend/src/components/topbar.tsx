import { Menu, LogOut, Package } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { apiGet } from "@/lib/api";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const prevOrdersRef = useRef<Record<string, any>>({});

  useEffect(() => {
    // Intercept checkout success redirect for sandbox environments without webhooks
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (sessionId) {
      apiGet(`/payments/verify-session?session_id=${sessionId}`, { skipCache: true })
        .then((res: any) => {
          if (res.status === 'PAID') {
            toast.success("Payment verified! Your order has been securely placed.", { icon: <Package className="w-4 h-4" /> });
          }
          const url = new URL(window.location.href);
          url.searchParams.delete('session_id');
          window.history.replaceState({}, document.title, url.toString());
        })
        .catch(console.error);
    }

    const loadUser = () => {
      const uStr = localStorage.getItem('user');
      if (uStr) setUser(JSON.parse(uStr));
    };
    loadUser();

    window.addEventListener('userUpdated', loadUser);
    return () => window.removeEventListener('userUpdated', loadUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    let intervalId: any;
    
    const checkOrders = async () => {
      try {
        const oData = await apiGet('/orders', { skipCache: true });
        const orders = oData?.orders || [];
        
        const newOrdersMap: Record<string, any> = {};
        let hasChanges = false;
        
        orders.forEach((o: any) => {
          newOrdersMap[o.id] = o;
          
          const prev = prevOrdersRef.current[o.id];
          if (prev) {
            if (prev.orderStatus !== o.orderStatus) {
              toast.info(`Order ${o.id.substring(o.id.length - 6).toUpperCase()}: Status is now ${o.orderStatus}`, { icon: <Package className="w-4 h-4" /> });
              hasChanges = true;
            }
            if (prev.paymentStatus !== o.paymentStatus) {
              toast.info(`Order ${o.id.substring(o.id.length - 6).toUpperCase()}: Payment is now ${o.paymentStatus}`, { icon: <Package className="w-4 h-4" /> });
              hasChanges = true;
            }
            if (prev.messages?.length < (o.messages?.length || 0)) {
              toast.info(`Order ${o.id.substring(o.id.length - 6).toUpperCase()}: You have a new message`, { icon: <Package className="w-4 h-4" /> });
              hasChanges = true;
            }
          }
        });
        
        prevOrdersRef.current = newOrdersMap;
      } catch (e) {
        // silently fail polling
      }
    };

    // Initial check (don't notify on first load)
    apiGet('/orders', { skipCache: true }).then(oData => {
      const orders = oData?.orders || [];
      const map: Record<string, any> = {};
      orders.forEach((o: any) => map[o.id] = o);
      prevOrdersRef.current = map;
      
      // Start polling
      intervalId = setInterval(checkOrders, 10000);
    }).catch(() => {});

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate({ to: "/" });
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
        <button
          onClick={handleLogout}
          className="h-9 w-9 grid place-items-center rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4.5 w-4.5" />
        </button>
      </div>
    </header>
  );
}
