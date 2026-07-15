import type { BarChartItem } from "@/components/reports-page/animated-bar-chart"
import type { DonutSegment } from "@/components/reports-page/animated-donut-chart"
import { parseDateString } from "@/lib/date-ageing"

import type {
  AttentionAlert,
  BranchCommandCard,
  ReportsAggregatedData,
  ReportsBooking,
  ReportsFilters,
  ReportsLead,
  ReportsProject,
  ReportsRawData,
  ReportsSummary,
  ReportsUser,
  FunnelStage,
  PerformanceRow,
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
]

const FUNNEL_STAGE_DEFS: Array<{ id: string; label: string; patterns: RegExp[]; color: string }> = [
  { id: "new", label: "New Leads", patterns: [/new/i, /fresh/i, /open/i], color: "#3b82f6" },
  { id: "contacted", label: "Contacted", patterns: [/contact/i, /call/i, /reach/i], color: "#6366f1" },
  { id: "qualified", label: "Qualified", patterns: [/qualif/i, /interested/i, /hot/i], color: "#8b5cf6" },
  { id: "site_visit", label: "Site Visit", patterns: [/site/i, /visit/i], color: "#eab308" },
  { id: "negotiation", label: "Negotiation", patterns: [/nego/i, /proposal/i, /offer/i], color: "#f97316" },
  { id: "booking", label: "Booking", patterns: [/book/i, /convert/i, /won/i, /sold/i, /register/i, /closed/i], color: "#059669" },
]

export interface ReportsAggregationContext {
  raw: ReportsRawData
  filters: ReportsFilters
  branchNameMap: Map<string, string>
  userNameMap: Map<string, string>
  projectNameMap: Map<string, string>
  dateRange?: { start?: Date; end?: Date }
}

function isConvertedLead(lead: ReportsLead): boolean {
  const status = lead.lead_status_name.toLowerCase()
  return /book|convert|won|closed|register|sold/.test(status)
}

function isLeadInDateRange(lead: ReportsLead, dateRange?: { start?: Date; end?: Date }): boolean {
  if (!dateRange?.start && !dateRange?.end) return true
  const created = parseDateString(lead.create_date)
  if (!created) return false
  if (dateRange.start && created < dateRange.start) return false
  if (dateRange.end && created > dateRange.end) return false
  return true
}

function matchesBranchFilter(branchId: string | undefined, filterBranchId: string): boolean {
  if (filterBranchId === "all") return true
  return branchId === filterBranchId
}

function getUsersByTier(users: ReportsUser[], tier: ReportsUser["role_tier"]): ReportsUser[] {
  return users.filter((user) => user.isActive && user.role_tier === tier)
}

function filterLeads(
  leads: ReportsLead[],
  context: ReportsAggregationContext,
): ReportsLead[] {
  const { filters, dateRange } = context

  return leads.filter((lead) => {
    if (!isLeadInDateRange(lead, dateRange)) return false
    if (!matchesBranchFilter(lead.branch_id, filters.branchId)) return false

    if (filters.projectId !== "all") {
      const projectName = context.projectNameMap.get(filters.projectId)
      if (!projectName || lead.project_name !== projectName) return false
    }

    if (filters.userId !== "all" && lead.assigned_to_id !== filters.userId) return false
    if (filters.managerId !== "all" && lead.assigned_to_id !== filters.managerId) return false
    if (filters.adminId !== "all" && lead.create_by_id !== filters.adminId && lead.assigned_to_id !== filters.adminId) {
      return false
    }

    return true
  })
}

function filterProjects(projects: ReportsProject[], context: ReportsAggregationContext): ReportsProject[] {
  const { filters } = context
  return projects.filter((project) => {
    if (!matchesBranchFilter(project.branch_id, filters.branchId)) return false
    if (filters.projectId !== "all" && project._id !== filters.projectId) return false
    return true
  })
}

function filterBookings(bookings: ReportsBooking[], context: ReportsAggregationContext): ReportsBooking[] {
  const { filters } = context
  return bookings.filter((booking) => {
    if (!matchesBranchFilter(booking.branch_id, filters.branchId)) return false
    if (filters.projectId !== "all" && booking.project_id !== filters.projectId) return false
    return true
  })
}

function countRoleUsers(users: ReportsUser[], context: ReportsAggregationContext) {
  const activeUsers = users.filter((user) => user.isActive)
  const branchFiltered =
    context.filters.branchId === "all"
      ? activeUsers
      : activeUsers.filter((user) => user.branch_id === context.filters.branchId)

  return {
    admins: branchFiltered.filter((user) => user.role_tier === "admin").length,
    managers: branchFiltered.filter((user) => user.role_tier === "branch_manager").length,
    branchUsers: branchFiltered.filter((user) => user.role_tier === "branch_user").length,
  }
}

