import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Activity, TrendingUp, Users, Gauge } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { AnimatedNumber } from "@/components/animated-number";
import {
  hourlyUsage, requestTrends, stationPerformance, peakHours, activityFeed,
} from "@/lib/mock-data";

export const Route = createFileRoute("/_app/analytics")({
  head: () => ({ meta: [{ title: "Analytics — LOX Smart Locker" }] }),
  component: AnalyticsPage,
});

const PIE_COLORS = ["#3B82F6", "#60A5FA", "#38BDF8", "#F59E0B"];

function Kpi({ icon: Icon, label, value, trend, accent }: { icon: any; label: string; value: number; trend: string; accent: string }) {
  return (
    <motion.div whileHover={{ y: -4 }} className="card-soft p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold"><AnimatedNumber value={value} /></p>
        </div>
        <div className={`h-10 w-10 rounded-xl grid place-items-center ${accent}`}>
          <Icon className="h-5 w-5 text-primary-foreground" />
        </div>
      </div>
      <p className="mt-3 text-xs text-success font-medium">{trend}</p>
    </motion.div>
  );
}

function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">Operational insights across all your campus stations.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Activity} label="Daily Requests"  value={342}  trend="+12.4% vs last week"  accent="bg-primary" />
        <Kpi icon={Gauge}    label="Active Lockers"  value={104}  trend="+3 stations online"   accent="bg-secondary" />
        <Kpi icon={Users}    label="Queue Requests"  value={56}   trend="−8% vs yesterday"     accent="bg-info" />
        <Kpi icon={TrendingUp} label="Utilization"   value={82}   trend="Best week this quarter" accent="bg-success" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-soft p-6">
          <h2 className="font-semibold">Locker Usage by Hour</h2>
          <p className="text-sm text-muted-foreground">Today · All stations</p>
          <div className="h-72 mt-4">
            <ResponsiveContainer>
              <AreaChart data={hourlyUsage}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="hour" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} />
                <Area type="monotone" dataKey="usage" stroke="#3B82F6" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-soft p-6">
          <h2 className="font-semibold">Peak Usage</h2>
          <p className="text-sm text-muted-foreground">Time-of-day distribution</p>
          <div className="h-72 mt-4">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={peakHours} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {peakHours.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-soft p-6">
          <h2 className="font-semibold">Request Trends</h2>
          <p className="text-sm text-muted-foreground">Last 7 days</p>
          <div className="h-64 mt-4">
            <ResponsiveContainer>
              <BarChart data={requestTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="day" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} />
                <Legend />
                <Bar dataKey="approved" radius={[8, 8, 0, 0]} fill="#3B82F6" />
                <Bar dataKey="rejected" radius={[8, 8, 0, 0]} fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-soft p-6">
          <h2 className="font-semibold">Station Performance</h2>
          <p className="text-sm text-muted-foreground">Average utilization (%)</p>
          <div className="h-64 mt-4">
            <ResponsiveContainer>
              <LineChart data={stationPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} />
                <Line type="monotone" dataKey="utilization" stroke="#38BDF8" strokeWidth={3} dot={{ r: 5, fill: "#38BDF8" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Heatmap + Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-soft p-6">
          <h2 className="font-semibold">Usage Heatmap</h2>
          <p className="text-sm text-muted-foreground">Past 7 days × 24 hours</p>
          <div className="mt-4 grid grid-cols-[40px_1fr] gap-3">
            <div className="flex flex-col justify-between text-xs text-muted-foreground py-1">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-rows-7 grid-cols-24 gap-1" style={{ gridTemplateColumns: "repeat(24,minmax(0,1fr))" }}>
              {Array.from({ length: 7 * 24 }).map((_, i) => {
                const intensity = Math.max(0, Math.sin(i / 4) * 0.5 + 0.5 + Math.random() * 0.2);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.002 }}
                    className="aspect-square rounded-md"
                    style={{ backgroundColor: `rgba(59, 130, 246, ${intensity.toFixed(2)})` }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="card-soft p-6">
          <h2 className="font-semibold">Activity Feed</h2>
          <ul className="mt-4 space-y-4">
            {activityFeed.map((a, i) => (
              <motion.li
                key={a.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="flex gap-3"
              >
                <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary grid place-items-center text-xs font-semibold shrink-0">
                  {a.who.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm"><span className="font-medium">{a.who}</span> {a.what}</p>
                  <p className="text-xs text-muted-foreground">{a.when}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
