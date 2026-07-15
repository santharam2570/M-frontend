import type { DonutSegment } from "@/components/reports-page/animated-donut-chart"
import type {
  AttentionAlert,
  BranchCommandCard,
  ReportsUser,
  TopPerformer,
} from "./types"

const SOURCE_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#e53935",
  "#f97316",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f59e0b",
  "#6366f1",
  "#14b8a6",
  "#a855f7",
  "#ef4444",
  "#10b981",
  "#0ea5e9",
  "#d946ef",
  "#64748b",
  "#ca8a04",
  "#7c3aed",
]

const BRANCH_ACCENT_COLORS = [
  "#003399",
  "#059669",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#0891b2",
  "#ca8a04",
  "#4f46e5",
  "#16a34a",
  "#dc2626",
  "#9333ea",
  "#2563eb",
  "#c026d3",
  "#0d9488",
  "#d97706",
  "#4b5563",
  "#b91c1c",
  "#1d4ed8",
  "#15803d",
  "#a21caf",
]

const BRANCH_NAMES = [
  "Mumbai Central",
  "Bandra West",
  "Andheri East",
  "Powai",
  "Thane",
  "Navi Mumbai",
  "Pune Hinjewadi",
  "Pune Kharadi",
  "Bangalore Whitefield",
  "Bangalore Indiranagar",
  "Hyderabad Gachibowli",
  "Hyderabad Hitech City",
  "Chennai OMR",
  "Chennai Anna Nagar",
  "Delhi Gurgaon",
  "Delhi Noida",
  "Ahmedabad SG Highway",
  "Kolkata Salt Lake",
  "Jaipur Malviya Nagar",
  "Kochi Kakkanad",
]

const PROJECT_NAMES = [
  "Skyline Residency",
  "Green Valley Estates",
  "Palm Grove Heights",
  "Lakeview Towers",
  "Sunrise Meadows",
  "Royal Orchid Park",
  "Emerald City Phase 2",
  "Silver Oak Villas",
  "Harmony Enclave",
  "Crown Plaza Residences",
  "Aqua Bay Apartments",
  "Maple Woods",
  "Prestige Gardens",
  "Urban Nest",
  "Golden Gate Homes",
  "Serene Heights",
  "Vista Grande",
  "Riverstone Court",
  "Horizon Park",
  "Elite Square",
]

const LEAD_SOURCE_NAMES = [
  "Facebook Ads",
  "Google Ads",
  "WhatsApp",
  "Website",
  "Referral",
  "Walk-in",
  "Instagram",
  "LinkedIn",
  "Property Portal",
  "Cold Call",
  "Email Campaign",
  "SMS Blast",
  "Channel Partner",
  "Exhibition",
  "Newspaper",
  "YouTube",
  "Broker Network",
  "Corporate Tie-up",
  "Hoarding",
  "Others",
]

const ADMIN_NAMES = [
  "Rajesh Kumar",
  "Priya Sharma",
  "Amit Patel",
  "Sneha Reddy",
  "Vikram Singh",
  "Ananya Iyer",
  "Karthik Menon",
  "Deepa Nair",
  "Rohit Gupta",
  "Meera Joshi",
  "Arjun Desai",
  "Kavita Rao",
  "Sanjay Mehta",
  "Lakshmi Pillai",
  "Nikhil Verma",
  "Pooja Agarwal",
  "Suresh Nambiar",
  "Divya Krishnan",
  "Manish Choudhary",
  "Ritu Bansal",
]

const MANAGER_NAMES = [
  "Arun Kulkarni",
  "Neha Kapoor",
  "Rahul Saxena",
  "Swati Malhotra",
  "Gaurav Bhatia",
  "Ishita Chatterjee",
  "Varun Khanna",
  "Aditi Sinha",
  "Harsh Trivedi",
  "Nidhi Oberoi",
  "Kunal Shah",
  "Tanvi Dutta",
  "Abhishek Roy",
  "Shreya Banerjee",
  "Vivek Pandey",
  "Anjali Mishra",
  "Prateek Jain",
  "Riya Ghosh",
  "Siddharth Rao",
  "Mansi Hegde",
]

const USER_NAMES = [
  "Aakash Sharma",
  "Bhavna Patel",
  "Chetan Deshmukh",
  "Diya Menon",
  "Eshan Iyer",
  "Farah Khan",
  "Gopal Naidu",
  "Heena Sheikh",
  "Imran Qureshi",
  "Jyoti Das",
  "Kiran Bose",
  "Lata Pillai",
  "Mohit Agarwal",
  "Nandini Reddy",
  "Omkar Joshi",
  "Pallavi Nair",
  "Qasim Ali",
  "Rekha Sundaram",
  "Sameer Verma",
  "Tanya Kapoor",
]

const ROLE_LABELS = ["Admin", "Manager", "User"] as const

function classifyBranchHealth(score: number): BranchCommandCard["statusLabel"] {
  if (score >= 80) return "excellent"
  if (score >= 60) return "healthy"
  if (score >= 35) return "watch"
  return "critical"
}

export const STATIC_LEADS_BY_SOURCE: DonutSegment[] = LEAD_SOURCE_NAMES.map((label, index) => ({
  label,
  value: 156 - index * 5 + (index % 4) * 3,
  color: SOURCE_COLORS[index % SOURCE_COLORS.length],
}))

