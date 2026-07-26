import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Activity, Users, Zap, ShieldAlert, Wrench, LockKeyhole, DollarSign, Building2 } from "lucide-react";
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from "recharts";
import { AnimatedNumber } from "@/components/animated-number";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiGet } from "@/lib/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/analytics")({
  head: () => ({ meta: [{ title: "Analytics — LOX Smart Locker" }] }),
  component: AnalyticsPage,
});

function Kpi({ icon: Icon, label, value, textValue, accent, prefix = "" }: { icon: any; label: string; value?: number; textValue?: string; accent: string; prefix?: string }) {
  return (
    <motion.div whileHover={{ y: -4 }} className="card-soft p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold">
            {prefix}
            {value !== undefined ? <AnimatedNumber value={value} /> : textValue}
          </p>
        </div>
        <div className={`h-10 w-10 rounded-xl grid place-items-center ${accent}`}>
          <Icon className="h-5 w-5 text-primary-foreground" />
        </div>
      </div>
    </motion.div>
  );
}

function UsageTrendsChart({ requests }: { requests: any[] }) {
  const [filter, setFilter] = useState<"week" | "month" | "year">("week");

  let chartData: any[] = [];
  const now = new Date();
  
  if (filter === "week") {
    chartData = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (6 - i));
      return {
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        requests: 0
      };
    });
    
    requests.forEach(r => {
      const rDate = new Date(r.createdAt);
      const diffTime = Math.abs(now.getTime() - rDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        chartData[6 - diffDays].requests += 1;
      }
    });
  } else if (filter === "month") {
    chartData = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (29 - i));
      return {
        label: d.getDate().toString(),
        requests: 0
      };
    });
    
    requests.forEach(r => {
      const rDate = new Date(r.createdAt);
      const diffTime = Math.abs(now.getTime() - rDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 30) {
        chartData[29 - diffDays].requests += 1;
      }
    });
  } else if (filter === "year") {
    const currentYear = now.getFullYear();
    chartData = Array.from({ length: 12 }).map((_, i) => ({
      label: new Date(currentYear, i, 1).toLocaleDateString('en-US', { month: 'short' }),
      requests: 0
    }));

    requests.forEach(r => {
      const rDate = new Date(r.createdAt);
      if (rDate.getFullYear() === currentYear) {
        chartData[rDate.getMonth()].requests += 1;
      }
    });
  }

  return (
    <div className="lg:col-span-2 card-soft p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-lg">Usage Trends</h2>
          <p className="text-sm text-muted-foreground">Volume of access requests over time.</p>
        </div>
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-[180px] bg-card border-border">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Weekly (Last 7 Days)</SelectItem>
            <SelectItem value="month">Monthly (Last 30 Days)</SelectItem>
            <SelectItem value="year">Yearly (This Year)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="h-80 mt-6">
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="label" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} cursor={{ fill: "transparent" }} />
            <Bar dataKey="requests" name="Requests" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function QueueTrendsChart({ queueEntries }: { queueEntries: any[] }) {
  const [filter, setFilter] = useState<"week" | "month" | "year">("week");

  let chartData: any[] = [];
  const now = new Date();
  
  if (filter === "week") {
    chartData = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (6 - i));
      return {
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        users: 0
      };
    });
    
    queueEntries.forEach(q => {
      const qDate = new Date(q.createdAt);
      const diffTime = Math.abs(now.getTime() - qDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        chartData[6 - diffDays].users += 1;
      }
    });
  } else if (filter === "month") {
    chartData = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (29 - i));
      return {
        label: d.getDate().toString(),
        users: 0
      };
    });
    
    queueEntries.forEach(q => {
      const qDate = new Date(q.createdAt);
      const diffTime = Math.abs(now.getTime() - qDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 30) {
        chartData[29 - diffDays].users += 1;
      }
    });
  } else if (filter === "year") {
    const currentYear = now.getFullYear();
    chartData = Array.from({ length: 12 }).map((_, i) => ({
      label: new Date(currentYear, i, 1).toLocaleDateString('en-US', { month: 'short' }),
      users: 0
    }));

    queueEntries.forEach(q => {
      const qDate = new Date(q.createdAt);
      if (qDate.getFullYear() === currentYear) {
        chartData[qDate.getMonth()].users += 1;
      }
    });
  }

  return (
    <div className="lg:col-span-2 card-soft p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-lg">Queue Status Trends</h2>
          <p className="text-sm text-muted-foreground">Number of users who entered the queue over time.</p>
        </div>
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-[180px] bg-card border-border">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Weekly (Last 7 Days)</SelectItem>
            <SelectItem value="month">Monthly (Last 30 Days)</SelectItem>
            <SelectItem value="year">Yearly (This Year)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="h-80 mt-6">
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="label" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} cursor={{ fill: "transparent" }} />
            <Bar dataKey="users" name="Queued Users" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Super Admin versions with extra station filter
