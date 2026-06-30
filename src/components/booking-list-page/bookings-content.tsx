"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, Search, X } from "lucide-react"

import BookingDetailPage from "@/components/booking-detail-page/booking-detail-page"
import {
  BookingsListTable,
  type BookingUnitRow,
} from "@/components/booking-list-page/bookings-table"
import {
  BookingsSummary,
  type BookingMetricsData,
} from "@/components/booking-list-page/bookings-summary"
import { Button } from "@/components/ui/button"
import { DeleteItemAlert } from "@/components/ui/delete-item-alert"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { BASE_URL } from "@/config/environment"
import URLS from "@/config/urls"
import { getApiErrorMessage, parseJsonResponse } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

const PROJECT_BOOKING_UNITS_URL = `${BASE_URL}/project_booking_units`
const BOOKING_STATUS = "booking"

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

function resolveStatusName(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (typeof value === "object" && value !== null && "name" in value) {
    return String((value as { name?: unknown }).name ?? "")
  }
  return ""
}

function isBookingStatus(status: string): boolean {
  const normalized = status.toLowerCase().trim()
  return normalized === BOOKING_STATUS || normalized === "booked"
}

function normalizeBookingUnit(raw: RawRecord, projectId: string, projectName: string): BookingUnitRow {
  const status = resolveStatusName(raw.status)

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

async function fetchBookingUnitsForProject(
  projectId: string,
  projectName: string,
  token: string,
): Promise<BookingUnitRow[]> {
  const response = await fetch(`${PROJECT_BOOKING_UNITS_URL}/${projectId}`, {
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
  }>(response)

  if (payload.code !== 200) {
    throw new Error(payload.msg || "Failed to load booking units.")
  }

  const items = Array.isArray(payload.data) ? payload.data : []

  return items
    .filter((item): item is RawRecord => typeof item === "object" && item !== null)
    .map((item) => normalizeBookingUnit(item, projectId, projectName))
    .filter((unit) => isBookingStatus(unit.status))
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

export function BookingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const projectId = searchParams.get("projectId")
  const unitId = searchParams.get("unitId")
  const hasFilters = Boolean(projectId || unitId)

  const queryClient = useQueryClient()
  const [hasToken, setHasToken] = useState(false)
  const [search, setSearch] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
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

  const {
    data: allBookingUnits = [],
    isLoading,
    error: bookingUnitsError,
  } = useQuery({
    queryKey: ["booking-units", projectId, unitId],
    enabled: hasToken,
    queryFn: async (): Promise<BookingUnitRow[]> => {
      const token = getAuthToken()
      if (!token) return []

      const projects = await fetchProjectOptions(token)
      let rows: BookingUnitRow[] = []

      if (projectId) {
        const projectName =
          projects.find((project) => project._id === projectId)?.name ?? "Selected project"
        rows = await fetchBookingUnitsForProject(projectId, projectName, token)
      } else {
        const projectResults = await Promise.all(
          projects.map((project) =>
            fetchBookingUnitsForProject(project._id, project.name, token),
          ),
        )
        rows = projectResults.flat()
      }

      return unitId ? rows.filter((row) => row._id === unitId) : rows
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
    void queryClient.invalidateQueries({ queryKey: ["booking-units"] })
    void queryClient.invalidateQueries({ queryKey: ["booking-metrics"] })
  }, [queryClient])

  const bookings = useMemo(
    () => allBookingUnits.filter((row) => matchesSearch(row, searchQuery)),
    [allBookingUnits, searchQuery],
  )

  const filterLabel = useMemo(() => {
    if (!hasFilters) return "Booking status"

    const parts: string[] = ["Booking status"]

    if (projectId) {
      parts.push(bookings[0]?.project_name ?? "Selected project")
    }

    if (unitId) {
      parts.push(bookings[0]?.unit_no ? `Unit ${bookings[0].unit_no}` : "Selected unit")
    }

    return parts.join(" · ")
  }, [bookings, hasFilters, projectId, unitId])

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

  const handleClearFilters = useCallback(() => {
    router.push("/bookings")
  }, [router])

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

      const params = new URLSearchParams({
        projectId: booking.project_id,
        unitId: booking._id,
        unitStatus: "booking",
      })
      router.push(`/bookings?${params.toString()}`)
    },
    [projectId, router, unitId],
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
        ["booking-units", projectId, unitId],
        (current) =>
          (current ?? []).filter(
            (row) =>
              !(
                row._id === bookingToDelete._id &&
                row.project_id === bookingToDelete.project_id
              ),
          ),
      )
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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden pb-2 pt-0">
        <div className="shrink-0 px-3 pb-1 pt-4">
          <BookingsSummary
            onFilterByMetric={handleFilterByMetric}
            activeMetricFilter={activeMetricFilter}
            metrics={bookingMetrics}
            isLoading={isMetricsLoading}
          />
        </div>

        <div className="mb-4 mt-4 flex shrink-0 flex-wrap items-center justify-between gap-x-8 gap-y-3 px-3">
          <div className="flex min-w-0 items-center gap-5">
            <div className="relative w-[220px] shrink-0 sm:w-[240px]">
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
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-3 pb-4">
          {projectId && unitId ? (
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
              onBack={hasFilters ? handleClearFilters : undefined}
              onBookingClick={handleBookingClick}
              onDeleteBooking={handleDeleteClick}
            />
          )}
        </div>
      </main>

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
