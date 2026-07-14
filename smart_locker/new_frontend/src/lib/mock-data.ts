export type LockerStatus = "available" | "occupied" | "maintenance" | "offline";

export interface Locker {
  id: string;
  code: string;
  status: LockerStatus;
  door: "open" | "closed";
  battery: number;
}

const statuses: LockerStatus[] = ["available", "available", "occupied", "occupied", "maintenance", "offline"];

export const lockers: Locker[] = Array.from({ length: 16 }, (_, i) => ({
  id: `L${i + 1}`,
  code: `LOX-${String(i + 1).padStart(3, "0")}`,
  status: statuses[i % statuses.length],
  door: i % 5 === 0 ? "open" : "closed",
  battery: 40 + ((i * 17) % 60),
}));

export const stations = [
  { id: "st-1", name: "Engineering Block A" },
  { id: "st-2", name: "Central Library" },
  { id: "st-3", name: "Science Hall" },
  { id: "st-4", name: "Sports Complex" },
];

export const summary = {
  totalLockers: 128,
  available: 64,
  occupied: 52,
  queue: 12,
};

export const queue = [
  { id: "q1", name: "Aisha Khan", position: 1, wait: "2 min" },
  { id: "q2", name: "Daniel Ortiz", position: 2, wait: "6 min" },
  { id: "q3", name: "Mei Tanaka", position: 3, wait: "11 min" },
  { id: "q4", name: "Liam Patel", position: 4, wait: "15 min" },
];

export const requestStatuses = [
  { id: "rs1", label: "Pending", count: 6, tone: "warning" as const },
  { id: "rs2", label: "Approved", count: 23, tone: "success" as const },
  { id: "rs3", label: "Rejected", count: 3, tone: "danger" as const },
  { id: "rs4", label: "Queued", count: 12, tone: "info" as const },
];

export const hourlyUsage = Array.from({ length: 12 }, (_, i) => ({
  hour: `${(i * 2).toString().padStart(2, "0")}:00`,
  usage: Math.round(20 + Math.sin(i / 2) * 18 + Math.random() * 12),
}));

export const requestTrends = Array.from({ length: 7 }, (_, i) => {
  const d = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i];
  return { day: d, approved: 30 + i * 4 + Math.round(Math.random() * 8), rejected: 4 + Math.round(Math.random() * 6) };
});

export const stationPerformance = stations.map((s, i) => ({
  name: s.name.split(" ")[0],
  utilization: 55 + i * 8 + Math.round(Math.random() * 10),
}));

export const peakHours = [
  { name: "Morning", value: 38 },
  { name: "Midday", value: 28 },
  { name: "Afternoon", value: 22 },
  { name: "Evening", value: 12 },
];

export const activityFeed = [
  { id: "a1", who: "Aisha Khan", what: "unlocked LOX-014", when: "just now" },
  { id: "a2", who: "Liam Patel", what: "requested a locker at Central Library", when: "2 min ago" },
  { id: "a3", who: "System", what: "marked LOX-007 for maintenance", when: "8 min ago" },
  { id: "a4", who: "Mei Tanaka", what: "returned LOX-002", when: "14 min ago" },
  { id: "a5", who: "Daniel Ortiz", what: "joined the queue", when: "22 min ago" },
];

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  rating: number;
  reviews: number;
  badge?: string;
  description: string;
  features: string[];
  gradient: string;
  color: string;
}

