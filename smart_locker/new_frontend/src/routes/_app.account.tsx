import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Camera, Mail, Phone, Briefcase, MapPin, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";

export const Route = createFileRoute("/_app/account")({
  head: () => ({ meta: [{ title: "My Account — LOX Smart Locker" }] }),
  component: AccountPage,
});

function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [homeBackgroundUrl, setHomeBackgroundUrl] = useState("");
  
  const [role, setRole] = useState("");

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const res = await fetch("http://localhost:3001/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok && data.user) {
        const u = data.user;
        setName(u.name || "");
        setEmail(u.email || "");
        setPhone(u.phone || "");
        setJobTitle(u.jobTitle || "");
        setBio(u.bio || "");
        setAvatarUrl(u.avatarUrl || "");
        setHomeBackgroundUrl(u.homeBackgroundUrl || "");
        setRole(u.role || "");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/api/auth/me", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          name, email, phone, jobTitle, bio, avatarUrl, homeBackgroundUrl
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save profile");
      
      toast.success("Profile saved successfully");
      
      // Update local storage user data
      const currentLocalUser = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...currentLocalUser, name: data.user.name, role: data.user.role, avatarUrl: data.user.avatarUrl }));
      window.dispatchEvent(new Event('userUpdated'));
      
    } catch (err: any) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading profile...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Account</h1>
        <p className="text-muted-foreground mt-1">Update your profile details and keep your locker account information current.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-soft p-6 lg:sticky lg:top-20 h-fit">
          <div className="relative w-fit mx-auto">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-28 w-28 rounded-3xl object-cover shadow-md border" />
            ) : (
              <div className="h-28 w-28 rounded-3xl bg-gradient-to-br from-primary to-accent text-primary-foreground grid place-items-center text-3xl font-bold shadow-md">
                {name ? name.substring(0, 2).toUpperCase() : "U"}
              </div>
            )}
            <button 
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 h-9 w-9 rounded-xl bg-card border border-border grid place-items-center shadow hover:bg-muted"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={avatarInputRef} 
              onChange={(e) => handleImageUpload(e, setAvatarUrl)} 
            />
          </div>
          <div className="mt-5 text-center">
            <h2 className="text-xl font-bold">{name || "Locker user"}</h2>
            <p className="text-sm text-muted-foreground">{role} {jobTitle ? `· ${jobTitle}` : ""}</p>
          </div>
          <div className="mt-6 space-y-3 text-sm">
            {email && <p className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /> {email}</p>}
            {phone && <p className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /> {phone}</p>}
            {jobTitle && <p className="flex items-center gap-2 text-muted-foreground"><Briefcase className="h-4 w-4" /> {jobTitle}</p>}
          </div>
        </motion.div>

        <div className="lg:col-span-2 space-y-6">
          <motion.form
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            onSubmit={handleSave}
            className="card-soft p-6 space-y-5"
          >
            <h3 className="font-semibold text-lg">Edit profile</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Locker user" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)} required type="email" placeholder="Email" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Phone number</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="07x xxx xxxx" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Job title</Label>
                <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Student, Staff, Admin ..." className="h-11 rounded-xl" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Short profile description" className="rounded-xl" />
            </div>

            <div className="space-y-2 pt-2 border-t mt-4">
              <Label className="block mb-2">Home Background</Label>
              <p className="text-sm text-muted-foreground mb-4">Upload an image from your desktop to use it as the home layout background.</p>
              
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {homeBackgroundUrl ? (
                  <div className="h-20 w-32 rounded-xl overflow-hidden border">
                    <img src={homeBackgroundUrl} alt="Background" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-20 w-32 rounded-xl border border-dashed bg-muted/30 flex flex-col items-center justify-center text-muted-foreground text-xs">
                    <ImageIcon className="h-5 w-5 mb-1 opacity-50" />
                    No background
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => backgroundInputRef.current?.click()}>
                    Upload desktop image
                  </Button>
                  {homeBackgroundUrl && (
                    <Button type="button" variant="destructive" className="rounded-xl" onClick={() => setHomeBackgroundUrl("")}>
                      Remove Background
                    </Button>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={backgroundInputRef} 
                    onChange={(e) => handleImageUpload(e, setHomeBackgroundUrl)} 
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={saving} className="rounded-xl gradient-primary text-primary-foreground hover:opacity-90 h-11 px-6 font-semibold">
                {saving ? "Saving..." : "Save Profile"}
              </Button>
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
