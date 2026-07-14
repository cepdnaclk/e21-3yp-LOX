import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — LOX Smart Locker" }] }),
  component: SettingsPage,
});

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-soft p-6">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
      <div className="mt-5 space-y-4">{children}</div>
    </motion.section>
  );
}

function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your LOX workspace.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Workspace" desc="Tenant-wide preferences.">
          <div className="space-y-2"><Label>Organization name</Label><Input defaultValue="Greenfield University" className="h-11 rounded-xl" /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default station</Label>
              <Select defaultValue="st-1">
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="st-1">Engineering Block A</SelectItem>
                  <SelectItem value="st-2">Central Library</SelectItem>
                  <SelectItem value="st-3">Science Hall</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select defaultValue="utc-5">
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="utc-8">UTC−8 · Pacific</SelectItem>
                  <SelectItem value="utc-5">UTC−5 · Eastern</SelectItem>
                  <SelectItem value="utc+0">UTC+0 · London</SelectItem>
                  <SelectItem value="utc+3">UTC+3 · Riyadh</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Section>

        <Section title="Security" desc="Protect access to your dashboard.">
          {[
            { t: "Two-factor authentication", d: "Require a 2FA code at sign-in" },
            { t: "Single sign-on (SSO)", d: "SAML 2.0 / OAuth integration" },
            { t: "Session auto-lock", d: "Lock dashboard after 15 min idle" },
            { t: "Audit log export", d: "Send daily audit log to SIEM" },
          ].map((s, i) => (
            <div key={s.t} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{s.t}</p>
                <p className="text-xs text-muted-foreground">{s.d}</p>
              </div>
              <Switch defaultChecked={i < 2} />
            </div>
          ))}
        </Section>

        <Section title="Notifications" desc="Choose how alerts reach your team.">
          {["Locker faults", "Queue thresholds", "Battery low", "Door tamper alerts"].map((s, i) => (
            <div key={s} className="flex items-center justify-between">
              <p className="text-sm font-medium">{s}</p>
              <Switch defaultChecked={i !== 3} />
            </div>
          ))}
        </Section>

        <Section title="Branding" desc="Customize how LOX appears for your users.">
          <div className="space-y-2"><Label>Display name</Label><Input defaultValue="Greenfield Lockers" className="h-11 rounded-xl" /></div>
          <div className="space-y-2"><Label>Support email</Label><Input defaultValue="support@greenfield.edu" className="h-11 rounded-xl" /></div>
        </Section>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => toast.success("Settings saved")} className="rounded-xl gradient-primary text-primary-foreground hover:opacity-90 h-11 px-6">
          Save all changes
        </Button>
      </div>
    </div>
  );
}
