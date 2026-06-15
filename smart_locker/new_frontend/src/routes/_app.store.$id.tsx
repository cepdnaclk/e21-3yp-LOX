import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingBag, Star, Check, Truck, Shield, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/store/$id")({
  head: () => ({ meta: [{ title: "Product — LOX Store" }] }),
  loader: ({ params }) => {
    return { id: params.id };
  },
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useLoaderData();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate({ to: "/" });
      return;
    }

    fetch(`http://localhost:3001/api/products/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => {
        if (!r.ok) throw new Error("cannot fetch product");
        return r.json();
      })
      .then(data => {
        setProduct(data.product);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        toast.error(err.message || "Failed to load product details");
        setLoading(false);
      });
  }, [id, navigate]);

  const handleCheckout = async () => {
    try {
      setCheckingOut(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/payment/checkout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ productId: product._id })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Checkout failed');
      
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        toast.error("Stripe is not configured on the backend.");
        setCheckingOut(false);
      }
    } catch (err: any) {
      toast.error(err.message);
      setCheckingOut(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading product details...</div>;
  if (!product) return <div className="p-12 text-center text-destructive">Product not found</div>;

  return (
    <div className="space-y-10">
      <Link to="/store" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition">
        <ArrowLeft className="h-4 w-4" /> Back to store
      </Link>

      <div className="grid lg:grid-cols-2 gap-10">
        <div>
          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            className="aspect-square rounded-3xl overflow-hidden relative card-soft bg-muted flex items-center justify-center"
          >
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full" />
            ) : (
              <ShoppingBag className="h-32 w-32 text-muted-foreground/30" />
            )}
          </motion.div>
          
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[0, 1, 2, 3].map((i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={cn(
                  "aspect-square rounded-xl border transition overflow-hidden bg-muted flex items-center justify-center",
                  active === i ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                )}
              >
                {product.imageUrl ? (
                  <img src={product.imageUrl} className="object-cover w-full h-full opacity-80" alt="thumb" />
                ) : (
                  <ShoppingBag className="h-8 w-8 text-muted-foreground/20" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-primary font-medium tracking-wide uppercase">{product.category}</p>
            {product.badge && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-900 text-white shadow-sm">
                {product.badge}
              </span>
            )}
          </div>
          
          <h1 className="mt-2 text-3xl lg:text-4xl font-bold tracking-tight">{product.name}</h1>
          <div className="mt-4 flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 text-warning font-semibold">
              <Star className="h-4 w-4 fill-warning" />
              {product.rating}
            </span>
            <span className="text-muted-foreground">· {product.reviews || 0} reviews</span>
            <span className="text-muted-foreground">· {product.sold || 0} sold</span>
          </div>
          <p className="mt-6 text-muted-foreground leading-relaxed text-base">{product.description}</p>

          <div className="mt-8 p-6 card-soft border-primary/10">
            <div className="flex items-baseline gap-4">
              <p className="text-4xl font-extrabold text-foreground tracking-tight">Rs. {product.price.toLocaleString()}</p>
              {product.compareAtPrice > product.price && (
                <p className="text-lg text-muted-foreground line-through font-medium">Rs. {product.compareAtPrice.toLocaleString()}</p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-4">
              <Button onClick={handleCheckout} disabled={checkingOut} className="rounded-xl gradient-primary text-primary-foreground hover:opacity-90 h-14 px-8 text-base shadow-md font-bold flex-1">
                {checkingOut ? "Redirecting..." : "Buy Now"}
              </Button>
              <Button variant="outline" className="rounded-xl h-14 px-8 text-base border-2 font-semibold">
                Add to cart
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground mt-4">Secure checkout powered by Stripe</p>
          </div>

          <div className="mt-8 grid sm:grid-cols-3 gap-3">
            {[
              { icon: Truck, label: `${product.deliveryLabel || 'Standard delivery'}\n(${product.deliveryDays} days)` },
              { icon: Shield, label: "2-year warranty" },
              { icon: RotateCcw, label: "30-day returns" },
            ].map((b) => (
              <div key={b.label} className="card-soft p-4 flex flex-col items-center justify-center text-center gap-2 text-sm border-transparent hover:border-primary/20 transition">
                <b.icon className="h-6 w-6 text-primary" /> 
                <span className="whitespace-pre-line font-medium leading-tight">{b.label}</span>
              </div>
            ))}
          </div>

          {product.features && product.features.length > 0 && (
            <div className="mt-10">
              <h3 className="text-lg font-bold">Key features</h3>
              <ul className="mt-4 space-y-3">
                {product.features.map((f: string) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Check className="h-5 w-5 text-success shrink-0" /> <span className="pt-0.5 leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-10 mt-12 border-t pt-10">
        <div>
           <h3 className="text-2xl font-bold mb-6">Specifications</h3>
           <div className="grid sm:grid-cols-2 gap-4">
             <div className="p-4 rounded-xl border bg-card">
               <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Art Style / Access</p>
               <p className="font-semibold text-base mt-1">{product.artStyle || 'Standard'}</p>
             </div>
             <div className="p-4 rounded-xl border bg-card">
               <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Delivery Time</p>
               <p className="font-semibold text-base mt-1">{product.deliveryDays} Business Days</p>
             </div>
             <div className="p-4 rounded-xl border bg-card">
               <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Stock Availability</p>
               <p className="font-semibold text-base mt-1">{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</p>
             </div>
             <div className="p-4 rounded-xl border bg-card">
               <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Delivery Fee</p>
               <p className="font-semibold text-base mt-1">{product.deliveryFee === 0 ? 'Free' : `Rs. ${product.deliveryFee}`}</p>
             </div>
           </div>
        </div>

        {product.colors && product.colors.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-4">Available Colors</h3>
            <div className="space-y-3">
              {product.colors.map((c: any) => (
                <div key={c.name} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                  <span className="h-6 w-6 rounded-full border shadow-sm" style={{ backgroundColor: c.name.toLowerCase() === 'grey' ? '#9ca3af' : c.name.toLowerCase() === 'black' ? '#1f2937' : c.name.toLowerCase() === 'red' ? '#ef4444' : c.name.toLowerCase() === 'walnut' ? '#78350f' : c.value }} />
                  <p className="font-medium text-sm">{c.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