function buildLeadsBySource(leads: ReportsLead[]): DonutSegment[] {
  const counts = new Map<string, number>()
  for (const lead of leads) {
    const source = lead.source_name?.trim() || "Unknown"
    counts.set(source, (counts.get(source) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value], index) => ({
      label,
      value,
      color: SOURCE_COLORS[index % SOURCE_COLORS.length],
    }))
}

function buildPipelineOverview(leads: ReportsLead[]): BarChartItem[] {
  const counts = new Map<string, number>()
  for (const lead of leads) {
    const stage = lead.lead_status_name?.trim() || "Unknown"
    counts.set(stage, (counts.get(stage) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }))
}

function buildPerformanceRow(
  id: string,
  name: string,
  leads: ReportsLead[],
  projects: ReportsProject[],
  bookings: ReportsBooking[],
  branchName?: string,
): PerformanceRow {
  const converted = leads.filter(isConvertedLead).length
  const newLeads = leads.length
  const revenue = bookings.reduce((sum, booking) => sum + booking.total_price, 0)

  return {
    id,
    name,
    branchName,
    leads: leads.length,
    newLeads,
    convertedLeads: converted,
    conversionRate: leads.length > 0 ? Math.round((converted / leads.length) * 1000) / 10 : 0,
    projects: projects.length,
    bookings: bookings.length,
    revenue,
  }
}

function buildBranchReports(
  context: ReportsAggregationContext,
  filteredLeads: ReportsLead[],
  filteredProjects: ReportsProject[],
  filteredBookings: ReportsBooking[],
): PerformanceRow[] {
  const branchIds = new Set<string>()
  for (const branch of context.raw.branches) branchIds.add(branch.id)
  for (const lead of filteredLeads) if (lead.branch_id) branchIds.add(lead.branch_id)
  for (const project of filteredProjects) if (project.branch_id) branchIds.add(project.branch_id)

  return Array.from(branchIds)
    .map((branchId) => {
      const branchLeads = filteredLeads.filter((lead) => lead.branch_id === branchId)
      const branchProjects = filteredProjects.filter((project) => project.branch_id === branchId)
      const branchBookings = filteredBookings.filter((booking) => booking.branch_id === branchId)

      return buildPerformanceRow(
        branchId,
        context.branchNameMap.get(branchId) ?? "Unassigned",
        branchLeads,
        branchProjects,
        branchBookings,
      )
    })
    .sort((a, b) => b.leads - a.leads)
}

function buildProjectReports(
  context: ReportsAggregationContext,
  filteredLeads: ReportsLead[],
  filteredProjects: ReportsProject[],
  filteredBookings: ReportsBooking[],
): PerformanceRow[] {
  return filteredProjects
    .map((project) => {
      const projectLeads = filteredLeads.filter((lead) => lead.project_name === project.name)
      const projectBookings = filteredBookings.filter((booking) => booking.project_id === project._id)
      const branchName = project.branch_id
        ? context.branchNameMap.get(project.branch_id)
        : undefined

      return buildPerformanceRow(
        project._id,
        project.name,
        projectLeads,
        [project],
        projectBookings,
        branchName,
      )
    })
    .sort((a, b) => b.bookings - a.bookings)
}

function buildUserTierReports(
  users: ReportsUser[],
  context: ReportsAggregationContext,
  filteredLeads: ReportsLead[],
  filteredProjects: ReportsProject[],
  filteredBookings: ReportsBooking[],
  matchLead: (lead: ReportsLead, user: ReportsUser) => boolean,
): PerformanceRow[] {
  return users
    .map((user) => {
      const userLeads = filteredLeads.filter((lead) => matchLead(lead, user))
      const userProjects = filteredProjects.filter((project) => project.branch_id === user.branch_id)
      const userBookings = filteredBookings.filter((booking) => booking.branch_id === user.branch_id)

      return buildPerformanceRow(
        user.id,
        user.name,
        userLeads,
        userProjects,
        userBookings,
        user.branch_id ? context.branchNameMap.get(user.branch_id) : undefined,
      )
    })
    .filter((row) => row.leads > 0 || row.bookings > 0 || row.projects > 0)
    .sort((a, b) => b.leads - a.leads)
}

function hasScopeFilters(filters: ReportsFilters): boolean {
  return (
    filters.branchId !== "all" ||
    filters.projectId !== "all" ||
    filters.userId !== "all" ||
    filters.managerId !== "all" ||
    filters.adminId !== "all"
  )
}

function isSiteVisitLead(lead: ReportsLead): boolean {
  return /site\s*visit|visit/i.test(lead.lead_status_name)
}

