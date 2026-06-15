import { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Search, Package, Plus, Edit, Settings, Trash2, Calendar, Edit2, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { apiMutate } from "@/lib/api";
import { toast } from "sonner";

export function SuperAdminStore({ products, orders, reloadStore }: { products: any[], orders: any[], reloadStore: () => void }) {
  const [activeTab, setActiveTab] = useState("products");
  
  // Search & Filter for products
  const [q, setQ] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("match");

  const filteredProducts = useMemo(() => {
    let res = products.filter((p) => {
      if (q && !(p.name || "").toLowerCase().includes(q.toLowerCase()) && !(p.description || "").toLowerCase().includes(q.toLowerCase())) return false;
      const price = p.price;
      const min = parseInt(minPrice) || 0;
      const max = parseInt(maxPrice) || 99999;
      if (price < min || price > max) return false;
      return true;
    });

    if (sortBy === "price_asc") res.sort((a, b) => a.price - b.price);
    if (sortBy === "price_desc") res.sort((a, b) => b.price - a.price);
    if (sortBy === "rating") res.sort((a, b) => b.rating - a.rating);

    return res;
  }, [products, q, minPrice, maxPrice, sortBy]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
    return counts;
  }, [products]);

  // Editing state
  const [editProduct, setEditProduct] = useState<any>(null);

  const tabs = [
    { id: "settings", label: "Store settings" },
    { id: "products", label: "Current products" },
    { id: "add", label: "Add product" },
    { id: "edit", label: "Edit product" },
    { id: "orders", label: "Pending orders" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold tracking-wider text-primary uppercase">Super Admin Store</p>
        <h1 className="text-4xl font-bold tracking-tight mt-1">Manage the catalog, product cards, and pending orders</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">Use the navigation bar to edit store settings, current products, add a new card, edit a selected card, or review pending orders.</p>
        
        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground font-medium">
          <span>{products.length} products</span>
          <span>{orders.length} pending orders</span>
          <span>{Object.keys(categoryCounts).length} categories</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-8 items-start mt-8">
        
        {/* Navigation Sidebar */}
        <div className="space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl border font-semibold transition-all duration-200",
                activeTab === tab.id 
                  ? "bg-primary text-primary-foreground border-primary shadow-md" 
                  : "bg-card border-border hover:border-primary/40 text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-card/50 rounded-2xl p-6 border border-border/50">
          {activeTab === "products" && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-[1fr_auto_auto_auto] gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Search</label>
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lockers, colors, features..." className="h-11 rounded-xl bg-card" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Min price</label>
                  <Input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="h-11 rounded-xl bg-card w-28" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Max price</label>
                  <Input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="h-11 rounded-xl bg-card w-28" />
                </div>
                <div className="space-y-1.5">
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
                <h3 className="font-bold text-lg">{filteredProducts.length} products found</h3>
                <p className="text-sm text-muted-foreground">Search, price filters, delivery filters, and best match sorting work here only.</p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredProducts.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="card-soft overflow-hidden group flex flex-col">
                    <div className="relative aspect-[4/3] bg-muted overflow-hidden flex items-center justify-center">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="object-cover w-full h-full" />
                      ) : (
                        <Package className="h-16 w-16 text-muted-foreground/30" />
                      )}
                      {p.badge && (
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-900 text-white backdrop-blur shadow-md">
                          {p.badge}
                        </span>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-bold tracking-tight text-lg leading-tight">{p.name}</h3>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed flex-1">{p.description}</p>
                      
                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-xl font-extrabold text-foreground">Rs. {(p.price || 0).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground font-medium text-right">{p.stock} in stock</p>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-border flex gap-2">
                        <Button variant="outline" className="flex-1 rounded-xl" onClick={() => {
                          setEditProduct(p);
                          setActiveTab("edit");
                        }}>
                          <Edit2 className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        <Button variant="destructive" className="rounded-xl px-3" onClick={async () => {
                          if (confirm("Are you sure you want to delete this product?")) {
                            try {
                              await apiMutate(`/products/${p.id}`, "DELETE");
                              toast.success("Product deleted successfully");
                              reloadStore();
                            } catch (e: any) {
                              toast.error(e.message);
                            }
                          }
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "add" && <ProductForm mode="add" onSuccess={() => { reloadStore(); setActiveTab("products"); }} />}
          
          {activeTab === "edit" && (
            editProduct ? (
              <ProductForm mode="edit" initialData={editProduct} onSuccess={() => { reloadStore(); setEditProduct(null); setActiveTab("products"); }} onCancel={() => { setEditProduct(null); setActiveTab("products"); }} />
            ) : (
              <div className="p-12 text-center">
                <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-bold">No product selected</h3>
                <p className="text-muted-foreground mb-6">Please select a product from the current products list to edit it.</p>
                <Button onClick={() => setActiveTab("products")}>Go to products</Button>
              </div>
            )
          )}

          {activeTab === "orders" && <OrdersManager orders={orders} reloadStore={reloadStore} />}

          {activeTab === "settings" && (
            <div className="p-12 text-center">
              <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold">Store Settings</h3>
              <p className="text-muted-foreground">General store configuration, taxes, and shipping rules will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const PREDEFINED_COLORS = [
  { name: 'Grey', value: '#c7ccd6' },
  { name: 'Black', value: '#111827' },
  { name: 'White', value: '#ffffff' },
  { name: 'Walnut', value: '#916447' },
];

function ProductForm({ mode, initialData, onSuccess, onCancel }: { mode: "add" | "edit", initialData?: any, onSuccess: () => void, onCancel?: () => void }) {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    category: initialData?.category || "Hidden Locks",
    price: initialData?.price || 0,
    compareAtPrice: initialData?.compareAtPrice || 0,
    deliveryDays: initialData?.deliveryDays || 3,
    deliveryFee: initialData?.deliveryFee || 0,
    deliveryLabel: initialData?.deliveryLabel || "Fast delivery",
    badge: initialData?.badge || "",
    rating: initialData?.rating || 4.7,
    reviews: initialData?.reviews || 0,
    sold: initialData?.sold || 0,
    stock: initialData?.stock || 1,
    artStyle: initialData?.artStyle || "rfid",
    imageUrl: initialData?.imageUrl || "",
    description: initialData?.description || "",
    features: initialData?.features?.join(", ") || "",
    featured: initialData?.featured || false,
  });

  const [selectedColors, setSelectedColors] = useState<any[]>(initialData?.colors || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleColor = (color: any) => {
    const exists = selectedColors.find(c => c.name === color.name);
    if (exists) {
      setSelectedColors(selectedColors.filter(c => c.name !== color.name));
    } else {
      setSelectedColors([...selectedColors, color]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormData({ ...formData, imageUrl: event.target.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...formData,
        features: formData.features.split(",").map((f: string) => f.trim()).filter(Boolean),
        colors: selectedColors,
      };

      if (mode === "add") {
        await apiMutate('/products', 'POST', payload);
        toast.success("Product created successfully");
      } else {
        await apiMutate(`/products/${initialData.id}`, 'PATCH', payload);
        toast.success("Product updated successfully");
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-card">
      <div>
        <h2 className="text-2xl font-bold">{mode === 'add' ? 'Add product card' : 'Edit product card'}</h2>
        <p className="text-muted-foreground text-sm mt-1">Create a new store card with the current settings, colors, and photo upload.</p>
      </div>
      
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Name</label>
          <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-card h-10" placeholder="Locker product name" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Category</label>
          <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Hidden Locks">Hidden Locks</SelectItem>
              <SelectItem value="Book Safes">Book Safes</SelectItem>
              <SelectItem value="Key Safes">Key Safes</SelectItem>
              <SelectItem value="Drawer Locks">Drawer Locks</SelectItem>
              <SelectItem value="Wall Lockers">Wall Lockers</SelectItem>
              <SelectItem value="Coin Boxes">Coin Boxes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Price</label>
          <Input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="bg-card h-10" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Compare at price</label>
          <Input type="number" value={formData.compareAtPrice} onChange={e => setFormData({...formData, compareAtPrice: Number(e.target.value)})} className="bg-card h-10" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Delivery days</label>
          <Input type="number" required value={formData.deliveryDays} onChange={e => setFormData({...formData, deliveryDays: Number(e.target.value)})} className="bg-card h-10" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Delivery fee</label>
          <Input type="number" required value={formData.deliveryFee} onChange={e => setFormData({...formData, deliveryFee: Number(e.target.value)})} className="bg-card h-10" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Delivery label</label>
          <Select value={formData.deliveryLabel} onValueChange={v => setFormData({...formData, deliveryLabel: v})}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Fast delivery">Fast delivery</SelectItem>
              <SelectItem value="Standard delivery">Standard delivery</SelectItem>
              <SelectItem value="Express delivery">Express delivery</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Badge</label>
          <Input value={formData.badge} onChange={e => setFormData({...formData, badge: e.target.value})} className="bg-card h-10" placeholder="e.g. Bestseller" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Rating</label>
          <Input type="number" step="0.1" required value={formData.rating} onChange={e => setFormData({...formData, rating: Number(e.target.value)})} className="bg-card h-10" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Reviews</label>
          <Input type="number" required value={formData.reviews} onChange={e => setFormData({...formData, reviews: Number(e.target.value)})} className="bg-card h-10" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Sold</label>
          <Input type="number" required value={formData.sold} onChange={e => setFormData({...formData, sold: Number(e.target.value)})} className="bg-card h-10" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Stock</label>
          <Input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="bg-card h-10" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Artwork style</label>
        <Select value={formData.artStyle} onValueChange={v => setFormData({...formData, artStyle: v})}>
          <SelectTrigger className="h-10 border-2 border-foreground rounded-lg font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rfid">RFID hidden lock</SelectItem>
            <SelectItem value="book">Book safe</SelectItem>
            <SelectItem value="safe">Safe box</SelectItem>
            <SelectItem value="drawer">Drawer lock</SelectItem>
            <SelectItem value="wall">Wall locker</SelectItem>
            <SelectItem value="coin">Coin box</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Product photo</label>
        <div className="border border-dashed border-primary/30 rounded-xl bg-primary/5 p-6 flex flex-col items-center justify-center min-h-[200px]">
          {formData.imageUrl ? (
            <img src={formData.imageUrl} alt="Preview" className="max-h-[180px] rounded-lg object-contain" />
          ) : (
            <div className="px-4 py-2 bg-background rounded-full text-sm font-semibold shadow-sm text-muted-foreground border border-border">No uploaded photo</div>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          <Button type="button" onClick={() => fileInputRef.current?.click()} className="bg-slate-700 hover:bg-slate-800 text-white rounded-lg h-9 px-4 text-xs font-semibold">Upload from device</Button>
          <Button type="button" onClick={() => setFormData({...formData, imageUrl: ""})} className="bg-slate-700 hover:bg-slate-800 text-white rounded-lg h-9 px-4 text-xs font-semibold">Remove photo</Button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Color palette</label>
        <div className="flex flex-wrap gap-2">
          {PREDEFINED_COLORS.map(c => {
            const isSelected = selectedColors.some(sc => sc.name === c.name);
            return (
              <button 
                type="button" 
                key={c.name}
                onClick={() => toggleColor(c)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition",
                  isSelected ? "bg-slate-100 border-slate-300" : "bg-card border-border hover:border-slate-300"
                )}
              >
                <div className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: c.value }} />
                {c.name}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Description</label>
        <Textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-card resize-y min-h-[80px] rounded-xl" />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Features</label>
        <Textarea value={formData.features} onChange={e => setFormData({...formData, features: e.target.value})} className="bg-card resize-y min-h-[60px] rounded-xl" placeholder="Comma separated..." />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="featured" checked={formData.featured} onCheckedChange={(checked) => setFormData({...formData, featured: !!checked})} />
        <label htmlFor="featured" className="text-xs font-medium text-muted-foreground cursor-pointer">Featured on the home shelf</label>
      </div>

      <div className="flex gap-4 pt-4 pb-12">
        <Button type="submit" disabled={loading} className="bg-slate-800 hover:bg-slate-900 text-white px-6 rounded-lg font-bold">{loading ? "Saving..." : mode === 'add' ? "Add product card" : "Save product card"}</Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} className="rounded-lg font-bold">Cancel</Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => onSuccess()} className="bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-bold px-6 border-0">Back to products</Button>
        )}
      </div>
    </form>
  );
}

function OrdersManager({ orders, reloadStore }: { orders: any[], reloadStore: () => void }) {
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await apiMutate(`/orders/${orderId}/status`, 'PATCH', { status: newStatus });
      toast.success("Order status updated");
      reloadStore();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Pending & Past Orders</h2>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-bold">
              <tr>
                <th className="px-6 py-4">Order ID / Date</th>
                <th className="px-6 py-4">Customer Details</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No orders found.</td>
                </tr>
              )}
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-foreground">{(o.orderNumber || o.id.substring(Math.max(0, o.id.length - 6))).toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(o.createdAt).toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold">{o.customerEmail || 'Unknown User'}</p>
                    <p className="text-xs text-muted-foreground">Stripe: {o.stripePaymentStatus || 'N/A'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium">{o.productName}</p>
                    <p className="text-xs text-muted-foreground">Qty: {o.quantity}</p>
                  </td>
                  <td className="px-6 py-4 text-right font-bold">
                    ${(o.amount || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <Select value={o.status} onValueChange={(val) => handleStatusChange(o.id, val)}>
                      <SelectTrigger className={cn("h-8 rounded-full border-0 font-bold uppercase tracking-wider text-[10px]", 
                        o.status === 'PAID' ? "bg-success/10 text-success" : 
                        o.status === 'CANCELLED' ? "bg-destructive/10 text-destructive" : 
                        o.status === 'FAILED' ? "bg-destructive/10 text-destructive" :
                        "bg-warning/10 text-warning")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">PENDING</SelectItem>
                        <SelectItem value="PAID">PAID</SelectItem>
                        <SelectItem value="FAILED">FAILED</SelectItem>
                        <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                        <SelectItem value="REFUNDED">REFUNDED</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
