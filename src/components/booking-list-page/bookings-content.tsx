"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, FilterIcon, Search, Shield, X, XCircleIcon } from "lucide-react"

import BookingDetailPage from "@/components/booking-detail-page/booking-detail-page"
import {
  BookingFilterDrawer,
  EMPTY_BOOKING_FILTERS,
  type BookingFilterState,
} from "@/components/booking-list-page/booking-filter-drawer"
import {
  BookingsListTable,
  type BookingUnitRow,
} from "@/components/booking-list-page/bookings-table"
import {
  BookingsSummary,
  type BookingMetricsData,
} from "@/components/booking-list-page/bookings-summary"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DeleteItemAlert } from "@/components/ui/delete-item-alert"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  getStatusLabel,
  getStatusOption,
  isBookingStatus,
} from "@/components/project-detail-page/units/unit-utils"
import { BASE_URL } from "@/config/environment"
import URLS from "@/config/urls"
import { getApiErrorMessage, parseJsonResponse } from "@/lib/api"
import {
  BOOKING_DETAIL_STALE_MS,
  bookingDetailSnapshotQueryKey,
  bookingUnitSeedQueryKey,
  fetchBookingDetailSnapshot,
} from "@/lib/bookings/booking-detail-api"
import { useToast } from "@/hooks/use-toast"
import { useBookingPermissions } from "@/hooks/useBookingPermissions"
import {
  fetchProjectUnits,
  fetchUnitStatusOptionsApi,
  type ProjectSettingOption,
} from "@/lib/projects/project-api"
import { UNIT_STATUS_OPTIONS_QUERY_KEY } from "@/lib/projects/project-shared-queries"
import type { ProjectUnit } from "@/lib/projects/types"
import type { BookingUnitContext } from "@/components/booking-detail-page/booking-types"

const PROJECT_BOOKING_UNITS_URL = `${BASE_URL}/project_booking_units`

type RawRecord = Record<string, unknown>

interface ProjectOption {
  _id: string
  name: string
}

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem("map_user") ?? "{}"
    const parsed = JSON.parse(stored)
    return parsed?.access_token ?? null
  } catch {
    return null
  }
}

function resolveId(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (typeof value === "object" && value !== null) {
    if ("$oid" in value) return String((value as { $oid: string }).$oid)
    if ("_id" in value) return resolveId((value as { _id: unknown })._id)
    if ("id" in value) return String((value as { id: unknown }).id)
  }
  return ""
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function resolveRawStatus(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (typeof value === "object" && value !== null) {
    if ("name" in value && typeof (value as { name?: unknown }).name === "string") {
      const name = String((value as { name: string }).name)
      if (name) return name
    }
    return resolveId((value as RawRecord)._id ?? (value as RawRecord).id ?? value)
  }
  return ""
}

function normalizeBookingUnit(
  raw: RawRecord,
  projectId: string,
  projectName: string,
  statusOptions: ProjectSettingOption[],
  rawStatus?: string,
): BookingUnitRow {
  const status = getStatusLabel(rawStatus ?? resolveRawStatus(raw.status), statusOptions)

  return {
    _id: resolveId(raw._id ?? raw.id),
    project_id: resolveId(raw.project_id) || projectId,
    project_name: projectName,
    unit_no: String(raw.unit_no ?? ""),
    block: raw.block ? String(raw.block) : undefined,
    property_type: String(raw.property_type ?? ""),
    area_sqft: raw.area_sqft != null ? toNumber(raw.area_sqft) : undefined,
    area_cents: raw.area_cents != null ? toNumber(raw.area_cents) : undefined,
    price_per_sqft: toNumber(raw.price_per_sqft),
    total_price: toNumber(raw.total_price),
    status,
    customer_name: raw.linked_lead_name ? String(raw.linked_lead_name) : undefined,
  }
}

async function fetchProjectOptions(token: string): Promise<ProjectOption[]> {
  const response = await fetch(`${URLS.PROJECT_LIST}?page=1&length=500&search=`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      draw: 1,
      search: { value: "", regex: false },
      filter: [],
    }),
  })

  const payload = await parseJsonResponse<{
    code?: number
    msg?: string
    data?: unknown
  }>(response)

  if (payload.code !== 200) {
    throw new Error(payload.msg || "Failed to load projects.")
  }

  const items = Array.isArray(payload.data) ? payload.data : []

  return items
    .filter((item): item is RawRecord => typeof item === "object" && item !== null)
    .map((item) => ({
      _id: resolveId(item._id ?? item.id),
      name: String(item.name ?? ""),
    }))
    .filter((project) => project._id)
}

