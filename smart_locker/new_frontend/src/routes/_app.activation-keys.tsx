import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  KeyRound,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { apiGet, apiMutate } from "@/lib/api";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/activation-keys")({
  head: () => ({ meta: [{ title: "Activation Keys — LOX Smart Locker" }] }),
  component: ActivationKeysPage,
});

// ─── Key generator ────────────────────────────────────────────────────────────
function generateKeySegment(len = 4): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let seg = "";
  for (let i = 0; i < len; i++) {
    seg += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return seg;
}

function generateActivationKey(): string {
  return `LOXA-${generateKeySegment()}-${generateKeySegment()}-${generateKeySegment()}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface ActivationKey {
  _id: string;
  label: string;
  isUsed: boolean;
  usedAt: string | null;
  usedBy: { _id: string; name: string; email: string } | null;
  usedForLocker: { _id: string; code: string } | null;
  createdAt: string;
}

// ─── Revealed Key Modal ───────────────────────────────────────────────────────
function RevealKeyModal({
  plaintextKey,
  onClose,
}: {
  plaintextKey: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyKey = async () => {
    await navigator.clipboard.writeText(plaintextKey);
    setCopied(true);
    toast.success("Key copied to clipboard");
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="relative w-full max-w-md mx-4 bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Gradient accent bar */}
        <div className="h-1 w-full gradient-primary" />

        <div className="p-8">
          {/* Icon */}
          <div className="flex items-center justify-center mb-6">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-center mb-2">Activation Key Generated!</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Copy this key now — it will <span className="font-semibold text-foreground">not be shown again</span> for security.
          </p>

          {/* Key display */}
          <div className="relative group mb-6">
            <div className="w-full font-mono text-lg font-bold text-center tracking-widest py-4 px-4 bg-muted/60 rounded-2xl border border-border select-all">
              {plaintextKey}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1 gap-2 rounded-xl h-11"
              onClick={copyKey}
              variant={copied ? "default" : "outline"}
            >
              {copied ? (
                <><CheckCircle2 className="h-4 w-4 text-green-500" /> Copied!</>
              ) : (
                <><Copy className="h-4 w-4" /> Copy Key</>
              )}
            </Button>
            <Button
              variant="default"
              className="flex-1 rounded-xl h-11 gradient-primary hover:opacity-90 text-primary-foreground border-0"
              onClick={onClose}
            >
              Done
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Share this key only with trusted sub-admins.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Add Key Form ─────────────────────────────────────────────────────────────
function AddKeyPanel({
  onCreated,
}: {
  onCreated: (plaintext: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [generatedKey, setGeneratedKey] = useState(generateActivationKey());
  const [customKey, setCustomKey] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const regenerate = () => setGeneratedKey(generateActivationKey());
  const activeKey = useCustom ? customKey.trim().toUpperCase() : generatedKey;

  const handleCreate = async () => {
    if (!activeKey) {
      toast.error("Please provide or generate a key");
      return;
    }
    setLoading(true);
    try {
      const data = await apiMutate("/activation-keys", "POST", {
        key: activeKey,
        label: label.trim(),
      }, ["/activation-keys"]);
      toast.success("Activation key created!");
      setLabel("");
      setGeneratedKey(generateActivationKey());
      setCustomKey("");
      onCreated(data.activationKey.plaintextKey);
    } catch (err: any) {
      toast.error(err.message || "Failed to create key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-soft p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Plus className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Generate New Key</h2>
          <p className="text-xs text-muted-foreground">Keys are bcrypt-hashed before storage</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Label */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Label (optional)</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Station ST001 – Block A"
            className="h-10 rounded-xl"
          />
        </div>

        {/* Key toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setUseCustom(false)}
            className={cn(
              "flex-1 h-9 rounded-xl text-xs font-medium border transition-all",
              !useCustom
                ? "bg-primary/10 border-primary/40 text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            Auto-generate
          </button>
          <button
            onClick={() => setUseCustom(true)}
            className={cn(
              "flex-1 h-9 rounded-xl text-xs font-medium border transition-all",
              useCustom
                ? "bg-primary/10 border-primary/40 text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            Custom key
          </button>
        </div>

        {/* Key input / display */}
        {!useCustom ? (
          <div className="relative">
            <div className="flex items-center gap-2 pr-12 font-mono text-sm font-bold tracking-widest py-2.5 px-4 bg-muted/60 rounded-xl border border-border">
              {showKey ? generatedKey : "LOXA-••••-••••-••••"}
            </div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <button
                title="Show/hide"
                onClick={() => setShowKey((v) => !v)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button
                title="Re-generate"
                onClick={regenerate}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Input
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value.toUpperCase())}
              placeholder="LOXA-XXXX-XXXX-XXXX"
              className="h-10 rounded-xl font-mono tracking-widest"
              maxLength={19}
            />
            <p className="text-[11px] text-muted-foreground">Format: LOXA-XXXX-XXXX-XXXX (uppercase alphanumeric)</p>
          </div>
        )}

        <Button
          className="w-full h-10 rounded-xl gradient-primary hover:opacity-90 text-primary-foreground border-0 font-semibold"
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? "Creating…" : "Create Activation Key"}
        </Button>
      </div>
    </div>
  );
}

// ─── Key Row ──────────────────────────────────────────────────────────────────
function KeyRow({
  k,
  index,
  onDelete,
}: {
  k: ActivationKey;
  index: number;
  onDelete: (id: string, label: string) => void;
}) {
  const created = new Date(k.createdAt);
  const usedDate = k.usedAt ? new Date(k.usedAt) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, scale: 0.97 }}
      transition={{ delay: index * 0.03, type: "spring", stiffness: 300, damping: 28 }}
      className={cn(
        "flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl border transition-all duration-200 group",
        k.isUsed
          ? "bg-muted/30 border-border/60"
          : "bg-card border-border hover:shadow-md hover:border-primary/30"
      )}
    >
      {/* Status icon */}
      <div className="flex-shrink-0">
        {k.isUsed ? (
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
            <ShieldOff className="h-5 w-5 text-muted-foreground" />
          </div>
        ) : (
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Masked key placeholder */}
          <span className={cn("font-mono text-sm font-bold tracking-widest", k.isUsed && "text-muted-foreground line-through")}>
            LOXA-••••-••••-••••
          </span>
          {k.isUsed ? (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">USED</span>
          ) : (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">ACTIVE</span>
          )}
        </div>

        {k.label && (
          <p className="text-xs text-muted-foreground truncate">📝 {k.label}</p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span>Created {created.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
          {k.isUsed && usedDate && (
            <span>
              Used by{" "}
              <span className="font-semibold text-foreground">{k.usedBy?.name ?? "Unknown"}</span>
              {" "}on{" "}
              {usedDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              {" "}
              {usedDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {k.isUsed && k.usedForLocker && (
            <span>
              Locker: <span className="font-semibold text-foreground">🔒 {k.usedForLocker.code}</span>
            </span>
          )}
        </div>
      </div>

      {/* Delete button */}
      <div className="flex-shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-9 w-9 p-0 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
          onClick={() => onDelete(k._id, k.label || "this key")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function ActivationKeysPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [keys, setKeys] = useState<ActivationKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [filterUsed, setFilterUsed] = useState<"all" | "active" | "used">("all");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; label: string }>({
    open: false,
    id: "",
    label: "",
  });

  useEffect(() => {
    const uStr = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (!token || !uStr) { navigate({ to: "/" }); return; }
    const u = JSON.parse(uStr);
    if (u.role !== "SUPER_ADMIN") { navigate({ to: "/dashboard" }); return; }
    setUser(u);
  }, [navigate]);

  const fetchKeys = useCallback(async (skipCache = false) => {
    try {
      setLoading(true);
      const data = await apiGet<{ activationKeys: ActivationKey[] }>("/activation-keys", { skipCache });
      setKeys(data.activationKeys || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load activation keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchKeys();
  }, [user, fetchKeys]);

  const handleKeyCreated = (plaintext: string) => {
    fetchKeys(true);
    setRevealedKey(plaintext);
  };

  const confirmDelete = (id: string, label: string) => {
    setDeleteDialog({ open: true, id, label });
  };

  const handleDelete = async () => {
    try {
      await apiMutate(`/activation-keys/${deleteDialog.id}`, "DELETE", undefined, ["/activation-keys"]);
      toast.success("Activation key deleted");
      fetchKeys(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete key");
    }
    setDeleteDialog({ open: false, id: "", label: "" });
  };

  if (!user) return null;

  const filteredKeys = keys.filter((k) => {
    if (filterUsed === "active") return !k.isUsed;
    if (filterUsed === "used") return k.isUsed;
    return true;
  });

  const activeCount = keys.filter((k) => !k.isUsed).length;
  const usedCount = keys.filter((k) => k.isUsed).length;

  return (
    <>
      {/* Reveal Modal */}
      <AnimatePresence>
        {revealedKey && (
          <RevealKeyModal
            plaintextKey={revealedKey}
            onClose={() => setRevealedKey(null)}
          />
        )}
      </AnimatePresence>

      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                <KeyRound className="h-4.5 w-4.5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Activation Keys</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-12">
              Manage one-time-use keys for sub-admins to create lockers.
            </p>
          </div>
          {/* Stats chips */}
          <div className="flex gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {activeCount} Active
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
              <span className="h-2 w-2 rounded-full bg-muted-foreground" />
              {usedCount} Used
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Add key panel */}
          <div className="lg:col-span-1">
            <AddKeyPanel onCreated={handleKeyCreated} />
          </div>

          {/* Right: Keys list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card-soft p-6">
              {/* Filter tabs */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold">All Keys</h2>
                <div className="flex gap-1 bg-muted/60 p-1 rounded-xl">
                  {(["all", "active", "used"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilterUsed(f)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all",
                        filterUsed === f
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                    <KeyRound className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {filterUsed === "all"
                      ? "No activation keys yet. Generate one to get started."
                      : `No ${filterUsed} keys found.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {filteredKeys.map((k, i) => (
                      <KeyRow
                        key={k._id}
                        k={k}
                        index={i}
                        onDelete={confirmDelete}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((p) => ({ ...p, open }))}
      >
        <AlertDialogContent className="rounded-2xl border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Delete Activation Key?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-[15px]">
              Are you sure you want to delete <span className="font-semibold text-foreground">"{deleteDialog.label}"</span>?
              If this key hasn't been used yet, sub-admins with this key will no longer be able to create a locker.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 sm:space-x-4">
            <AlertDialogCancel className="rounded-xl h-10 px-5">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-xl h-10 px-5 bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0"
            >
              Delete Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
