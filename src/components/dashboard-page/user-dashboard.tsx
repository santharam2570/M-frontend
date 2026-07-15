"use client"

import type { ComponentType } from "react"
import Link from "next/link"
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  Building2,
  IndianRupee,
  LayoutDashboard,
  MapPin,
  RefreshCw,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react"

import { AnimatedBarChart } from "@/components/reports-page/animated-bar-chart"
import { AnimatedDonutChart } from "@/components/reports-page/animated-donut-chart"
import { DashboardPageLayout } from "@/components/layout/dashboard-page-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useUserData } from "@/hooks/useUserData"
import { resolveAuthUserId } from "@/lib/auth"
import { buildDashboardScope } from "@/lib/dashboard/get-dashboard-scope"
import { useReportsPermissions } from "@/hooks/useReportsPermissions"
import { fetchReportsRawData, getReportsData } from "@/lib/reports/reports-api"
import type { ReportsSummary } from "@/lib/reports/types"
import { cn } from "@/lib/utils"

function formatIndianCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`
  return `₹${amount.toLocaleString("en-IN")}`
}

function MetricCard({
  label,
  value,
  icon: Icon,
  iconClassName,
  accentClassName,
  isLoading,
}: {
  label: string
  value: string | number
  icon: ComponentType<{ className?: string }>
  iconClassName: string
  accentClassName: string
  isLoading?: boolean
}) {
  const isCurrency = typeof value === "string" && value.startsWith("₹")

  return (
    <Card
      className={cn(
        "min-h-[104px] border shadow-sm transition-all duration-200 hover:shadow-md",
        accentClassName,
      )}
    >
      <CardContent className="flex h-full items-center px-4 py-5">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            {isLoading ? (
              <Skeleton className="mt-2 h-8 w-20" />
            ) : (
              <p
                className={cn(
                  "mt-2 font-bold tabular-nums leading-none tracking-tight",
                  isCurrency ? "text-2xl" : "text-3xl",
                )}
              >
                {typeof value === "number" ? value.toLocaleString("en-IN") : value}
              </p>
            )}
          </div>
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
              iconClassName,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function buildMetricCards(summary: ReportsSummary, scopeKind: "organization" | "branch" | "personal") {
  const shared = [
    {
      id: "new-leads",
      label: "New Leads",
      value: summary.newLeads,
      icon: UserPlus,
      iconClassName: "text-blue-600 bg-blue-50",
      accentClassName: "hover:border-blue-200",
    },
    {
      id: "total-leads",
      label: scopeKind === "personal" ? "My Leads" : "Total Leads",
      value: summary.totalLeads,
      icon: Users,
      iconClassName: "text-indigo-600 bg-indigo-50",
      accentClassName: "hover:border-indigo-200",
    },
    {
      id: "converted",
      label: "Converted",
      value: summary.convertedLeads,
      icon: TrendingUp,
      iconClassName: "text-emerald-600 bg-emerald-50",
      accentClassName: "hover:border-emerald-200",
    },
    {
      id: "bookings",
      label: "Bookings",
      value: summary.totalBookings,
      icon: Bookmark,
      iconClassName: "text-emerald-600 bg-emerald-50",
      accentClassName: "hover:border-emerald-200",
    },
    {
      id: "revenue",
      label: "Revenue",
      value: formatIndianCurrency(summary.totalRevenue),
      icon: IndianRupee,
      iconClassName: "text-primary bg-primary/10",
      accentClassName: "hover:border-primary/20",
    },
  ]

  if (scopeKind === "organization") {
    return [
      {
        id: "branches",
        label: "Branches",
        value: summary.totalBranches,
        icon: Building2,
        iconClassName: "text-blue-600 bg-blue-50",
        accentClassName: "hover:border-blue-200",
      },
      {
        id: "projects",
        label: "Projects",
        value: summary.totalProjects,
        icon: LayoutDashboard,
        iconClassName: "text-orange-600 bg-orange-50",
        accentClassName: "hover:border-orange-200",
      },
      ...shared,
    ]
  }

  if (scopeKind === "branch") {
    return [
      {
        id: "team-users",
        label: "Team Members",
        value: summary.totalUsers + summary.totalManagers,
        icon: Users,
        iconClassName: "text-cyan-600 bg-cyan-50",
        accentClassName: "hover:border-cyan-200",
      },
      {
        id: "projects",
        label: "Projects",
        value: summary.totalProjects,
        icon: Building2,
        iconClassName: "text-orange-600 bg-orange-50",
        accentClassName: "hover:border-orange-200",
      },
      {
        id: "site-visits",
        label: "Site Visits (Week)",
        value: summary.siteVisitsThisWeek,
        icon: MapPin,
        iconClassName: "text-amber-600 bg-amber-50",
        accentClassName: "hover:border-amber-200",
      },
      ...shared.slice(0, 4),
    ]
  }

  return [
    ...shared.slice(0, 3),
    {
      id: "conversion-rate",
      label: "Conversion Rate",
      value: `${summary.conversionRate}%`,
      icon: BarChart3,
      iconClassName: "text-primary bg-primary/10",
      accentClassName: "hover:border-primary/20",
    },
    shared[3],
    shared[4],
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

export function UserDashboard() {
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
  const { canViewReports } = useReportsPermissions()

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

  const {
    data: rawData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
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
  const metricCards = buildMetricCards(summary, scope.kind)
  const leadsBySource = dashboardData?.leadsBySource ?? []
  const pipelineOverview = dashboardData?.pipelineOverview ?? []
  const dataLoading = isLoading || !dashboardData

  return (
    <DashboardPageLayout className="w-full">
      <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4 md:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-semibold md:text-2xl">
              <LayoutDashboard className="h-6 w-6 shrink-0 text-primary" />
              <span className="truncate">{scope.title}</span>
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{scope.subtitle}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {scope.showReportsLink && canViewReports ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/reports">
                  <BarChart3 className="mr-1.5 h-4 w-4" />
                  Open Reports
                </Link>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              <RefreshCw className={cn("mr-1.5 h-4 w-4", isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {metricCards.map((metric) => (
            <MetricCard key={metric.id} {...metric} isLoading={dataLoading} />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card className="border shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-semibold">Leads by Source</CardTitle>
            </CardHeader>
            <CardContent className="py-8">
              {dataLoading ? (
                <Skeleton className="mx-auto h-[320px] w-[320px] rounded-full" />
              ) : leadsBySource.length > 0 ? (
                <AnimatedDonutChart data={leadsBySource} size={320} strokeWidth={40} />
              ) : (
                <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
                  No lead source data for this view yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-semibold">Pipeline Overview</CardTitle>
            </CardHeader>
            <CardContent className="py-6">
              {dataLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-8 w-full" />
                  ))}
                </div>
              ) : pipelineOverview.length > 0 ? (
                <AnimatedBarChart data={pipelineOverview} />
              ) : (
                <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
                  No pipeline data for this view yet.
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {scope.showReportsLink && canViewReports ? (
          <Card className="mt-4 border border-dashed bg-muted/20 shadow-none">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Need branch-wise or team performance tables?</p>
                <p className="text-xs text-muted-foreground">
                  Detailed reports, funnel analysis, and performance breakdowns live in the Reports
                  module.
                </p>
              </div>
              <Button asChild variant="secondary" size="sm" className="shrink-0">
                <Link href="/reports">
                  Go to Reports
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardPageLayout>
  )
}
