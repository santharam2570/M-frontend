export type ProjectStatus = "active" | "upcoming" | "sold_out" | "on_hold"

export type ReraStatus = "approved" | "pending" | "not_applicable"

export type UnitStatus = string

export type PropertyType =
  | "plot"
  | "villa"
  | "apartment"
  | "commercial"
  | "agri_land"
  | "industrial_land"

export type SiteVisitStatus = "scheduled" | "completed" | "cancelled" | "no_show"

export type DocumentCategory =
  | "legal"
  | "layout"
  | "brochure"
  | "kyc"
  | "registration"
  | "other"

export interface ProjectUnit {
  _id: string
  unit_no: string
  block?: string
  property_type: PropertyType
  area_sqft?: number
  area_cents?: number
  facing?: string
  floor?: string
  status: UnitStatus
  price_per_sqft: number
  total_price: number
  percentage?: number
  hold_until?: string
  linked_lead_id?: string
  linked_lead_name?: string
  linked_booking_id?: string
}

export interface SiteVisit {
  _id: string
  project_id: string
  lead_id?: string
  lead_name: string
  visit_date: string
  visit_time: string
  agent_name: string
  attaching_person?: string
  family_attended: boolean
  feedback?: string
  follow_up_scheduled: boolean
  next_follow_up_date?: string
  status: SiteVisitStatus
}

export interface ProjectDocument {
  _id: string
  name: string
  category: DocumentCategory
  file_url?: string
  uploaded_at: string
}

export const PROJECT_CARD_COLORS = [
  "#003399",
  "#059669",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#0891b2",
  "#ca8a04",
  "#dc2626",
  "#4f46e5",
  "#0d9488",
  "#6366f1",
  "#16a34a",
  "#c026d3",
  "#d97706",
  "#0284c7",
  "#be123c",
  "#4338ca",
  "#15803d",
  "#a21caf",
  "#b45309",
  "#0369a1",
  "#9f1239",
  "#312e81",
  "#166534",
  "#86198f",
  "#92400e",
  "#075985",
  "#881337",
  "#1e1b4b",
  "#14532d",
  "#701a75",
] as const

export interface Project {
  _id: string
  project_no: string
  name: string
  location: string
  area_locality: string
  card_color?: string
  sort_order?: number
  price_per_sqft: number
  price_per_cent?: number
  price_range_min: number
  price_range_max: number
  total_units: number
  available_units: number
  blocked_units: number
  sold_units: number
  owner_site_units?: number
  rera_status: ReraStatus
  rera_number?: string
  dtcp_number?: string
  dtcp_status?: string
  highlights: string[]
  property_types: PropertyType[]
  budget_min: number
  budget_max: number
  status: ProjectStatus
  description?: string
  create_date: string
  units: ProjectUnit[]
  site_visits: SiteVisit[]
  documents: ProjectDocument[]
}

export interface ProjectMetrics {
  total_projects: number
  active_projects: number
  total_units: number
  available_units: number
  site_visits_this_week: number
}

export interface MatchedLead {
  _id: string
  name: string
  phone: string
  budget: string
  location: string
  property_type: string
  match_score: number
  match_reasons: string[]
}

export interface MatchedProject {
  _id: string
  name: string
  location: string
  match_score: number
  match_reasons: string[]
}

export interface LeadMatchCriteria {
  location?: string
  budget?: string
  customerRequirementName?: string
}

export interface ProjectFilterState {
  status: string
  location: string
  property_type: string
  rera_status: string
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  plot: "Plot",
  villa: "Villa",
  apartment: "Apartment",
  commercial: "Commercial",
  agri_land: "Agri Land",
  industrial_land: "Industrial Land",
}

export const UNIT_STATUS_LABELS = {
  available: "Available",
  hold: "On Hold",
  booked: "Booked",
  registered: "Registered",
  sold: "Sold",
} as const

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  upcoming: "Upcoming",
  sold_out: "Sold Out",
  on_hold: "On Hold",
}

export const RERA_STATUS_LABELS: Record<ReraStatus, string> = {
  approved: "RERA Approved",
  pending: "RERA Pending",
  not_applicable: "Not Applicable",
}

export function getProjectCardColor(project: Project, index: number): string {
  return project.card_color ?? PROJECT_CARD_COLORS[index % PROJECT_CARD_COLORS.length]
}

export function formatIndianCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`
  }
  return `₹${amount.toLocaleString("en-IN")}`
}
