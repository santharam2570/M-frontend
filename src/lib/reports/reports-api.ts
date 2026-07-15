import { endOfDay, startOfDay, subDays } from "date-fns"

import URLS from "@/config/urls"
import { BASE_URL } from "@/config/environment"
import { parseJsonResponse } from "@/lib/api"
import type { BookingMetricsData } from "@/components/booking-list-page/bookings-summary"
import {
  getAllUserRoleMeta,
  getOrgIdFromAuth,
  getStoredAuthUser,
  type Branch,
  type RoleTier,
} from "@/lib/auth"
import { resolveBranchObjectId } from "@/lib/branches/branch-id"
import { fetchLeadMetrics } from "@/lib/leads/lead-api"
import {
  fetchProjectList,
  fetchProjectMetrics,
  fetchUnitStatusOptionsApi,
  type ProjectSettingOption,
} from "@/lib/projects/project-api"
import { getStatusLabel, isBookingStatus } from "@/components/project-detail-page/units/unit-utils"
import { parseDateString } from "@/lib/date-ageing"

import {
  aggregateReportsData,
  type ReportsAggregationContext,
} from "./aggregate-reports-data"
import {
  DEFAULT_REPORTS_FILTERS,
  type ReportsAggregatedData,
  type ReportsBooking,
  type ReportsFilters,
  type ReportsLead,
  type ReportsProject,
  type ReportsRawData,
  type ReportsUser,
} from "./types"

const PROJECT_BOOKING_UNITS_URL = `${BASE_URL}/project_booking_units`
const LEAD_PAGE_SIZE = 250
const MAX_LEAD_PAGES = 20

type RawRecord = Record<string, unknown>

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem("map_user") ?? "{}"
    const parsed = JSON.parse(stored) as { access_token?: string }
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

function extractUsersFromApiResponse(data: unknown): RawRecord[] {
  if (Array.isArray(data)) return data as RawRecord[]
  if (!data || typeof data !== "object") return []

  const record = data as RawRecord
  if (Array.isArray(record.users)) return record.users as RawRecord[]
  if (Array.isArray(record.data)) return record.data as RawRecord[]
  if (Array.isArray(record.result)) return record.result as RawRecord[]

  return []
}

function isActiveUserStatus(status: unknown): boolean {
  if (status == null) return true
  const normalized = String(status).toLowerCase().trim()
  return normalized === "active" || normalized === "1" || normalized === "true"
}

function normalizeReportsUser(
  raw: RawRecord,
  metaMap: Record<string, { role_tier: RoleTier; branch_id?: string }>,
): ReportsUser | null {
  const id = resolveId(raw._id ?? raw.id ?? raw.user_id)
  if (!id) return null

  const meta = metaMap[id]
  const roleTier = (raw.role_tier as RoleTier | undefined) ?? meta?.role_tier ?? "branch_user"
  const branchId =
    resolveBranchObjectId(raw.branch_id ?? raw.branchId) ||
    resolveBranchObjectId(meta?.branch_id) ||
    undefined

  return {
    id,
    name: String(raw.name ?? raw.user_name ?? raw.full_name ?? "Unknown"),
    email: String(raw.email ?? ""),
    role_tier: roleTier,
    branch_id: branchId,
    isActive: isActiveUserStatus(raw.status),
  }
}

async function fetchReportsUsers(token: string): Promise<ReportsUser[]> {
  const response = await fetch(URLS.USERS_LIST, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) return []

  const result = await parseJsonResponse<RawRecord>(response)
  const authUser = getStoredAuthUser()
  const orgId = getOrgIdFromAuth(authUser)
  const metaMap = orgId ? getAllUserRoleMeta(orgId) : {}

  return extractUsersFromApiResponse(result.data ?? result)
    .map((user) => normalizeReportsUser(user, metaMap))
    .filter((user): user is ReportsUser => Boolean(user))
}

