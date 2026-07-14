import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Battery, BatteryLow, DoorOpen, DoorClosed, LockKeyhole, Wrench, WifiOff, CheckCircle2, Unlock, LogOut, ShieldAlert, ShieldOff, Vibrate, BellRing, X, AlertTriangle, Clock } from "lucide-react";
import { useState, useEffect, useRef } from "react";
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

// ─── Security Alert Types ────────────────────────────────────────────────────
const ALERT_EVENT_TYPES = ['SECURITY_ALERT', 'UNEXPECTED_DOOR_OPEN', 'TAMPER_DETECTED', 'VIBRATION_ALERT'];

interface SecurityEvent {
  _id: string;
  lockerId: string | null;      // raw ObjectId string from backend
  stationId: string | null;     // raw ObjectId string from backend
  eventType: string;
  message: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

const alertMeta: Record<string, { label: string; icon: any; border: string; bg: string; badge: string; iconColor: string }> = {
  SECURITY_ALERT:      { label: 'Security Alert',        icon: ShieldAlert,   border: 'border-l-red-500',    bg: 'bg-red-500/5',    badge: 'bg-red-500/15 text-red-400',    iconColor: 'text-red-400' },
  UNEXPECTED_DOOR_OPEN:{ label: 'Unexpected Door Open',  icon: DoorOpen,      border: 'border-l-orange-500', bg: 'bg-orange-500/5', badge: 'bg-orange-500/15 text-orange-400', iconColor: 'text-orange-400' },
  TAMPER_DETECTED:     { label: 'Tamper Detected',       icon: ShieldOff,     border: 'border-l-rose-500',   bg: 'bg-rose-500/5',   badge: 'bg-rose-500/15 text-rose-400',   iconColor: 'text-rose-400' },
  VIBRATION_ALERT:     { label: 'Vibration Detected',    icon: Vibrate,       border: 'border-l-amber-500',  bg: 'bg-amber-500/5',  badge: 'bg-amber-500/15 text-amber-400', iconColor: 'text-amber-400' },
  DEFAULT:             { label: 'Security Event',         icon: AlertTriangle, border: 'border-l-yellow-500', bg: 'bg-yellow-500/5', badge: 'bg-yellow-500/15 text-yellow-400', iconColor: 'text-yellow-400' },
};

function getAlertMeta(eventType: string) {
  return alertMeta[eventType] ?? alertMeta.DEFAULT;
}

function formatAlertDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function formatAlertTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ─── Alert Card Component ────────────────────────────────────────────────────
function SecurityAlertCard({
  event,
  isNew,
  onIgnore,
  onDismiss,
  isSubAdmin,
  lockerMap,
  stationMap,
}: {
  event: SecurityEvent;
  isNew: boolean;
  onIgnore: (lockerId: string) => void;
  onDismiss: (id: string) => void;
  isSubAdmin: boolean;
  lockerMap: Record<string, string>;   // lockerId → locker code
  stationMap: Record<string, string>;  // stationId → station name/code
}) {
  const meta = getAlertMeta(event.eventType);
  const Icon = meta.icon;
  // Resolve from frontend lookup maps (no backend populate needed)
  const lockerCode = (event.lockerId && lockerMap[event.lockerId]) ?? event.lockerId ?? 'Unknown Locker';
  const stationName = (event.stationId && stationMap[event.stationId]) ?? event.stationId ?? 'Unknown Station';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -24, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.96, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      className={cn(
        'relative flex gap-4 p-4 rounded-2xl border border-border border-l-4 shadow-sm',
        'hover:shadow-md transition-shadow duration-200 group',
        meta.border,
        meta.bg
      )}
    >
      {/* Pulse indicator for new alerts */}
      {isNew && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
      )}

      {/* Icon */}
      <div className={cn('flex-shrink-0 mt-0.5', meta.iconColor)}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', meta.badge)}>
            {meta.label}
          </span>
          <span className="text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-full">
            🔒 {lockerCode}
          </span>
          <span className="text-xs text-muted-foreground">{stationName}</span>
        </div>

