import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ListOrdered, Clock, User, CheckCircle2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { apiGet } from "@/lib/api";

export const Route = createFileRoute("/_app/queue")({
  head: () => ({ meta: [{ title: "Queue — LOX Smart Locker" }] }),
  component: QueuePage,
});

function QueuePage() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState("");
  const [stationsList, setStationsList] = useState<any[]>([]);
  const [stationId, setStationId] = useState("");
  const [queueEntries, setQueueEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const fetchStations = async (t: string) => {
    try {
      const data = await apiGet('/stations');
      const stList = data.stations || [];
      setStationsList(stList);
      if (stList.length > 0 && !stationId) {
        setStationId(stList[0]._id);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load stations");
    }
  };

  const fetchQueue = async (t: string, sId: string) => {
    setLoading(true);
    try {
      const data = await apiGet(`/requests/queue/list?stationId=${sId}`);
      setQueueEntries(data.queueEntries || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = localStorage.getItem("token");
    const uStr = localStorage.getItem("user");
    if (!t || !uStr) {
      navigate({ to: "/" });
      return;
    }
    const u = JSON.parse(uStr);
    setUser(u);
    setToken(t);
    fetchStations(t);
  }, [navigate]);

  useEffect(() => {
    if (token && stationId) {
      fetchQueue(token, stationId);

      const intervalId = setInterval(() => {
        // Only refresh silently, don't set loading to true
        apiGet(`/requests/queue/list?stationId=${stationId}`, { skipCache: true }).then(data => {
          setQueueEntries(data.queueEntries || []);
        }).catch(e => console.error(e));
      }, 5000);
      return () => clearInterval(intervalId);
    }
  }, [token, stationId]);

  if (!user) return null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mt-1 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
            <ListOrdered className="h-5 w-5" />
          </div>
          Locker Waiting Queue
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          View users waiting for available lockers.
        </p>
      </div>

      <div className="card-soft p-6">
        <div className="max-w-xs space-y-3">
          <Label>Select Station</Label>
          <Select value={stationId} onValueChange={setStationId}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Select station" />
            </SelectTrigger>
            <SelectContent>
              {stationsList.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name} ({s.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="card-soft p-6">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          Current Queue
          <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold">
            {queueEntries.length}
          </span>
        </h2>

        {loading ? (
          <div className="py-12 flex justify-center text-muted-foreground">
            <Clock className="animate-spin h-6 w-6 mr-2" /> Loading queue...
          </div>
        ) : queueEntries.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-2xl bg-muted/20 border-muted-foreground/20">
            <CheckCircle2 className="mx-auto h-10 w-10 text-success mb-3 opacity-60" />
            <p className="text-muted-foreground font-medium">No one is currently waiting in the queue.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {queueEntries.map((entry, index) => (
              <motion.div
                key={entry._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "p-5 rounded-2xl border flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center",
                  entry.userId?._id === user._id || entry.userId === user._id
                    ? "bg-primary/5 border-primary/30"
                    : "bg-card border-border"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-muted grid place-items-center text-muted-foreground font-bold text-lg shrink-0">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-lg flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {entry.userId?.name || "Unknown User"}
                      {(entry.userId?._id === user._id || entry.userId === user._id) && (
                        <span className="text-[10px] uppercase bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold ml-2">
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                      <Clock className="h-3.5 w-3.5" />
                      Joined: {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div>
                  <span
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider",
                      entry.status === "WAITING"
                        ? "bg-warning/15 text-warning border border-warning/30"
                        : "bg-success/15 text-success border border-success/30"
                    )}
                  >
                    {entry.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
