import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Phone, ShieldAlert, Wrench, BookOpen, ChevronRight, Send } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { faqs, guides } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/help")({
  head: () => ({ meta: [{ title: "Help — LOX Smart Locker" }] }),
  component: HelpPage,
});

const contacts = [
  { icon: ShieldAlert, name: "Campus Security",     phone: "+1 555 911 0001", color: "bg-destructive/10 text-destructive" },
  { icon: Phone,       name: "LOX Support Desk",    phone: "+1 555 010 8800", color: "bg-primary/10 text-primary" },
  { icon: Wrench,      name: "System Administrator", phone: "+1 555 010 4422", color: "bg-warning/15 text-warning" },
];

function HelpPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Help Center</h1>
        <p className="text-muted-foreground mt-1">Get support, browse guides, and contact your campus team.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {contacts.map((c, i) => (
          <motion.div key={c.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card-soft p-5 flex items-center gap-4">
            <div className={`h-12 w-12 rounded-2xl grid place-items-center ${c.color}`}><c.icon className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{c.name}</p>
              <p className="text-sm text-muted-foreground">{c.phone}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-soft p-6">
          <h2 className="font-semibold">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="mt-4">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`f-${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="card-soft p-6">
          <h2 className="font-semibold">Step-by-step guides</h2>
          <ul className="mt-4 divide-y divide-border">
            {guides.map((g) => (
              <li key={g.id} className="flex items-center justify-between py-3.5 group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center"><BookOpen className="h-4 w-4" /></div>
                  <div>
                    <p className="text-sm font-medium">{g.title}</p>
                    <p className="text-xs text-muted-foreground">{g.steps} steps · {g.time}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition" />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); toast.success("Support request sent"); (e.currentTarget as HTMLFormElement).reset(); }}
        className="card-soft p-6 space-y-5"
      >
        <div>
          <h2 className="font-semibold">Contact support</h2>
          <p className="text-sm text-muted-foreground">We typically reply within an hour.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Name</Label><Input className="h-11 rounded-xl" placeholder="Your name" required /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" className="h-11 rounded-xl" placeholder="you@campus.edu" required /></div>
        </div>
        <div className="space-y-2"><Label>Message</Label><Textarea rows={4} className="rounded-xl" placeholder="Tell us what's going on…" required /></div>
        <div className="flex justify-end">
          <Button type="submit" className="rounded-xl gradient-primary text-primary-foreground hover:opacity-90 h-11 px-5">
            <Send className="h-4 w-4 mr-2" /> Send message
          </Button>
        </div>
      </form>
    </div>
  );
}
