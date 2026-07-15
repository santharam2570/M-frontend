import type { RoleTier } from "@/lib/auth"
import { hasAllBranchAccess } from "@/lib/auth"
import type { ReportsFilters } from "@/lib/reports/types"
import { DEFAULT_REPORTS_FILTERS } from "@/lib/reports/types"

export type DashboardScopeKind = "organization" | "branch" | "personal"

export interface DashboardScope {
  kind: DashboardScopeKind
  title: string
  subtitle: string
  filters: ReportsFilters
  showReportsLink: boolean
}

interface BuildDashboardScopeInput {
  roleTier: RoleTier
  userId?: string
  branchId?: string
  userName?: string
  branchName?: string
}

export function buildDashboardScope({
  roleTier,
  userId,
  branchId,
  userName,
  branchName,
}: BuildDashboardScopeInput): DashboardScope {
  const firstName = userName?.trim().split(/\s+/)[0] ?? "there"

  if (hasAllBranchAccess(roleTier)) {
    return {
      kind: "organization",
      title: `Welcome back, ${firstName}`,
      subtitle:
        "Your organization at a glance — key metrics and pipeline activity. Open Reports for detailed analytics.",
      filters: { ...DEFAULT_REPORTS_FILTERS, branchId: "all" },
      showReportsLink: true,
    }
  }

  if (roleTier === "branch_manager") {
    const resolvedBranchId = branchId ?? "all"
    return {
      kind: "branch",
      title: `Welcome back, ${firstName}`,
      subtitle: branchName
        ? `Branch dashboard for ${branchName} — team leads, bookings, and pipeline.`
        : "Branch dashboard — team leads, bookings, and pipeline.",
      filters: {
        ...DEFAULT_REPORTS_FILTERS,
        branchId: resolvedBranchId,
      },
      showReportsLink: true,
    }
  }

  return {
    kind: "personal",
    title: `Welcome back, ${firstName}`,
    subtitle: "Your personal workspace — assigned leads, bookings, and pipeline progress.",
    filters: {
      ...DEFAULT_REPORTS_FILTERS,
      branchId: branchId ?? "all",
      userId: userId ?? "all",
    },
    showReportsLink: false,
  }
}
