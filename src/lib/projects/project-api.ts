import URLS from "@/config/urls"
import { parseJsonResponse } from "@/lib/api"
import type {
  LeadMatchCriteria,
  MatchedLead,
  MatchedProject,
  Project,
  ProjectDocument,
  ProjectFilterState,
  ProjectMetrics,
  ProjectStatus,
  ProjectUnit,
  PropertyType,
  ReraStatus,
  SiteVisit,
} from "./types"

interface ApiEnvelope<T> {
  code?: number
  msg?: string
  data?: T
  total_count?: number
}

type RawRecord = Record<string, unknown>

export class ProjectApiError extends Error {
  code: number

  constructor(message: string, code = 500) {
    super(message)
    this.name = "ProjectApiError"
    this.code = code
  }
}

export function getProjectAuthToken(): string {
  if (typeof window === "undefined") {
    throw new ProjectApiError("Not available on the server.", 401)
  }

  const userData = JSON.parse(localStorage.getItem("map_user") || "{}")
  if (!userData.access_token) {
    throw new ProjectApiError("You are not logged in. Please sign in again.", 401)
  }

  return userData.access_token
}

function projectAuthHeaders(token?: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token ?? getProjectAuthToken()}`,
  }
}

async function readProjectResponse<T>(response: Response): Promise<T> {
  const payload = await parseJsonResponse<ApiEnvelope<T>>(response)

  if (payload.code !== 200) {
    throw new ProjectApiError(payload.msg || "Request failed.", payload.code ?? response.status)
  }

  return payload.data as T
}

export type ProjectSettingType =
  | "rera_status"
  | "project_status"
  | "property_type"
  | "unit_status"
  | "site_visit_status"
  | "document_category"

export interface ProjectSettingItem {
  _id?: string | { $oid?: string }
  id?: string | number
  name?: string
  color?: string
  default?: number
}

export interface ProjectSettingOption {
  value: string
  label: string
  color: string
  isDefault?: boolean
}

export type ProjectSettingsListData = Partial<Record<ProjectSettingType, ProjectSettingItem[]>>

export function resolveProjectSettingId(item: ProjectSettingItem): string {
  if (item._id && typeof item._id === "object" && item._id.$oid) {
    return item._id.$oid
  }

  return String(item._id ?? item.id ?? "")
}

export function mapProjectSettingsToOptions(
  items: ProjectSettingItem[] | undefined,
): ProjectSettingOption[] {
  return (items || [])
    .filter((item) => item.name?.trim() && resolveProjectSettingId(item))
    .map((item) => ({
      value: resolveProjectSettingId(item),
      label: item.name!.trim(),
      color: item.color?.trim() || "#64748b",
      isDefault: item.default === 1,
    }))
}

export async function fetchProjectSettingsListApi(
  token?: string,
): Promise<ProjectSettingsListData> {
  const authToken = token ?? getProjectAuthToken()

  const response = await fetch(URLS.PROJECT_SETTINGS_LIST, {
    method: "GET",
    headers: projectAuthHeaders(authToken),
  })

  const data = await readProjectResponse<ProjectSettingsListData>(response)
  return data ?? {}
}

export async function fetchUnitStatusOptionsApi(
  token?: string,
): Promise<ProjectSettingOption[]> {
  const settings = await fetchProjectSettingsListApi(token)
  return mapProjectSettingsToOptions(settings.unit_status)
}

export function resolveProjectId(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (typeof value === "object" && value !== null) {
    if ("$oid" in value) return String((value as { $oid: string }).$oid)
    if ("_id" in value) return resolveProjectId((value as { _id: unknown })._id)
    if ("id" in value) return String((value as { id: unknown }).id)
  }
  return ""
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value == null) return undefined
  const trimmed = String(value).trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

function serializeProjectUpdatePayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const serialized = { ...payload }

  if ("price_per_cent" in serialized) {
    const value = serialized.price_per_cent
    serialized.price_per_cent =
      value == null || String(value).trim() === "" ? "" : String(value).trim()
  }

  return serialized
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function resolveSettingValue(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (typeof value === "object" && value !== null) {
    if ("name" in value && typeof (value as { name?: unknown }).name === "string") {
      return (value as { name: string }).name
    }
    return resolveProjectId(value)
  }
  return ""
}

function normalizePropertyTypes(value: unknown): PropertyType[] {
  const items = toStringArray(value)
  const allowed: PropertyType[] = [
    "plot",
    "villa",
    "apartment",
    "commercial",
    "agri_land",
    "industrial_land",
  ]

  return items.filter((item): item is PropertyType =>
    allowed.includes(item as PropertyType),
  )
}

function normalizeUnit(raw: RawRecord): ProjectUnit {
  return {
    _id: resolveProjectId(raw._id ?? raw.id),
    unit_no: String(raw.unit_no ?? raw.name ?? ""),
    block: raw.block ? String(raw.block) : undefined,
    property_type: (raw.property_type as PropertyType) ?? "plot",
    area_sqft: raw.area_sqft != null ? toNumber(raw.area_sqft) : undefined,
    area_cents: raw.area_cents != null ? toNumber(raw.area_cents) : undefined,
    facing: raw.facing ? String(raw.facing) : undefined,
    floor: raw.floor ? String(raw.floor) : undefined,
    status: resolveSettingValue(raw.status) || "available",
    price_per_sqft: toNumber(raw.price_per_sqft),
    total_price: toNumber(raw.total_price ?? raw.total),
    percentage: raw.percentage != null ? toNumber(raw.percentage) : undefined,
    hold_until: raw.hold_until ? String(raw.hold_until) : undefined,
    linked_lead_id: raw.linked_lead_id ? resolveProjectId(raw.linked_lead_id) : undefined,
    linked_lead_name: raw.linked_lead_name ? String(raw.linked_lead_name) : undefined,
    linked_booking_id: raw.booking_id
      ? resolveProjectId(raw.booking_id)
      : raw.linked_booking_id
        ? resolveProjectId(raw.linked_booking_id)
        : typeof raw.booking === "object" && raw.booking !== null
          ? resolveProjectId((raw.booking as RawRecord)._id ?? (raw.booking as RawRecord).id)
          : undefined,
  }
}

export function coerceProjectUnits(value: unknown): ProjectUnit[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is RawRecord => typeof item === "object" && item !== null)
      .map((item) => normalizeUnit(item))
  }

  if (typeof value === "object" && value !== null) {
    const record = value as RawRecord

    if (Array.isArray(record.units)) {
      return coerceProjectUnits(record.units)
    }
    if (Array.isArray(record.data)) {
      return coerceProjectUnits(record.data)
    }
    if (Array.isArray(record.list)) {
      return coerceProjectUnits(record.list)
    }
    if (record.unit_no != null || record._id != null || record.id != null) {
      return [normalizeUnit(record)]
    }
  }

  return []
}

function normalizeSiteVisit(raw: RawRecord, projectId = ""): SiteVisit {
  return {
    _id: resolveProjectId(raw._id ?? raw.id),
    project_id: resolveProjectId(raw.project_id) || projectId,
    lead_id: raw.lead_id ? resolveProjectId(raw.lead_id) : undefined,
    lead_name: String(raw.lead_name ?? raw.name ?? ""),
    visit_date: String(raw.visit_date ?? ""),
    visit_time: String(raw.visit_time ?? ""),
    agent_name: String(raw.agent_name ?? raw.agent ?? ""),
    family_attended: Boolean(raw.family_attended),
    feedback: raw.feedback ? String(raw.feedback) : undefined,
    follow_up_scheduled: Boolean(raw.follow_up_scheduled),
    next_follow_up_date: raw.next_follow_up_date
      ? String(raw.next_follow_up_date)
      : undefined,
    status: (raw.status as SiteVisit["status"]) ?? "scheduled",
  }
}

function normalizeDocument(raw: RawRecord): ProjectDocument {
  return {
    _id: resolveProjectId(raw._id ?? raw.id),
    name: String(raw.name ?? raw.file_name ?? "Document"),
    category: (raw.category as ProjectDocument["category"]) ?? "other",
    file_url: raw.file_url ? String(raw.file_url) : undefined,
    uploaded_at: String(raw.uploaded_at ?? raw.create_date ?? ""),
  }
}

function normalizeMatchedLead(raw: RawRecord): MatchedLead {
  return {
    _id: resolveProjectId(raw._id ?? raw.id),
    name: String(raw.name ?? raw.lead_name ?? ""),
    phone: String(raw.phone ?? raw.mobile ?? ""),
    budget: String(raw.budget ?? raw.budget_range ?? ""),
    location: String(raw.location ?? raw.preferred_location ?? ""),
    property_type: String(raw.property_type ?? raw.customer_requirement ?? ""),
    match_score: toNumber(raw.match_score ?? raw.score),
    match_reasons: toStringArray(raw.match_reasons ?? raw.reasons),
  }
}

function normalizeMatchedProject(raw: RawRecord): MatchedProject {
  return {
    _id: resolveProjectId(raw._id ?? raw.id ?? raw.project_id),
    name: String(raw.name ?? raw.project_name ?? ""),
    location: String(raw.location ?? raw.area_locality ?? ""),
    match_score: toNumber(raw.match_score ?? raw.score),
    match_reasons: toStringArray(raw.match_reasons ?? raw.reasons),
  }
}

function normalizeMatchText(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
}

function mapRequirementToPropertyTypes(requirement: string): PropertyType[] {
  const normalized = requirement.toLowerCase()
  const types: PropertyType[] = []

  if (normalized.includes("commercial")) types.push("commercial")
  if (normalized.includes("apartment") || normalized.includes("flat")) types.push("apartment")
  if (normalized.includes("villa")) types.push("villa")
  if (normalized.includes("plot")) types.push("plot")
  if (normalized.includes("agri")) types.push("agri_land")
  if (normalized.includes("industrial")) types.push("industrial_land")

  return types
}

function parseBudgetAmount(value: string): number | null {
  const normalized = value.trim().toLowerCase().replace(/,/g, "")
  if (!normalized) return null

  const croreMatch = normalized.match(/([\d.]+)\s*(cr|crore)/)
  if (croreMatch) return Number(croreMatch[1]) * 10000000

  const lakhMatch = normalized.match(/([\d.]+)\s*(l|lac|lakh|lakhs)/)
  if (lakhMatch) return Number(lakhMatch[1]) * 100000

  const numeric = Number(normalized.replace(/[^\d.]/g, ""))
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

function parseBudgetRange(value: string): { min?: number; max?: number } {
  const parts = value.split(/-|to/i).map((part) => part.trim()).filter(Boolean)
  if (parts.length === 0) return {}

  const amounts = parts
    .map((part) => parseBudgetAmount(part))
    .filter((amount): amount is number => amount !== null)

  if (amounts.length === 0) return {}
  if (amounts.length === 1) return { min: amounts[0], max: amounts[0] }

  return {
    min: Math.min(...amounts),
    max: Math.max(...amounts),
  }
}

function locationsMatch(leadLocation: string, project: Project): boolean {
  const lead = normalizeMatchText(leadLocation)
  if (!lead) return false

  const projectLocation = normalizeMatchText(project.location)
  const projectArea = normalizeMatchText(project.area_locality)

  return (
    projectLocation.includes(lead) ||
    lead.includes(projectLocation) ||
    projectArea.includes(lead) ||
    lead.includes(projectArea)
  )
}

function budgetsOverlap(
  leadBudget: { min?: number; max?: number },
  project: Project,
): boolean {
  const leadMin = leadBudget.min
  const leadMax = leadBudget.max ?? leadBudget.min
  if (leadMin === undefined && leadMax === undefined) return false
  if (project.budget_min <= 0 && project.budget_max <= 0) return false

  const resolvedLeadMin = leadMin ?? leadMax ?? 0
  const resolvedLeadMax = leadMax ?? leadMin ?? 0

  return project.budget_max >= resolvedLeadMin && project.budget_min <= resolvedLeadMax
}

export function matchProjectsForLead(
  projects: Project[],
  criteria: LeadMatchCriteria,
  limit = 4,
): MatchedProject[] {
  const requiredTypes = mapRequirementToPropertyTypes(criteria.customerRequirementName ?? "")
  const leadBudget = parseBudgetRange(criteria.budget ?? "")
  const hasCriteria =
    Boolean(criteria.location?.trim()) ||
    requiredTypes.length > 0 ||
    leadBudget.min !== undefined ||
    leadBudget.max !== undefined

  const scored = projects
    .filter((project) => project.status === "active")
    .map((project) => {
      let score = 0
      const reasons: string[] = []

      if (criteria.location?.trim() && locationsMatch(criteria.location, project)) {
        score += 40
        reasons.push("Location match")
      }

      if (
        requiredTypes.length > 0 &&
        requiredTypes.some((type) => project.property_types.includes(type))
      ) {
        score += 35
        reasons.push("Property type match")
      }

      if (budgetsOverlap(leadBudget, project)) {
        score += 25
        reasons.push("Budget match")
      }

      if (!hasCriteria) {
        score = 1
      }

      return {
        _id: project._id,
        name: project.name,
        location: project.area_locality || project.location,
        match_score: score,
        match_reasons: reasons,
      }
    })
    .filter((project) => project.match_score > 0)
    .sort((a, b) => b.match_score - a.match_score)

  return scored.slice(0, limit)
}

export async function fetchLeadMatchedProjects(
  leadId: string,
  criteria: LeadMatchCriteria = {},
  token?: string,
): Promise<MatchedProject[]> {
  const authToken = token ?? getProjectAuthToken()

  try {
    const response = await fetch(
      `${URLS.LEAD_MATCH_PROJECTS}?lead_id=${encodeURIComponent(leadId)}`,
      {
        method: "GET",
        headers: projectAuthHeaders(authToken),
      },
    )

    if (response.ok) {
      const payload = await parseJsonResponse<ApiEnvelope<unknown>>(response)
      if (payload.code === 200) {
        const items = Array.isArray(payload.data) ? payload.data : []
        if (items.length > 0) {
          return items.map((item) => normalizeMatchedProject(item as RawRecord))
        }
      }
    }
  } catch {
    // Fall back to client-side matching below.
  }

  const { projects } = await fetchProjectList({
    token: authToken,
    length: 500,
  })

  return matchProjectsForLead(projects, criteria)
}

export function normalizeProject(raw: RawRecord, index = 0): Project {
  const units = coerceProjectUnits(raw.units)
  const siteVisits = Array.isArray(raw.site_visits)
    ? raw.site_visits.map((item) =>
        normalizeSiteVisit(item as RawRecord, resolveProjectId(raw._id ?? raw.id)),
      )
    : []
  const documents = Array.isArray(raw.documents)
    ? raw.documents.map((item) => normalizeDocument(item as RawRecord))
    : []

  const availableUnits = toNumber(
    raw.available_units,
    units.filter((unit) => unit.status === "available").length,
  )
  const blockedUnits = toNumber(
    raw.blocked_units,
    units.filter((unit) => unit.status === "hold").length,
  )
  const soldUnits = toNumber(
    raw.sold_units,
    units.filter(
      (unit) =>
        unit.status === "sold" ||
        unit.status === "booked" ||
        unit.status === "registered",
    ).length,
  )
  const ownerSiteUnits = toNumber(
    raw.owner_site_units,
    units.filter((unit) => {
      const status = unit.status.toLowerCase().trim()
      return status === "owner_site" || status === "owner site"
    }).length,
  )

  return {
    _id: resolveProjectId(raw._id ?? raw.id),
    project_no: String(raw.project_no ?? raw.project_number ?? ""),
    name: String(raw.name ?? ""),
    location: String(raw.location ?? raw.city ?? ""),
    area_locality: String(raw.area_locality ?? raw.locality ?? ""),
    card_color:
      raw.card_color != null && String(raw.card_color).trim()
        ? String(raw.card_color).trim()
        : undefined,
    sort_order: raw.sort_order != null ? toNumber(raw.sort_order, index) : index,
    price_per_sqft: toNumber(raw.price_per_sqft),
    price_per_cent: toOptionalNumber(raw.price_per_cent),
    price_range_min: toNumber(raw.price_range_min ?? raw.budget_min),
    price_range_max: toNumber(raw.price_range_max ?? raw.budget_max),
    total_units: toNumber(raw.total_units, units.length),
    available_units: availableUnits,
    blocked_units: blockedUnits,
    sold_units: soldUnits,
    owner_site_units: ownerSiteUnits,
    rera_status: (resolveSettingValue(raw.rera_status) as ReraStatus) || "pending",
    rera_number: raw.rera_number ? String(raw.rera_number) : undefined,
    dtcp_number: raw.dtcp_number ? String(raw.dtcp_number) : undefined,
    dtcp_status: raw.dtcp_status ? String(raw.dtcp_status) : undefined,
    highlights: toStringArray(raw.highlights),
    property_types: normalizePropertyTypes(raw.property_types),
    budget_min: toNumber(raw.budget_min ?? raw.price_range_min),
    budget_max: toNumber(raw.budget_max ?? raw.price_range_max),
    status: (resolveSettingValue(raw.status ?? raw.project_status) as ProjectStatus) || "active",
    description: raw.description ? String(raw.description) : undefined,
    create_date: String(raw.create_date ?? raw.created_at ?? ""),
    units,
    site_visits: siteVisits,
    documents,
  }
}

export function sortProjectsByOrder(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER
    const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER
    if (orderA !== orderB) return orderA - orderB
    return a.name.localeCompare(b.name)
  })
}

const PROJECT_ORDER_STORAGE_KEY = "map_project_sort_order"
const PROJECT_COLORS_STORAGE_KEY = "map_project_card_colors"

export function normalizeCardColor(color: string): string {
  const trimmed = color.trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith("#")) return trimmed
  if (/^[0-9a-fA-F]{3,6}$/.test(trimmed)) return `#${trimmed}`
  return trimmed
}