export const products: Product[] = [
  {
    id: "p1",
    name: "RFID Smart Locker",
    category: "RFID Lockers",
    price: 1299,
    rating: 4.8,
    reviews: 214,
    badge: "Best Seller",
    description: "Contactless RFID access with audit-grade logging and tamper alerts.",
    features: ["RFID + PIN access", "Tamper detection", "Cloud audit log", "24-month warranty"],
    gradient: "linear-gradient(135deg, #3B82F6, #60A5FA)",
    color: "blue",
  },
  {
    id: "p2",
    name: "Vault Smart Safe",
    category: "Smart Safes",
    price: 2499,
    rating: 4.9,
    reviews: 87,
    badge: "Premium",
    description: "Biometric safe with reinforced steel body and offline-first firmware.",
    features: ["Biometric + RFID", "Reinforced steel", "Offline mode", "Insurance ready"],
    gradient: "linear-gradient(135deg, #1E293B, #3B82F6)",
    color: "slate",
  },
  {
    id: "p3",
    name: "Digital Drawer Unit",
    category: "Digital Drawers",
    price: 899,
    rating: 4.6,
    reviews: 156,
    description: "Stackable drawer system perfect for shared workspaces and labs.",
    features: ["Stackable design", "Soft-close drawers", "LED indicators", "Wall mount kit"],
    gradient: "linear-gradient(135deg, #38BDF8, #60A5FA)",
    color: "sky",
  },
  {
    id: "p4",
    name: "Campus Wall Locker",
    category: "Wall Lockers",
    price: 749,
    rating: 4.5,
    reviews: 92,
    description: "Slim wall-mounted lockers ideal for hallways and study halls.",
    features: ["Slim profile", "Wall-mount design", "Anti-corrosion paint", "Low-power mode"],
    gradient: "linear-gradient(135deg, #60A5FA, #38BDF8)",
    color: "sky",
  },
  {
    id: "p5",
    name: "Coin-Op Public Locker",
    category: "Coin Lockers",
    price: 549,
    rating: 4.3,
    reviews: 41,
    badge: "New",
    description: "Coin or QR-based public lockers built for high-traffic venues.",
    features: ["Coin + QR pay", "High-traffic build", "Tamper alarm", "Plug-and-play"],
    gradient: "linear-gradient(135deg, #F59E0B, #EF4444)",
    color: "amber",
  },
  {
    id: "p6",
    name: "Pro RFID Cabinet",
    category: "RFID Lockers",
    price: 1799,
    rating: 4.7,
    reviews: 67,
    description: "Large multi-compartment cabinet with centralized management.",
    features: ["12 compartments", "Central admin", "Role-based access", "Backup battery"],
    gradient: "linear-gradient(135deg, #22C55E, #38BDF8)",
    color: "green",
  },
];

export const categories = ["All", "RFID Lockers", "Smart Safes", "Digital Drawers", "Wall Lockers", "Coin Lockers"];
export const colorsList = ["Slate", "Blue", "Sky", "Amber", "Green"];

export const reviews = [
  { id: "r1", name: "Dr. Helen Cruz", role: "Facilities Director", rating: 5, text: "Rock-solid hardware. Audit logs saved us during the last compliance review." },
  { id: "r2", name: "Marcus Lin", role: "IT Operations", rating: 4, text: "Setup was a breeze. Firmware updates roll out cleanly across all stations." },
  { id: "r3", name: "Priya Shah", role: "Student Services", rating: 5, text: "Students love how fast the unlock flow is. Queue handling is excellent." },
];

export const faqs = [
  { q: "How do I request a locker?", a: "Open the Home page, choose a station, set the purpose and duration, then submit your request. You'll be added to the queue if no locker is free." },
  { q: "What happens if my session expires?", a: "You'll receive a notification 10 minutes before expiry. You can extend the session if no one is waiting." },
  { q: "Can I report a faulty locker?", a: "Yes — open the locker card and tap 'Report issue'. Maintenance will be notified instantly." },
  { q: "How is access secured?", a: "Every unlock is signed with a rotating key and logged with user, station, and timestamp metadata." },
  { q: "Do staff and students share lockers?", a: "No. Roles map to separate locker pools at each station." },
];

export const guides = [
  { id: "g1", title: "Getting Started with LOX", steps: 4, time: "3 min" },
  { id: "g2", title: "Requesting a Locker", steps: 5, time: "2 min" },
  { id: "g3", title: "Managing a Station as Sub Admin", steps: 8, time: "9 min" },
  { id: "g4", title: "Resolving Stuck Doors", steps: 6, time: "5 min" },
];

export const notifications = [
  { id: "n1", title: "Locker LOX-014 unlocked", body: "Aisha Khan opened her locker.", time: "1m", tone: "success" as const },
  { id: "n2", title: "Queue alert", body: "12 people are waiting at Central Library.", time: "6m", tone: "warning" as const },
  { id: "n3", title: "Maintenance scheduled", body: "Engineering Block A — tomorrow 06:00.", time: "1h", tone: "info" as const },
];
