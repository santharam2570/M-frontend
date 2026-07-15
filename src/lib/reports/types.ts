import type { RoleTier } from "@/lib/auth"
import type { BarChartItem } from "@/components/reports-page/animated-bar-chart"
import type { DonutSegment } from "@/components/reports-page/animated-donut-chart"
import type { LeadMetricsData } from "@/lib/leads/lead-api"
import type { ProjectMetrics } from "@/lib/projects/types"
import type { BookingMetricsData } from "@/components/booking-list-page/bookings-summary"

export interface ReportsFilters {
  branchId: string
  projectId: string
  userId: string
  managerId: string
  adminId: string
  startDate?: string
  endDate?: string
}

export const DEFAULT_REPORTS_FILTERS: ReportsFilters = {
  branchId: "all",
  projectId: "all",
  userId: "all",
  managerId: "all",
  adminId: "all",
  startDate: undefined,
  endDate: undefined,
}

export interface ReportsUser {
  id: string
  name: string
  email: string
  role_tier: RoleTier
  branch_id?: string
  isActive: boolean
}

export interface ReportsLead {
  _id: string
  name: string
  source_name: string
  lead_status_name: string
  assigned_to: string
  assigned_to_id: string
  create_by: string
  create_by_id: string
  create_date: string
  project_name?: string
  branch_id?: string
}

export interface ReportsProject {
  _id: string
  name: string
  branch_id?: string
  status: string
  total_units: number
  sold_units: number
  available_units: number
}

export interface ReportsBooking {
  _id: string
  project_id: string
  project_name: string
  branch_id?: string
  total_price: number
  status: string
  customer_name?: string
}

export interface ReportsSummary {
  totalBranches: number
  totalAdmins: number
  totalManagers: number
  totalUsers: number
  totalLeads: number
  newLeads: number
  convertedLeads: number
  conversionRate: number
  totalProjects: number
  totalBookings: number
  totalRevenue: number
  activeLeads: number
  siteVisitsThisWeek: number
}

export interface PerformanceRow {
  id: string
  name: string
  branchName?: string
  leads: number
  newLeads: number
  convertedLeads: number
  conversionRate: number
  projects: number
  bookings: number
  revenue: number
}

export interface BranchCommandCard {
  id: string
  name: string
  healthScore: number
  rank: number
  leads: number
  bookings: number
  conversionRate: number
  revenue: number
  statusLabel: "excellent" | "healthy" | "watch" | "critical"
  accentColor: string
}

export interface TopPerformer {
  id: string
  name: string
  roleLabel: string
  branchName?: string
  score: number
  leads: number
  bookings: number
  convertedLeads: number
}

export interface AttentionAlert {
  id: string
  severity: "high" | "medium" | "low"
  title: string
  description: string
  branchId?: string
  branchName?: string
}

export interface FunnelStage {
  id: string
  label: string
  value: number
  color: string
}

export interface ReportsAggregatedData {
  summary: ReportsSummary
  orgHealthScore: number
  leadsBySource: DonutSegment[]
  pipelineOverview: BarChartItem[]
  salesFunnel: FunnelStage[]
  branchCommandCards: BranchCommandCard[]
  topPerformers: TopPerformer[]
  attentionAlerts: AttentionAlert[]
  branchReports: PerformanceRow[]
  projectReports: PerformanceRow[]
  adminReports: PerformanceRow[]
  managerReports: PerformanceRow[]
  userReports: PerformanceRow[]
}

export interface ReportsRawData {
  branches: Array<{ id: string; name: string; status: string }>
  users: ReportsUser[]
  leads: ReportsLead[]
  projects: ReportsProject[]
  bookings: ReportsBooking[]
  leadMetrics: LeadMetricsData | null
  projectMetrics: ProjectMetrics | null
  bookingMetrics: BookingMetricsData | null
}
