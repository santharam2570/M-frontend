"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  BarChart3,
  Bookmark,
  IndianRupee,
  LayoutDashboard,
  MapPin,
  PhoneCall,
  UserPlus,
} from "lucide-react"

import { AnimatedBarChart } from "@/components/dashboard-page/animated-bar-chart"
import { AnimatedDonutChart } from "@/components/dashboard-page/animated-donut-chart"
import { DashboardPageLayout } from "@/components/layout/dashboard-page-layout"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useUserData } from "@/hooks/useUserData"
import { resolveAuthUserId } from "@/lib/auth"
import { buildDashboardScope } from "@/lib/dashboard/get-dashboard-scope"
import { fetchReportsRawData, getReportsData } from "@/lib/reports/reports-api"
import type { ReportsLead, ReportsSummary } from "@/lib/reports/types"
import { cn } from "@/lib/utils"

function formatIndianCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`
  return `₹${amount.toLocaleString("en-IN")}`
}

function countCallsMade(leads: ReportsLead[], followupsThisWeek?: number): number {
  if (typeof followupsThisWeek === "number") {
    return followupsThisWeek
  }

  return leads.filter((lead) =>
    /contact|call|reach|follow\s*up/i.test(lead.lead_status_name),
  ).length
}

function buildMetricCards(
  summary: ReportsSummary,
  callsMade: number,
): Array<{
  id: string
  label: string
  value: number | string
  icon: typeof UserPlus
}> {
  return [
    {
      id: "new-leads",
      label: "New Leads",
      value: summary.newLeads,
      icon: UserPlus,
    },
    {
      id: "calls-made",
      label: "Calls Made",
      value: callsMade,
      icon: PhoneCall,
    },
    {
      id: "site-visits",
      label: "Site Visits",
      value: summary.siteVisitsThisWeek,
      icon: MapPin,
    },
    {
      id: "bookings",
      label: "Bookings",
      value: summary.totalBookings,
      icon: Bookmark,
    },
    {
      id: "revenue",
      label: "Revenue",
      value: formatIndianCurrency(summary.totalRevenue),
      icon: IndianRupee,
    },
  ]
}

const EMPTY_SUMMARY: ReportsSummary = {
  totalBranches: 0,
  totalAdmins: 0,
  totalManagers: 0,
  totalUsers: 0,
  totalLeads: 0,
  newLeads: 0,
  convertedLeads: 0,
  conversionRate: 0,
  totalProjects: 0,
  totalBookings: 0,
  totalRevenue: 0,
  activeLeads: 0,
  siteVisitsThisWeek: 0,
}

const dashboardCardClass =
  "gap-0 overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm ring-0"

export function DashboardContent() {
  const {
    userData,
    branches,
    branchesLoading,
    isAuthLoading,
    roleTier,
    branchId,
    accessibleBranchIds,
    getBranchName,
  } = useUserData()

  const userId = userData ? resolveAuthUserId(userData) : ""
  const userName = String(userData?.result?.name ?? userData?.result?.email ?? "")
  const branchName = branchId ? getBranchName(branchId) : undefined

  const accessibleBranches = useMemo(() => {
    if (accessibleBranchIds === "all") return branches
    return branches.filter((branch) => accessibleBranchIds.includes(branch.id))
  }, [branches, accessibleBranchIds])

  const scope = useMemo(
    () =>
      buildDashboardScope({
        roleTier,
        userId,
        branchId,
        userName,
        branchName,
      }),
    [roleTier, userId, branchId, userName, branchName],
  )

  const { data: rawData, isLoading } = useQuery({
    queryKey: ["dashboard-raw", accessibleBranches.map((branch) => branch.id).join(",")],
    enabled: !isAuthLoading && !branchesLoading,
    queryFn: () => fetchReportsRawData(accessibleBranches),
    staleTime: 5 * 60 * 1000,
  })

  const dashboardData = useMemo(
    () => (rawData ? getReportsData(rawData, scope.filters) : null),
    [rawData, scope.filters],
  )

  const summary = dashboardData?.summary ?? EMPTY_SUMMARY
  const leadsBySource = dashboardData?.leadsBySource ?? []
  const pipelineOverview = dashboardData?.pipelineOverview ?? []

  const scopedLeads = useMemo(() => {
    if (!rawData) return [] as ReportsLead[]

    return rawData.leads.filter((lead) => {
      if (scope.filters.branchId !== "all" && lead.branch_id !== scope.filters.branchId) {
        return false
      }
      if (scope.filters.userId !== "all" && lead.assigned_to_id !== scope.filters.userId) {
        return false
      }
      return true
    })
  }, [rawData, scope.filters.branchId, scope.filters.userId])

  const useOrgFollowups =
    scope.filters.branchId === "all" && scope.filters.userId === "all"

  const callsMade = countCallsMade(
    scopedLeads,
    useOrgFollowups ? rawData?.leadMetrics?.followups_this_week : undefined,
  )

  const metricCards = buildMetricCards(summary, callsMade)
  const dataLoading = isLoading || !dashboardData
  const pipelineMax = Math.max(...pipelineOverview.map((item) => item.value), 0)
  const yAxisMax = pipelineMax <= 0 ? 10 : Math.ceil(pipelineMax / 50) * 50 || pipelineMax

  return (
    <DashboardPageLayout className="w-full">
      <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background p-4 md:p-6">
        <div className="mb-6">
          <h1 className="flex items-center gap-2.5 text-xl font-semibold text-primary md:text-2xl">
            <LayoutDashboard className="h-6 w-6 shrink-0" />
            Reporting Dashboard
          </h1>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {metricCards.map((metric) => {
            const Icon = metric.icon

            return (
              <Card key={metric.id} className={cn(dashboardCardClass, "min-h-[108px]")}>
                <CardContent className="flex h-full items-center px-4 py-5 sm:px-5">
                  <div className="flex w-full items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {metric.label}
                      </p>
                      {dataLoading ? (
                        <Skeleton className="mt-2 h-8 w-20" />
                      ) : (
                        <p
                          className={cn(
                            "mt-1.5 font-bold tabular-nums leading-none tracking-tight text-foreground",
                            metric.id === "revenue" ? "text-2xl" : "text-3xl",
                          )}
                        >
                          {typeof metric.value === "number"
                            ? metric.value.toLocaleString("en-IN")
                            : metric.value}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-stretch">
          <Card className={cn(dashboardCardClass, "flex min-h-[400px] flex-col xl:min-h-[430px]")}>
            <CardHeader className="border-b border-border/70 px-5 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <BarChart3 className="h-4 w-4 text-primary" />
                Leads by Source
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
              {dataLoading ? (
                <Skeleton className="h-[220px] w-[220px] rounded-full" />
              ) : leadsBySource.length > 0 ? (
                <AnimatedDonutChart data={leadsBySource} size={220} strokeWidth={32} />
              ) : (
                <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
                  No lead source data yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={cn(dashboardCardClass, "flex min-h-[400px] flex-col xl:min-h-[430px]")}>
            <CardHeader className="border-b border-border/70 px-5 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <BarChart3 className="h-4 w-4 text-primary" />
                Pipeline Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 items-center px-4 py-6 sm:px-5">
              {dataLoading ? (
                <div className="w-full space-y-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-8 w-full" />
                  ))}
                </div>
              ) : pipelineOverview.length > 0 ? (
                <AnimatedBarChart data={pipelineOverview} yAxisMax={yAxisMax} />
              ) : (
                <div className="flex min-h-[200px] w-full items-center justify-center text-sm text-muted-foreground">
                  No pipeline data yet.
                </div>
              )}
            </CardContent>
            <CardFooter className="mt-auto flex items-center justify-between border-t border-border/70 bg-muted/40 px-5 py-4">
              <span className="text-sm font-medium text-muted-foreground">
                Overall Conversion
              </span>
              {dataLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <span className="text-xl font-bold tabular-nums text-foreground">
                  {summary.conversionRate}%
                </span>
              )}
            </CardFooter>
          </Card>
        </section>
      </div>
    </DashboardPageLayout>
  )
}
