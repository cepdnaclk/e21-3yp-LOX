import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { 
  Mail, Lock, ArrowRight, ShieldCheck, Zap, Server, 
  BarChart3, Activity, Smartphone, Network, Building2, CheckCircle2, LockKeyhole
} from "lucide-react";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
    <div className="min-h-screen grid lg:grid-cols-[1.2fr_1fr] bg-[#F8FAFC] font-['Inter'] selection:bg-[#2F80ED]/20">
      {/* LEFT SIDE - Premium Enterprise Branding */}
      <div className="relative hidden lg:flex flex-col overflow-hidden text-white p-12 xl:p-16" style={{ background: 'linear-gradient(135deg, #2F80ED 0%, #56CCF2 100%)' }}>
        
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ y: [0, -20, 0], opacity: [0.3, 0.5, 0.3] }} 
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-40 -left-40 w-[30rem] h-[30rem] rounded-full bg-white/10 blur-3xl"
          />
          <motion.div 
            animate={{ x: [0, 30, 0], opacity: [0.2, 0.4, 0.2] }} 
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/3 -right-20 w-[40rem] h-[40rem] rounded-full bg-[#56CCF2]/20 blur-3xl"
          />
          
          {/* IoT Connection Lines Pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <circle cx="20%" cy="30%" r="2" fill="white" />
            <circle cx="60%" cy="70%" r="2" fill="white" />
            <circle cx="80%" cy="20%" r="2" fill="white" />
            <path d="M 20% 30% L 60% 70% L 80% 20%" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
          </svg>
        </div>

        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col h-full max-w-2xl 2xl:max-w-3xl mx-auto w-full">
          {/* Header */}
          <div className="flex items-center gap-4 mb-10">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md grid place-items-center border border-white/30 shadow-lg p-1">
              <img src="/logo.jpg" alt="LOX Logo" className="w-full h-full rounded-xl object-cover" />
            </div>
            <div>
              <p className="text-3xl font-extrabold tracking-tight">LOX</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block py-1.5 px-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[11px] font-bold tracking-wider uppercase mb-6 shadow-sm">
              Smart Locker Platform
            </span>
            <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.15] mb-5 text-white drop-shadow-sm">
              LOX - Smart Locker Management System
            </h1>
            <p className="text-lg text-white/90 leading-relaxed mb-10 font-medium">
              A modern platform for securely managing smart lockers, monitoring real-time locker activity, controlling user access, and streamlining locker operations through one intelligent dashboard.
            </p>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-2 gap-4 mb-10">
              {[
                { icon: ShieldCheck, title: "Secure Access Control", desc: "Protect lockers with secure authentication and role-based access permissions." },
                { icon: Server, title: "Smart Locker Operations", desc: "Manage locker allocation, reservations, and releases with ease." },
                { icon: Activity, title: "Real-Time Monitoring", desc: "Monitor locker status, door activity, security alerts, and system events instantly." },
                { icon: BarChart3, title: "Analytics & Insights", desc: "Track usage trends, operational performance, and activity reports through interactive dashboards." },
                { icon: LockKeyhole, title: "Complete Activity Logs", desc: "Every action is securely recorded to provide full visibility and accountability." },
                { icon: Building2, title: "Scalable & Reliable", desc: "Designed to support organizations of any size with fast, secure, and dependable performance." },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="group flex items-start gap-3 p-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 backdrop-blur-sm transition-all duration-300 shadow-sm"
                >
                  <div className="mt-0.5 h-8 w-8 rounded-lg bg-white/20 grid place-items-center shrink-0">
                    <f.icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1 leading-tight group-hover:text-white transition-colors">{f.title}</h3>
                    <p className="text-[11px] text-white/80 leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Dashboard Preview Illustration (CSS Based) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="relative w-full h-44 xl:h-52 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 border border-white/30 backdrop-blur-md overflow-hidden shadow-2xl p-4 flex gap-4 items-end"
            >
              {/* Fake Locker Column */}
              <div className="w-1/3 h-full bg-white/10 rounded-xl border border-white/20 p-2 flex flex-col gap-2">
                <div className="h-4 w-1/2 bg-white/20 rounded-md mb-2"></div>
                <div className="flex-1 bg-white/10 rounded-lg flex items-center justify-center relative overflow-hidden">
                   <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#4ade80] shadow-[0_0_8px_#4ade80]"></div>
                   <LockKeyhole className="w-6 h-6 text-white/50" />
                </div>
                <div className="flex-1 bg-white/10 rounded-lg flex items-center justify-center relative overflow-hidden">
                   <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#f87171] shadow-[0_0_8px_#f87171]"></div>
                   <LockKeyhole className="w-6 h-6 text-white/50" />
                </div>
              </div>

              {/* Fake Chart / Analytics */}
              <div className="flex-1 h-full flex flex-col justify-end gap-3 relative">
                {/* Floating Status Card */}
                <motion.div 
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute top-2 right-2 bg-white rounded-xl shadow-xl p-3 flex items-center gap-3 z-20"
                >
                  <div className="w-8 h-8 rounded-full bg-green-100 grid place-items-center">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider">System Status</p>
                    <p className="text-[11px] font-extrabold text-[#0F172A]">All Lockers Online</p>
                  </div>
                </motion.div>

                {/* Mobile Phone Mockup */}
                <motion.div 
                  animate={{ y: [0, 4, 0] }}
                  transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                  className="absolute bottom-[-10px] right-10 w-20 h-32 xl:w-24 xl:h-40 bg-slate-900 rounded-t-2xl border-4 border-slate-800 shadow-2xl overflow-hidden p-1.5 z-10"
                >
                  <div className="w-full h-full bg-slate-50 rounded-md pt-4 flex flex-col items-center gap-2">
                    <div className="w-8 h-8 xl:w-10 xl:h-10 bg-blue-100 rounded-full grid place-items-center mb-1">
                      <Smartphone className="w-4 h-4 xl:w-5 xl:h-5 text-[#2F80ED]" />
                    </div>
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                    <div className="w-8 h-1.5 bg-slate-200 rounded-full"></div>
                  </div>
                </motion.div>

                <div className="w-full h-24 bg-white/10 rounded-xl border border-white/20 flex items-end p-2 gap-1.5">
                  <div className="w-1/6 bg-white/40 h-1/3 rounded-t-sm"></div>
                  <div className="w-1/6 bg-white/60 h-2/3 rounded-t-sm"></div>
                  <div className="w-1/6 bg-white/80 h-full rounded-t-sm"></div>
                  <div className="w-1/6 bg-white/50 h-1/2 rounded-t-sm"></div>
                  <div className="w-1/6 bg-[#56CCF2] h-4/5 rounded-t-sm"></div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Stats Footer */}
          <div className="mt-auto pt-8 pb-4 flex justify-between gap-4">
            {[
              { val: "1000+", lbl: "Smart Lockers Managed" },
              { val: "24/7", lbl: "Real-Time Monitoring" },
              { val: "Role-Based", lbl: "Secure Access Control" },
              { val: "99.9%", lbl: "System Reliability" }
            ].map((stat, i) => (
              <motion.div 
                key={stat.lbl}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + i * 0.1 }}
                className="flex flex-col"
              >
                <span className="text-2xl xl:text-3xl font-black text-white">{stat.val}</span>
                <span className="text-[10px] xl:text-[11px] mt-1 font-bold text-white/70 tracking-wide">{stat.lbl}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Premium Login Card */}
      <div className="flex items-start justify-center p-6 sm:p-12 pt-12 lg:pt-24 relative bg-[#F8FAFC]">
        {/* Subtle background decoration for right side on mobile */}
        <div className="absolute inset-0 lg:hidden opacity-5" style={{ background: 'linear-gradient(135deg, #2F80ED 0%, #56CCF2 100%)' }}></div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring', damping: 25 }}
          className="w-full max-w-[460px] bg-[#FFFFFF] rounded-[18px] p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#E2E8F0] relative z-10"
        >
          <div className="lg:hidden flex items-center gap-4 mb-8">
            <div className="h-16 w-16 rounded-2xl overflow-hidden shadow-sm border border-[#E2E8F0] p-1 bg-white">
              <img src="/logo.jpg" alt="LOX Logo" className="w-full h-full rounded-xl object-cover" />
            </div>
            <p className="text-3xl font-extrabold text-[#0F172A]">LOX</p>
          </div>

          <h2 className="text-[28px] font-extrabold tracking-tight text-[#0F172A] mb-2">Welcome Back</h2>
          <p className="text-[#64748B] text-[15px] mb-8 font-medium">Sign in to access your Smart Locker Management Dashboard.</p>

          <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl mb-8">
            <div className="bg-white p-1.5 rounded-lg shadow-sm border border-slate-100">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F172A]">Secure Authentication</p>
              <p className="text-[11px] text-[#64748B] font-medium mt-0.5">Your account is protected with enterprise-grade security.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-bold text-[#0F172A]">Email Address</Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#64748B] group-focus-within:text-[#2F80ED] transition-colors" />
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="name@company.com" 
                  className="pl-11 h-[52px] rounded-xl border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#2F80ED] focus:ring-4 focus:ring-[#2F80ED]/10 transition-all text-[15px] font-medium text-[#0F172A]" 
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pw" className="text-sm font-bold text-[#0F172A]">Password</Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#64748B] group-focus-within:text-[#2F80ED] transition-colors" />
                <Input 
                  id="pw" 
                  name="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-11 h-[52px] rounded-xl border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#2F80ED] focus:ring-4 focus:ring-[#2F80ED]/10 transition-all text-[15px] font-medium text-[#0F172A]" 
                  required 
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm py-2">
              <label className="flex items-center gap-2.5 text-[#64748B] font-medium cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" className="peer sr-only" defaultChecked />
                  <div className="w-[18px] h-[18px] border-2 border-[#E2E8F0] rounded-[6px] peer-checked:bg-[#2F80ED] peer-checked:border-[#2F80ED] transition-colors bg-[#F8FAFC]"></div>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none stroke-[3]" />
                </div>
                Remember me
              </label>
              <a className="text-[#2F80ED] font-bold hover:text-[#2F80ED]/80 transition-colors cursor-pointer">Forgot password?</a>
            </div>

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full h-[52px] mt-2 rounded-xl text-white font-bold text-[15px] shadow-[0_4px_14px_0_rgba(47,128,237,0.39)] hover:shadow-[0_6px_20px_rgba(47,128,237,0.23)] hover:-translate-y-[1px] transition-all group relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #2F80ED 0%, #56CCF2 100%)' }}
            >
              <span className="relative z-10 flex items-center justify-center">
                {loading ? "Authenticating…" : (<>Sign In <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" /></>)}
              </span>
            </Button>
          </form>

          <p className="mt-8 text-[14px] text-center text-[#64748B] font-medium">
            Don't have an account?{" "}
            <Link to="/register" className="text-[#0F172A] font-extrabold hover:text-[#2F80ED] transition-colors">Create Account</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
