import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Activity, Users, Zap } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { AnimatedNumber } from "@/components/animated-number";
import { apiGet } from "@/lib/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/analytics")({
  head: () => ({ meta: [{ title: "Analytics — LOX Smart Locker" }] }),
  component: AnalyticsPage,
});

function Kpi({ icon: Icon, label, value, textValue, accent }: { icon: any; label: string; value?: number; textValue?: string; accent: string }) {
  return (
    <motion.div whileHover={{ y: -4 }} className="card-soft p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold">
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

function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    hourlyData: any[];
    totalQueueWaits: number;
    totalLockerAccess: number;
    peakHour: string;
  } | null>(null);

  useEffect(() => {
    const fetchAndProcessAnalytics = async () => {
      try {
        // Fetch only QUEUED and APPROVED requests in parallel using apiGet (uses cache if available)
        const [queuedJson, approvedJson] = await Promise.all([
          apiGet("/requests?status=QUEUED"),
          apiGet("/requests?status=APPROVED")
        ]);

        const queuedRequests = queuedJson.requests || [];
        const approvedRequests = approvedJson.requests || [];

        // Process data for "today"
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const hourlyData = Array.from({ length: 24 }).map((_, hour) => ({
          hour: `${hour.toString().padStart(2, '0')}:00`,
          queueWaits: 0,
          lockerAccess: 0,
          total: 0
        }));

        let totalQueueWaits = 0;
        let totalLockerAccess = 0;

        // Count queue entries by creation hour
        queuedRequests.forEach((req: any) => {
          const createdAt = new Date(req.createdAt);
          if (createdAt >= startOfDay && createdAt <= endOfDay) {
            const hour = createdAt.getHours();
            hourlyData[hour].queueWaits += 1;
            hourlyData[hour].total += 1;
            totalQueueWaits += 1;
          }
        });

        // Count approved accesses by approval hour
        approvedRequests.forEach((req: any) => {
          if (req.approvedAt) {
            const approvedAt = new Date(req.approvedAt);
            if (approvedAt >= startOfDay && approvedAt <= endOfDay) {
              const hour = approvedAt.getHours();
              hourlyData[hour].lockerAccess += 1;
              hourlyData[hour].total += 1;
              totalLockerAccess += 1;
            }
          }
        });

        let peakHour = "N/A";
        let maxTotal = -1;
        hourlyData.forEach(d => {
          if (d.total > maxTotal) {
            maxTotal = d.total;
            peakHour = d.hour;
          }
        });

        setData({
          hourlyData,
          totalQueueWaits,
          totalLockerAccess,
          peakHour: maxTotal > 0 ? peakHour : "No activity"
        });
      } catch (e: any) {
        console.error(e);
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAndProcessAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground space-y-4">
        <Activity className="h-8 w-8 animate-spin" />
        <p>Calculating live analytics...</p>
      </div>
    );
  }

  if (!data) return null;

  const { hourlyData, totalQueueWaits, totalLockerAccess, peakHour } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">Live bar graphs update automatically as new requests and approvals flow through the system.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Kpi icon={Users} label="Queue waits today" value={totalQueueWaits} accent="bg-info" />
        <Kpi icon={Activity} label="Locker access today" value={totalLockerAccess} accent="bg-success" />
        <Kpi icon={Zap} label="Peak hour" textValue={peakHour} accent="bg-primary" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Queue Waited Graph */}
        <div className="card-soft p-6">
          <h2 className="font-semibold text-lg">Queue Waited</h2>
          <p className="text-sm text-muted-foreground">How many requests entered the queue per hour today.</p>
          <div className="h-72 mt-6">
            <ResponsiveContainer>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="hour" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} cursor={{ fill: "transparent" }} />
                <Bar dataKey="queueWaits" name="Queue Entries" fill="#38BDF8" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Locker Access Graph */}
        <div className="card-soft p-6">
          <h2 className="font-semibold text-lg">Locker Access</h2>
          <p className="text-sm text-muted-foreground">How many requests were approved per hour today.</p>
          <div className="h-72 mt-6">
            <ResponsiveContainer>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="hour" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} cursor={{ fill: "transparent" }} />
                <Bar dataKey="lockerAccess" name="Approved Requests" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Hours Graph */}
        <div className="lg:col-span-2 card-soft p-6">
          <h2 className="font-semibold text-lg">Peak Hours</h2>
          <p className="text-sm text-muted-foreground">Combined queue and locker activity by hour.</p>
          <div className="h-80 mt-6">
            <ResponsiveContainer>
              <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorQueue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="hour" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 20 }} />
                <Area type="monotone" dataKey="queueWaits" name="Queue Activity" stroke="#38BDF8" strokeWidth={3} fillOpacity={1} fill="url(#colorQueue)" />
                <Area type="monotone" dataKey="lockerAccess" name="Locker Access" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorAccess)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
