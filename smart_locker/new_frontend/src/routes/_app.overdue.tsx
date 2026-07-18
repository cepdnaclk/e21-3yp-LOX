import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Clock, AlertTriangle, CheckCircle2, TrendingUp, Users,
  DollarSign, Settings2, ChevronUp, ChevronDown, Minus, Plus,
  Calendar, Timer, LockKeyhole, DoorOpen, DoorClosed, RefreshCw,
  Filter, CreditCard, ShieldCheck
} from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { apiGet, apiMutate } from "@/lib/api";

export const Route = createFileRoute("/_app/overdue")({
  head: () => ({ meta: [{ title: "Overdue Payments — LOX Smart Locker" }] }),
  component: OverduePage,
});

// Default settings (used before station data loads)
const DEFAULTS = { freeDurationMinutes: 15, gracePeriodMinutes: 10, overdueRatePerHour: 300 };
type Period = "week" | "month" | "year";
type OverdueSettings = { freeDurationMinutes: number; gracePeriodMinutes: number; overdueRatePerHour: number };

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  return `${fmtDate(iso)}  ${fmtTime(iso)}`;
}
function elapsedMinutes(from?: string | null): number {
  if (!from) return 0;
  return Math.max(0, (Date.now() - new Date(from).getTime()) / 60_000);
}
function fmtDuration(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function calcCharge(overdueMinutes: number, ratePerHour: number): number {
  return Math.max(0, Math.ceil(overdueMinutes)) * (ratePerHour / 60);
}
function isInPeriod(iso: string, period: Period) {
  const d = new Date(iso); const n = new Date();
  if (period === "week") return d >= new Date(n.getTime() - 7 * 86400000);
  if (period === "month") return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
  return d.getFullYear() === n.getFullYear();
}

interface LockerUsage {
  requestId: string;
  userId: { _id: string; name: string; email: string } | null;
  lockerId: { _id: string; code: string; lockState: string; doorState: string } | null;
  stationId: { _id: string; name: string; code: string } | null;
  approvedAt: string | null;
  createdAt: string;
  usedMinutes: number;
  overdueMinutes: number;
  charge: number;
  isOverdue: boolean;
}

// ─── Overdue Settings Card (all 3 settings, saved to DB) ─────────────────────
function OverdueSettingsCard({
  stationId, settings, onSaved
}: {
  stationId: string;
  settings: OverdueSettings;
  onSaved: (s: OverdueSettings) => void;
}) {
  const [draft, setDraft] = useState<OverdueSettings>({ ...settings });
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft({ ...settings }), [settings]);

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const changed =
    draft.freeDurationMinutes !== settings.freeDurationMinutes ||
    draft.gracePeriodMinutes !== settings.gracePeriodMinutes ||
    draft.overdueRatePerHour !== settings.overdueRatePerHour;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiMutate<{ station: any }>(
        `/stations/${stationId}/overdue-settings`,
        'PATCH',
        draft,
        ['/stations']
      );
      const s = res.station;
      const saved: OverdueSettings = {
        freeDurationMinutes: s.freeDurationMinutes ?? draft.freeDurationMinutes,
        gracePeriodMinutes:  s.gracePeriodMinutes  ?? draft.gracePeriodMinutes,
        overdueRatePerHour:  s.overdueRatePerHour  ?? draft.overdueRatePerHour,
      };
      onSaved(saved);
      toast.success('Overdue settings saved to database');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const NumControl = ({ label, field, unit, min, max, step, help }: {
    label: string; field: keyof OverdueSettings; unit: string;
    min: number; max: number; step: number; help?: string;
  }) => (
    <div className="flex-1 min-w-[200px] space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg flex-shrink-0"
          onClick={() => setDraft(d => ({ ...d, [field]: clamp(d[field] - step, min, max) }))}>
          <Minus className="w-4 h-4" />
        </Button>
        <div className="flex-1 text-center">
          <p className="text-3xl font-extrabold text-primary tabular-nums leading-none">{draft[field]}</p>
        </div>
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg flex-shrink-0"
          onClick={() => setDraft(d => ({ ...d, [field]: clamp(d[field] + step, min, max) }))}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <input type="range" min={min} max={max} step={step} value={draft[field]}
        onChange={e => setDraft(d => ({ ...d, [field]: Number(e.target.value) }))}
        className="w-full accent-primary cursor-pointer h-1.5" />
      {help && <p className="text-[11px] text-muted-foreground">{help}</p>}
    </div>
  );

  return (
    <div className="card-soft p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center"><Settings2 className="w-5 h-5 text-primary" /></div>
        <div>
          <h2 className="text-base font-semibold">Overdue Payment Settings</h2>
          <p className="text-xs text-muted-foreground">Saved per-station to the database — changes apply immediately</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-6">
        <NumControl
          label="Free Duration" field="freeDurationMinutes" unit="minutes"
          min={0} max={120} step={5}
          help="Minutes a user may use the locker for free before overdue charges begin"
        />
        <NumControl
          label="Grace Period (post-payment)" field="gracePeriodMinutes" unit="minutes"
          min={0} max={60} step={5}
          help="Time after payment is confirmed for user to remove goods and release locker"
        />
        <NumControl
          label="Overdue Rate" field="overdueRatePerHour" unit="LKR / hour"
          min={0} max={3000} step={50}
          help={`Charged at LKR ${(draft.overdueRatePerHour / 60).toFixed(2)} per overdue minute`}
        />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="p-3 rounded-xl bg-muted/50 flex items-center gap-2 text-xs text-muted-foreground">
          <DollarSign className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
          Rate per minute: <span className="font-semibold text-foreground ml-1">
            LKR {(draft.overdueRatePerHour / 60).toFixed(2)}
          </span>
          <span className="mx-2">·</span>
          Free period: <span className="font-semibold text-foreground ml-1">{draft.freeDurationMinutes} min</span>
          <span className="mx-2">·</span>
          Grace: <span className="font-semibold text-foreground ml-1">{draft.gracePeriodMinutes} min</span>
        </div>
        <div className="flex items-center gap-3">
          {changed && <p className="text-xs text-warning font-medium">Unsaved changes</p>}
          <Button onClick={handleSave} disabled={!changed || saving}
            className="rounded-xl gradient-primary text-primary-foreground h-10 px-6 font-semibold">
            {saving ? 'Saving…' : 'Save to Database'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, iconCls }: { icon: any; label: string; value: string | number; sub?: string; iconCls: string }) {
  return (
    <div className="card-soft p-5 flex gap-4 items-start">
      <div className={cn("h-11 w-11 rounded-xl grid place-items-center flex-shrink-0", iconCls)}><Icon className="w-5 h-5" /></div>
      <div>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function RevenueSummary({ activeRows, completedRows }: { activeRows: LockerUsage[]; completedRows: any[] }) {
  const [period, setPeriod] = useState<Period>("month");
  
  const inPeriodActive = activeRows.filter(r => r.isOverdue && r.approvedAt && isInPeriod(r.approvedAt, period));
  const activeAccrued = inPeriodActive.reduce((s, r) => s + r.charge, 0);

  const inPeriodPaid = completedRows.filter(r => r.pmtStatus === "PAID" && r.closedAt && isInPeriod(r.closedAt, period));
  const paidCollected = inPeriodPaid.reduce((s, r) => s + r.charge, 0);

  const total = activeAccrued + paidCollected;
  const sessions = inPeriodActive.length + inPeriodPaid.length;
  const avg = sessions ? Math.round(total / sessions) : 0;

  return (
    <div className="card-soft p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 grid place-items-center"><TrendingUp className="w-5 h-5 text-emerald-500" /></div>
          <div>
            <h2 className="text-base font-semibold">Overdue Revenue Summary</h2>
            <p className="text-xs text-muted-foreground">Collected and accrued charges</p>
          </div>
        </div>
        <Select value={period} onValueChange={v => setPeriod(v as Period)}>
          <SelectTrigger className="h-9 w-36 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 text-center">
          <p className="text-xs text-muted-foreground mb-1">Actually Collected</p>
          <p className="text-3xl font-extrabold text-emerald-500">LKR {Math.round(paidCollected).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">{period === "week" ? "last 7 days" : period === "month" ? "this month" : "this year"}</p>
        </div>
        <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/15 text-center">
          <p className="text-xs text-muted-foreground mb-1">Currently Accrued</p>
          <p className="text-3xl font-extrabold text-orange-500">LKR {Math.round(activeAccrued).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">unpaid from {inPeriodActive.length} active lockers</p>
        </div>
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15 text-center">
          <p className="text-xs text-muted-foreground mb-1">Combined Total</p>
          <p className="text-3xl font-extrabold text-primary">LKR {Math.round(total).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">{sessions} total overdue sessions</p>
        </div>
      </div>
    </div>
  );
}

function OverdueBadge({ minutes }: { minutes: number }) {
  const cls = minutes < 15 ? "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20" :
              minutes < 60 ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" :
                             "bg-red-500/10 text-red-500 border border-red-500/20";
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold", cls)}>
      <Timer className="w-3 h-3" />{fmtDuration(minutes)}
    </span>
  );
}

function ActiveOverdueSection({ rows, freeDuration, onRefresh }: { rows: LockerUsage[]; freeDuration: number; onRefresh: () => void }) {
  type SK = "overdueMinutes" | "charge" | "approvedAt";
  const [sk, setSk] = useState<SK>("approvedAt");
  const [sd, setSd] = useState<"desc" | "asc">("desc");
  const [filter, setFilter] = useState<"all" | "overdue" | "free">("all");
  const [page, setPage] = useState(1);
  const PAGE = 8;

  const toggleSort = (k: SK) => { if (sk === k) setSd(d => d === "desc" ? "asc" : "desc"); else { setSk(k); setSd("desc"); } setPage(1); };
  const SI = ({ k }: { k: SK }) => sk === k ? (sd === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />) : null;

  const filtered = rows
    .filter(r => filter === "all" ? true : filter === "overdue" ? r.isOverdue : !r.isOverdue)
    .sort((a, b) => {
      const m = sd === "desc" ? -1 : 1;
      if (sk === "overdueMinutes") return m * (a.overdueMinutes - b.overdueMinutes);
      if (sk === "charge") return m * (a.charge - b.charge);
      return m * (new Date(a.approvedAt ?? 0).getTime() - new Date(b.approvedAt ?? 0).getTime());
    });

  const total = filtered.length, pages = Math.max(1, Math.ceil(total / PAGE));
  const paged = filtered.slice((page - 1) * PAGE, page * PAGE);
  const TH = ({ children, k }: { children: React.ReactNode; k?: SK }) => (
    <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap", k && "cursor-pointer hover:text-foreground select-none")} onClick={k ? () => toggleSort(k) : undefined}>
      <span className="inline-flex items-center gap-1">{children}{k && <SI k={k} />}</span>
    </th>
  );

  return (
    <div className="card-soft overflow-hidden">
      <div className="px-6 py-5 flex flex-wrap items-center gap-3 justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-red-500/10 grid place-items-center"><AlertTriangle className="w-4 h-4 text-red-500" /></div>
          <div>
            <h2 className="text-base font-semibold">Active Locker Usage</h2>
            <p className="text-xs text-muted-foreground">{rows.length} assigned · free: {freeDuration} min</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={v => { setFilter(v as any); setPage(1); }}>
            <SelectTrigger className="h-9 w-40 rounded-xl"><Filter className="w-3.5 h-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              <SelectItem value="overdue">Overdue Only</SelectItem>
              <SelectItem value="free">Within Free Period</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={onRefresh}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      {paged.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="text-sm">No active locker sessions found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur border-b border-border">
              <tr>
                <TH>Locker</TH>
                <TH>User</TH>
                <TH>User ID</TH>
                <TH k="approvedAt">Reserved / Opened</TH>
                <TH>Free Period</TH>
                <TH k="overdueMinutes">Overdue Duration</TH>
                <TH k="charge">Charge (LKR)</TH>
                <TH>Door</TH>
                <TH>Lock State</TH>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.map((row, i) => (
                <motion.tr key={row.requestId} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className={cn("hover:bg-muted/30 transition-colors", row.isOverdue && "bg-red-500/[0.03]")}>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 font-bold"><LockKeyhole className="w-3.5 h-3.5 text-primary" />{row.lockerId?.code ?? "—"}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-bold flex-shrink-0">{row.userId?.name?.[0]?.toUpperCase() ?? "?"}</span>
                      <div><p className="font-medium leading-tight">{row.userId?.name ?? "—"}</p><p className="text-[11px] text-muted-foreground">{row.userId?.email ?? ""}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{row.userId?._id ? `…${row.userId._id.slice(-8)}` : "—"}</span></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground min-w-[140px]">
                    <div className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(row.approvedAt)}</div>
                    <div className="flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" />{fmtTime(row.approvedAt)}</div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">{freeDuration} min</span></td>
                  <td className="px-4 py-3">
                    {row.isOverdue ? <OverdueBadge minutes={row.overdueMinutes} /> :
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" />In free period</span>}
                  </td>
                  <td className="px-4 py-3">{row.isOverdue ? <span className="font-bold text-red-500 text-sm">LKR {row.charge.toLocaleString()}</span> : <span className="text-xs text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", row.lockerId?.doorState === "OPEN" ? "text-orange-500" : "text-emerald-500")}>
                      {row.lockerId?.doorState === "OPEN" ? <><DoorOpen className="w-3.5 h-3.5" />Open</> : <><DoorClosed className="w-3.5 h-3.5" />Closed</>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", row.lockerId?.lockState === "LOCKED" ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500")}>
                      {row.lockerId?.lockState ?? "—"}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="px-6 py-4 border-t border-border flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Showing {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, total)} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-lg" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <Button variant="outline" size="sm" className="rounded-lg" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CompletedPaymentsSection({ completedRows }: { completedRows: any[] }) {
  const [page, setPage] = useState(1);
  const PAGE = 8;
  const total = completedRows.length, pages = Math.max(1, Math.ceil(total / PAGE));
  const paged = completedRows.slice((page - 1) * PAGE, page * PAGE);

  const getPmtBadge = (status: string, reqStatus: string) => {
    if (status === "PAID") return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500">PAID</span>;
    if (status === "UNPAID") return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-500">UNPAID ({reqStatus})</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">Free</span>;
  };

  return (
    <div className="card-soft overflow-hidden mt-8">
      <div className="px-6 py-5 flex items-center gap-3 border-b border-border">
        <div className="h-9 w-9 rounded-xl bg-emerald-500/10 grid place-items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>
        <div>
          <h2 className="text-base font-semibold">Completed Overdue Payments & Closed Sessions</h2>
          <p className="text-xs text-muted-foreground">Historical records of paid sessions and free releases</p>
        </div>
      </div>
      {paged.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground"><CreditCard className="w-12 h-12 mx-auto mb-3 opacity-25" /><p className="text-sm">No completed sessions yet.</p></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur border-b border-border">
              <tr>
                {["Locker", "User", "Closed / Paid At", "Total Duration", "Due Time (Overdue)", "Amount", "Payment Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.map((req, i) => (
                <motion.tr key={req._id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-bold"><span className="inline-flex items-center gap-1.5"><LockKeyhole className="w-3.5 h-3.5 text-primary" />{req.lockerId?.code ?? "—"}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-full bg-muted text-muted-foreground grid place-items-center text-xs font-bold flex-shrink-0">{req.userId?.name?.[0]?.toUpperCase() ?? "?"}</span>
                      <div>
                        <p className="font-medium leading-tight">{req.userId?.name ?? "—"}</p>
                        <p className="text-[11px] font-mono text-muted-foreground">{req.userId?._id ? `ID: …${req.userId._id.slice(-6)}` : "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground min-w-[130px]">
                    <div className="flex items-center gap-1"><Calendar className="w-3 h-3 flex-shrink-0" />{fmtDate(req.closedAt)}</div>
                    <div className="flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3 flex-shrink-0" />{fmtTime(req.closedAt)}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{req.approvedAt ? fmtDuration(req.usedMinutes) : "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {req.overdueMinutes > 0 ? (
                      <span className="text-orange-500 font-semibold inline-flex items-center gap-1">
                        <Timer className="w-3 h-3" /> {fmtDuration(req.overdueMinutes)}
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {req.charge > 0 ? <span className="font-bold text-foreground">LKR {Math.round(req.charge).toLocaleString()}</span> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">{getPmtBadge(req.pmtStatus, req.status)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="px-6 py-4 border-t border-border flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Showing {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, total)} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-lg" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <Button variant="outline" size="sm" className="rounded-lg" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function OverduePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Station settings fetched from DB; keyed by stationId
  const [settingsMap, setSettingsMap] = useState<Record<string, OverdueSettings>>({});
  // Active station (first station the admin manages, or selected)
  const [activeStationId, setActiveStationId] = useState<string>('');
  const [stationsList, setStationsList] = useState<any[]>([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    const uStr = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (!token || !uStr) { navigate({ to: "/" }); return; }
    const u = JSON.parse(uStr);
    if (u.role !== "SUB_ADMIN" && u.role !== "SUPER_ADMIN") { navigate({ to: "/dashboard" }); return; }
    setUser(u);
  }, [navigate]);

  // Fetch stations and build settingsMap
  const fetchStations = useCallback(async (skipCache = false) => {
    try {
      const data = await apiGet<{ stations: any[] }>('/stations', { skipCache });
      const list = data.stations || [];
      setStationsList(list);
      if (list.length > 0 && !activeStationId) setActiveStationId(list[0]._id);
      const map: Record<string, OverdueSettings> = {};
      for (const s of list) {
        map[s._id] = {
          freeDurationMinutes: s.freeDurationMinutes ?? DEFAULTS.freeDurationMinutes,
          gracePeriodMinutes:  s.gracePeriodMinutes  ?? DEFAULTS.gracePeriodMinutes,
          overdueRatePerHour:  s.overdueRatePerHour  ?? DEFAULTS.overdueRatePerHour,
        };
      }
      setSettingsMap(map);
    } catch (e) { console.error(e); }
  }, [activeStationId]);

  const fetchRequests = useCallback(async (skipCache = false) => {
    try {
      const data = await apiGet<{ requests: any[] }>("/requests", { skipCache });
      setAllRequests(data.requests || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchStations();
    fetchRequests();
    const a = setInterval(() => fetchRequests(true), 15_000);
    const b = setInterval(() => setTick(t => t + 1), 60_000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [user, fetchRequests, fetchStations]);

  // Current station's settings (falls back to defaults if not yet loaded)
  const activeSettings: OverdueSettings = settingsMap[activeStationId] ?? DEFAULTS;
  const { freeDurationMinutes, gracePeriodMinutes, overdueRatePerHour } = activeSettings;

  const onSettingsSaved = (saved: OverdueSettings) => {
    setSettingsMap(m => ({ ...m, [activeStationId]: saved }));
  };

  const activeRows: LockerUsage[] = allRequests
    .filter(r => r.status === "APPROVED" && r.lockerId)
    .map(req => {
      // Use per-station rate if we can resolve the station
      const stId = req.stationId?._id || req.stationId;
      const stSettings = settingsMap[stId] ?? activeSettings;
      const used = elapsedMinutes(req.approvedAt);
      const ov = Math.max(0, used - stSettings.freeDurationMinutes);
      return {
        requestId: req._id, userId: req.userId, lockerId: req.lockerId,
        stationId: req.stationId, approvedAt: req.approvedAt, createdAt: req.createdAt,
        usedMinutes: used, overdueMinutes: ov,
        charge: calcCharge(ov, stSettings.overdueRatePerHour),
        isOverdue: ov > 0
      };
    });

  const overdueCount = activeRows.filter(r => r.isOverdue).length;
  const totalCharge = activeRows.reduce((s, r) => s + r.charge, 0);

  const completedRows = allRequests
    .filter(r => ["RELEASED", "CANCELLED", "REJECTED"].includes(r.status))
    .map(req => {
      const stId = req.stationId?._id || req.stationId;
      const stSettings = settingsMap[stId] ?? activeSettings;
      const closedAt = req.rejectedAt || req.updatedAt || new Date();
      let used = 0, ov = 0, charge = 0;
      if (req.approvedAt) {
        used = Math.max(0, (new Date(closedAt).getTime() - new Date(req.approvedAt).getTime()) / 60_000);
        ov = Math.max(0, used - stSettings.freeDurationMinutes);
        charge = calcCharge(ov, stSettings.overdueRatePerHour);
      }
      let pmtStatus = "N/A";
      if (charge > 0) {
        pmtStatus = req.status === "RELEASED" ? "PAID" : "UNPAID";
      }
      return { ...req, closedAt, usedMinutes: used, overdueMinutes: ov, charge, pmtStatus, stSettings };
    })
    .sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());

  if (!user) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overdue Payments</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor locker usage, configure grace periods, and track overdue charges</p>
      </div>

      {/* Station selector (SUPER_ADMIN sees all stations; SUB_ADMIN sees their own) */}
      {stationsList.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Station settings for:</span>
          <Select value={activeStationId} onValueChange={setActiveStationId}>
            <SelectTrigger className="h-9 w-52 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {stationsList.map(s => <SelectItem key={s._id} value={s._id}>{s.name || s.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}         label="Active Sessions" value={activeRows.length}                    sub="currently assigned"         iconCls="bg-primary/10 text-primary" />
        <StatCard icon={AlertTriangle} label="Overdue Now"     value={overdueCount}                          sub="exceeding free period"      iconCls="bg-red-500/10 text-red-500" />
        <StatCard icon={DollarSign}    label="Total Accrued"   value={`LKR ${Math.round(totalCharge).toLocaleString()}`} sub="live overdue charges" iconCls="bg-orange-500/10 text-orange-500" />
        <StatCard icon={Clock}         label="Free Duration"   value={`${freeDurationMinutes} min`}          sub={`LKR ${(overdueRatePerHour/60).toFixed(2)}/min after`} iconCls="bg-emerald-500/10 text-emerald-500" />
      </div>

      {/* Settings card — reads from and writes to DB */}
      {activeStationId ? (
        <OverdueSettingsCard
          stationId={activeStationId}
          settings={activeSettings}
          onSaved={onSettingsSaved}
        />
      ) : (
        <div className="card-soft p-6 text-center text-muted-foreground text-sm">No station found — settings unavailable.</div>
      )}

      <RevenueSummary activeRows={activeRows} completedRows={completedRows} />

      {loading ? (
        <div className="card-soft p-20 text-center text-muted-foreground">
          <RefreshCw className="w-10 h-10 mx-auto mb-4 animate-spin opacity-30" />
          <p className="text-sm">Loading locker sessions…</p>
        </div>
      ) : (
        <ActiveOverdueSection rows={activeRows} freeDuration={freeDurationMinutes} onRefresh={() => fetchRequests(true)} />
      )}

      <CompletedPaymentsSection completedRows={completedRows} />
    </div>
  );
}