        <p className="text-sm font-medium text-foreground leading-snug">{event.message || 'Security event detected.'}</p>

        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatAlertDate(event.createdAt)}
          </span>
          <span>·</span>
          <span>{formatAlertTime(event.createdAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 flex-shrink-0 justify-center">
        {isSubAdmin && event.lockerId && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs px-3 border-green-500/30 text-green-500 hover:bg-green-500/10 hover:text-green-400 transition-colors"
            onClick={() => onIgnore(event.lockerId!)}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Ignore Alert
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-xs px-3 text-muted-foreground hover:text-foreground"
          onClick={() => onDismiss(event._id)}
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Dismiss
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Security Alerts Panel ────────────────────────────────────────────────────
function SecurityAlertsPanel({
  alerts,
  newAlertIds,
  onIgnore,
  onDismiss,
  isSubAdmin,
  lockerMap,
  stationMap,
}: {
  alerts: SecurityEvent[];
  newAlertIds: Set<string>;
  onIgnore: (lockerId: string) => void;
  onDismiss: (id: string) => void;
  isSubAdmin: boolean;
  lockerMap: Record<string, string>;
  stationMap: Record<string, string>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const hasAlerts = alerts.length > 0;

  return (
    <div
      className={cn(
        'card-soft overflow-hidden transition-all duration-300',
        hasAlerts && 'border border-red-500/25'
      )}
      style={hasAlerts ? { boxShadow: '0 0 0 1px rgba(239,68,68,0.10), 0 4px 24px rgba(239,68,68,0.08)' } : undefined}
    >
      {/* ── Header ── */}
      <div
        className={cn(
          'flex items-center gap-3 px-6 py-4',
          hasAlerts && 'cursor-pointer hover:bg-red-500/5 transition-colors border-b border-red-500/10 bg-red-500/5'
        )}
        onClick={hasAlerts ? () => setCollapsed(c => !c) : undefined}
      >
        <span className="flex items-center gap-2 flex-1">
          {hasAlerts ? (
            /* Live pulsing dot when alerts are active */
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
          ) : (
            /* Static green dot when all clear */
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
          )}
          <BellRing className={cn('w-4 h-4', hasAlerts ? 'text-red-400' : 'text-muted-foreground')} />
          <span className="font-semibold text-lg">Security Alert Notifications</span>
          {hasAlerts && (
            <span className="ml-1 text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
              {alerts.length}
            </span>
          )}
        </span>
        {hasAlerts && (
          <span className="text-xs text-muted-foreground select-none">{collapsed ? 'Show' : 'Hide'}</span>
        )}
      </div>

      {/* ── Body ── */}
      {!hasAlerts ? (
        /* All-clear state — always visible */
        <div className="px-6 py-4">
          <p className="text-sm text-muted-foreground">No active security alerts.</p>
        </div>
      ) : (
        /* Alert cards — collapsible */
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-3">
                <AnimatePresence mode="popLayout">
                  {alerts.map(event => (
                    <SecurityAlertCard
                      key={event._id}
                      event={event}
                      isNew={newAlertIds.has(event._id)}
                      onIgnore={onIgnore}
                      onDismiss={onDismiss}
                      isSubAdmin={isSubAdmin}
                      lockerMap={lockerMap}
                      stationMap={stationMap}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

function Dashboard() {
  const [purpose, setPurpose] = useState("");
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState("");
  
  const [lockers, setLockers] = useState<any[]>([]); // lockers for selected station
  const [allLockers, setAllLockers] = useState<any[]>([]); // full locker list for ID→code lookup
  const [stationsList, setStationsList] = useState<any[]>([]);
  const [stationId, setStationId] = useState(""); // for request form (USER role)
  const [selectedGridStation, setSelectedGridStation] = useState<string>(""); // for locker grid filter (SUPER_ADMIN)
  
  // User specific state
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [myLockers, setMyLockers] = useState<any[]>([]);
  
  // Sub-admin specific state
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // Security alert notifications
  const [securityAlerts, setSecurityAlerts] = useState<SecurityEvent[]>([]);
  const [newAlertIds, setNewAlertIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const prevAlertIdsRef = useRef<Set<string>>(new Set());

  const navigate = useNavigate();

  const fetchAll = async (t: string, u: any, skipCache = false) => {
    try {
      // Fire all independent requests in parallel using apiGet (uses cache if available)
      const stationsPromise = apiGet('/stations', { skipCache });

      let requestsPromise: Promise<any> | null = null;
      let lockersPromise: Promise<any> | null = null;
      let pendingPromise: Promise<any> | null = null;

      if (u.role === 'USER') {
        requestsPromise = apiGet('/requests', { skipCache });
        lockersPromise = apiGet('/lockers', { skipCache });
      }

      if (u.role === 'SUB_ADMIN' || u.role === 'SUPER_ADMIN') {
        pendingPromise = apiGet('/requests?status=PENDING', { skipCache });
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

      // For Super Admin: don't auto-load lockers here; the grid filter drives it
      if (u.role === 'SUPER_ADMIN') {
        // selectedGridStation will trigger its own effect
        if (stList.length > 0) {
          setSelectedGridStation(prev => prev || stList[0]._id);
        }
      } else {
        // Sub Admin / User: load ST001 or first station lockers
        const st001 = stList.find((s: any) => s.code === 'ST001');
        const fetchLockersId = st001 ? st001._id : (stList[0]?._id || '');
        if (fetchLockersId) {
          const genLockData = await apiGet(`/lockers?stationId=${fetchLockersId}`, { skipCache });
          setLockers(genLockData.lockers || []);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSecurityAlerts = async (skipCache = false) => {
    try {
      // Also keep allLockers up-to-date for the ID→code lookup map
      const [data, lockersData] = await Promise.all([
        apiGet<{ events: SecurityEvent[] }>('/events?limit=50', { skipCache }),
        apiGet<{ lockers: any[] }>('/lockers', { skipCache }),
      ]);
      setAllLockers(lockersData.lockers || []);

      const allEvents: SecurityEvent[] = data.events || [];
      const alertEvents = allEvents.filter(e => ALERT_EVENT_TYPES.includes(e.eventType));
      const incoming = new Set(alertEvents.map(e => e._id));
      const fresh: Set<string> = new Set();
      for (const id of incoming) {
        if (!prevAlertIdsRef.current.has(id)) fresh.add(id);
      }
      prevAlertIdsRef.current = incoming;
      if (fresh.size > 0) {
        setNewAlertIds(fresh);
        setTimeout(() => setNewAlertIds(new Set()), 6000);
      }
      setSecurityAlerts(alertEvents.filter(e => !dismissedIds.has(e._id)));
    } catch (e) {
      console.error('Failed to fetch security alerts', e);
    }
  };

  const fetchLockersForStation = async (sid: string, skipCache = false) => {
    if (!sid) return;
    try {
      const data = await apiGet(`/lockers?stationId=${sid}`, { skipCache });
      setLockers(data.lockers || []);
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

    fetchSecurityAlerts();

    const intervalId = setInterval(() => {
      fetchAll(t, u, true);
    }, 5000);
    const alertIntervalId = setInterval(() => fetchSecurityAlerts(true), 7000);
    return () => { clearInterval(intervalId); clearInterval(alertIntervalId); };
  }, [navigate]);

  // When Super Admin changes the grid station, reload lockers
  useEffect(() => {
    if (selectedGridStation) {
      fetchLockersForStation(selectedGridStation);
    }
  }, [selectedGridStation]);

  // Live refresh lockers for the selected grid station (Super Admin)
  useEffect(() => {
    if (!user || user.role !== 'SUPER_ADMIN' || !selectedGridStation) return;
    const id = setInterval(() => fetchLockersForStation(selectedGridStation, true), 5000);
    return () => clearInterval(id);
  }, [user, selectedGridStation]);

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

  const ignoreAlertAndDismiss = async (lockerId: string, eventId: string) => {
    try {
      await apiMutate(`/lockers/${lockerId}/security-ignore`, 'POST', undefined, ['/lockers']);
      toast.success('Security alert ignored');
      setDismissedIds(prev => new Set([...prev, eventId]));
      setSecurityAlerts(prev => prev.filter(e => e._id !== eventId));
      fetchAll(token, user, true);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const dismissAlert = (eventId: string) => {
    setDismissedIds(prev => new Set([...prev, eventId]));
    setSecurityAlerts(prev => prev.filter(e => e._id !== eventId));
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
    if (l.isMaintenance) return "maintenance";
    if (l.isBooked) return "occupied";
    return "available";
  };

  if (!user) return null;

  const isUser = user.role === 'USER';
  const isSubAdmin = user.role === 'SUB_ADMIN' || user.role === 'SUPER_ADMIN';

  // Build lookup maps entirely on the frontend — no backend populate needed
  const lockerMap: Record<string, string> = {};
  for (const l of allLockers) { lockerMap[l._id] = l.code; }

  const stationMap: Record<string, string> = {};
  for (const s of stationsList) { stationMap[s._id] = s.name || s.code; }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Hi {user.name}:</h1>
      </div>

      {/* ── Security Alert Notifications (sub-admin & super-admin) ── */}
      {isSubAdmin && (
        <SecurityAlertsPanel
          alerts={securityAlerts}
          newAlertIds={newAlertIds}
          onIgnore={(lockerId) => ignoreAlertAndDismiss(lockerId, securityAlerts.find(e => e.lockerId === lockerId)?._id ?? '')}
          onDismiss={dismissAlert}
          isSubAdmin={isSubAdmin}
          lockerMap={lockerMap}
          stationMap={stationMap}
        />
      )}

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
            <div className="space-y-3">
              {pendingRequests.map(req => {
                const submittedAt = req.createdAt ? new Date(req.createdAt) : null;
                const dateStr = submittedAt
                  ? submittedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                  : '—';
                const timeStr = submittedAt
                  ? submittedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : '—';

                return (
                  <div
                    key={req._id}
                    className="relative p-4 rounded-2xl border border-border border-l-4 border-l-warning bg-warning/5 hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex flex-col sm:flex-row gap-4 sm:items-start justify-between">
                      {/* Left: user & request info */}
                      <div className="flex-1 min-w-0 space-y-2">

                        {/* Row 1: User name + status badge */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-base font-bold text-foreground">
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-warning/20 text-warning text-xs font-bold flex-shrink-0">
                              {req.userId?.name?.[0]?.toUpperCase() ?? '?'}
                            </span>
                            {req.userId?.name ?? 'Unknown User'}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-warning/15 text-warning">
                            {req.status}
                          </span>
                        </div>

                        {/* Row 2: Station */}
                        <p className="text-sm text-muted-foreground">
                          Station: <span className="font-semibold text-foreground">{req.stationId?.name || req.stationId?.code || '—'}</span>
                        </p>

                        {/* Row 3: Note */}
                        {req.note && (
                          <p className="text-sm text-muted-foreground italic">"{req.note}"</p>
                        )}

                        {/* Row 4: Date & Time */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Requested on <span className="font-semibold text-foreground">{dateStr}</span></span>
                          <span>·</span>
                          <span className="font-semibold text-foreground">{timeStr}</span>
                        </div>
                      </div>

                      {/* Right: action buttons */}
                      <div className="flex sm:flex-col gap-2 sm:items-end justify-end flex-shrink-0">
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-success hover:bg-success/90 text-success-foreground rounded-xl px-4"
                          onClick={() => approveRequest(req._id)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="rounded-xl px-4"
                          onClick={() => rejectRequest(req._id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-semibold">Locker Grid</h2>
              {user.role === 'SUPER_ADMIN' && selectedGridStation && (() => {
                const st = stationsList.find(s => s._id === selectedGridStation);
                return st ? (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Showing <span className="font-semibold text-foreground">{st.name || st.code}</span> — {lockers.length} locker{lockers.length !== 1 ? 's' : ''}
                  </p>
                ) : null;
              })()}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Station filter — Super Admin only */}
              {user.role === 'SUPER_ADMIN' && (
                <Select value={selectedGridStation} onValueChange={setSelectedGridStation}>
                  <SelectTrigger className="h-9 w-[190px] rounded-xl bg-card border-border">
                    <SelectValue placeholder="Select station" />
                  </SelectTrigger>
                  <SelectContent>
                    {stationsList.map(s => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name || s.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {/* Status legend */}
              <div className="flex flex-wrap gap-2">
                {(Object.keys(statusStyles) as LockerStatus[]).map((k) => (
                  <span key={k} className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", statusStyles[k].chip)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", statusStyles[k].dot)} />
                    {statusStyles[k].label}
                  </span>
                ))}
              </div>
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
                  
                  {l.securityAlertActive && (
                    <div className="mt-3 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                      </span>
                      Security Alert!
                    </div>
                  )}

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
                    <div className="mt-4 pt-3 border-t border-border flex flex-col gap-2">
                      <div className="grid grid-cols-3 gap-2">
                        <Button title="Unlock" size="sm" variant="outline" className="h-8 text-[11px] px-2" onClick={() => commandLocker(l._id, 'unlock')}><Unlock className="w-3 h-3" /></Button>
                        <Button title="Lock" size="sm" variant="outline" className="h-8 text-[11px] px-2" onClick={() => commandLocker(l._id, 'lock')}><LockKeyhole className="w-3 h-3" /></Button>
                        <Button title="Release User" size="sm" variant="outline" className="h-8 text-[11px] px-2 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => commandLocker(l._id, 'release')}><LogOut className="w-3 h-3" /></Button>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <Button size="sm" variant="outline" className={cn("h-8 text-[11px] px-2", l.isMaintenance ? "border-success/30 text-success hover:bg-success/10" : "border-warning/30 text-warning hover:bg-warning/10")} onClick={() => commandLocker(l._id, 'maintenance')}><Wrench className="w-3 h-3 mr-1" /> {l.isMaintenance ? 'Mark Ready' : 'Maintenance'}</Button>
                        {l.securityAlertActive && (
                          <Button size="sm" variant="outline" className="h-8 text-[11px] px-2 bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20" onClick={() => commandLocker(l._id, 'security-ignore')}><CheckCircle2 className="w-3 h-3 mr-1" /> Ignore Alert</Button>
                        )}
                      </div>
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