function normalizeReportsLead(raw: RawRecord, userBranchMap: Map<string, string>): ReportsLead {
  const assignedToId = resolveId(raw.assigned_to ?? raw.assigned_to_id ?? raw.assign_to)
  const createById = resolveId(raw.create_by ?? raw.created_by ?? raw.create_by_id)

  return {
    _id: resolveId(raw._id ?? raw.id),
    name: String(raw.name ?? raw.company_name ?? ""),
    source_name: String(raw.source_name ?? raw.source ?? "Unknown"),
    lead_status_name: String(raw.lead_status_name ?? raw.status_name ?? raw.lead_status ?? "Unknown"),
    assigned_to: String(raw.assigned_to_name ?? raw.assigned_user_name ?? assignedToId),
    assigned_to_id: assignedToId,
    create_by: String(raw.create_by_name ?? raw.created_by_name ?? createById),
    create_by_id: createById,
    create_date: String(raw.create_date ?? raw.created_at ?? ""),
    project_name: raw.project_name ? String(raw.project_name) : undefined,
    branch_id:
      resolveBranchObjectId(raw.branch_id ?? raw.branchId) ||
      userBranchMap.get(assignedToId) ||
      userBranchMap.get(createById),
  }
}

async function fetchReportsLeads(
  token: string,
  userBranchMap: Map<string, string>,
): Promise<ReportsLead[]> {
  const leads: ReportsLead[] = []
  let page = 1

  while (page <= MAX_LEAD_PAGES) {
    const response = await fetch(
      `${URLS.LEAD_LIST}?page=${page}&length=${LEAD_PAGE_SIZE}&search=&sort=&order=`,
      {
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
      },
    )

    if (!response.ok) break

    const result = await parseJsonResponse<{
      code?: number
      data?: RawRecord[]
      total_count?: number
      search_count?: number
    }>(response)

    if (result.code !== 200) break

    const batch = (result.data ?? []).map((lead) => normalizeReportsLead(lead, userBranchMap))
    leads.push(...batch)

    const total = result.search_count ?? result.total_count ?? leads.length
    if (leads.length >= total || batch.length < LEAD_PAGE_SIZE) break
    page += 1
  }

  return leads
}

function normalizeReportsProject(raw: RawRecord): ReportsProject {
  return {
    _id: resolveId(raw._id ?? raw.id),
    name: String(raw.name ?? ""),
    branch_id: resolveBranchObjectId(raw.branch_id ?? raw.branchId) || undefined,
    status: String(raw.status ?? raw.project_status ?? "active"),
    total_units: toNumber(raw.total_units),
    sold_units: toNumber(raw.sold_units),
    available_units: toNumber(raw.available_units),
  }
}

async function fetchReportsProjects(token: string): Promise<ReportsProject[]> {
  const { projects } = await fetchProjectList({ token, length: 500 })
  return projects.map((project) => ({
    _id: project._id,
    name: project.name,
    branch_id: project.branch_id,
    status: project.status,
    total_units: project.total_units,
    sold_units: project.sold_units,
    available_units: project.available_units,
  }))
}

async function fetchReportsProjectsWithBranches(token: string): Promise<ReportsProject[]> {
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

  if (!response.ok) {
    return fetchReportsProjects(token)
  }

  const payload = await parseJsonResponse<{ code?: number; data?: unknown }>(response)
  if (payload.code !== 200) return fetchReportsProjects(token)

  const items = Array.isArray(payload.data) ? payload.data : []
  return items
    .map((item) => normalizeReportsProject(item as RawRecord))
    .filter((project) => project._id)
}

function resolveRawStatus(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (typeof value === "object" && value !== null) {
    if ("name" in value && typeof (value as { name?: unknown }).name === "string") {
      return String((value as { name: string }).name)
    }
    return resolveId((value as RawRecord)._id ?? (value as RawRecord).id ?? value)
  }
  return ""
}

const BOOKING_PAGE_SIZE = 250
const MAX_BOOKING_PAGES = 20