export function readStoredProjectColors(): Record<string, string> {
  if (typeof window === "undefined") return {}

  try {
    const raw = localStorage.getItem(PROJECT_COLORS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function writeStoredProjectColors(colors: Record<string, string>): void {
  if (typeof window === "undefined") return
  localStorage.setItem(PROJECT_COLORS_STORAGE_KEY, JSON.stringify(colors))
}

export function writeStoredProjectColor(projectId: string, color: string): void {
  const normalized = normalizeCardColor(color)
  writeStoredProjectColors({
    ...readStoredProjectColors(),
    [projectId]: normalized,
  })
}

export function applyStoredProjectColors(projects: Project[]): Project[] {
  const storedColors = readStoredProjectColors()
  if (Object.keys(storedColors).length === 0) return projects

  return projects.map((project) => ({
    ...project,
    card_color: storedColors[project._id] ?? project.card_color,
  }))
}

export function applyStoredProjectColor(project: Project): Project {
  const storedColor = readStoredProjectColors()[project._id]
  if (!storedColor) return project
  return { ...project, card_color: storedColor }
}

export function readStoredProjectOrder(): Record<string, number> {
  if (typeof window === "undefined") return {}

  try {
    const raw = localStorage.getItem(PROJECT_ORDER_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, number>) : {}
  } catch {
    return {}
  }
}

export function writeStoredProjectOrder(orderedIds: string[]): void {
  if (typeof window === "undefined") return

  const order = Object.fromEntries(orderedIds.map((id, index) => [id, index + 1]))
  localStorage.setItem(PROJECT_ORDER_STORAGE_KEY, JSON.stringify(order))
}

export function applyStoredProjectOrder(projects: Project[]): Project[] {
  const storedOrder = readStoredProjectOrder()
  if (Object.keys(storedOrder).length === 0) return projects

  return sortProjectsByOrder(
    projects.map((project) => ({
      ...project,
      sort_order: storedOrder[project._id] ?? project.sort_order,
    })),
  )
}

export function reorderProjectsList(projects: Project[], orderedIds: string[]): Project[] {
  const byId = new Map(projects.map((project) => [project._id, project]))

  return orderedIds.flatMap((id, index) => {
    const project = byId.get(id)
    return project ? [{ ...project, sort_order: index + 1 }] : []
  })
}

function normalizeProjectList(data: unknown): Project[] {
  const items = Array.isArray(data)
    ? data
    : Array.isArray((data as RawRecord | null)?.projects)
      ? ((data as RawRecord).projects as unknown[])
      : []

  return applyStoredProjectColors(
    applyStoredProjectOrder(
      sortProjectsByOrder(
        items.map((item, index) => normalizeProject(item as RawRecord, index)),
      ),
    ),
  )
}

function normalizeProjectMetrics(data: unknown): ProjectMetrics {
  const raw = (data ?? {}) as RawRecord

  return {
    total_projects: toNumber(raw.total_projects),
    active_projects: toNumber(raw.active_projects),
    total_units: toNumber(raw.total_units),
    available_units: toNumber(raw.available_units),
    site_visits_this_week: toNumber(raw.site_visits_this_week),
  }
}

function buildProjectListFilters(filters: ProjectFilterState) {
  const apiFilters: Array<{ field: string; selected_values: string[] }> = []

  if (filters.status) {
    apiFilters.push({ field: "status", selected_values: [filters.status] })
  }
  if (filters.location) {
    apiFilters.push({ field: "area_locality", selected_values: [filters.location] })
  }
  if (filters.property_type) {
    apiFilters.push({ field: "property_types", selected_values: [filters.property_type] })
  }
  if (filters.rera_status) {
    apiFilters.push({ field: "rera_status", selected_values: [filters.rera_status] })
  }

  return apiFilters
}

export interface FetchProjectListParams {
  token?: string
  search?: string
  page?: number
  length?: number
  filters?: ProjectFilterState
}

export async function fetchProjectList({
  token,
  search = "",
  page = 1,
  length = 100,
  filters,
}: FetchProjectListParams = {}): Promise<{ projects: Project[]; totalCount: number }> {
  const authToken = token ?? getProjectAuthToken()

  const response = await fetch(
    `${URLS.PROJECT_LIST}?page=${page}&length=${length}&search=${encodeURIComponent(search)}`,
    {
      method: "POST",
      headers: projectAuthHeaders(authToken),
      body: JSON.stringify({
        draw: 1,
        search: {
          value: search,
          regex: false,
        },
        filter: filters ? buildProjectListFilters(filters) : [],
      }),
    },
  )

  const payload = await parseJsonResponse<ApiEnvelope<unknown>>(response)

  if (payload.code !== 200) {
    throw new ProjectApiError(payload.msg || "Failed to load projects.", payload.code ?? response.status)
  }

  return {
    projects: normalizeProjectList(payload.data),
    totalCount: payload.total_count ?? normalizeProjectList(payload.data).length,
  }
}

export async function fetchProjectMetrics(token?: string): Promise<ProjectMetrics> {
  const authToken = token ?? getProjectAuthToken()

  const response = await fetch(URLS.PROJECT_METRICS, {
    method: "GET",
    headers: projectAuthHeaders(authToken),
  })

  const data = await readProjectResponse<unknown>(response)
  return normalizeProjectMetrics(data)
}

export interface CreateProjectPayload {
  name: string
  location: string
  area_locality: string
  price_per_sqft: number
  price_per_cent?: number
  price_range_min: number
  price_range_max: number
  rera_status: string
  rera_number?: string
  dtcp_number?: string
  dtcp_status?: string
  property_types: string[]
  budget_min: number
  budget_max: number
  status: string
  description?: string
  highlights?: string[]
  branch_id?: string
}

export async function createProjectApi(
  payload: CreateProjectPayload,
  token?: string,
): Promise<Project> {
  const authToken = token ?? getProjectAuthToken()

  const response = await fetch(URLS.ADD_PROJECT, {
    method: "POST",
    headers: projectAuthHeaders(authToken),
    body: JSON.stringify(payload),
  })

  const data = await readProjectResponse<RawRecord>(response)
  return normalizeProject(data)
}

export async function fetchProjectDetail(
  projectId: string,
  token?: string,
): Promise<Project> {
  const authToken = token ?? getProjectAuthToken()

  const response = await fetch(`${URLS.PROJECT_DETAIL}/${projectId}`, {
    method: "GET",
    headers: projectAuthHeaders(authToken),
  })

  const data = await readProjectResponse<RawRecord>(response)
  return applyStoredProjectColor(normalizeProject(data))
}

export async function updateProjectApi(
  projectId: string,
  payload: Record<string, unknown>,
  token?: string,
): Promise<Project> {
  const authToken = token ?? getProjectAuthToken()

  const response = await fetch(`${URLS.PROJECT_UPDATE}/${projectId}`, {
    method: "PUT",
    headers: projectAuthHeaders(authToken),
    body: JSON.stringify(serializeProjectUpdatePayload(payload)),
  })

  const data = await readProjectResponse<RawRecord>(response)
  return normalizeProject(data)
}

export async function fetchProjectUnits(
  projectId: string,
  token?: string,
): Promise<ProjectUnit[]> {
  const authToken = token ?? getProjectAuthToken()

  try {
    const response = await fetch(`${URLS.PROJECT_UNITS}/${projectId}`, {
      method: "GET",
      headers: projectAuthHeaders(authToken),
    })

    const data = await readProjectResponse<unknown>(response)
    return coerceProjectUnits(data)
  } catch {
    return []
  }
}

export interface CreateProjectUnitPayload {
  unit_no: string
  block?: string
  property_type: ProjectUnit["property_type"]
  area_sqft?: number
  area_cents?: number
  price_per_sqft: number
  total_price: number
  percentage?: number
  status: ProjectUnit["status"]
}

export async function createProjectUnit(
  projectId: string,
  payload: CreateProjectUnitPayload,
  token?: string,
): Promise<ProjectUnit> {
  const authToken = token ?? getProjectAuthToken()

  const response = await fetch(`${URLS.PROJECT_UNITS}/${projectId}`, {
    method: "POST",
    headers: projectAuthHeaders(authToken),
    body: JSON.stringify(payload),
  })

  const data = await readProjectResponse<RawRecord>(response)
  return normalizeUnit(data)
}

export type UpdateProjectUnitPayload = Partial<CreateProjectUnitPayload>

export async function updateProjectUnit(
  unitId: string,
  payload: UpdateProjectUnitPayload,
  token?: string,
): Promise<ProjectUnit> {
  const authToken = token ?? getProjectAuthToken()

  const response = await fetch(`${URLS.PROJECT_UNITS}/${unitId}`, {
    method: "PUT",
    headers: projectAuthHeaders(authToken),
    body: JSON.stringify(payload),
  })

  const data = await readProjectResponse<RawRecord>(response)
  return normalizeUnit(data)
}

export async function fetchProjectSiteVisits(
  projectId: string,
  token?: string,
): Promise<SiteVisit[]> {
  const authToken = token ?? getProjectAuthToken()

  const response = await fetch(`${URLS.PROJECT_SITE_VISITS}/${projectId}`, {
    method: "GET",
    headers: projectAuthHeaders(authToken),
  })

  const data = await readProjectResponse<unknown>(response)
  const items = Array.isArray(data) ? data : []

  return items.map((item) => normalizeSiteVisit(item as RawRecord, projectId))
}

export interface CreateSiteVisitPayload {
  lead_name: string
  visit_date: string
  visit_time: string
  agent_name: string
  family_attended: boolean
  feedback?: string
  follow_up_scheduled: boolean
  next_follow_up_date?: string
  status: SiteVisit["status"]
  lead_id?: string
}

export async function createProjectSiteVisit(
  projectId: string,
  payload: CreateSiteVisitPayload,
  token?: string,
): Promise<SiteVisit> {
  const authToken = token ?? getProjectAuthToken()

  const response = await fetch(`${URLS.PROJECT_SITE_VISITS}/${projectId}`, {
    method: "POST",
    headers: projectAuthHeaders(authToken),
    body: JSON.stringify(payload),
  })

  const data = await readProjectResponse<RawRecord>(response)
  return normalizeSiteVisit(data, projectId)
}

export async function fetchProjectMatchedLeads(
  projectId: string,
  token?: string,
): Promise<MatchedLead[]> {
  const authToken = token ?? getProjectAuthToken()

  const response = await fetch(
    `${URLS.PROJECT_MATCH_LEADS}?project_id=${encodeURIComponent(projectId)}`,
    {
      method: "GET",
      headers: projectAuthHeaders(authToken),
    },
  )

  const data = await readProjectResponse<unknown>(response)
  const items = Array.isArray(data) ? data : []

  return items.map((item) => normalizeMatchedLead(item as RawRecord))
}

export async function fetchProjectDocuments(
  projectId: string,
  token?: string,
): Promise<ProjectDocument[]> {
  const authToken = token ?? getProjectAuthToken()

  const response = await fetch(`${URLS.PROJECT_DOCUMENTS}/${projectId}`, {
    method: "GET",
    headers: projectAuthHeaders(authToken),
  })

  const data = await readProjectResponse<unknown>(response)
  const items = Array.isArray(data) ? data : []

  return items.map((item) => normalizeDocument(item as RawRecord))
}

export interface UploadProjectDocumentInput {
  file: File
  name?: string
  category?: ProjectDocument["category"]
}

export async function uploadProjectDocumentApi(
  projectId: string,
  input: UploadProjectDocumentInput,
  token?: string,
): Promise<ProjectDocument> {
  const authToken = token ?? getProjectAuthToken()
  const formData = new FormData()
  formData.append("file", input.file)
  formData.append("name", input.name ?? input.file.name)
  formData.append("category", input.category ?? "other")

  const response = await fetch(`${URLS.PROJECT_DOCUMENTS}/${projectId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: formData,
  })

  const payload = await parseJsonResponse<ApiEnvelope<RawRecord>>(response)
  if (payload.code !== 200) {
    throw new ProjectApiError(
      payload.msg || "Failed to upload document.",
      payload.code ?? response.status,
    )
  }

  if (payload.data && typeof payload.data === "object") {
    return normalizeDocument(payload.data)
  }

  throw new ProjectApiError("Invalid upload response.", 500)
}

export async function updateProjectCardColorApi(
  projectId: string,
  color: string,
  token?: string,
): Promise<Project> {
  const normalized = normalizeCardColor(color)
  writeStoredProjectColor(projectId, normalized)
  const project = await updateProjectApi(projectId, { card_color: normalized }, token)
  return { ...project, card_color: normalized }
}

export async function reorderProjectsApi(
  orderedIds: string[],
  token?: string,
): Promise<void> {
  writeStoredProjectOrder(orderedIds)

  for (let index = 0; index < orderedIds.length; index++) {
    await updateProjectApi(orderedIds[index], { sort_order: index + 1 }, token)
  }
}
