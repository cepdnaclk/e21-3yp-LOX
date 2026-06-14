import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Camera, Mail, Phone, Briefcase, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/account")({
  head: () => ({ meta: [{ title: "My Account — LOX Smart Locker" }] }),
  component: AccountPage,
});

function AccountPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Account</h1>
        <p className="text-muted-foreground mt-1">Manage your profile and preferences.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-soft p-6 lg:sticky lg:top-20 h-fit">
          <div className="relative w-fit mx-auto">
            <div className="h-28 w-28 rounded-3xl bg-gradient-to-br from-primary to-accent text-primary-foreground grid place-items-center text-3xl font-bold">
              AK
            </div>
            <button className="absolute -bottom-1 -right-1 h-9 w-9 rounded-xl bg-card border border-border grid place-items-center shadow hover:bg-muted">
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-5 text-center">
            <h2 className="text-xl font-bold">Aisha Khan</h2>
            <p className="text-sm text-muted-foreground">Super Admin · Facilities</p>
          </div>
          <div className="mt-6 space-y-3 text-sm">
            <p className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /> aisha@lox.app</p>
            <p className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /> +1 (555) 014-7720</p>
            <p className="flex items-center gap-2 text-muted-foreground"><Briefcase className="h-4 w-4" /> Operations Team</p>
            <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> Engineering Block A</p>
          </div>
        </motion.div>

        <div className="lg:col-span-2 space-y-6">
          <motion.form
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            onSubmit={(e) => { e.preventDefault(); toast.success("Profile saved"); }}
            className="card-soft p-6 space-y-5"
          >
            <h3 className="font-semibold">Edit profile</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name</Label><Input defaultValue="Aisha Khan" className="h-11 rounded-xl" /></div>
              <div className="space-y-2"><Label>Email</Label><Input defaultValue="aisha@lox.app" className="h-11 rounded-xl" /></div>
              <div className="space-y-2"><Label>Phone</Label><Input defaultValue="+1 555 014 7720" className="h-11 rounded-xl" /></div>
              <div className="space-y-2"><Label>Job title</Label><Input defaultValue="Operations Director" className="h-11 rounded-xl" /></div>
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea rows={3} defaultValue="Leading the rollout of LOX across 12 campus buildings." className="rounded-xl" />
            </div>
            <div className="flex justify-end">
              <Button type="submit" className="rounded-xl gradient-primary text-primary-foreground hover:opacity-90 h-11 px-5">Save changes</Button>
            </div>
          </motion.form>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-soft p-6">
            <h3 className="font-semibold">Preferences</h3>
            <div className="mt-4 divide-y divide-border">
              {[
                { title: "Email notifications", desc: "Daily summary of locker activity" },
                { title: "Push notifications", desc: "Real-time alerts for queue events" },
                { title: "Maintenance digest", desc: "Weekly maintenance report" },
              ].map((p, i) => (
                <div key={p.title} className="flex items-center justify-between py-3.5">
                  <div>
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                  </div>
                  <Switch defaultChecked={i !== 2} />
                </div>
              ))}
            </div>

            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select defaultValue="light">
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