function extractBookingsFromListPayload(data: unknown): RawRecord[] {
  if (!data || typeof data !== "object") return []
  const record = data as RawRecord
  if (Array.isArray(record.bookings)) return record.bookings as RawRecord[]
  if (Array.isArray(record.data)) return record.data as RawRecord[]
  if (Array.isArray(data)) return data as RawRecord[]
  return []
}

function normalizeReportsBookingFromApi(
  raw: RawRecord,
  projectBranchMap: Map<string, string | undefined>,
): ReportsBooking | null {
  const id = resolveId(raw._id ?? raw.id ?? raw.booking_id)
  if (!id) return null

  const projectId = resolveId(raw.project_id)
  const branchId =
    resolveBranchObjectId(raw.branch_id ?? raw.branchId) ||
    projectBranchMap.get(projectId)

  return {
    _id: id,
    project_id: projectId,
    project_name: String(raw.project_name ?? ""),
    branch_id: branchId,
    total_price: toNumber(raw.amount_paid ?? raw.total_price ?? raw.total_amount),
    status: String(raw.status ?? "active"),
    customer_name: raw.customer_name ? String(raw.customer_name) : undefined,
  }
}

async function fetchReportsBookingsFromList(
  token: string,
  projects: ReportsProject[],
): Promise<ReportsBooking[]> {
  const projectBranchMap = new Map(
    projects.map((project) => [project._id, project.branch_id]),
  )
  const bookings: ReportsBooking[] = []
  let page = 1

  while (page <= MAX_BOOKING_PAGES) {
    const params = new URLSearchParams({
      page: String(page),
      length: String(BOOKING_PAGE_SIZE),
    })
    const response = await fetch(`${URLS.BOOKING_LIST}?${params.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) break

    const payload = await parseJsonResponse<{
      code?: number
      data?: unknown
      total_count?: number
      search_count?: number
    }>(response)

    if (payload.code !== 200) break

    const batch = extractBookingsFromListPayload(payload.data)
      .map((item) => normalizeReportsBookingFromApi(item, projectBranchMap))
      .filter((booking): booking is ReportsBooking => Boolean(booking))

    bookings.push(...batch)

    const total = payload.search_count ?? payload.total_count ?? bookings.length
    if (bookings.length >= total || batch.length < BOOKING_PAGE_SIZE) break
    page += 1
  }

  return bookings
}

async function fetchBookingUnitsForProject(
  projectId: string,
  projectName: string,
  branchId: string | undefined,
  token: string,
  statusOptions: ProjectSettingOption[],
): Promise<ReportsBooking[]> {
  const response = await fetch(`${PROJECT_BOOKING_UNITS_URL}/${projectId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) return []

  const payload = await parseJsonResponse<{ code?: number; data?: unknown }>(response)
  if (payload.code !== 200) return []

  const items = Array.isArray(payload.data) ? payload.data : []
  return items
    .map((item) => {
      const raw = item as RawRecord
      const status = getStatusLabel(resolveRawStatus(raw.status), statusOptions)
      if (!isBookingStatus(status)) return null

      return {
        _id: resolveId(raw._id ?? raw.id),
        project_id: projectId,
        project_name: projectName,
        branch_id: branchId,
        total_price: toNumber(raw.total_price),
        status,
        customer_name: raw.customer_name ? String(raw.customer_name) : undefined,
      } satisfies ReportsBooking
    })
    .filter((booking): booking is ReportsBooking => Boolean(booking?._id))
}

async function fetchReportsBookingsFromUnits(
  token: string,
  projects: ReportsProject[],
): Promise<ReportsBooking[]> {
  const statusOptions = await fetchUnitStatusOptionsApi(token)
  const projectBranchMap = new Map(projects.map((project) => [project._id, project.branch_id]))

  const results = await Promise.all(
    projects.map((project) =>
      fetchBookingUnitsForProject(
        project._id,
        project.name,
        project.branch_id,
        token,
        statusOptions,
      ),
    ),
  )

  return results.flat().map((booking) => ({
    ...booking,
    branch_id: booking.branch_id ?? projectBranchMap.get(booking.project_id),
  }))
}

async function fetchReportsBookings(
  token: string,
  projects: ReportsProject[],
): Promise<ReportsBooking[]> {
  try {
    const fromList = await fetchReportsBookingsFromList(token, projects)
    if (fromList.length > 0) return fromList
  } catch {
    // Fall back to project booking units below.
  }

  return fetchReportsBookingsFromUnits(token, projects)
}

function normalizeBookingMetrics(data: unknown): BookingMetricsData | null {
  if (!data || typeof data !== "object") return null
  const raw = data as RawRecord
  const nested =
    raw.metrics && typeof raw.metrics === "object"
      ? (raw.metrics as RawRecord)
      : raw

  return {
    total_bookings: toNumber(nested.total_bookings ?? nested.total_count),
    bookings_this_month: toNumber(nested.bookings_this_month),
    total_amount_paid: toNumber(
      nested.total_amount_paid ?? nested.total_amount ?? nested.revenue,
    ),
    registered_this_month: toNumber(nested.registered_this_month),
  }
}

async function fetchBookingMetrics(token: string): Promise<BookingMetricsData | null> {
  const response = await fetch(URLS.BOOKING_METRICS, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) return null

  const payload = await parseJsonResponse<{
    code?: number
    data?: unknown
  }>(response)

  if (payload.code !== 200 || !payload.data) return null
  return normalizeBookingMetrics(payload.data)
}

function buildUserBranchMap(users: ReportsUser[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const user of users) {
    if (user.branch_id) {
      map.set(user.id, user.branch_id)
    }
  }
  return map
}

function normalizeBranches(branches: Branch[]): ReportsRawData["branches"] {
  return branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
    status: branch.status,
  }))
}

