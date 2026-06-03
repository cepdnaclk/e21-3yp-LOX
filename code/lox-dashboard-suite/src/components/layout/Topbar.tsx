import { Bell, LogOut, Settings } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { clearAuthSession } from "@/lib/auth";

export function Topbar({
  title,
  role,
  notificationCount = 0,
  userName,
  userDetail,
}: {
  title: string;
  role: "sub" | "super";
  notificationCount?: number;
  userName?: string;
  userDetail?: string;
}) {
  const router = useRouter();
  const avatar = userName
    ? userName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : role === "sub"
      ? "SA"
      : "SX";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/70 px-4 md:px-8 backdrop-blur-xl">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight text-foreground truncate">{title}</h1>
        <p className="text-xs text-muted-foreground hidden sm:block">
          {role === "sub" ? "Locker station owner" : "LOX super admin"}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Link
          to={role === "super" ? "/super/notifications" : "/admin/notifications"}
          className="relative grid h-10 w-10 place-items-center rounded-xl border border-border bg-card hover:bg-secondary transition"
        >
          <Bell className="h-4 w-4 text-foreground" />
          {notificationCount > 0 ? (
            <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground shadow-sm">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          ) : (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive animate-pulse-dot" />
          )}
        </Link>
        <button className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card hover:bg-secondary transition">
          <Settings className="h-4 w-4 text-foreground" />
        </button>

        <button
          type="button"
          onClick={() => {
            clearAuthSession();
            void router.navigate({ to: "/login" });
          }}
          className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card hover:bg-secondary transition"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-4 w-4 text-foreground" />
        </button>

        <Link
          to={role === "super" ? "/super" : "/admin/station"}
          className="flex items-center gap-3 rounded-xl border border-border bg-card pl-1 pr-3 py-1 hover:bg-secondary transition"
          aria-label={role === "super" ? "Open super admin overview" : "Open sub admin overview"}
        >
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary text-primary-foreground text-xs font-semibold">
            {avatar}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-foreground leading-tight">
              {userName ?? (role === "sub" ? "Aarav Mehta" : "LOX HQ")}
            </div>
            <div className="text-[10px] text-muted-foreground leading-tight">
              {userDetail ?? (role === "sub" ? "Kochi Central" : "Super admin")}
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
}
