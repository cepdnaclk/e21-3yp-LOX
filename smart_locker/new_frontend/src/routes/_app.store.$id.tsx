import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingBag, Star, Check, Truck, Shield, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { products, reviews } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/store/$id")({
  head: () => ({ meta: [{ title: "Product — LOX Store" }] }),
  notFoundComponent: () => <div className="p-12 text-center">Product not found</div>,
  errorComponent: ({ error }) => <div className="p-12 text-center text-destructive">{error.message}</div>,
  loader: ({ params }) => {
    const product = products.find((p) => p.id === params.id);
    if (!product) throw notFound();
    return { product };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const [active, setActive] = useState(0);
  const related = products.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <div className="space-y-10">
      <Link to="/store" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to store
      </Link>

      <div className="grid lg:grid-cols-2 gap-10">
        <div>
          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            className="aspect-square rounded-3xl overflow-hidden relative card-soft"
            style={{ backgroundImage: product.gradient }}
          >
            <div className="absolute inset-0 grid place-items-center">
              <ShoppingBag className="h-32 w-32 text-white/70" />
            </div>
          </motion.div>
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[0, 1, 2, 3].map((i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={cn(
                  "aspect-square rounded-xl border transition",
                  active === i ? "border-primary ring-2 ring-primary/30" : "border-border"
                )}
                style={{ backgroundImage: product.gradient, opacity: 0.6 + i * 0.1 }}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-primary font-medium">{product.category}</p>
          <h1 className="mt-1 text-3xl lg:text-4xl font-bold tracking-tight">{product.name}</h1>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 text-warning"><Star className="h-4 w-4 fill-warning" />{product.rating}</span>
            <span className="text-muted-foreground">· {product.reviews} reviews</span>
          </div>
          <p className="mt-5 text-muted-foreground leading-relaxed">{product.description}</p>

          <div className="mt-6 flex items-baseline gap-3">
            <p className="text-4xl font-bold">${product.price.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground line-through">${(product.price * 1.2).toFixed(0)}</p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success">In stock</span>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => toast.success("Added to cart")} className="rounded-xl gradient-primary text-primary-foreground hover:opacity-90 h-12 px-6">
              Buy Now
            </Button>
            <Button variant="outline" className="rounded-xl h-12 px-6">Add to cart</Button>
          </div>

          <div className="mt-8 grid sm:grid-cols-3 gap-3">
            {[
              { icon: Truck, label: "Free shipping" },
              { icon: Shield, label: "2-year warranty" },
              { icon: RotateCcw, label: "30-day returns" },
            ].map((b) => (
              <div key={b.label} className="card-soft p-3 flex items-center gap-2 text-sm">
                <b.icon className="h-4 w-4 text-primary" /> {b.label}
              </div>
            ))}
          </div>

          <div className="mt-8">
            <h3 className="font-semibold">Key features</h3>
            <ul className="mt-3 grid sm:grid-cols-2 gap-2">
              {product.features.map((f: string) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Specs */}
      <div className="card-soft p-6">
        <h3 className="text-lg font-semibold">Specifications</h3>
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {[
            ["Power", "100-240V AC"],
            ["Connectivity", "Wi-Fi · Ethernet"],
            ["Material", "Powder-coated steel"],
            ["Dimensions", "60 × 40 × 30 cm"],
            ["Weight", "18 kg"],
            ["Battery backup", "12 hours"],
            ["Operating temp", "-10° to 50°C"],
            ["Compliance", "CE · FCC · RoHS"],
          ].map(([k, v]) => (
            <div key={k} className="p-3 rounded-xl bg-muted/40">
              <p className="text-xs text-muted-foreground">{k}</p>
              <p className="font-medium">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews */}
      <div>
        <h3 className="text-lg font-semibold mb-4">What customers say</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {reviews.map((r) => (
            <div key={r.id} className="card-soft p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground grid place-items-center text-sm font-bold">
                  {r.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="font-medium text-sm">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.role}</p>
                </div>
              </div>
              <div className="mt-3 flex">
                {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-4 w-4 text-warning fill-warning" />)}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{r.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Related */}
      <div>
        <h3 className="text-lg font-semibold mb-4">You may also like</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {related.map((p) => (
            <Link key={p.id} to="/store/$id" params={{ id: p.id }} className="card-soft overflow-hidden hover:-translate-y-1 transition">
              <div className="aspect-square grid place-items-center" style={{ backgroundImage: p.gradient }}>
                <ShoppingBag className="h-12 w-12 text-white/70" />
              </div>
              <div className="p-3">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-sm text-muted-foreground">${p.price.toLocaleString()}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