function normalizeProjectUnitToBookingRow(
  unit: ProjectUnit,
  projectId: string,
  projectName: string,
  statusOptions: ProjectSettingOption[],
): BookingUnitRow {
  return {
    _id: unit._id,
    project_id: projectId,
    project_name: projectName,
    unit_no: unit.unit_no,
    block: unit.block,
    property_type: unit.property_type,
    area_sqft: unit.area_sqft,
    area_cents: unit.area_cents,
    price_per_sqft: unit.price_per_sqft,
    total_price: unit.total_price,
    status: getStatusLabel(unit.status, statusOptions),
    customer_name: unit.linked_lead_name,
  }
}

async function fetchBookingUnitsForProject(
  projectId: string,
  projectName: string,
  token: string,
  statusOptions: ProjectSettingOption[],
): Promise<BookingUnitRow[]> {
  // Prefer the dedicated booking-units endpoint. Only fall back to the full
  // project units list when that endpoint returns nothing — halves list load.
  const bookingResponse = await fetch(`${PROJECT_BOOKING_UNITS_URL}/${projectId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })

  const payload = await parseJsonResponse<{
    code?: number
    msg?: string
    data?: unknown
  }>(bookingResponse)

  if (payload.code !== 200) {
    throw new Error(payload.msg || "Failed to load booking units.")
  }

  const items = Array.isArray(payload.data) ? payload.data : []

  const fromBookingApi = items
    .filter((item): item is RawRecord => typeof item === "object" && item !== null)
    .map((item) => {
      const rawStatus = resolveRawStatus(item.status)
      return { item, rawStatus }
    })
    .filter(({ rawStatus }) => isBookingStatus(rawStatus, statusOptions))
    .map(({ item, rawStatus }) =>
      normalizeBookingUnit(item, projectId, projectName, statusOptions, rawStatus),
    )

  if (fromBookingApi.length > 0) {
    return fromBookingApi
  }

  const projectUnits = await fetchProjectUnits(projectId, token)
  return projectUnits
    .filter((unit) => isBookingStatus(unit.status, statusOptions))
    .map((unit) => normalizeProjectUnitToBookingRow(unit, projectId, projectName, statusOptions))
}

function bookingRowToUnitContext(booking: BookingUnitRow): BookingUnitContext {
  return {
    _id: booking._id,
    project_id: booking.project_id,
    project_name: booking.project_name,
    unit_no: booking.unit_no,
    area_sqft: booking.area_sqft,
    area_cents: booking.area_cents,
    customer_name: booking.customer_name,
  }
}

/** Seeds unit context for the detail page (placeholder only — does not mark snapshot fresh). */
function seedBookingUnitContext(
  queryClient: ReturnType<typeof useQueryClient>,
  booking: BookingUnitRow,
) {
  queryClient.setQueryData(
    bookingUnitSeedQueryKey(booking.project_id, booking._id),
    bookingRowToUnitContext(booking),
  )
}

async function deleteBookingForUnit(
  projectId: string,
  unitId: string,
  token: string,
): Promise<void> {
  const params = new URLSearchParams({
    project_id: projectId,
    unit_id: unitId,
  })

  const response = await fetch(`${URLS.BOOKING_DELETE}?${params.toString()}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })

  const payload = await parseJsonResponse<{
    code?: number
    msg?: string
  }>(response)

  if (payload.code !== 200) {
    throw new Error(payload.msg || "Failed to delete booking.")
  }
}

function matchesSearch(row: BookingUnitRow, query: string): boolean {
  if (!query.trim()) return true

  const haystack = [
    row.customer_name,
    row.project_name,
    row.unit_no,
    row.block,
    row.property_type,
    row.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  return haystack.includes(query.trim().toLowerCase())
}

function matchesBookingFilters(
  row: BookingUnitRow,
  filters: BookingFilterState,
  statusOptions: ProjectSettingOption[],
): boolean {
  if (filters.project_id && row.project_id !== filters.project_id) {
    return false
  }

  if (filters.status) {
    const option = getStatusOption(row.status, statusOptions)
    const matchesValue = option?.value === filters.status
    const matchesLabel =
      option?.label.toLowerCase() === filters.status.toLowerCase() ||
      row.status.toLowerCase() === filters.status.toLowerCase()
    if (!matchesValue && !matchesLabel) {
      return false
    }
  }

  return true
}

/** Cap parallel project fetches so list load scales under multi-user load. */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return []

  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(items[index])
    }
  }

  const workerCount = Math.min(Math.max(concurrency, 1), items.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}