function buildSummary(
  context: ReportsAggregationContext,
  filteredLeads: ReportsLead[],
  filteredProjects: ReportsProject[],
  filteredBookings: ReportsBooking[],
): ReportsSummary {
  const { raw, filters, dateRange } = context
  const roleCounts = countRoleUsers(raw.users, context)
  const hasDateFilter = Boolean(dateRange?.start || dateRange?.end)
  const useBackendMetrics = !hasScopeFilters(filters) && !hasDateFilter

  const convertedFromList = filteredLeads.filter(isConvertedLead).length
  const listRevenue = filteredBookings.reduce((sum, booking) => sum + booking.total_price, 0)
  const siteVisitsFromLeads = filteredLeads.filter(isSiteVisitLead).length

  const totalLeads = useBackendMetrics
    ? (raw.leadMetrics?.active_leads ?? filteredLeads.length)
    : filteredLeads.length

  const newLeads = useBackendMetrics
    ? (raw.leadMetrics?.created_this_month ?? filteredLeads.length)
    : hasDateFilter
      ? filteredLeads.length
      : filteredLeads.filter((lead) => {
          const created = parseDateString(lead.create_date)
          if (!created) return false
          const now = new Date()
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
        }).length

  const convertedLeads = useBackendMetrics
    ? (raw.leadMetrics?.converted_this_month ?? convertedFromList)
    : convertedFromList

  const totalBookings = useBackendMetrics
    ? (raw.bookingMetrics?.total_bookings ?? filteredBookings.length)
    : filteredBookings.length

  const totalRevenue = useBackendMetrics
    ? (raw.bookingMetrics?.total_amount_paid ?? listRevenue)
    : listRevenue

  const totalProjects = useBackendMetrics
    ? (raw.projectMetrics?.total_projects ?? filteredProjects.length)
    : filteredProjects.length

  const siteVisitsThisWeek = useBackendMetrics
    ? (raw.projectMetrics?.site_visits_this_week ?? siteVisitsFromLeads)
    : siteVisitsFromLeads

  const visibleBranches =
    filters.branchId === "all"
      ? raw.branches.filter((branch) => branch.status === "active")
      : raw.branches.filter((branch) => branch.id === filters.branchId)

  return {
    totalBranches: visibleBranches.length,
    totalAdmins: roleCounts.admins,
    totalManagers: roleCounts.managers,
    totalUsers: roleCounts.branchUsers,
    totalLeads,
    newLeads,
    convertedLeads,
    conversionRate:
      totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 1000) / 10 : 0,
    totalProjects,
    totalBookings,
    totalRevenue,
    activeLeads: raw.leadMetrics?.active_leads ?? filteredLeads.length,
    siteVisitsThisWeek,
  }
}

function classifyBranchHealth(score: number): BranchCommandCard["statusLabel"] {
  if (score >= 80) return "excellent"
  if (score >= 60) return "healthy"
  if (score >= 35) return "watch"
  return "critical"
}

function computeBranchHealthScore(
  row: PerformanceRow,
  maxLeads: number,
  maxRevenue: number,
): number {
  const leadScore = maxLeads > 0 ? (row.leads / maxLeads) * 25 : 0
  const convScore = Math.min(row.conversionRate, 100) * 0.35
  const bookingRatio = row.leads > 0 ? Math.min((row.bookings / row.leads) * 100, 100) : 0
  const bookingScore = bookingRatio * 0.25
  const revenueScore = maxRevenue > 0 ? (row.revenue / maxRevenue) * 15 : 0
  return Math.round(Math.min(leadScore + convScore + bookingScore + revenueScore, 100))
}

function buildBranchCommandCards(branchReports: PerformanceRow[]): BranchCommandCard[] {
  const maxLeads = Math.max(...branchReports.map((row) => row.leads), 1)
  const maxRevenue = Math.max(...branchReports.map((row) => row.revenue), 1)

  const scored = branchReports
    .map((row, index) => {
      const healthScore = computeBranchHealthScore(row, maxLeads, maxRevenue)
      return {
        id: row.id,
        name: row.name,
        healthScore,
        rank: 0,
        leads: row.leads,
        bookings: row.bookings,
        conversionRate: row.conversionRate,
        revenue: row.revenue,
        statusLabel: classifyBranchHealth(healthScore),
        accentColor: BRANCH_ACCENT_COLORS[index % BRANCH_ACCENT_COLORS.length],
      } satisfies BranchCommandCard
    })
    .sort((a, b) => b.healthScore - a.healthScore)

  return scored.map((card, index) => ({ ...card, rank: index + 1 }))
}

function computeOrgHealthScore(branchCards: BranchCommandCard[]): number {
  if (branchCards.length === 0) return 0
  const total = branchCards.reduce((sum, card) => sum + card.healthScore, 0)
  return Math.round(total / branchCards.length)
}