export const STATIC_TOP_PERFORMERS: TopPerformer[] = Array.from({ length: 20 }, (_, index) => {
  const roleLabel = ROLE_LABELS[index % ROLE_LABELS.length]
  const namePool = roleLabel === "Admin" ? ADMIN_NAMES : roleLabel === "Manager" ? MANAGER_NAMES : USER_NAMES
  const name = namePool[index]
  const leads = 142 - index * 5
  const convertedLeads = Math.max(8, Math.round(leads * (0.18 - index * 0.004)))
  const bookings = Math.max(2, convertedLeads - (index % 3))

  return {
    id: `performer-${index + 1}`,
    name,
    roleLabel,
    branchName: BRANCH_NAMES[index],
    score: convertedLeads * 3 + bookings * 5 + leads,
    leads,
    bookings,
    convertedLeads,
  }
})

export const STATIC_BRANCH_COMMAND_CARDS: BranchCommandCard[] = BRANCH_NAMES.map((name, index) => {
  const healthScore = Math.max(22, 92 - index * 3 + (index % 3) * 2)
  const leads = 210 - index * 8
  const bookings = Math.max(3, 28 - index)
  const conversionRate = leads > 0 ? Math.round((bookings / leads) * 1000) / 10 : 0
  const revenue = bookings * (920000 + (index % 5) * 110000)

  return {
    id: `branch-card-${index + 1}`,
    name,
    healthScore,
    rank: index + 1,
    leads,
    bookings,
    conversionRate,
    revenue,
    statusLabel: classifyBranchHealth(healthScore),
    accentColor: BRANCH_ACCENT_COLORS[index % BRANCH_ACCENT_COLORS.length],
  }
})

export const STATIC_FILTER_BRANCHES = BRANCH_NAMES.map((name, index) => ({
  id: `static-branch-${index + 1}`,
  name,
}))

export const STATIC_FILTER_PROJECTS = PROJECT_NAMES.map((name, index) => ({
  _id: `static-project-${index + 1}`,
  name,
}))

export const STATIC_FILTER_USERS: ReportsUser[] = [
  ...ADMIN_NAMES.map((name, index) => ({
    id: `static-admin-${index + 1}`,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@map.demo`,
    role_tier: "admin" as const,
    branch_id: `static-branch-${(index % 20) + 1}`,
    isActive: true,
  })),
  ...MANAGER_NAMES.map((name, index) => ({
    id: `static-manager-${index + 1}`,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@map.demo`,
    role_tier: "branch_manager" as const,
    branch_id: `static-branch-${(index % 20) + 1}`,
    isActive: true,
  })),
  ...USER_NAMES.map((name, index) => ({
    id: `static-user-${index + 1}`,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@map.demo`,
    role_tier: "branch_user" as const,
    branch_id: `static-branch-${(index % 20) + 1}`,
    isActive: true,
  })),
]

const ATTENTION_ALERT_TEMPLATES: Array<{
  severity: AttentionAlert["severity"]
  title: string
  description: (branch: string, index: number) => string
}> = [
  {
    severity: "high",
    title: "Low conversion rate",
    description: (branch, i) =>
      `${branch} is at ${(4 + (i % 5)).toFixed(1)}% conversion with ${48 + i * 3} leads.`,
  },
  {
    severity: "high",
    title: "Overdue follow-ups",
    description: (branch, i) =>
      `${branch} has ${12 + i * 2} leads with follow-ups overdue by more than 7 days.`,
  },
  {
    severity: "high",
    title: "Pipeline stall",
    description: (branch, i) =>
      `${branch} has ${18 + i} leads stuck in negotiation for over 14 days.`,
  },
  {
    severity: "medium",
    title: "No bookings yet",
    description: (branch, i) =>
      `${branch} has ${32 + i * 2} leads but zero bookings recorded this month.`,
  },
  {
    severity: "medium",
    title: "Site visit drop-off",
    description: (branch, i) =>
      `${branch} scheduled ${22 + i} site visits but only ${8 + (i % 6)} completed.`,
  },
  {
    severity: "medium",
    title: "Lead response delay",
    description: (branch, i) =>
      `${branch} average first response time is ${4 + (i % 4)} hours — above target.`,
  },
  {
    severity: "medium",
    title: "Cold leads aging",
    description: (branch, i) =>
      `${branch} has ${15 + i} leads with no activity in the last 30 days.`,
  },
  {
    severity: "low",
    title: "Unassigned leads",
    description: (branch, i) =>
      `${6 + (i % 8)} leads in ${branch} are not assigned to a sales executive.`,
  },
  {
    severity: "low",
    title: "Missing project mapping",
    description: (branch, i) =>
      `${branch} has ${4 + (i % 5)} leads without a linked project.`,
  },
  {
    severity: "low",
    title: "Incomplete lead profiles",
    description: (branch, i) =>
      `${branch} has ${9 + i} leads missing phone or email contact details.`,
  },
]

export const STATIC_ATTENTION_ALERTS: AttentionAlert[] = BRANCH_NAMES.map((branchName, index) => {
  const template = ATTENTION_ALERT_TEMPLATES[index % ATTENTION_ALERT_TEMPLATES.length]
  return {
    id: `attention-${index + 1}`,
    severity: template.severity,
    title: template.title,
    description: template.description(branchName, index),
    branchId: `static-branch-${index + 1}`,
    branchName,
  }
})
