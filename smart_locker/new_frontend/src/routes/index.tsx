import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, LockKeyhole, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — LOX Smart Locker" },
      { name: "description", content: "Sign in to your LOX Smart Locker account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Login failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      toast.success("Welcome back to LOX");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left — brand */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden gradient-primary text-primary-foreground p-12">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-accent/40 blur-3xl" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl overflow-hidden bg-white/15 backdrop-blur grid place-items-center border border-white/30">
            <img src="/logo.jpg" alt="LOX Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">LOX</p>
            <p className="text-xs text-white/80">Smart Locker Platform</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-md"
        >
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
            Intelligent lockers for the modern world.
          </h1>
          <p className="mt-4 text-white/80 text-lg">
            Manage thousands of smart lockers, real-time queues, and access logs from one beautiful dashboard.
          </p>

          <div className="mt-10 grid gap-4">
            {[
              { icon: ShieldCheck, label: "End-to-end audit logging" },
              { icon: Zap, label: "Realtime locker telemetry" },
              { icon: Sparkles, label: "Used by 120+ universities" },
            ].map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3 text-white/90"
              >
                <div className="h-9 w-9 rounded-xl bg-white/15 grid place-items-center border border-white/20">
                  <f.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{f.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Locker illustration */}
        <div className="relative z-10 grid grid-cols-4 gap-2 max-w-sm">
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.04 }}
              className="aspect-square rounded-xl bg-white/10 border border-white/20 backdrop-blur grid place-items-center"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-white/80" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-2xl overflow-hidden gradient-primary grid place-items-center text-primary-foreground">
              <img src="/logo.jpg" alt="LOX Logo" className="w-full h-full object-cover" />
            </div>
            <p className="text-lg font-bold">LOX Smart Locker</p>
          </div>

          <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
          <p className="mt-2 text-muted-foreground">Sign in to manage your campus lockers.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" name="email" type="email" placeholder="you@campus.edu" className="pl-10 h-12 rounded-xl" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pw">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="pw" name="password" type="password" placeholder="••••••••" className="pl-10 h-12 rounded-xl" required />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" className="h-4 w-4 rounded border-border" defaultChecked />
                Remember me
              </label>
              <a className="text-primary hover:underline cursor-pointer">Forgot password?</a>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-medium hover:opacity-90">
              {loading ? "Signing in…" : (<>Sign In <ArrowRight className="ml-2 h-4 w-4" /></>)}
            </Button>


          </form>

          <p className="mt-8 text-sm text-center text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">Create one</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
