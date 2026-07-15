"use client"

import type { ComponentType } from "react"
import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  BarChart3,
  Bookmark,
  Building2,
  IndianRupee,
  LayoutGrid,
  MapPin,
  RefreshCw,
  Shield,
  TrendingUp,
  UserCog,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react"

import { AnimatedDonutChart } from "@/components/reports-page/animated-donut-chart"
import { PipelineOverviewChart } from "@/components/reports-page/pipeline-overview-chart"
import { BranchCommandGrid } from "@/components/reports-page/branch-command-grid"
import { ReportsCommandHero } from "@/components/reports-page/reports-command-hero"
import { ReportsFiltersBar } from "@/components/reports-page/reports-filters-bar"
import { ReportsInsightsPanel } from "@/components/reports-page/reports-insights-panel"
import { SalesFunnelChart } from "@/components/reports-page/sales-funnel-chart"
import { DashboardPageLayout } from "@/components/layout/dashboard-page-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUserData } from "@/hooks/useUserData"
import { hasAllBranchAccess } from "@/lib/auth"
import {
  fetchReportsRawData,
  getReportsData,
} from "@/lib/reports/reports-api"
import { STATIC_LEADS_BY_SOURCE } from "@/lib/reports/reports-sections-static-data"
import {
  DEFAULT_REPORTS_FILTERS,
  type ReportsFilters,
  type ReportsSummary,
  type PerformanceRow,
} from "@/lib/reports/types"
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
        "h-[112px] border shadow-sm transition-all duration-200 hover:shadow-md",
        accentClassName,
      )}
    >
      <CardContent className="flex h-full flex-col justify-between p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 min-h-[2.5rem] flex-1 text-[10px] font-medium uppercase leading-tight tracking-wide text-muted-foreground sm:text-[11px]">
            {label}
          </p>
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9",
              iconClassName,
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-1">
          {isLoading ? (
            <Skeleton className="h-7 w-20" />
          ) : (
            <p
              className={cn(
                "truncate font-bold tabular-nums leading-none tracking-tight",
                isCurrency ? "text-lg sm:text-xl" : "text-2xl sm:text-[1.75rem]",
              )}
            >
              {typeof value === "number" ? value.toLocaleString("en-IN") : value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function buildSummaryCards(summary: ReportsSummary, isLoading: boolean) {
  return [
    {
      id: "branches",
      label: "Total Branches",
      value: summary.totalBranches,
      icon: Building2,
      iconClassName: "text-blue-600 bg-blue-50",
      accentClassName: "hover:border-blue-200",
      isLoading,
    },
    {
      id: "admins",
      label: "Admins",
      value: summary.totalAdmins,
      icon: Shield,
      iconClassName: "text-violet-600 bg-violet-50",
      accentClassName: "hover:border-violet-200",
      isLoading,
    },
    {
      id: "managers",
      label: "Managers",
      value: summary.totalManagers,
      icon: UserCog,
      iconClassName: "text-amber-600 bg-amber-50",
      accentClassName: "hover:border-amber-200",
      isLoading,
    },
    {
      id: "users",
      label: "Users",
      value: summary.totalUsers,
      icon: UsersRound,
      iconClassName: "text-cyan-600 bg-cyan-50",
      accentClassName: "hover:border-cyan-200",
      isLoading,
    },
    {
      id: "total-leads",
      label: "Total Leads",
      value: summary.totalLeads,
      icon: Users,
      iconClassName: "text-indigo-600 bg-indigo-50",
      accentClassName: "hover:border-indigo-200",
      isLoading,
    },
    {
      id: "new-leads",
      label: "New Leads",
      value: summary.newLeads,
      icon: UserPlus,
      iconClassName: "text-blue-600 bg-blue-50",
      accentClassName: "hover:border-blue-200",
      isLoading,
    },
    {
      id: "converted",
      label: "Converted Leads",
      value: summary.convertedLeads,
      icon: TrendingUp,
      iconClassName: "text-emerald-600 bg-emerald-50",
      accentClassName: "hover:border-emerald-200",
      isLoading,
    },
    {
      id: "conversion-rate",
      label: "Conversion Rate",
      value: `${summary.conversionRate}%`,
      icon: BarChart3,
      iconClassName: "text-primary bg-primary/10",
      accentClassName: "hover:border-primary/20",
      isLoading,
    },
    {
      id: "projects",
      label: "Total Projects",
      value: summary.totalProjects,
      icon: LayoutGrid,
      iconClassName: "text-orange-600 bg-orange-50",
      accentClassName: "hover:border-orange-200",
      isLoading,
    },
    {
      id: "bookings",
      label: "Total Bookings",
      value: summary.totalBookings,
      icon: Bookmark,
      iconClassName: "text-emerald-600 bg-emerald-50",
      accentClassName: "hover:border-emerald-200",
      isLoading,
    },
    {
      id: "site-visits",
      label: "Site Visits (Week)",
      value: summary.siteVisitsThisWeek,
      icon: MapPin,
      iconClassName: "text-amber-600 bg-amber-50",
      accentClassName: "hover:border-amber-200",
      isLoading,
    },
    {
      id: "revenue",
      label: "Revenue",
      value: formatIndianCurrency(summary.totalRevenue),
      icon: IndianRupee,
      iconClassName: "text-primary bg-primary/10",
      accentClassName: "hover:border-primary/20",
      isLoading,
    },
  ]
}

function PerformanceTable({
  rows,
  nameColumnLabel,
  isLoading,
}: {
  rows: PerformanceRow[]
  nameColumnLabel: string
  isLoading?: boolean
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-6 text-sm text-muted-foreground">
        No records match the selected filters.
      </div>
    )
  }

  return (
    <div className="max-h-[400px] overflow-auto overscroll-y-contain">
      <Table className="min-w-[640px]">
        <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
          <TableRow>
            <TableHead>{nameColumnLabel}</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead className="text-right">New</TableHead>
            <TableHead className="text-right">Converted</TableHead>
            <TableHead className="text-right">Conv. %</TableHead>
            <TableHead className="text-right">Projects</TableHead>
            <TableHead className="text-right">Bookings</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-muted-foreground">{row.branchName ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{row.leads.toLocaleString("en-IN")}</TableCell>
              <TableCell className="text-right tabular-nums">{row.newLeads.toLocaleString("en-IN")}</TableCell>
              <TableCell className="text-right tabular-nums">{row.convertedLeads.toLocaleString("en-IN")}</TableCell>
              <TableCell className="text-right tabular-nums">{row.conversionRate}%</TableCell>
              <TableCell className="text-right tabular-nums">{row.projects.toLocaleString("en-IN")}</TableCell>
              <TableCell className="text-right tabular-nums">{row.bookings.toLocaleString("en-IN")}</TableCell>
              <TableCell className="text-right tabular-nums">{formatIndianCurrency(row.revenue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function SuperAdminReports() {
  const {
    branches,
    branchesLoading,
    isAuthLoading,
    roleTier,
    accessibleBranchIds,
    branchId: userBranchId,
  } = useUserData()

  const canFilterAllBranches = hasAllBranchAccess(roleTier)

  const accessibleBranches = useMemo(() => {
    if (accessibleBranchIds === "all") return branches
    return branches.filter((branch) => accessibleBranchIds.includes(branch.id))
  }, [branches, accessibleBranchIds])

  const defaultBranchFilter = useMemo(() => {
    if (canFilterAllBranches) return "all"
    if (userBranchId) return userBranchId
    if (accessibleBranchIds !== "all" && accessibleBranchIds[0]) {
      return accessibleBranchIds[0]
    }
    return "all"
  }, [canFilterAllBranches, userBranchId, accessibleBranchIds])

  const [filters, setFilters] = useState<ReportsFilters>(DEFAULT_REPORTS_FILTERS)
  const [filtersInitialized, setFiltersInitialized] = useState(false)

  useEffect(() => {
    if (isAuthLoading || branchesLoading || filtersInitialized) return
    setFilters((prev) => ({ ...prev, branchId: defaultBranchFilter }))
    setFiltersInitialized(true)
  }, [isAuthLoading, branchesLoading, defaultBranchFilter, filtersInitialized])

  const {
    data: rawData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "reports-raw",
      accessibleBranches.map((b) => b.id).join(","),
    ],
    enabled: !isAuthLoading && !branchesLoading && filtersInitialized,
    queryFn: () => fetchReportsRawData(accessibleBranches),
    staleTime: 5 * 60 * 1000,
  })

  const reportsData = useMemo(
    () => (rawData ? getReportsData(rawData, filters) : null),
    [rawData, filters],
  )

  const summaryCards = buildSummaryCards(
    reportsData?.summary ?? {
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
    },
    isLoading || !reportsData,
  )

  const leadsBySource = STATIC_LEADS_BY_SOURCE

  const handleBranchSelect = (branchId: string) => {
    setFilters((prev) => ({
      ...prev,
      branchId: prev.branchId === branchId ? "all" : branchId,
    }))
  }

  const handleFocusBranch = (branchId: string) => {
    setFilters((prev) => ({ ...prev, branchId }))
  }

  return (
    <DashboardPageLayout className="w-full">
      <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-lg font-semibold sm:text-xl md:text-2xl">
              <BarChart3 className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" />
              <span className="truncate">Reports</span>
            </h1>
            <p className="mt-1 max-w-3xl text-xs text-muted-foreground sm:text-sm">
              {canFilterAllBranches
                ? "Organization-wide analytics — branch performance, sales funnel, and detailed breakdowns."
                : "Branch analytics — pipeline, funnel, and team performance breakdowns."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full shrink-0 sm:w-auto"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCw className={cn("mr-1.5 h-4 w-4", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <ReportsFiltersBar
          filters={filters}
          onChange={setFilters}
          branches={accessibleBranches}
          projects={rawData?.projects ?? []}
          users={rawData?.users ?? []}
          isLoading={isLoading || !filtersInitialized}
          showBranchFilter={canFilterAllBranches}
        />

        <ReportsCommandHero
          summary={
            reportsData?.summary ?? {
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
          }
          orgHealthScore={reportsData?.orgHealthScore ?? 0}
          isLoading={isLoading || !reportsData}
        />

        <section className="mb-6">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Branch Command Grid
            </h2>
            <p className="text-xs text-muted-foreground">Tap a branch to filter the reports</p>
          </div>
          <BranchCommandGrid
            branches={reportsData?.branchCommandCards ?? []}
            selectedBranchId={filters.branchId !== "all" ? filters.branchId : undefined}
            onSelectBranch={handleBranchSelect}
            isLoading={isLoading || !reportsData}
          />
        </section>

        <section className="mb-6">
          <ReportsInsightsPanel
            topPerformers={reportsData?.topPerformers ?? []}
            attentionAlerts={reportsData?.attentionAlerts ?? []}
            onFocusBranch={handleFocusBranch}
            isLoading={isLoading || !reportsData}
          />
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Performance Metrics
          </h2>
          <div className="rounded-xl border bg-card p-3 shadow-sm sm:p-4">
            <div className="max-h-[236px] overflow-y-auto overscroll-y-contain pr-1 md:max-h-none md:overflow-visible">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                {summaryCards.slice(4).map((metric) => (
                  <MetricCard key={metric.id} {...metric} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2">
          <Card className="border shadow-sm">
            <CardHeader className="border-b px-3 pb-3 pt-4 sm:px-6 sm:pb-4">
              <CardTitle className="text-sm font-semibold sm:text-base">Real Estate Sales Funnel</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[360px] overflow-y-auto overscroll-y-contain px-3 py-4 pr-2 sm:max-h-[400px] sm:px-6 sm:py-6 sm:pr-1">
              <SalesFunnelChart stages={reportsData?.salesFunnel ?? []} />
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="border-b px-3 pb-3 pt-4 sm:px-6 sm:pb-4">
              <CardTitle className="text-sm font-semibold sm:text-base">Leads by Source</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[420px] overflow-y-auto overscroll-y-contain px-3 py-4 pr-2 sm:max-h-[480px] sm:px-6 sm:py-8 sm:pr-1">
              <AnimatedDonutChart data={leadsBySource} />
            </CardContent>
          </Card>

          <Card className="border shadow-sm xl:col-span-2">
            <CardHeader className="border-b px-3 pb-3 pt-4 sm:px-6 sm:pb-4">
              <CardTitle className="text-sm font-semibold sm:text-base">Pipeline Overview</CardTitle>
            </CardHeader>
            <CardContent className="px-3 py-4 sm:px-6 sm:py-6">
              <PipelineOverviewChart data={reportsData?.pipelineOverview ?? []} />
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="border shadow-sm">
            <CardHeader className="border-b px-3 pb-3 pt-4 sm:px-6 sm:pb-4">
              <CardTitle className="text-sm font-semibold sm:text-base">Detailed Reports</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="branch" className="w-full">
                <div className="overflow-x-auto border-b px-2 pt-3 sm:px-4 sm:pt-4">
                  <TabsList className="mb-0 inline-flex h-auto min-w-max flex-nowrap justify-start gap-1 bg-transparent p-0">
                    <TabsTrigger value="branch" className="shrink-0 text-xs data-[state=active]:bg-muted sm:text-sm">
                      Branch-wise
                    </TabsTrigger>
                    {/* <TabsTrigger value="project" className="shrink-0 text-xs data-[state=active]:bg-muted sm:text-sm">
                      Project-wise
                    </TabsTrigger> */}
                    {/* <TabsTrigger value="admin" className="shrink-0 text-xs data-[state=active]:bg-muted sm:text-sm">
                      Admin-wise
                    </TabsTrigger> */}
                    {/* <TabsTrigger value="manager" className="shrink-0 text-xs data-[state=active]:bg-muted sm:text-sm">
                      Manager-wise
                    </TabsTrigger> */}
                    <TabsTrigger value="user" className="shrink-0 text-xs data-[state=active]:bg-muted sm:text-sm">
                      User-wise
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="branch" className="m-0">
                  <PerformanceTable
                    rows={reportsData?.branchReports ?? []}
                    nameColumnLabel="Branch"
                    isLoading={isLoading || !reportsData}
                  />
                </TabsContent>
                <TabsContent value="project" className="m-0">
                  <PerformanceTable
                    rows={reportsData?.projectReports ?? []}
                    nameColumnLabel="Project"
                    isLoading={isLoading || !reportsData}
                  />
                </TabsContent>
                <TabsContent value="admin" className="m-0">
                  <PerformanceTable
                    rows={reportsData?.adminReports ?? []}
                    nameColumnLabel="Admin"
                    isLoading={isLoading || !reportsData}
                  />
                </TabsContent>
                <TabsContent value="manager" className="m-0">
                  <PerformanceTable
                    rows={reportsData?.managerReports ?? []}
                    nameColumnLabel="Manager"
                    isLoading={isLoading || !reportsData}
                  />
                </TabsContent>
                <TabsContent value="user" className="m-0">
                  <PerformanceTable
                    rows={reportsData?.userReports ?? []}
                    nameColumnLabel="User"
                    isLoading={isLoading || !reportsData}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardPageLayout>
  )
}
