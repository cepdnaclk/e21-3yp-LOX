import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Star, Search, ShoppingBag, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { categories, colorsList, products } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/store")({
  head: () => ({ meta: [{ title: "Store — LOX Smart Locker" }] }),
  component: StorePage,
});

function StorePage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [color, setColor] = useState<string | null>(null);
  const [price, setPrice] = useState([3000]);
  const [inStockOnly, setInStockOnly] = useState(false);

  const filtered = useMemo(() =>
    products.filter((p) =>
      (cat === "All" || p.category === cat) &&
      (!color || p.color.toLowerCase() === color.toLowerCase()) &&
      p.price <= price[0] &&
      p.name.toLowerCase().includes(q.toLowerCase())
    ), [q, cat, color, price]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">LOX Store</h1>
          <p className="text-muted-foreground mt-1">Hardware that pairs with your LOX platform.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="pl-10 h-11 rounded-xl bg-card" />
        </div>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="card-soft p-5 h-fit sticky top-20">
          <p className="text-sm font-semibold mb-3">Categories</p>
          <div className="space-y-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "w-full text-left text-sm px-3 py-2 rounded-lg transition",
                  cat === c ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"
                )}
              >
                {c}
              </button>
            ))}
          </div>

          <p className="text-sm font-semibold mt-6 mb-3">Colors</p>
          <div className="flex flex-wrap gap-2">
            {colorsList.map((c) => (
              <button
                key={c}
                onClick={() => setColor(color === c ? null : c)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs border transition",
                  color === c ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40"
                )}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="mt-6">
            <div className="flex justify-between mb-2">
              <p className="text-sm font-semibold">Max price</p>
              <p className="text-sm text-primary font-medium">${price[0].toLocaleString()}</p>
            </div>
            <Slider value={price} onValueChange={setPrice} min={500} max={3000} step={50} />
          </div>

          <label className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="h-4 w-4 rounded" />
            In stock only
          </label>
        </aside>

        {/* Grid */}
        <div>
          <p className="text-sm text-muted-foreground mb-4">{filtered.length} products</p>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                whileHover={{ y: -4 }}
                className="card-soft overflow-hidden group"
              >
                <div className="relative aspect-[4/3] overflow-hidden" style={{ backgroundImage: p.gradient }}>
                  <div className="absolute inset-0 grid place-items-center">
                    <ShoppingBag className="h-16 w-16 text-white/70" />
                  </div>
                  {p.badge && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/90 backdrop-blur text-foreground">
                      {p.badge}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                  <h3 className="mt-1 font-semibold tracking-tight">{p.name}</h3>
                  <div className="mt-1.5 flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-0.5 text-warning">
                      <Star className="h-3.5 w-3.5 fill-warning" />{p.rating}
                    </span>
                    <span className="text-muted-foreground">({p.reviews})</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-lg font-bold">${p.price.toLocaleString()}</p>
                    <Link to="/store/$id" params={{ id: p.id }}>
                      <Button size="sm" className="rounded-xl gradient-primary text-primary-foreground hover:opacity-90">
                        View <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="card-soft p-12 text-center mt-8">
              <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="mt-3 font-medium">No products match those filters</p>
              <p className="text-sm text-muted-foreground">Try clearing the search or price.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