export async function fetchReportsRawData(
  branches: Branch[],
): Promise<ReportsRawData> {
  const token = getAuthToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  const users = await fetchReportsUsers(token)
  const userBranchMap = buildUserBranchMap(users)

  const [leads, projects, leadMetrics, projectMetrics, bookingMetrics] = await Promise.all([
    fetchReportsLeads(token, userBranchMap),
    fetchReportsProjectsWithBranches(token),
    fetchLeadMetrics(token, 7).catch(() => null),
    fetchProjectMetrics(token).catch(() => null),
    fetchBookingMetrics(token).catch(() => null),
  ])

  const bookings = await fetchReportsBookings(token, projects)

  return {
    branches: normalizeBranches(branches),
    users,
    leads,
    projects,
    bookings,
    leadMetrics,
    projectMetrics,
    bookingMetrics,
  }
}

export function buildReportsAggregationContext(
  raw: ReportsRawData,
  filters: ReportsFilters = DEFAULT_REPORTS_FILTERS,
): ReportsAggregationContext {
  const branchNameMap = new Map(raw.branches.map((branch) => [branch.id, branch.name]))
  const userNameMap = new Map(raw.users.map((user) => [user.id, user.name]))
  const projectNameMap = new Map(raw.projects.map((project) => [project._id, project.name]))

  const startDate = filters.startDate ? startOfDay(parseDateString(filters.startDate) ?? new Date()) : undefined
  const endDate = filters.endDate ? endOfDay(parseDateString(filters.endDate) ?? new Date()) : undefined

  return {
    raw,
    filters,
    branchNameMap,
    userNameMap,
    projectNameMap,
    dateRange: startDate || endDate ? { start: startDate, end: endDate } : undefined,
  }
}

export function getReportsData(
  raw: ReportsRawData,
  filters: ReportsFilters = DEFAULT_REPORTS_FILTERS,
): ReportsAggregatedData {
  return aggregateReportsData(buildReportsAggregationContext(raw, filters))
}

export function getDefaultReportsDateRange(): { startDate: string; endDate: string } {
  const end = new Date()
  const start = subDays(end, 30)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}