function buildSalesFunnel(leads: ReportsLead[]): FunnelStage[] {
  const counts = new Map<string, number>()
  for (const stage of FUNNEL_STAGE_DEFS) counts.set(stage.id, 0)

  for (const lead of leads) {
    const status = lead.lead_status_name.toLowerCase()
    const matched = FUNNEL_STAGE_DEFS.find((stage) =>
      stage.patterns.some((pattern) => pattern.test(status)),
    )
    const stageId = matched?.id ?? "new"
    counts.set(stageId, (counts.get(stageId) ?? 0) + 1)
  }

  return FUNNEL_STAGE_DEFS.map((stage) => ({
    id: stage.id,
    label: stage.label,
    value: counts.get(stage.id) ?? 0,
    color: stage.color,
  }))
}

function buildTopPerformers(
  adminReports: PerformanceRow[],
  managerReports: PerformanceRow[],
  userReports: PerformanceRow[],
): TopPerformer[] {
  const withRole = [
    ...adminReports.map((row) => ({ row, roleLabel: "Admin" })),
    ...managerReports.map((row) => ({ row, roleLabel: "Manager" })),
    ...userReports.map((row) => ({ row, roleLabel: "User" })),
  ]

  return withRole
    .map(({ row, roleLabel }) => ({
      id: `${roleLabel}-${row.id}`,
      name: row.name,
      roleLabel,
      branchName: row.branchName,
      score: row.convertedLeads * 3 + row.bookings * 5 + row.leads,
      leads: row.leads,
      bookings: row.bookings,
      convertedLeads: row.convertedLeads,
    }))
    .filter((performer) => performer.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
}

function buildAttentionAlerts(branchReports: PerformanceRow[]): AttentionAlert[] {
  const alerts: AttentionAlert[] = []

  for (const branch of branchReports) {
    if (branch.leads >= 5 && branch.conversionRate < 10) {
      alerts.push({
        id: `low-conv-${branch.id}`,
        severity: "high",
        title: "Low conversion rate",
        description: `${branch.name} is at ${branch.conversionRate}% conversion with ${branch.leads} leads.`,
        branchId: branch.id,
        branchName: branch.name,
      })
    }

    if (branch.leads > 0 && branch.bookings === 0) {
      alerts.push({
        id: `no-bookings-${branch.id}`,
        severity: "medium",
        title: "No bookings yet",
        description: `${branch.name} has ${branch.leads} leads but zero bookings recorded.`,
        branchId: branch.id,
        branchName: branch.name,
      })
    }

    if (branch.name === "Unassigned" && branch.leads > 0) {
      alerts.push({
        id: `unassigned-${branch.id}`,
        severity: "low",
        title: "Unassigned leads",
        description: `${branch.leads} leads are not mapped to a branch via assigned users.`,
        branchId: branch.id,
        branchName: branch.name,
      })
    }
  }

  return alerts
    .sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 }
      return rank[a.severity] - rank[b.severity]
    })
    .slice(0, 6)
}

export function aggregateReportsData(context: ReportsAggregationContext): ReportsAggregatedData {
  const filteredLeads = filterLeads(context.raw.leads, context)
  const filteredProjects = filterProjects(context.raw.projects, context)
  const filteredBookings = filterBookings(context.raw.bookings, context)

  const admins = getUsersByTier(context.raw.users, "admin")
  const managers = getUsersByTier(context.raw.users, "branch_manager")
  const branchUsers = getUsersByTier(context.raw.users, "branch_user")

  const branchReports = buildBranchReports(context, filteredLeads, filteredProjects, filteredBookings)
  const adminReports = buildUserTierReports(
    admins,
    context,
    filteredLeads,
    filteredProjects,
    filteredBookings,
    (lead, user) => lead.create_by_id === user.id || lead.assigned_to_id === user.id,
  )
  const managerReports = buildUserTierReports(
    managers,
    context,
    filteredLeads,
    filteredProjects,
    filteredBookings,
    (lead, user) => lead.assigned_to_id === user.id,
  )
  const userReports = buildUserTierReports(
    branchUsers,
    context,
    filteredLeads,
    filteredProjects,
    filteredBookings,
    (lead, user) => lead.assigned_to_id === user.id,
  )

  const branchCommandCards = buildBranchCommandCards(branchReports)

  return {
    summary: buildSummary(context, filteredLeads, filteredProjects, filteredBookings),
    orgHealthScore: computeOrgHealthScore(branchCommandCards),
    leadsBySource: buildLeadsBySource(filteredLeads),
    pipelineOverview: buildPipelineOverview(filteredLeads),
    salesFunnel: buildSalesFunnel(filteredLeads),
    branchCommandCards,
    topPerformers: buildTopPerformers(adminReports, managerReports, userReports),
    attentionAlerts: buildAttentionAlerts(branchReports),
    branchReports,
    projectReports: buildProjectReports(context, filteredLeads, filteredProjects, filteredBookings),
    adminReports,
    managerReports,
    userReports,
  }
}
