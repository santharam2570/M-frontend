"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { FilterIcon, Home, Plus, Search, XCircleIcon, X, Check } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { LeadsTable } from "@/components/lead-list-page/leads-table"
import { LeadsSummary } from "@/components/lead-list-page/leads-summary"
import {
  ColumnsDropdown,
  type ColumnPref,
  fetchLeadColumnConfig,
  buildFallbackConfig,
} from "@/components/lead-list-page/columns-dropdown"
import { FilterDrawer } from "@/components/lead-list-page/filter-drawer"
import { LeadFormDrawer } from "@/components/lead-list-page/lead-form-drawer"
import { useToast } from "@/hooks/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"
import { ExportDialog } from "@/components/lead-list-page/export-dialog"
import { ImportDialog } from "@/components/lead-list-page/import-dialog"
import { useRouter } from "next/navigation"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getApiErrorMessage } from "@/lib/api"
import { fetchLeadMetrics } from "@/lib/leads/lead-api"

interface CustomFilter {
  name: string
  filters: any
}

interface FilterState {
  lead_status: string
  stage: string
  customer_type: string
  purpose: string
  source: string
  assigned_to: string
  start_date: string
  end_date: string
  create_by: string
}

export function LeadsContent() {
  const [search, setSearch] = useState("")
  const [searchQuery, setSearchQuery] = useState("") // Actual search query sent to API
  const [totalLeads, setTotalLeads] = useState(0)
  const [visibleColumnsOverride, setVisibleColumnsOverride] = useState<ColumnPref[] | null>(null)
  const [allColumnsOverride, setAllColumnsOverride] = useState<ColumnPref[] | null>(null)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [leadFormOpen, setLeadFormOpen] = useState(false)
  const [customFilters, setCustomFilters] = useState<CustomFilter[]>([])
  const [activeCustomFilters, setActiveCustomFilters] = useState<FilterState>({
    lead_status: "",
    stage: "",
    customer_type: "",
    purpose: "",
    source: "",
    assigned_to: "",
    start_date: "",
    end_date: "",
    create_by: "",
  })
  const [activeMetricFilter, setActiveMetricFilter] = useState<string | null>(null)
  // Separate state for metrics filters
  const [activeMetricsFilters, setActiveMetricsFilters] = useState<any[]>([])
  const [hasActiveMetricsFilter, setHasActiveMetricsFilter] = useState(false)
  // Store the Active status ID to check if applied filters match it
  const [activeStatusId, setActiveStatusId] = useState<string | null>(null)
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const [open, setOpen] = useState(false)
  const router = useRouter();
  const queryClient = useQueryClient();
  const [userData, setUserData] = useState<any>(null);
  // Bumped whenever the lead list needs to reload (e.g. after adding a lead)
  // without triggering a full page reload.
  const refreshKey = 0
  const [prependLeadRequest, setPrependLeadRequest] = useState<{
    lead: Record<string, unknown>
    id: number
  } | null>(null)

  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [filteredCount, setFilteredCount] = useState(0);

  const token = userData?.access_token as string | undefined

  // Lead summary metrics are cached across navigations: returning to this page
  // shows the previously-loaded numbers immediately (no loading flash) and only
  // refetches when the cache is stale.
  const {
    data: leadMetrics = null,
    isLoading: isMetricsLoading,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ["lead-metrics"],
    enabled: !!token,
    queryFn: () => fetchLeadMetrics(token, 7),
    staleTime: 5 * 60 * 1000,
  })

  // Column configuration is also cached; falls back to a default config on error.
  const { data: columnConfig } = useQuery({
    queryKey: ["lead-columns"],
    enabled: !!token,
    queryFn: async () => {
      try {
        return await fetchLeadColumnConfig(token as string)
      } catch (error) {
        console.error("Error loading lead columns:", getApiErrorMessage(error))
        return buildFallbackConfig()
      }
    },
  })

  const columnsLoaded = !!columnConfig
  const visibleColumns = visibleColumnsOverride ?? columnConfig?.visibleColumns ?? []
  const allColumns = allColumnsOverride ?? columnConfig?.modalColumns ?? []

  useEffect(() => {
    try {
      const storedData = localStorage.getItem('map_user') ?? '{}';
      const userData = JSON.parse(storedData);
      if (!userData?.access_token) {
        router.push('/login');
      } else {
        setUserData(userData);
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    }
  }, []);

  // Default view: show active leads without a lead_status ObjectId filter.
  // The API already scopes results to status=active; filtering by lead_status
  // excludes records that do not have that field populated yet.
  const setDefaultStatusFilter = useCallback(() => {
    setActiveStatusId(null);
    setActiveCustomFilters({
      lead_status: "",
      stage: "",
      customer_type: "",
      purpose: "",
      source: "",
      assigned_to: "",
      start_date: "",
      end_date: "",
      create_by: "",
    });
    localStorage.removeItem('current_filters');
    localStorage.removeItem('current_lead_metrics_filters');
    setActiveMetricFilter(null);
    setActiveMetricsFilters([]);
    setHasActiveMetricsFilter(false);
  }, []);

  // Always set default status filter on page load/reload
  useEffect(() => {
    // Clear any existing filters from localStorage on page reload
    localStorage.removeItem('current_filters');
    localStorage.removeItem('current_lead_metrics_filters');
    // Set default status filter (0th index - "Active")
    setDefaultStatusFilter();
  }, [setDefaultStatusFilter]);

  const handleSearch = useCallback(() => {
    setSearchQuery(search);
  }, [search]);

  const handleClearSearch = useCallback(() => {
    setSearch("");
    setSearchQuery("");
  }, []);

  const handleSearchKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handleApplyFilters = useCallback(
    (filters: any) => {
      try {
        localStorage.removeItem("current_lead_metrics_filters")
        setActiveMetricsFilters([])
        setHasActiveMetricsFilter(false)

        let filterArray: any[] = []
        let filterState: FilterState = {
          lead_status: "",
          stage: "",
          customer_type: "",
          purpose: "",
          source: "",
          assigned_to: "",
          start_date: "",
          end_date: "",
          create_by: "",
        }

        if (Array.isArray(filters)) {
          filterArray = filters
          filters.forEach((f: any) => {
            const uiField = f.field === "stages" ? "stage" : f.field

            if (
              f.field === "create_date" &&
              f.selected_values?.[0] === "custom" &&
              (f.custom_start || f.custom_end)
            ) {
              if (f.custom_start) filterState.start_date = f.custom_start
              if (f.custom_end) filterState.end_date = f.custom_end
              return
            }

            if (uiField === "lead_status" && f.selected_values?.length) {
              filterState.lead_status = f.selected_values[0]
            } else if (uiField === "stage" && f.selected_values?.length) {
              filterState.stage = f.selected_values[0]
            } else if (uiField === "customer_type" && f.selected_values?.length) {
              filterState.customer_type = f.selected_values[0]
            } else if (f.field === "purpose" && f.selected_values?.length) {
              filterState.purpose = f.selected_values[0]
            } else if (f.field === "source" && f.selected_values?.length) {
              filterState.source = f.selected_values[0]
            } else if (f.field === "assigned_to" && f.selected_values?.length) {
              filterState.assigned_to = f.selected_values[0]
            } else if (f.field === "create_date" && f.selected_values?.length) {
              filterState.start_date = f.selected_values[0]
              filterState.end_date = f.selected_values[0]
            } else if (f.field === "create_by" && f.selected_values?.length) {
              filterState.create_by = f.selected_values[0]
            }
          })
        } else {
          filterState = filters
          const { start_date, end_date, ...otherFilters } = filters
          filterArray = Object.entries(otherFilters)
            .filter(
              ([key, value]) =>
                value !== "" &&
                ["lead_status", "stage", "customer_type", "purpose", "source", "assigned_to", "create_by"].includes(key),
            )
            .map(([field, value]) => ({
              field: field === "stage" ? "stages" : field,
              indictor: "is",
              field_orgin: "default",
              selected_values: [value],
            }))

          if (start_date || end_date) {
            filterArray.push({
              field: "create_date",
              indictor: "is",
              field_orgin: "default",
              selected_values: ["custom"],
              custom_start: start_date || end_date,
              custom_end: end_date || start_date,
            })
          }
        }

        setActiveMetricFilter(null)
        localStorage.setItem("current_filters", JSON.stringify(filterArray))
        setActiveCustomFilters(filterState)
      } catch (error) {
        console.error("Error applying filters:", getApiErrorMessage(error))
        toast({
          title: "Error",
          description: getApiErrorMessage(error, "Failed to apply filters"),
          variant: "destructive",
        })
      }
    },
    [toast],
  )

  const handleClearFilters = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      setFilterDrawerOpen(false)

      localStorage.removeItem("current_filters")
      localStorage.removeItem("current_lead_metrics_filters")
      setDefaultStatusFilter()

      toast({
        title: "Filters Reset",
        description: "Filters have been reset to default (Active status).",
      })
    },
    [toast, setDefaultStatusFilter],
  )

  const handleSaveLead = useCallback(
    (lead: Record<string, unknown> | undefined) => {
      if (lead && typeof lead === "object" && lead._id) {
        setPrependLeadRequest({ lead, id: Date.now() })
      }
      void queryClient.invalidateQueries({ queryKey: ["lead-metrics"] })
    },
    [queryClient],
  )

  const handleFilterByMetric = useCallback(
    (metricType: string) => {
      try {
        if (activeMetricFilter === metricType) {
          setDefaultStatusFilter()
          return
        }

        localStorage.removeItem("current_filters")
        setActiveCustomFilters({
          lead_status: "",
          stage: "",
          customer_type: "",
          purpose: "",
          source: "",
          assigned_to: "",
          start_date: "",
          end_date: "",
          create_by: "",
        })

        setActiveMetricFilter(metricType)
        setHasActiveMetricsFilter(true)

        let metricsFilter: any[] = []
        switch (metricType) {
          case "aging":
            metricsFilter = [{
              field: "date_aging_filter",
              indictor: "is",
              field_orgin: "default",
              selected_values: [String(leadMetrics?.aging_days ?? 7)],
            }]
            break
          case "followup-today":
            metricsFilter = [{
              field: "followup_today",
              indictor: "is",
              field_orgin: "default",
              selected_values: ["true"],
            }]
            break
          case "followups-this-week":
          case "this-week":
            metricsFilter = [{
              field: "followup_this_week",
              indictor: "is",
              field_orgin: "default",
              selected_values: ["true"],
            }]
            break
          case "pending-followups":
          case "overdue":
            metricsFilter = [{
              field: "overdue_followup",
              indictor: "is",
              field_orgin: "default",
              selected_values: ["true"],
            }]
            break
          case "created-month":
            metricsFilter = [{
              field: "created_this_month",
              indictor: "is",
              field_orgin: "default",
              selected_values: ["true"],
            }]
            break
          case "converted-month":
            metricsFilter = [{
              field: "converted",
              indictor: "is",
              field_orgin: "default",
              selected_values: ["true"],
            }]
            break
          default:
            metricsFilter = []
        }

        setActiveMetricsFilters(metricsFilter)
        localStorage.setItem("current_lead_metrics_filters", JSON.stringify(metricsFilter))
      } catch (error) {
        console.error("Error applying metric filter:", getApiErrorMessage(error))
        toast({
          title: "Error",
          description: getApiErrorMessage(error, "Failed to apply metric filter"),
          variant: "destructive",
        })
      }
    },
    [activeMetricFilter, toast, setDefaultStatusFilter, leadMetrics?.aging_days],
  )

  const hasActiveCustomFilters =
    Object.values(activeCustomFilters).some((value) => value !== "") ||
    hasActiveMetricsFilter

  const handleVisibleColumnsChange = useCallback((columns: ColumnPref[]) => {
    setVisibleColumnsOverride(columns)
    queryClient.setQueryData(["lead-columns"], (current) => ({
      ...(current ?? buildFallbackConfig()),
      visibleColumns: columns,
    }))
  }, [queryClient])

  const handleAllColumnsChange = useCallback((columns: ColumnPref[]) => {
    setAllColumnsOverride(columns)
    const nextVisibleColumns = columns
      .filter((col) => col.visible)
      .sort((a, b) => a.order - b.order)

    queryClient.setQueryData(["lead-columns"], (current) => ({
      ...(current ?? buildFallbackConfig()),
      visibleColumns: nextVisibleColumns,
      modalColumns: columns,
    }))
  }, [queryClient])

  // Handle filter change
  const handleFilterChange = useCallback(
    (filter: string | null, filterData?: any) => {
      // console.log("Filter changed:", filter, "Filter data:", filterData)
      setActiveFilter(filter)

      if (filter && filterData) {
        // Apply the filter data
        handleApplyFilters(filterData)
        
        toast({
          title: "Filter Applied",
          description: `Filter "${filter}" has been applied.`,
        })
      } else if (filter) {
        toast({
          title: "Filter Applied",
          description: `Filter "${filter}" has been applied.`,
        })
      }
    },
    [toast, handleApplyFilters],
  )

  const exportRecordCount = searchQuery || activeFilter || hasActiveCustomFilters || activeMetricFilter
    ? filteredCount
    : totalLeads

  const leadsTableContent = columnsLoaded ? (
    <LeadsTable
      searchQuery={searchQuery}
      visibleColumns={visibleColumns}
      activeFilter={activeFilter}
      customFilters={customFilters}
      activeCustomFilters={activeCustomFilters}
      activeMetricFilter={activeMetricFilter}
      refreshKey={refreshKey}
      prependLeadRequest={prependLeadRequest}
      onPrependLeadHandled={() => setPrependLeadRequest(null)}
      onTotalCountChange={setTotalLeads}
      onFilteredCountChange={setFilteredCount}
      onMetricsRefresh={() => {
        void refetchMetrics()
      }}
    />
  ) : (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span className="text-sm">Loading columns...</span>
      </div>
    </div>
  )

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 pt-0">
        <LeadsSummary
          onFilterByMetric={handleFilterByMetric}
          activeMetricFilter={activeMetricFilter}
          metrics={leadMetrics}
          isLoading={isMetricsLoading}
        />

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="relative w-full min-w-0 sm:w-[220px] sm:shrink-0 md:w-[260px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                className={`h-8 py-1 pl-8 text-sm transition-all ${
                  search ? "pr-20" : "pr-3"
                }`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={handleSearchKeyPress}
              />
              {search && (
                <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-1"
                          onClick={handleSearch}
                        >
                          <Check className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Search</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={handleClearSearch}
                          className="flex h-6 w-6 items-center justify-center rounded-full p-1 transition-colors hover:bg-accent"
                          aria-label="Clear search"
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Clear Search</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>

            <p className="flex h-8 shrink-0 items-center text-sm text-muted-foreground sm:whitespace-nowrap">
              {searchQuery ? (
                <span>
                  Search Results: <span className="font-medium text-foreground">{filteredCount}</span>
                  {searchQuery && <span className="ml-1">for &quot;{searchQuery}&quot;</span>}
                </span>
              ) : activeFilter || hasActiveCustomFilters || activeMetricFilter ? (
                <span>
                  Filtered: <span className="font-medium text-foreground">{filteredCount}</span> / Total:{" "}
                  <span className="font-medium text-foreground">{totalLeads}</span>
                </span>
              ) : (
                <span>
                  No of Records: <span className="font-medium text-foreground">{totalLeads}</span>
                </span>
              )}
            </p>
          </div>

          <div className="flex shrink-0 flex-nowrap items-center justify-start gap-2 sm:justify-end">
            <ColumnsDropdown
              visibleColumns={visibleColumns}
              allColumns={allColumns}
              onVisibleColumnsChange={handleVisibleColumnsChange}
              onAllColumnsChange={handleAllColumnsChange}
              isLoading={!columnsLoaded}
            />
            <div className="relative inline-flex shrink-0">
              <Button
                variant="outline"
                size="sm"
                className={`h-8 shrink-0 gap-1.5 text-xs ${hasActiveCustomFilters ? "bg-muted pr-7" : "px-3"}`}
                onClick={() => setFilterDrawerOpen(true)}
              >
                <FilterIcon className="h-3.5 w-3.5" />
                Filters
                {hasActiveCustomFilters && (
                  <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                    {activeMetricFilter ? "1" : Object.values(activeCustomFilters).filter((v) => v !== "").length}
                  </span>
                )}
              </Button>
              {hasActiveCustomFilters && (
                <button
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center"
                  onClick={handleClearFilters}
                  aria-label="Clear filters"
                >
                  <XCircleIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <Button
              size="sm"
              className="h-8 shrink-0 gap-1.5 px-3 text-xs"
              onClick={() => setLeadFormOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              {!isMobile && "Add Lead"}
              {isMobile && "Add"}
            </Button>
          </div>
        </div>

        {isMobile ? (
          <div className="min-h-0 flex-1 overflow-auto pb-4">
            {leadsTableContent}
          </div>
        ) : (
          <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0">
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {leadsTableContent}
              </div>
            </CardContent>
          </Card>
        )}

      </main>

      <FilterDrawer
        open={filterDrawerOpen}
        onOpenChange={setFilterDrawerOpen}
        onApplyFilters={handleApplyFilters}
        initialFilters={activeCustomFilters}
      />

      <LeadFormDrawer
        open={leadFormOpen}
        onOpenChange={setLeadFormOpen}
        onSave={handleSaveLead}
      />

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        totalRecords={exportRecordCount}
      />
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </div>
  )
}
