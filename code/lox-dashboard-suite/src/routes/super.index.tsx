import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/stat-card";
import { apiRequest } from "@/lib/api";
import { clearAuthSession, getAuthSession } from "@/lib/auth";
import { Building2, Users, Boxes, Search, MapPin, Activity, PlusCircle } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/super/")({
  head: () => ({ meta: [{ title: "LOX HQ — Overview" }] }),
  component: SuperHome,
});

type OverviewStation = {
  station_id: string;
  name: string;
  status: string;
  city: string;
  district: string;
  locker_count: number;
  in_use_count: number;
  occupancy_rate: number;
  owner_name?: string;
  created_at: string | null;
  last_heartbeat_at: string | null;
  location?: {
    city?: string;
    district?: string;
  };
};

type WeeklySeriesPoint = {
  date: string;
  label: string;
  count: number;
};

type UsersResponse = {
  count: number;
};

type StationsResponse = {
  stations: OverviewStation[];
  station_creation_series: WeeklySeriesPoint[];
  station_additions_this_week: number;
};

type AdminsResponse = {
  admins: Array<{
    station_id: string | null;
    station_name: string | null;
    name: string;
  }>;
};

const numberFormatter = new Intl.NumberFormat("en-IN");
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function SuperHome() {
  const router = useRouter();
  const session = useMemo(() => getAuthSession(), []);
  const [stations, setStations] = useState<OverviewStation[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [adminsByStation, setAdminsByStation] = useState<Map<string, string>>(new Map());
  const [stationCreationSeries, setStationCreationSeries] = useState<WeeklySeriesPoint[]>([]);
  const [stationAdditionsThisWeek, setStationAdditionsThisWeek] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;

    const loadOverview = async () => {
      if (!session?.token) {
        clearAuthSession();
        await router.navigate({ to: "/login" });
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [stationsResponse, usersResponse, adminsResponse] = await Promise.all([
          apiRequest<StationsResponse>("/stations"),
          apiRequest<UsersResponse>("/users"),
          apiRequest<AdminsResponse>("/users/admins?role=sub_admin", {
            headers: {
              Authorization: `Bearer ${session.token}`,
            },
          }),
        ]);

        if (!active) return;
        setStations((stationsResponse.stations || []).map((station) => ({
          ...station,
          locker_count: station.locker_count ?? 0,
          estimated_members: station.estimated_members ?? 0,
          city: station.city || station.location?.city || "",
          district: station.district || station.location?.district || "",
          owner_name: station.owner_name || "Unassigned",
          status: station.status || "active",
          created_at: station.created_at || null,
          last_heartbeat_at: station.last_heartbeat_at || null,
        })));
        setStationCreationSeries(stationsResponse.station_creation_series || []);
        setStationAdditionsThisWeek(stationsResponse.station_additions_this_week || 0);
        setMemberCount(usersResponse.count || 0);
        setAdminsByStation(new Map((adminsResponse.admins || [])
          .map((admin) => [String(admin.station_id || "").trim().toUpperCase(), admin.station_name || admin.name])
          .filter(([stationId]) => Boolean(stationId))));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load overview data");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadOverview();

    return () => {
      active = false;
    };
  }, [router, session?.token]);

  const filteredStations = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return stations;
    }

    return stations.filter((station) => {
      const haystack = [
        station.station_id,
        station.name,
        station.city,
        station.district,
        station.owner_name,
        station.status,
      ].join(" ").toLowerCase();

      return haystack.includes(normalized);
    });
  }, [stations, query]);

  const stats = useMemo(() => {
    const lockerCount = stations.reduce((sum, station) => sum + (station.locker_count || 0), 0);

    return {
      station_count: stations.length,
      locker_count: lockerCount,
      member_count: memberCount,
      station_additions_this_week: stationAdditionsThisWeek,
    };
  }, [memberCount, stationAdditionsThisWeek, stations]);

  const network = useMemo(() => {
    const totalLockers = stations.reduce((sum, station) => sum + (station.locker_count || 0), 0);
    const totalInUse = stations.reduce((sum, station) => sum + (station.in_use_count || 0), 0);

    return {
      average_occupancy_rate: totalLockers > 0 ? Math.round((totalInUse / totalLockers) * 100) : 0,
      stations_with_lockers: stations.length,
      active_stations: stations.filter((station) => station.status === "active").length,
    };
  }, [stations]);

  if (loading && !stations.length) {
    return (
      <AppShell role="super" title="Network overview">
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-soft">
          Loading real network data…
        </div>
      </AppShell>
    );
  }

  if (error && !stations.length) {
    return (
      <AppShell role="super" title="Network overview">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="text-sm font-semibold text-foreground">Unable to load overview</div>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="super" title="Network overview">
      <div className="grid gap-5 lg:grid-cols-4">
        <StatCard label="Locker stations" value={numberFormatter.format(stats.station_count)} icon={Building2} tone="primary" />
        <StatCard label="Total lockers" value={numberFormatter.format(stats.locker_count)} icon={Boxes} tone="info" />
        <StatCard label="Members" value={numberFormatter.format(stats.member_count)} icon={Users} tone="success" />
        <StatCard label="Stations added this week" value={numberFormatter.format(stats.station_additions_this_week)} icon={PlusCircle} tone="warning" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">New locker stations</h3>
            <span className="text-xs text-muted-foreground">Created over the past 7 days</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={stationCreationSeries}>
                <defs>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2.5} fill="url(#g2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold text-foreground mb-3">Network snapshot</h3>
          <div className="space-y-4 text-sm">
            {[
              { l: "Active stations", v: numberFormatter.format(network.active_stations) },
              { l: "Stations tracked", v: numberFormatter.format(network.stations_with_lockers) },
              { l: "Stations added this week", v: numberFormatter.format(stats.station_additions_this_week) },
            ].map((item) => (
              <div key={item.l} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2">
                <span className="text-muted-foreground">{item.l}</span>
                <span className="font-semibold text-foreground">{item.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between mb-5">
          <h3 className="text-sm font-semibold text-foreground">Locker stations</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, district, ID…"
                className="w-72 rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredStations.map((station) => {
            const pct = station.occupancy_rate;
            const createdAtLabel = station.created_at ? dateTimeFormatter.format(new Date(station.created_at)) : "Creation date unavailable";
            const ownerName = adminsByStation.get(station.station_id) || station.owner_name;
            return (
              <Link key={station.station_id} to="/super/stations" className="group rounded-2xl border border-border bg-card overflow-hidden shadow-soft hover:shadow-glow transition hover:-translate-y-0.5">
                <div className="relative h-28 bg-gradient-primary overflow-hidden">
                  <div className="absolute inset-0 bg-mesh opacity-30 mix-blend-overlay" />
                  <div className="absolute inset-0 grid grid-cols-12 gap-1 p-3 opacity-70">
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div key={i} className={`aspect-square rounded ${(i * 7) % 5 < 2 ? "bg-white/70" : "bg-white/20"}`} />
                    ))}
                  </div>
                  <span className="absolute top-3 right-3 rounded-full glass px-2 py-1 text-[11px] font-medium text-primary-foreground">{pct}% full</span>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{station.name}</div>
                      <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> {station.district} · {station.station_id}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">Created {createdAtLabel}</div>
                    </div>
                    <div className="inline-flex items-center gap-1 text-success text-xs">
                      <Activity className="h-3 w-3" /> {station.status === "active" ? "live" : station.status}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <Cell k="Lockers" v={numberFormatter.format(station.locker_count)} />
                    <Cell k="In use" v={numberFormatter.format(station.in_use_count)} />
                    <Cell k="Owner" v={ownerName.split(" ")[0]} />
                  </div>
                </div>
              </Link>
            );
          })}
          {!filteredStations.length && (
            <div className="rounded-2xl border border-dashed border-border bg-background/50 p-6 text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
              No locker stations match the current search.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-secondary py-2">
      <div className="text-sm font-semibold text-foreground">{v}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{k}</div>
    </div>
  );
}
