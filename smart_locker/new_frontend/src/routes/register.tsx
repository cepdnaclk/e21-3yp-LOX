import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { LockKeyhole, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — LOX Smart Locker" },
      { name: "description", content: "Register for the LOX Smart Locker platform." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState("USER");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const stationCode = formData.get('stationCode') as string;
    const inviteKey = formData.get('inviteKey') as string;

    try {
      const res = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, stationCode, inviteKey })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Registration failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      toast.success("Account created successfully");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const needsStation = role === "SUB_ADMIN" || role === "USER";
  const needsAdminKey = role === "SUB_ADMIN" || role === "SUPER_ADMIN";

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden gradient-primary text-primary-foreground p-12">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-32 right-0 h-[28rem] w-[28rem] rounded-full bg-white/30 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-accent/50 blur-3xl" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-white/15 backdrop-blur grid place-items-center border border-white/30">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">LOX</p>
            <p className="text-xs text-white/80">Smart Locker Platform</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-md"
        >
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight">Join 120+ campuses already on LOX.</h1>
          <p className="mt-4 text-white/80 text-lg">From a single dorm to a whole university — onboarding takes minutes.</p>

          <div className="mt-10 grid grid-cols-3 gap-3 max-w-md">
            {Array.from({ length: 9 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className="aspect-square rounded-2xl bg-white/10 border border-white/20 backdrop-blur"
              />
            ))}
          </div>
        </motion.div>

        <p className="relative z-10 text-sm text-white/70">"Setup was a breeze." — Marcus L., IT Ops</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <h2 className="text-3xl font-bold tracking-tight">Create your account</h2>
          <p className="mt-2 text-muted-foreground">Get started in less than a minute.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" placeholder="Jane Doe" className="h-11 rounded-xl" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="you@campus.edu" className="h-11 rounded-xl" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">Password</Label>
              <Input id="pw" name="password" type="password" placeholder="At least 8 characters" className="h-11 rounded-xl" required />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="SUB_ADMIN">Sub Admin</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {needsStation && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                <Label htmlFor="station">Station code</Label>
                <Input id="station" name="stationCode" placeholder="ST-ENG-01" className="h-11 rounded-xl" />
              </motion.div>
            )}

            {needsAdminKey && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                <Label htmlFor="key">Admin key</Label>
                <Input id="key" name="inviteKey" placeholder="••••-••••-••••" className="h-11 rounded-xl" required={needsAdminKey} />
              </motion.div>
            )}

            <Button type="submit" className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-medium hover:opacity-90">
              Create Account <ArrowRight className="ml-2 h-4 w-4" />
            </Button>


          </form>

          <p className="mt-8 text-sm text-center text-muted-foreground">
            Already have an account? <Link to="/" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
