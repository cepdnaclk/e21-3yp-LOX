import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Star, Search, ShoppingBag, ArrowRight, Package, Calendar } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { apiGet } from "@/lib/api";
import { SuperAdminStore } from "@/components/super-admin-store";

export const Route = createFileRoute("/_app/store/")({
  head: () => ({ meta: [{ title: "Store — LOX Smart Locker" }] }),
  component: StorePage,
});

function StorePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  // Filters
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [color, setColor] = useState("All");
  const [delivery, setDelivery] = useState("All");
  const [minPrice, setMinPrice] = useState("0");
  const [maxPrice, setMaxPrice] = useState("99999");
  const [sortBy, setSortBy] = useState("match");

  useEffect(() => {
    const token = localStorage.getItem('token');
    const uStr = localStorage.getItem('user');
    if (!token || !uStr) {
      navigate({ to: "/" });
      return;
    }
    const u = JSON.parse(uStr);
    setUser(u);

    const loadStore = async (skipCache: boolean = false) => {
      try {
        const [pData, oData] = await Promise.all([
          apiGet('/products', { skipCache }).catch(err => {
            console.error("Products error:", err);
            return { products: [] };
          }),
          apiGet('/orders', { skipCache }).catch(err => {
            console.error("Orders error:", err);
            return { orders: [] };
          })
        ]);
        
        setProducts(pData?.products || []);
        setOrders(oData?.orders || []);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to load store data");
      } finally {
        setLoading(false);
      }
    };
    
    loadStore();

    const intervalId = setInterval(() => {
      loadStore(true);
    }, 5000);
    return () => clearInterval(intervalId);
  }, [navigate]);

  // Derived filter options
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  const uniqueColors = useMemo(() => {
    const s = new Set<string>();
    products.forEach(p => p.colors?.forEach((c: any) => s.add(c.name)));
    return Array.from(s);
  }, [products]);

  // Filtering
  const filtered = useMemo(() => {
    let res = products.filter((p) => {
      if (cat !== "All" && p.category !== cat) return false;
      if (color !== "All" && !p.colors?.some((c: any) => c.name.toLowerCase() === color.toLowerCase())) return false;
      if (q && !(p.name || "").toLowerCase().includes(q.toLowerCase()) && !(p.description || "").toLowerCase().includes(q.toLowerCase())) return false;
      
      const price = p.price;
      const min = parseInt(minPrice) || 0;
      const max = parseInt(maxPrice) || 99999;
      if (price < min || price > max) return false;

      if (delivery === "express" && p.deliveryDays > 3) return false;
      if (delivery === "standard" && p.deliveryDays <= 3) return false;

      return true;
    });

    if (sortBy === "price_asc") res.sort((a, b) => a.price - b.price);
    if (sortBy === "price_desc") res.sort((a, b) => b.price - a.price);
    if (sortBy === "rating") res.sort((a, b) => b.rating - a.rating);

    return res;
  }, [products, q, cat, color, minPrice, maxPrice, delivery, sortBy]);

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading store...</div>;

  const loadStore = async (skipCache = false) => {
    setLoading(true);
    try {
      const [pData, oData] = await Promise.all([
        apiGet('/products', { skipCache }).catch(() => ({ products: [] })),
        apiGet('/orders', { skipCache }).catch(() => ({ orders: [] }))
      ]);
      setProducts(pData?.products || []);
      setOrders(oData?.orders || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role === 'SUPER_ADMIN') {
    return <SuperAdminStore products={products} orders={orders} reloadStore={loadStore} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold tracking-wider text-primary uppercase">Locker Marketplace</p>
        <h1 className="text-4xl font-bold tracking-tight mt-1">Search, compare, and order different locker products</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">Browse product cards in a store layout, filter by price, delivery speed and color, then open each product for a details view.</p>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-6 items-start mt-6">
        
        {/* Sidebar Filters */}
        <div className="space-y-6">
          <div className="card-soft p-4">
            <h2 className="font-semibold">Categories</h2>
            <p className="text-xs text-muted-foreground mt-1 mb-3">Use category and color filters like a marketplace.</p>
            <div className="space-y-2">
              <button
                onClick={() => setCat("All")}
                className={cn("w-full text-left text-sm px-3 py-2 rounded-xl border transition flex justify-between items-center", cat === "All" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40")}
              >
                All categories
              </button>
              {Object.entries(categoryCounts).map(([c, count]) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={cn("w-full text-left text-sm px-3 py-2 rounded-xl border transition flex justify-between items-center", cat === c ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40 bg-card")}
                >
                  {c}
                  <span className="font-semibold text-xs">{count}</span>
                </button>
              ))}
            </div>

            <h2 className="font-semibold mt-6 mb-3">Delivery</h2>
            <div className="space-y-2">
              {[
                { id: "All", label: "Any speed" },
                { id: "express", label: "Express only" },
                { id: "standard", label: "Standard only" }
              ].map(d => (
                <button
                  key={d.id}
                  onClick={() => setDelivery(d.id)}
                  className={cn("w-full text-left text-sm px-3 py-2 rounded-xl border transition", delivery === d.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40 bg-card")}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <h2 className="font-semibold mt-6 mb-3">Color</h2>
            <div className="space-y-2">
              <button
                onClick={() => setColor("All")}
                className={cn("w-full text-left text-sm px-3 py-2 rounded-xl border transition", color === "All" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40 bg-card")}
              >
                Any color
              </button>
              {uniqueColors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn("w-full text-left text-sm px-3 py-2 rounded-xl border transition flex items-center gap-2", color === c ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40 bg-card")}
                >
                  <span className="h-3 w-3 rounded-full border border-border/50" style={{ backgroundColor: c.toLowerCase() === 'grey' ? '#9ca3af' : c.toLowerCase() === 'black' ? '#1f2937' : c.toLowerCase() === 'red' ? '#ef4444' : c.toLowerCase() === 'walnut' ? '#78350f' : c }} />
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          
          {/* Search & Top Filters */}
          <div className="grid md:grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Search</label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lockers, colors, features..." className="h-11 rounded-xl bg-card" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Min price</label>
              <Input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="h-11 rounded-xl bg-card w-28" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Max price</label>
              <Input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="h-11 rounded-xl bg-card w-28" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Sort by</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-11 rounded-xl bg-card w-40">
                  <SelectValue placeholder="Best match" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="match">Best match</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="card-soft p-4 rounded-2xl">
            <h3 className="font-bold text-lg">{filtered.length} products found</h3>
            <p className="text-sm text-muted-foreground">Search, price filters, delivery filters and color selection all work together.</p>
          </div>

          <div className="card-soft p-5 rounded-2xl">
            <h3 className="font-bold text-lg">Recent orders</h3>
            <p className="text-sm text-muted-foreground mb-4">Stripe-backed checkout sessions and payment status updates appear here.</p>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet. Buy a product to create your first Stripe test checkout session.</p>
            ) : (
              <div className="space-y-3">
                {orders.map(o => (
                  <div key={o.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-primary/10 rounded-lg grid place-items-center text-primary">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Order {o.orderNumber || (o.id ? o.id.substring(Math.max(0, o.id.length - 6)).toUpperCase() : o._id?.substring(Math.max(0, o._id.length - 6)).toUpperCase() || 'UNKNOWN')}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(o.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">${(o.amount || 0).toLocaleString()}</p>
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", o.status === 'PAID' ? "bg-success/10 text-success" : o.status === 'CANCELLED' ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning")}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                whileHover={{ y: -4 }}
                className="card-soft overflow-hidden group flex flex-col"
              >
                <div className="relative aspect-[4/3] bg-muted overflow-hidden flex items-center justify-center">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="object-cover w-full h-full" />
                  ) : (
                    <ShoppingBag className="h-16 w-16 text-muted-foreground/30" />
                  )}
                  {p.badge && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-900 text-white backdrop-blur shadow-md">
                      {p.badge}
                    </span>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold tracking-tight text-lg leading-tight">{p.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3 leading-relaxed flex-1">{p.description}</p>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xl font-extrabold text-foreground">Rs. {(p.price || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground text-right">{p.deliveryDays} days</p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs">
                    <div className="flex gap-1.5 items-center">
                      {(p.colors || []).slice(0, 3).map((c: any) => (
                        <span key={c.name} className="h-3.5 w-3.5 rounded-full border border-border/50 shadow-sm" style={{ backgroundColor: c.name.toLowerCase() === 'grey' ? '#9ca3af' : c.name.toLowerCase() === 'black' ? '#1f2937' : c.name.toLowerCase() === 'red' ? '#ef4444' : c.name.toLowerCase() === 'walnut' ? '#78350f' : c.value }} title={c.name} />
                      ))}
                      <span className="text-muted-foreground ml-1 font-medium">{p.category}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                       {p.rating} rating
                    </span>
                  </div>

                  <Link to="/store/$id" params={{ id: p.id }} className="mt-4 w-full">
                    <Button className="w-full rounded-xl bg-card border border-border shadow-sm hover:bg-muted text-foreground">
                      View Details
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
