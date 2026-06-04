import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ShieldCheck, Search, Trash2, UserX } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { getAuthSession } from "@/lib/auth";

export const Route = createFileRoute("/admin/members")({
  head: () => ({ meta: [{ title: "Members — LOX Station" }] }),
  component: MembersPage,
});

type StationMember = {
  user_id: string;
  name: string;
  email: string;
  role: "sub_admin";
  status: string;
  station_id: string | null;
  station_name: string | null;
  created_at: string;
  approved_at: string | null;
};

type StationMembersResponse = {
  admins: StationMember[];
  count: number;
  station_id: string;
};

function MembersPage() {
  const router = useRouter();
  const session = useMemo(() => getAuthSession(), []);

  const [members, setMembers] = useState<StationMember[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [removeBusyId, setRemoveBusyId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<StationMember | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!session?.token) {
        await router.navigate({ to: "/login" });
        return;
      }

      setLoading(true);
      setErrorText(null);

      try {
        const params = new URLSearchParams();
        const trimmed = searchText.trim();
        if (trimmed) params.set("search", trimmed);

        const path = params.toString()
          ? `/auth/station-members?${params.toString()}`
          : "/auth/station-members";

        const payload = await apiRequest<StationMembersResponse>(path, {
          headers: { Authorization: `Bearer ${session.token}` },
        });

        if (!active) return;
        setMembers(payload.admins || []);
      } catch (err) {
        if (!active) return;
        setMembers([]);
        setErrorText(
          err instanceof Error ? err.message : "Unable to load station members"
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    const timer = window.setTimeout(() => void load(), 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchText, session?.token, router]);

  const handleRemove = async (member: StationMember) => {
    if (!session?.token) return;
    setConfirmRemove(null);
    setRemoveBusyId(member.user_id);
    setErrorText(null);

    try {
      await apiRequest(`/auth/station-members/${member.user_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.token}` },
      });
      setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id));
    } catch (err) {
      setErrorText(
        err instanceof Error ? err.message : "Failed to remove sub admin"
      );
    } finally {
      setRemoveBusyId(null);
    }
  };

  const currentUserId = session?.user?.user_id;

  return (
    <AppShell role="sub" title="Station members">
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main list */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-foreground">
              Sub-admins at this station
            </h3>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Search */}
          <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              id="member-search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>

          {/* Error */}
          {errorText && (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {errorText}
            </div>
          )}

          {/* List */}
          <div className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-dashed border-border bg-secondary/50 p-6 text-center text-sm text-muted-foreground">
                Loading station members…
              </div>
            ) : members.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-secondary/50 p-6 text-center">
                <UserX className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {searchText.trim()
                    ? "No members match your search."
                    : "No sub-admins are assigned to this station yet."}
                </p>
              </div>
            ) : (
              members.map((m) => {
                const isMe = m.user_id === currentUserId;
                const isBusy = removeBusyId === m.user_id;
                const initials = m.name
                  .split(" ")
                  .map((s) => s[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={m.user_id}
                    className="rounded-2xl border border-border p-4 hover:bg-secondary/60 transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground text-xs font-semibold flex-shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground truncate">
                              {m.name}
                            </span>
                            {isMe && (
                              <span className="rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-semibold">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {m.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="inline-flex items-center gap-1 rounded-full bg-info/15 text-info px-2.5 py-1 text-[11px] font-medium">
                          <ShieldCheck className="h-3 w-3" />
                          Sub admin
                        </span>
                        {!isMe && (
                          <button
                            type="button"
                            id={`remove-member-${m.user_id}`}
                            disabled={isBusy}
                            onClick={() => setConfirmRemove(m)}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60 transition"
                            title="Remove sub admin"
                          >
                            {isBusy ? (
                              <span className="h-4 w-4 rounded-full border-2 border-destructive/30 border-t-destructive animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                      <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
                        Status: {m.status}
                      </span>
                      {m.approved_at && (
                        <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
                          Approved {new Date(m.approved_at).toLocaleDateString()}
                        </span>
                      )}
                      <span className="ml-auto self-center">
                        Joined {new Date(m.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Sidebar */}
        <aside className="rounded-2xl border border-border bg-card p-5 shadow-soft h-fit">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Station info
          </h3>
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <div className="text-xs text-muted-foreground">
                Total sub-admins
              </div>
              <div className="text-2xl font-semibold text-foreground">
                {loading ? "—" : members.length}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <div className="text-xs text-muted-foreground mb-1">
                Your station
              </div>
              <div className="text-sm font-medium text-foreground">
                {session?.user?.station_name || session?.user?.station_id || "—"}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <div className="text-xs text-muted-foreground mb-1">
                Logged in as
              </div>
              <div className="text-sm font-medium text-foreground">
                {session?.user?.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {session?.user?.email}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-warning/10 p-3">
            <p className="text-[11px] text-warning leading-relaxed">
              Removing a sub-admin will permanently delete their account. This
              action cannot be undone.
            </p>
          </div>
        </aside>
      </div>

      {/* Confirmation Dialog */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl mx-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-destructive/15 mb-4">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-base font-semibold text-foreground mb-1">
              Remove sub admin?
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              <span className="font-medium text-foreground">
                {confirmRemove.name}
              </span>{" "}
              ({confirmRemove.email}) will be permanently removed from the
              system. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmRemove(null)}
                className="flex-1 rounded-xl border border-border bg-secondary py-2 text-sm font-medium text-foreground hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-remove-btn"
                onClick={() => handleRemove(confirmRemove)}
                className="flex-1 rounded-xl bg-destructive py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