function SuperAdminUsageTrendsChart({ requests, stations }: { requests: any[], stations: any[] }) {
  const [filter, setFilter] = useState<"week" | "month" | "year">("week");
  const [stationFilter, setStationFilter] = useState<string>("all");

  const filteredRequests = stationFilter === "all"
    ? requests
    : requests.filter(r => r.stationId?._id === stationFilter || r.stationId === stationFilter);

  let chartData: any[] = [];
  const now = new Date();

  if (filter === "week") {
    chartData = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (6 - i));
      return { label: d.toLocaleDateString('en-US', { weekday: 'short' }), requests: 0 };
    });
    filteredRequests.forEach(r => {
      const rDate = new Date(r.createdAt);
      const diffDays = Math.floor(Math.abs(now.getTime() - rDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) chartData[6 - diffDays].requests += 1;
    });
  } else if (filter === "month") {
    chartData = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (29 - i));
      return { label: d.getDate().toString(), requests: 0 };
    });
    filteredRequests.forEach(r => {
      const rDate = new Date(r.createdAt);
      const diffDays = Math.floor(Math.abs(now.getTime() - rDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 30) chartData[29 - diffDays].requests += 1;
    });
  } else {
    const currentYear = now.getFullYear();
    chartData = Array.from({ length: 12 }).map((_, i) => ({
      label: new Date(currentYear, i, 1).toLocaleDateString('en-US', { month: 'short' }),
      requests: 0
    }));
    filteredRequests.forEach(r => {
      const rDate = new Date(r.createdAt);
      if (rDate.getFullYear() === currentYear) chartData[rDate.getMonth()].requests += 1;
    });
  }

  const selectedStationName = stationFilter === "all"
    ? "All Stations"
    : stations.find(s => s._id === stationFilter)?.name || stationFilter;

  return (
    <div className="lg:col-span-2 card-soft p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-lg">Usage Trends</h2>
          <p className="text-sm text-muted-foreground">Volume of access requests over time.</p>
          {stationFilter !== "all" && (
            <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {selectedStationName}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={stationFilter} onValueChange={setStationFilter}>
            <SelectTrigger className="w-[160px] bg-card border-border">
              <SelectValue placeholder="All Stations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stations</SelectItem>
              {stations.map(s => (
                <SelectItem key={s._id} value={s._id}>{s.name || s.code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-[180px] bg-card border-border">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Weekly (Last 7 Days)</SelectItem>
              <SelectItem value="month">Monthly (Last 30 Days)</SelectItem>
              <SelectItem value="year">Yearly (This Year)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="h-80 mt-6">
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="label" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} cursor={{ fill: "transparent" }} />
            <Bar dataKey="requests" name="Requests" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SuperAdminQueueTrendsChart({ queueEntries, stations }: { queueEntries: any[], stations: any[] }) {
  const [filter, setFilter] = useState<"week" | "month" | "year">("week");
  const [stationFilter, setStationFilter] = useState<string>("all");

  const filteredEntries = stationFilter === "all"
    ? queueEntries
    : queueEntries.filter(q => q.stationId?._id === stationFilter || q.stationId === stationFilter);

  let chartData: any[] = [];
  const now = new Date();

  if (filter === "week") {
    chartData = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (6 - i));
      return { label: d.toLocaleDateString('en-US', { weekday: 'short' }), users: 0 };
    });
    filteredEntries.forEach(q => {
      const qDate = new Date(q.createdAt);
      const diffDays = Math.floor(Math.abs(now.getTime() - qDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) chartData[6 - diffDays].users += 1;
    });
  } else if (filter === "month") {
    chartData = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (29 - i));
      return { label: d.getDate().toString(), users: 0 };
    });
    filteredEntries.forEach(q => {
      const qDate = new Date(q.createdAt);
      const diffDays = Math.floor(Math.abs(now.getTime() - qDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 30) chartData[29 - diffDays].users += 1;
    });
  } else {
    const currentYear = now.getFullYear();
    chartData = Array.from({ length: 12 }).map((_, i) => ({
      label: new Date(currentYear, i, 1).toLocaleDateString('en-US', { month: 'short' }),
      users: 0
    }));
    filteredEntries.forEach(q => {
      const qDate = new Date(q.createdAt);
      if (qDate.getFullYear() === currentYear) chartData[qDate.getMonth()].users += 1;
    });
  }

  const selectedStationName = stationFilter === "all"
    ? "All Stations"
    : stations.find(s => s._id === stationFilter)?.name || stationFilter;

  return (
    <div className="lg:col-span-2 card-soft p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-lg">Queue Status Trends</h2>
          <p className="text-sm text-muted-foreground">Number of users who entered the queue over time.</p>
          {stationFilter !== "all" && (
            <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
              {selectedStationName}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={stationFilter} onValueChange={setStationFilter}>
            <SelectTrigger className="w-[160px] bg-card border-border">
              <SelectValue placeholder="All Stations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stations</SelectItem>
              {stations.map(s => (
                <SelectItem key={s._id} value={s._id}>{s.name || s.code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-[180px] bg-card border-border">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Weekly (Last 7 Days)</SelectItem>
              <SelectItem value="month">Monthly (Last 30 Days)</SelectItem>
              <SelectItem value="year">Yearly (This Year)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="h-80 mt-6">
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="label" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} cursor={{ fill: "transparent" }} />
            <Bar dataKey="users" name="Queued Users" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Sub Admin View
function SubAdminAnalytics({ requests, lockers, stations, queueEntries }: { requests: any[], lockers: any[], stations: any[], queueEntries: any[] }) {
  // KPI Data
  const totalLockers = lockers.length;
  const bookedLockers = lockers.filter(l => l.isBooked).length;
  const maintenanceLockers = lockers.filter(l => l.isMaintenance).length;
  const occupancyRate = totalLockers > 0 ? Math.round((bookedLockers / totalLockers) * 100) : 0;

  // Most Used Lockers (Heatmap)
  const lockerUsageMap: Record<string, number> = {};
  lockers.forEach(l => lockerUsageMap[l.code] = 0);
  requests.forEach(r => {
    if (r.lockerId?.code) {
      lockerUsageMap[r.lockerId.code] = (lockerUsageMap[r.lockerId.code] || 0) + 1;
    }
  });
  const lockerUtilizationData = Object.keys(lockerUsageMap).map(code => ({
    code,
    usage: lockerUsageMap[code]
  })).sort((a, b) => b.usage - a.usage).slice(0, 10); // Top 10

  // Peak Hours (Today)
  const todayHourlyData = Array.from({ length: 24 }).map((_, hour) => ({
    hour: `${hour.toString().padStart(2, '0')}:00`,
    requests: 0
  }));
  
  const startOfToday = new Date();
  startOfToday.setHours(0,0,0,0);
  
  requests.forEach(r => {
    const rDate = new Date(r.createdAt);
    if (rDate >= startOfToday) {
      todayHourlyData[rDate.getHours()].requests += 1;
    }
  });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Kpi icon={Activity} label="Occupancy Rate (%)" value={occupancyRate} accent="bg-primary" />
        <Kpi icon={Users} label="Total Access Requests" value={requests.length} accent="bg-info" />
        <Kpi icon={Wrench} label="Lockers in Maintenance" value={maintenanceLockers} accent="bg-warning" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-soft p-6">
          <h2 className="font-semibold text-lg">Locker Utilization Heatmap</h2>
          <p className="text-sm text-muted-foreground">Top 10 most frequently requested lockers.</p>
          <div className="h-72 mt-6">
            <ResponsiveContainer>
              <BarChart data={lockerUtilizationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="code" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} cursor={{ fill: "transparent" }} />
                <Bar dataKey="usage" name="Usage Count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-soft p-6">
          <h2 className="font-semibold text-lg">Peak Activity Hours</h2>
          <p className="text-sm text-muted-foreground">Request volume by hour (Today).</p>
          <div className="h-72 mt-6">
            <ResponsiveContainer>
              <BarChart data={todayHourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="hour" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} cursor={{ fill: "transparent" }} />
                <Bar dataKey="requests" name="New Requests" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <UsageTrendsChart requests={requests} />
        <QueueTrendsChart queueEntries={queueEntries} />
      </div>
    </div>
  );
}

function MaintenancePieChart({ lockers, stations }: { lockers: any[], stations: any[] }) {
  const [stationFilter, setStationFilter] = useState<string>("all");

  const filteredLockers = stationFilter === "all"
    ? lockers
    : lockers.filter(l => l.stationId?._id === stationFilter || l.stationId === stationFilter);

  const activeCount = filteredLockers.filter(l => !l.isMaintenance).length;
  const maintenanceCount = filteredLockers.filter(l => l.isMaintenance).length;
  const maintenancePct = filteredLockers.length > 0
    ? Math.round((maintenanceCount / filteredLockers.length) * 100)
    : 0;

  const selectedStationName = stationFilter === "all"
    ? null
    : stations.find(s => s._id === stationFilter)?.name || stationFilter;

  return (
    <div className="card-soft p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-1">
        <div>
          <h2 className="font-semibold text-lg">System Health: Maintenance Load</h2>
          <p className="text-sm text-muted-foreground">Percentage of lockers currently offline for maintenance.</p>
          {selectedStationName && (
            <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
              {selectedStationName}
            </span>
          )}
        </div>
        <Select value={stationFilter} onValueChange={setStationFilter}>
          <SelectTrigger className="w-[160px] bg-card border-border flex-shrink-0">
            <SelectValue placeholder="All Stations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stations</SelectItem>
            {stations.map(s => (
              <SelectItem key={s._id} value={s._id}>{s.name || s.code}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="h-64 mt-2 flex items-center justify-center relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[
                { name: 'Active', value: activeCount },
                { name: 'Maintenance', value: maintenanceCount }
              ]}
              cx="50%" cy="50%" innerRadius={70} outerRadius={100}
              dataKey="value"
              stroke="none"
            >
              <Cell fill="#10B981" />
              <Cell fill="#F43F5E" />
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold">{maintenancePct}%</span>
          <span className="text-sm text-muted-foreground">Maintenance</span>
          <span className="text-xs text-muted-foreground mt-1">{filteredLockers.length} lockers</span>
        </div>
      </div>
      <div className="flex justify-center gap-6 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#10B981] inline-block" />
          <span className="text-sm text-muted-foreground">Active ({activeCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#F43F5E] inline-block" />
          <span className="text-sm text-muted-foreground">Maintenance ({maintenanceCount})</span>
        </div>
      </div>
    </div>
  );
}

// Super Admin View
function SuperAdminAnalytics({ requests, lockers, stations, orders, queueEntries }: { requests: any[], lockers: any[], stations: any[], orders: any[], queueEntries: any[] }) {
  const totalRevenue = orders.filter(o => o.status === 'PAID').reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalStations = stations.length;
  const maintenancePercentage = lockers.length > 0 ? Math.round((lockers.filter(l => l.isMaintenance).length / lockers.length) * 100) : 0;

  // Busiest Stations (Macro Heatmap)
  const stationUsageMap: Record<string, number> = {};
  stations.forEach(s => stationUsageMap[s.code] = 0);
  requests.forEach(r => {
    if (r.stationId?.code) {
      stationUsageMap[r.stationId.code] = (stationUsageMap[r.stationId.code] || 0) + 1;
    }
  });
  
  const busiestStationsData = Object.keys(stationUsageMap).map(code => ({
    station: code,
    requests: stationUsageMap[code]
  })).sort((a, b) => b.requests - a.requests);

  // Emergency / Security Alerts
  const securityAlertCount = lockers.filter(l => l.securityAlertActive).length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Kpi icon={DollarSign} label="Total Revenue (USD)" value={totalRevenue} accent="bg-success" prefix="$" />
        <Kpi icon={Building2} label="Total Stations" value={totalStations} accent="bg-primary" />
        <Kpi icon={Wrench} label="System Maintenance Load (%)" value={maintenancePercentage} accent="bg-warning" />
        <Kpi icon={ShieldAlert} label="Active Security Alerts" value={securityAlertCount} accent={securityAlertCount > 0 ? "bg-destructive" : "bg-info"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-soft p-6">
          <h2 className="font-semibold text-lg">Busiest Stations Overview</h2>
          <p className="text-sm text-muted-foreground">Total request volume per station.</p>
          <div className="h-72 mt-6">
            <ResponsiveContainer>
              <BarChart data={busiestStationsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="station" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} cursor={{ fill: "transparent" }} />
                <Bar dataKey="requests" name="Total Requests" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <MaintenancePieChart lockers={lockers} stations={stations} />

        <SuperAdminUsageTrendsChart requests={requests} stations={stations} />
        <SuperAdminQueueTrendsChart queueEntries={queueEntries} stations={stations} />
      </div>
    </div>
  );
}


function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<{
    requests: any[];
    lockers: any[];
    stations: any[];
    orders: any[];
    queueEntries: any[];
  }>({ requests: [], lockers: [], stations: [], orders: [], queueEntries: [] });

  useEffect(() => {
    const uStr = localStorage.getItem('user');
    if (uStr) {
      setUser(JSON.parse(uStr));
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const fetchAnalyticsData = async (skipCache = false) => {
      try {
        const promises: Promise<any>[] = [
          apiGet("/stations", { skipCache }),
          apiGet("/requests", { skipCache }),
          apiGet("/lockers", { skipCache }),
        ];

        if (user.role === 'SUPER_ADMIN') {
          promises.push(apiGet("/orders", { skipCache }));
        }

        const results = await Promise.all(promises);
        const stationsData = results[0].stations || [];
        
        // Fetch queue entries for all these stations
        const queuePromises = stationsData.map((s: any) => 
          apiGet(`/queue?stationId=${s._id}`, { skipCache })
            .catch(() => ({ queueEntries: [] }))
        );
        const queueResults = await Promise.all(queuePromises);
        let allQueueEntries: any[] = [];
        queueResults.forEach((res: any) => {
          if (res.queueEntries) {
            allQueueEntries = [...allQueueEntries, ...res.queueEntries];
          }
        });
        
        setData({
          stations: stationsData,
          requests: results[1].requests || [],
          lockers: results[2].lockers || [],
          orders: user.role === 'SUPER_ADMIN' ? (results[3]?.orders || []) : [],
          queueEntries: allQueueEntries,
        });
      } catch (e: any) {
        console.error(e);
        toast.error("Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalyticsData();

    const intervalId = setInterval(() => {
      fetchAnalyticsData(true);
    }, 15000);
    
    return () => clearInterval(intervalId);
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground space-y-4">
        <Activity className="h-8 w-8 animate-spin" />
        <p>Loading analytics data...</p>
      </div>
    );
  }

  if (!user || user.role === 'USER') {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
        <ShieldAlert className="h-12 w-12 opacity-50 mb-4" />
        <p className="text-lg font-semibold">Access Denied</p>
        <p>You do not have permission to view analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{user.role === 'SUPER_ADMIN' ? 'Global Analytics' : 'Station Analytics'}</h1>
        <p className="text-muted-foreground mt-1">
          {user.role === 'SUPER_ADMIN' 
            ? 'System-wide metrics and performance overview.' 
            : 'Live insights and utilization metrics for your assigned stations.'}
        </p>
      </div>

      {user.role === 'SUPER_ADMIN' ? (
        <SuperAdminAnalytics {...data} />
      ) : (
        <SubAdminAnalytics {...data} />
      )}
    </div>
  );
}
