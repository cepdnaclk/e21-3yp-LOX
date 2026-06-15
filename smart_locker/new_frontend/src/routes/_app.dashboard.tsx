import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Battery, BatteryLow, DoorOpen, DoorClosed, LockKeyhole, Wrench, WifiOff, CheckCircle2, Unlock, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type LockerStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { apiGet, apiMutate } from "@/lib/api";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — LOX Smart Locker" }] }),
  component: Dashboard,
});

const statusStyles: Record<LockerStatus, { dot: string; chip: string; ring: string; label: string; icon: any }> = {
  available:   { dot: "bg-success",     chip: "bg-success/10 text-success",         ring: "ring-success/30",     label: "Available",   icon: CheckCircle2 },
  occupied:    { dot: "bg-destructive", chip: "bg-destructive/10 text-destructive", ring: "ring-destructive/30", label: "Occupied",    icon: LockKeyhole },
  maintenance: { dot: "bg-warning",     chip: "bg-warning/15 text-warning",         ring: "ring-warning/30",     label: "Maintenance", icon: Wrench },
  offline:     { dot: "bg-muted-foreground", chip: "bg-muted text-muted-foreground", ring: "ring-border",         label: "Offline",     icon: WifiOff },
};

function Dashboard() {
  const [purpose, setPurpose] = useState("");
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState("");
  
  const [lockers, setLockers] = useState<any[]>([]); // ST001 general lockers
  const [stationsList, setStationsList] = useState<any[]>([]);
  const [stationId, setStationId] = useState("");
  
  // User specific state
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [myLockers, setMyLockers] = useState<any[]>([]);
  
  // Sub-admin specific state
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  const navigate = useNavigate();

  const fetchAll = async (t: string, u: any) => {
    try {
      // Fire all independent requests in parallel using apiGet (uses cache if available)
      const stationsPromise = apiGet('/stations');

      let requestsPromise: Promise<any> | null = null;
      let lockersPromise: Promise<any> | null = null;
      let pendingPromise: Promise<any> | null = null;

      if (u.role === 'USER') {
        requestsPromise = apiGet('/requests');
        lockersPromise = apiGet('/lockers');
      }

      if (u.role === 'SUB_ADMIN' || u.role === 'SUPER_ADMIN') {
        pendingPromise = apiGet('/requests?status=PENDING');
      }

      // Await all in parallel
      const [stData, reqData, lockData, pReqData] = await Promise.all([
        stationsPromise,
        requestsPromise,
        lockersPromise,
        pendingPromise
      ]);

      if (reqData) setMyRequests(reqData.requests || []);
      if (lockData) setMyLockers(lockData.lockers || []);
      if (pReqData) setPendingRequests(pReqData.requests || []);

      const stList = stData.stations || [];
      setStationsList(stList);
      if (stList.length > 0 && !stationId) setStationId(stList[0]._id);

      // This depends on stations data, so it runs after
      const st001 = stList.find((s: any) => s.code === 'ST001');
      const fetchLockersId = st001 ? st001._id : (stList[0]?._id || '');

      if (fetchLockersId) {
        const genLockData = await apiGet(`/lockers?stationId=${fetchLockersId}`);
        setLockers(genLockData.lockers || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const t = localStorage.getItem('token');
    const uStr = localStorage.getItem('user');
    if (!t || !uStr) {
      navigate({ to: "/" });
      return;
    }
    const u = JSON.parse(uStr);
    setUser(u);
    setToken(t);
    fetchAll(t, u);
  }, [navigate]);

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationId) { toast.error("Please select a station"); return; }
    
    try {
      await apiMutate('/requests/access', 'POST', { stationId, note: purpose }, ['/requests', '/lockers']);
      
      toast.success("Locker request submitted");
      setPurpose("");
      fetchAll(token, user);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const cancelRequest = async (id: string) => {
    try {
      await apiMutate(`/requests/${id}/cancel`, 'POST', undefined, ['/requests']);
      toast.success("Request cancelled");
      fetchAll(token, user);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const approveRequest = async (id: string) => {
    try {
      const data = await apiMutate(`/requests/${id}/approve`, 'POST', undefined, ['/requests', '/lockers']);
      toast.success(data.message || "Request approved");
      fetchAll(token, user);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const rejectRequest = async (id: string) => {
    try {
      await apiMutate(`/requests/${id}/reject`, 'POST', undefined, ['/requests']);
      toast.success("Request rejected");
      fetchAll(token, user);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const commandLocker = async (id: string, action: string) => {
    try {
      await apiMutate(`/lockers/${id}/${action}`, 'POST', undefined, ['/lockers']);
      toast.success(`Locker ${action} successful`);
      fetchAll(token, user);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getLockerStatus = (l: any): LockerStatus => {
    if (l.securityAlertActive) return "maintenance";
    if (l.isBooked) return "occupied";
    return "available";
  };

  if (!user) return null;

  const isUser = user.role === 'USER';
  const isSubAdmin = user.role === 'SUB_ADMIN' || user.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Hi {user.name}:</h1>
      </div>

      {isUser && myRequests.filter(r => r.status === 'PENDING' || r.status === 'QUEUED').map(req => (
        <div key={req._id} className="card-soft p-6 border border-warning/30 bg-warning/5">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold">Current Request</h2>
              <p className="mt-2 text-sm">Status: <span className="font-bold text-warning">{req.status}</span></p>
              <p className="mt-1 text-sm">Sub-admin station: {req.stationId?.code}</p>
              {req.note && <p className="mt-1 text-sm">Note: {req.note}</p>}
            </div>
            <Button variant="destructive" size="sm" onClick={() => cancelRequest(req._id)}>
              Cancel Request
            </Button>
          </div>
        </div>
      ))}

      {isSubAdmin && (
        <div className="card-soft p-6">
          <h2 className="text-lg font-semibold mb-4">Pending User Requests</h2>
          {pendingRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending requests.</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map(req => (
                <div key={req._id} className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                  <div>
                    <p className="font-semibold">{req.userId?.name}</p>
                    <p className="text-sm">Status: <span className="font-bold text-warning">{req.status}</span></p>
                    <p className="text-sm">Sub-admin station: {req.stationId?.code}</p>
                    {req.note && <p className="text-sm text-muted-foreground mt-1">Note: {req.note}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="default" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => approveRequest(req._id)}>Approve</Button>
                    <Button variant="destructive" onClick={() => rejectRequest(req._id)}>Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isUser && myLockers.length > 0 && (
        <div className="card-soft p-6">
          <h2 className="text-lg font-semibold mb-4">My Assigned Lockers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myLockers.map(l => (
              <div key={l._id} className="p-5 rounded-2xl bg-card border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">{l.code}</h3>
                  <span className={cn("px-2 py-1 rounded-md text-xs font-semibold", l.lockState === 'LOCKED' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success')}>
                    Lock: {l.lockState}
                  </span>
                </div>
                <p className="text-sm mb-1">Door: <span className="font-semibold">{l.doorState}</span></p>
                <p className="text-sm mb-4">Booked: <span className="font-semibold">{l.isBooked ? 'Yes' : 'No'}</span></p>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => commandLocker(l._id, 'unlock')}><Unlock className="w-4 h-4 mr-1" /> Unlock</Button>
                  <Button size="sm" variant="outline" onClick={() => commandLocker(l._id, 'lock')}><LockKeyhole className="w-4 h-4 mr-1" /> Lock</Button>
                  <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => commandLocker(l._id, 'release')}><LogOut className="w-4 h-4 mr-1" /> Release</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Locker grid */}
        <div className="lg:col-span-3 card-soft p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold">Locker Grid</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(statusStyles) as LockerStatus[]).map((k) => (
                <span key={k} className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", statusStyles[k].chip)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", statusStyles[k].dot)} />
                  {statusStyles[k].label}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {lockers.map((l: any, i: number) => {
              const status = getLockerStatus(l);
              const s = statusStyles[status];
              const Icon = s.icon;
              return (
                <motion.div
                  key={l._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    "group relative text-left p-4 rounded-2xl bg-card border border-border ring-1 ring-transparent",
                    "hover:shadow-lg hover:" + s.ring,
                    "transition-all"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <Icon className={cn(
                      "h-5 w-5",
                      status === "available" && "text-success",
                      status === "occupied" && "text-destructive",
                      status === "maintenance" && "text-warning",
                    )} />
                    <span className={cn("h-2 w-2 rounded-full", s.dot)} />
                  </div>
                  <p className="mt-3 text-sm font-semibold">{l.code}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {l.doorState === "OPEN" ? <DoorOpen className="h-3.5 w-3.5" /> : <DoorClosed className="h-3.5 w-3.5" />}
                      {l.doorState}
                    </span>
                    <span className={cn("inline-flex items-center gap-1")}>
                       {l.lockState}
                    </span>
                  </div>
                  {isSubAdmin && (
                    <div className="mt-4 pt-3 border-t border-border grid grid-cols-2 gap-2">
                      <Button size="sm" variant="outline" className="h-8 text-[11px] px-2" onClick={() => commandLocker(l._id, 'unlock')}><Unlock className="w-3 h-3 mr-1" /> Unlock</Button>
                      <Button size="sm" variant="outline" className="h-8 text-[11px] px-2" onClick={() => commandLocker(l._id, 'lock')}><LockKeyhole className="w-3 h-3 mr-1" /> Lock</Button>
                      <Button size="sm" variant="outline" className="h-8 text-[11px] px-2 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => commandLocker(l._id, 'release')}><LogOut className="w-3 h-3 mr-1" /> Release</Button>
                      {l.securityAlertActive && (
                        <Button size="sm" variant="outline" className="h-8 text-[11px] px-2 border-warning/30 text-warning hover:bg-warning/10" onClick={() => commandLocker(l._id, 'security-ignore')}><CheckCircle2 className="w-3 h-3 mr-1" /> Ignore</Button>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
            {lockers.length === 0 && <p className="text-muted-foreground col-span-full">No lockers found.</p>}
          </div>
        </div>
      </div>

      {/* Request locker (Only for USER) */}
      {isUser && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3 card-soft p-6">
            <h2 className="text-lg font-semibold">Request Locker Access</h2>
            <form onSubmit={submitRequest} className="mt-5 grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Station (choose the locker station)</Label>
                <Select value={stationId} onValueChange={setStationId}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select station" /></SelectTrigger>
                  <SelectContent>
                    {stationsList.map((s) => <SelectItem key={s._id} value={s._id}>{s.name} ({s.code})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Note</Label>
                <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Note" className="h-11 rounded-xl" />
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-3">
                <Button type="submit" className="rounded-xl gradient-primary text-primary-foreground hover:opacity-90 h-11 px-5">Submit Request</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