export function BookingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { canViewBookings, canDeleteBooking, isLoading: isPermissionsLoading } =
    useBookingPermissions()

  const projectId = searchParams.get("projectId")
  const unitId = searchParams.get("unitId")
  const isDetailView = Boolean(projectId && unitId)
  const hasFilters = Boolean(projectId || unitId)

  const queryClient = useQueryClient()
  const [hasToken, setHasToken] = useState(false)
  const [search, setSearch] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [filters, setFilters] = useState<BookingFilterState>(EMPTY_BOOKING_FILTERS)
  const [activeMetricFilter, setActiveMetricFilter] = useState<string | null>(null)
  const [bookingToDelete, setBookingToDelete] = useState<BookingUnitRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!getAuthToken()) {
      router.push("/login")
    } else {
      setHasToken(true)
    }
  }, [router])

  // Booking units + metrics are cached across navigations (5-min staleTime in
  // the shared QueryClient) so returning to this page renders instantly instead
  // of re-running the (expensive) per-project booking fetch every time.
  const {
    data: bookingMetrics = null,
    isLoading: isMetricsLoading,
  } = useQuery({
    queryKey: ["booking-metrics"],
    // Metrics cards stay mounted in detail view; serve from cache when available.
    enabled: hasToken,
    queryFn: async (): Promise<BookingMetricsData | null> => {
      const token = getAuthToken()
      if (!token) return null

      const response = await fetch(URLS.BOOKING_METRICS, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const payload = await parseJsonResponse<{
        code?: number
        data?: BookingMetricsData
        msg?: string
      }>(response)

      return payload.code === 200 && payload.data ? payload.data : null
    },
  })

  // Shared across projects / bookings so we don't re-fetch settings on every list load.
  const { data: statusOptions = [], isSuccess: statusOptionsReady } = useQuery({
    queryKey: UNIT_STATUS_OPTIONS_QUERY_KEY,
    enabled: hasToken && !isDetailView,
    queryFn: async () => {
      const token = getAuthToken()
      if (!token) return [] as ProjectSettingOption[]
      return fetchUnitStatusOptionsApi(token)
    },
  })

  const { data: projectOptions = [], isSuccess: projectOptionsReady } = useQuery({
    queryKey: ["booking-project-options"],
    enabled: hasToken && !isDetailView,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const token = getAuthToken()
      if (!token) return [] as ProjectOption[]
      return fetchProjectOptions(token)
    },
  })

  const {
    data: allBookingUnits = [],
    isLoading,
    error: bookingUnitsError,
  } = useQuery({
    queryKey: ["booking-units", projectId ?? "all"],
    // Detail view loads its own data; skip the expensive per-project list fetch.
    enabled: hasToken && !isDetailView && statusOptionsReady && projectOptionsReady,
    queryFn: async (): Promise<BookingUnitRow[]> => {
      const token = getAuthToken()
      if (!token) return []

      let rows: BookingUnitRow[] = []

      if (projectId) {
        const projectName =
          projectOptions.find((project) => project._id === projectId)?.name ?? "Selected project"
        rows = await fetchBookingUnitsForProject(projectId, projectName, token, statusOptions)
      } else {
        const projectResults = await mapWithConcurrency(projectOptions, 4, (project) =>
          fetchBookingUnitsForProject(project._id, project.name, token, statusOptions),
        )
        rows = projectResults.flat()
      }

      return rows
    },
  })

  useEffect(() => {
    if (bookingUnitsError) {
      toast({
        title: "Error",
        description: getApiErrorMessage(bookingUnitsError, "Failed to load booking units."),
        variant: "destructive",
      })
    }
  }, [bookingUnitsError, toast])

  const refreshBookings = useCallback(() => {
    // Soft refresh list metrics only — detail snapshot is already updated in-place on save.
    void queryClient.invalidateQueries({ queryKey: ["booking-units"] })
    void queryClient.invalidateQueries({ queryKey: ["booking-metrics"] })
  }, [queryClient])

  const bookingStatusOptions = useMemo(
    () => statusOptions.filter((option) => isBookingStatus(option.value, statusOptions)),
    [statusOptions],
  )

  const activeFilterCount = Object.values(filters).filter(Boolean).length
  const hasActiveDrawerFilters = activeFilterCount > 0

  const bookings = useMemo(
    () =>
      allBookingUnits.filter(
        (row) =>
          matchesSearch(row, searchQuery) &&
          matchesBookingFilters(row, filters, statusOptions),
      ),
    [allBookingUnits, filters, searchQuery, statusOptions],
  )

  const filterLabel = useMemo(() => {
    const parts: string[] = ["Booking status"]

    if (filters.project_id) {
      const projectName =
        projectOptions.find((project) => project._id === filters.project_id)?.name ||
        bookings[0]?.project_name ||
        "Selected project"
      parts.push(projectName)
    } else if (projectId) {
      parts.push(bookings[0]?.project_name ?? "Selected project")
    }

    if (filters.status) {
      const statusLabel =
        getStatusLabel(filters.status, statusOptions) || filters.status
      parts.push(statusLabel)
    }

    if (unitId) {
      parts.push(bookings[0]?.unit_no ? `Unit ${bookings[0].unit_no}` : "Selected unit")
    }

    return parts.join(" · ")
  }, [bookings, filters.project_id, filters.status, projectId, projectOptions, statusOptions, unitId])

  const handleSearch = useCallback(async () => {
    setIsSearching(true)
    setSearchQuery(search)
    setIsSearching(false)
  }, [search])

  const handleClearSearch = useCallback(() => {
    setSearch("")
    setSearchQuery("")
  }, [])

  const handleSearchKeyPress = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter") {
        void handleSearch()
      }
    },
    [handleSearch],
  )

  const handleClearUrlFilters = useCallback(() => {
    router.push("/bookings")
  }, [router])

  const handleApplyFilters = useCallback((nextFilters: BookingFilterState) => {
    setFilters(nextFilters)
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters(EMPTY_BOOKING_FILTERS)
    setActiveMetricFilter(null)
  }, [])

  const handleFilterByMetric = useCallback(
    (metricType: string) => {
      if (activeMetricFilter === metricType) {
        setActiveMetricFilter(null)
        toast({
          title: "Filter Reset",
          description: "Showing all bookings",
        })
        return
      }

      setActiveMetricFilter(metricType)
      const labels: Record<string, string> = {
        total: "total bookings",
        "this-month": "bookings this month",
        "amount-paid": "total amount paid",
        "registered-month": "registrations this month",
      }
      toast({
        title: "Filter Applied",
        description: `Filtering by ${labels[metricType] ?? metricType.replace("-", " ")}`,
      })
    },
    [activeMetricFilter, toast],
  )

  const handleBookingClick = useCallback(
    (booking: BookingUnitRow) => {
      if (unitId === booking._id && projectId === booking.project_id) {
        router.push(`/projects/detail/${booking.project_id}`)
        return
      }

      // Seed unit context + prefetch receipts so detail opens with a single API call.
      seedBookingUnitContext(queryClient, booking)
      void queryClient.prefetchQuery({
        queryKey: bookingDetailSnapshotQueryKey(booking.project_id, booking._id),
        staleTime: BOOKING_DETAIL_STALE_MS,
        queryFn: async () => {
          const token = getAuthToken()
          if (!token) throw new Error("Not authenticated")
          return fetchBookingDetailSnapshot(booking.project_id, booking._id, token, {
            seedUnit: bookingRowToUnitContext(booking),
          })
        },
      })

      const params = new URLSearchParams({
        projectId: booking.project_id,
        unitId: booking._id,
        unitStatus: "booking",
      })
      router.push(`/bookings?${params.toString()}`)
    },
    [projectId, queryClient, router, unitId],
  )

  const handleDeleteClick = useCallback((booking: BookingUnitRow) => {
    setBookingToDelete(booking)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!bookingToDelete || isDeleting) return

    const token = getAuthToken()
    if (!token) return

    setIsDeleting(true)
    try {
      await deleteBookingForUnit(
        bookingToDelete.project_id,
        bookingToDelete._id,
        token,
      )
      // Optimistically drop the deleted row from the cached list, then refresh
      // metrics in the background.
      queryClient.setQueryData<BookingUnitRow[]>(
        ["booking-units", projectId ?? "all"],
        (current) =>
          (current ?? []).filter(
            (row) =>
              !(
                row._id === bookingToDelete._id &&
                row.project_id === bookingToDelete.project_id
              ),
          ),
      )
      queryClient.removeQueries({
        queryKey: bookingDetailSnapshotQueryKey(
          bookingToDelete.project_id,
          bookingToDelete._id,
        ),
      })
      toast({
        title: "Booking deleted",
        description: `Unit ${bookingToDelete.unit_no || bookingToDelete._id} booking was removed.`,
      })
      setBookingToDelete(null)
      void queryClient.invalidateQueries({ queryKey: ["booking-metrics"] })
    } catch (error) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to delete booking."),
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }, [bookingToDelete, isDeleting, projectId, queryClient, toast, unitId])

  const deleteItemName = useMemo(() => {
    if (!bookingToDelete) return ""
    const unitLabel = bookingToDelete.unit_no
      ? `Unit ${bookingToDelete.unit_no}`
      : "this unit"
    return `${bookingToDelete.project_name || "Project"} · ${unitLabel}`
  }, [bookingToDelete])

  if (isPermissionsLoading) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center p-4 pt-0 text-sm text-muted-foreground">
          Loading bookings...
        </main>
      </div>
    )
  }

  if (!canViewBookings) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <main className="flex min-h-0 flex-1 flex-col p-4 pt-0">
          <Card className="border-none shadow-sm">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Shield className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Access restricted</p>
                <p className="text-sm text-muted-foreground">
                  You don&apos;t have permission to view bookings. Ask an admin to enable the View Booking permission for your role.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 pt-0">
        <BookingsSummary
          onFilterByMetric={handleFilterByMetric}
          activeMetricFilter={activeMetricFilter}
          metrics={bookingMetrics}
          isLoading={isMetricsLoading}
        />

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="relative w-full min-w-0 sm:w-[220px] sm:shrink-0 md:w-[260px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search bookings..."
                className={`h-8 py-1 pl-8 text-sm transition-all ${search ? "pr-20" : "pr-3"}`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={handleSearchKeyPress}
              />
              {search ? (
                <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-1"
                          onClick={() => void handleSearch()}
                          disabled={isSearching}
                        >
                          {isSearching ? (
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                          )}
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
              ) : null}
            </div>

            {!isDetailView ? (
              <p className="flex h-8 shrink-0 items-center text-sm text-muted-foreground sm:whitespace-nowrap">
                {searchQuery ? (
                  <span>
                    Search Results: <span className="font-medium text-foreground">{bookings.length}</span>
                    {searchQuery && <span className="ml-1">for &quot;{searchQuery}&quot;</span>}
                  </span>
                ) : hasFilters || hasActiveDrawerFilters || activeMetricFilter ? (
                  <span>
                    Filtered: <span className="font-medium text-foreground">{bookings.length}</span> / Total:{" "}
                    <span className="font-medium text-foreground">{allBookingUnits.length}</span>
                  </span>
                ) : (
                  <span>
                    No of Records: <span className="font-medium text-foreground">{allBookingUnits.length}</span>
                  </span>
                )}
              </p>
            ) : null}
          </div>

          {!isDetailView ? (
            <div className="flex shrink-0 flex-nowrap items-center justify-start gap-2 sm:justify-end">
              <div className="relative inline-flex shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-8 shrink-0 gap-1.5 text-xs ${hasActiveDrawerFilters ? "bg-muted pr-7" : "px-3"}`}
                  onClick={() => setFilterDrawerOpen(true)}
                >
                  <FilterIcon className="h-3.5 w-3.5" />
                  Filters
                  {hasActiveDrawerFilters ? (
                    <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </Button>
                {hasActiveDrawerFilters ? (
                  <button
                    className="absolute right-1.5 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center"
                    onClick={handleClearFilters}
                    aria-label="Clear filters"
                  >
                    <XCircleIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-auto pb-4">
          {isDetailView && projectId && unitId ? (
            <BookingDetailPage
              projectId={projectId}
              unitId={unitId}
              onSaved={refreshBookings}
            />
          ) : (
            <BookingsListTable
              bookings={bookings}
              isLoading={isLoading}
              filterLabel={filterLabel}
              onBack={hasFilters ? handleClearUrlFilters : undefined}
              onBookingClick={handleBookingClick}
              onDeleteBooking={canDeleteBooking ? handleDeleteClick : undefined}
            />
          )}
        </div>
      </main>

      <BookingFilterDrawer
        open={filterDrawerOpen}
        onOpenChange={setFilterDrawerOpen}
        filters={filters}
        projectOptions={projectOptions}
        statusOptions={bookingStatusOptions}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      <DeleteItemAlert
        open={Boolean(bookingToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setBookingToDelete(null)
          }
        }}
        onDelete={() => {
          void handleConfirmDelete()
        }}
        itemName={deleteItemName}
        itemType="booking"
      />
    </div>
  )
}
