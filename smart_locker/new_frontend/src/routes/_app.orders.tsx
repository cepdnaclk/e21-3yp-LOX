import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Package, Calendar, MessageSquare, Send, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiMutate } from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/orders")({
  head: () => ({ meta: [{ title: "Orders — LOX Smart Locker" }] }),
  component: OrdersPage,
});

const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];

function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messageInputs, setMessageInputs] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const loadOrders = async () => {
    try {
      const oData = await apiGet('/orders', { skipCache: true });
      setOrders(oData?.orders || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const uStr = localStorage.getItem('user');
    if (!token || !uStr) {
      navigate({ to: "/" });
      return;
    }
    setUser(JSON.parse(uStr));
    loadOrders();
  }, [navigate]);

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await apiMutate(`/orders/${orderId}/order-status`, 'PATCH', { orderStatus: status }, ['/orders']);
      toast.success("Order status updated");
      loadOrders();
    } catch (err: any) {
      toast.error(err.message || "Failed to update order status");
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, status: string) => {
    try {
      await apiMutate(`/orders/${orderId}/payment-status`, 'PATCH', { paymentStatus: status }, ['/orders']);
      toast.success("Payment status updated");
      loadOrders();
    } catch (err: any) {
      toast.error(err.message || "Failed to update payment status");
    }
  };

  const handleSendMessage = async (orderId: string) => {
    const msg = messageInputs[orderId];
    if (!msg?.trim()) return;
    try {
      await apiMutate(`/orders/${orderId}/messages`, 'POST', { message: msg }, ['/orders']);
      toast.success("Message sent");
      setMessageInputs(prev => ({ ...prev, [orderId]: "" }));
      loadOrders();
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) return;
    try {
      await apiMutate(`/orders/${orderId}`, 'DELETE', undefined, ['/orders']);
      toast.success("Order deleted");
      loadOrders();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete order");
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading orders...</div>;

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold tracking-wider text-primary uppercase">{isSuperAdmin ? 'All Orders' : 'My Orders'}</p>
        <h1 className="text-4xl font-bold tracking-tight mt-1">{isSuperAdmin ? 'Manage System Orders' : 'Your Order History'}</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">View your recently ordered products and their statuses.</p>
      </div>

      <div className="card-soft p-5 rounded-2xl">
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders found.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((o, i) => {
              const isExpanded = expandedId === o.id;
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  key={o.id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
                >
                  <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpandedId(isExpanded ? null : o.id)}>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-primary/10 rounded-xl grid place-items-center text-primary shrink-0">
                        <Package className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-base">Order {o.id.substring(Math.max(0, o.id.length - 6)).toUpperCase()}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                          <Calendar className="w-3.5 h-3.5"/> {new Date(o.createdAt).toLocaleDateString()}
                          {isSuperAdmin && <span className="ml-2 font-medium text-foreground/80">• User ID: {o.userId}</span>}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 md:gap-6 w-full md:w-auto">
                      <div className="flex flex-col items-start md:items-end flex-1 md:flex-none">
                        <span className="text-[11px] text-muted-foreground uppercase font-semibold">Payment</span>
                        <span className={cn("text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mt-1", o.paymentStatus === 'PAID' ? "bg-success/10 text-success" : o.paymentStatus === 'FAILED' ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning")}>
                          {o.paymentStatus}
                        </span>
                      </div>
                      <div className="flex flex-col items-start md:items-end flex-1 md:flex-none">
                        <span className="text-[11px] text-muted-foreground uppercase font-semibold">Order</span>
                        <span className={cn("text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mt-1", o.orderStatus === 'DELIVERED' ? "bg-success/10 text-success" : o.orderStatus === 'CANCELLED' ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
                          {o.orderStatus}
                        </span>
                      </div>
                      <div className="flex flex-col items-end flex-none">
                        <p className="font-bold text-lg">${(o.amount || 0).toLocaleString()}</p>
                        <span className="text-xs text-muted-foreground">{o.quantity} x {o.productName}</span>
                      </div>
                      <div className="hidden md:block text-muted-foreground">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-border bg-muted/10">
                        <div className="p-4 md:p-6 grid lg:grid-cols-[1fr_auto] gap-6 items-start">
                          
                          {/* Messages Section */}
                          <div className="space-y-4 flex-1">
                            <h3 className="font-semibold text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4"/> Order Messages</h3>
                            
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                              {(!o.messages || o.messages.length === 0) ? (
                                <p className="text-sm text-muted-foreground italic">No messages yet.</p>
                              ) : (
                                o.messages.map((m: any, idx: number) => (
                                  <div key={idx} className={cn("p-3 rounded-xl max-w-[85%] text-sm", m.senderRole === 'SUPER_ADMIN' ? "bg-primary/10 text-foreground rounded-tl-sm border border-primary/20" : "bg-card border border-border rounded-tr-sm ml-auto")}>
                                    <div className="flex items-center justify-between gap-4 mb-1">
                                      <span className="font-bold text-[11px] uppercase tracking-wider opacity-70">{m.senderRole === 'SUPER_ADMIN' ? 'Support' : 'You'}</span>
                                      <span className="text-[10px] opacity-60">{new Date(m.date).toLocaleString()}</span>
                                    </div>
                                    <p className="leading-relaxed">{m.message}</p>
                                  </div>
                                ))
                              )}
                            </div>

                            {isSuperAdmin && (
                              <div className="flex gap-2 mt-4">
                                <Input 
                                  placeholder="Type a message to the customer..." 
                                  value={messageInputs[o.id] || ''}
                                  onChange={e => setMessageInputs(prev => ({ ...prev, [o.id]: e.target.value }))}
                                  onKeyDown={e => e.key === 'Enter' && handleSendMessage(o.id)}
                                  className="bg-card"
                                />
                                <Button size="icon" onClick={() => handleSendMessage(o.id)}>
                                  <Send className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Admin Controls Section */}
                          {isSuperAdmin && (
                            <div className="space-y-5 bg-card p-4 rounded-xl border border-border w-full lg:w-[280px]">
                              <h3 className="font-semibold text-sm">Admin Controls</h3>
                              
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground uppercase">Update Order Status</label>
                                <Select value={o.orderStatus} onValueChange={(val) => handleUpdateOrderStatus(o.id, val)}>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground uppercase">Update Payment Status</label>
                                <Select value={o.paymentStatus} onValueChange={(val) => handleUpdatePaymentStatus(o.id, val)}>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Payment" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PAYMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="pt-2 border-t border-border mt-2">
                                <Button variant="destructive" className="w-full" onClick={() => handleDeleteOrder(o.id)}>
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete Order
                                </Button>
                              </div>
                            </div>
                          )}

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
