import URLS from "@/config/urls"
import { parseJsonResponse } from "@/lib/api"
import {
  getAllUserRoleMeta,
  getOrgIdFromAuth,
  getStoredAuthUser,
  type RoleTier,
} from "@/lib/auth"
import type {
  Agent,
  AgentFilterState,
  AgentFormPayload,
  AgentMetrics,
  AgentStatus,
  AgentType,
} from "./types"

interface ApiEnvelope<T> {
  code?: number
  msg?: string
  data?: T
  total_count?: number
}

type RawRecord = Record<string, unknown>

export class AgentApiError extends Error {
  code: number

  constructor(message: string, code = 500) {
    super(message)
    this.name = "AgentApiError"
    this.code = code
  }
}

export function getAgentAuthToken(): string {
  if (typeof window === "undefined") {
    throw new AgentApiError("Not available on the server.", 401)
  }

  const userData = JSON.parse(localStorage.getItem("map_user") || "{}")
  if (!userData.access_token) {
    throw new AgentApiError("You are not logged in. Please sign in again.", 401)
  }

  return userData.access_token
}

function agentAuthHeaders(token?: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token ?? getAgentAuthToken()}`,
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

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (value == null) continue
    const normalized = String(value).trim()
    if (normalized) return normalized
  }
  return undefined
}

function normalizeAgentType(value: unknown): AgentType {
  const normalized = String(value ?? "internal").toLowerCase()
  if (normalized === "external" || normalized === "channel_partner") return normalized
  return "internal"
}

function normalizeAgentStatus(value: unknown): AgentStatus {
  const normalized = String(value ?? "active").toLowerCase()
  return normalized === "inactive" ? "inactive" : "active"
}

function extractUsersFromApiResponse(data: unknown): RawRecord[] {
  if (Array.isArray(data)) {
    return data.filter((item): item is RawRecord => typeof item === "object" && item !== null)
  }

  if (data && typeof data === "object") {
    const record = data as RawRecord
    for (const key of ["users", "data", "items"] as const) {
      const value = record[key]
      if (Array.isArray(value)) {
        return value.filter((item): item is RawRecord => typeof item === "object" && item !== null)
      }
    }
  }

  return []
}

function inferAgentTypeFromRole(roleName: unknown): AgentType {
  const normalized = String(roleName ?? "").toLowerCase()
  if (normalized.includes("channel")) return "channel_partner"
  if (normalized.includes("external")) return "external"
  return "internal"
}

function isActiveUserStatus(status: unknown): boolean {
  if (status === undefined || status === null || status === "") return true
  const normalized = String(status).trim().toLowerCase()
  return normalized === "active" || normalized === "1" || normalized === "true"
}

async function fetchUsersFromList(): Promise<RawRecord[]> {
  const response = await fetch(URLS.USERS_LIST, {
    method: "GET",
    headers: agentAuthHeaders(),
  })

  if (!response.ok) {
    throw new AgentApiError("Failed to fetch agents.", response.status)
  }

  const result = await parseJsonResponse<Record<string, unknown>>(response)
  return extractUsersFromApiResponse(result.data ?? result)
}

function normalizeBranchId(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined
  return String(value)
}

function userRecordToAgent(raw: RawRecord, orgId?: number): Agent {
  const id = resolveId(raw._id ?? raw.id ?? raw.user_id)
  const metaMap = orgId ? getAllUserRoleMeta(orgId) : {}
  const meta = metaMap[id]
  const apiTier = raw.role_tier as RoleTier | undefined
  const apiBranch = normalizeBranchId(raw.branch_id)

  return normalizeAgent({
    ...raw,
    _id: id,
    name: raw.name ?? raw.user_name ?? raw.full_name ?? raw.agent_name,
    phone: raw.phone ?? raw.mobile,
    role: raw.role ?? raw.role_id,
    role_name: raw.role_name,
    role_tier: apiTier ?? meta?.role_tier ?? "branch_user",
    branch_id: apiBranch ?? meta?.branch_id,
    agency_name: raw.agency_name ? String(raw.agency_name) : undefined,
    agent_type: raw.agent_type ?? raw.type ?? inferAgentTypeFromRole(raw.role_name),
    rera_number: raw.rera_number ?? raw.rera_no,
    create_date: raw.create_date ?? raw.created_at ?? raw.created,
    total_leads: raw.total_leads ?? raw.lead_count,
    total_bookings: raw.total_bookings ?? raw.booking_count,
    status: isActiveUserStatus(raw.status) ? "active" : "inactive",
  })
}

function normalizeAssignedProjectIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .map((id) => resolveId(id))
    .filter((id): id is string => Boolean(id))
}

function normalizeAgent(raw: RawRecord): Agent {
  const projectIds = normalizeAssignedProjectIds(raw.assigned_project_ids)
  const projectNames = Array.isArray(raw.assigned_project_names)
    ? raw.assigned_project_names.map((name) => String(name))
    : []

  return {
    _id: resolveId(raw._id ?? raw.id),
    name: String(raw.name ?? raw.agent_name ?? ""),
    email: String(raw.email ?? ""),
    phone: String(raw.phone ?? raw.mobile ?? ""),
    role: raw.role ? String(raw.role) : undefined,
    role_name: raw.role_name ? String(raw.role_name) : undefined,
    role_tier: raw.role_tier as RoleTier | undefined,
    agent_type: normalizeAgentType(raw.agent_type ?? raw.type),
    rera_number: raw.rera_number ? String(raw.rera_number) : undefined,
    commission_rate: raw.commission_rate != null ? toNumber(raw.commission_rate) : undefined,
    branch_id: raw.branch_id ? String(raw.branch_id) : undefined,
    branch_name: raw.branch_name ? String(raw.branch_name) : undefined,
    status: normalizeAgentStatus(raw.status),
    address: pickString(raw.address),
    city: pickString(raw.city),
    state: pickString(raw.state),
    pincode: pickString(raw.pincode),
    pan_number: pickString(raw.pan_number, raw.pan),
    pan_document: pickString(raw.pan_document, raw.pan_doc),
    aadhaar_number: pickString(raw.aadhaar_number, raw.aadhaar),
    aadhaar_document: pickString(raw.aadhaar_document, raw.aadhaar_doc),
    passport_number: pickString(raw.passport_number, raw.passport),
    source: pickString(raw.source),
    referred_by: pickString(raw.referred_by, raw.referredBy),
    reference_contact_number: pickString(
      raw.reference_contact_number,
      raw.reference_contact,
      raw.reference_phone,
    ),
    agency_name: raw.agency_name ? String(raw.agency_name) : undefined,
    assigned_project_ids: projectIds,
    assigned_project_names: projectNames,
    total_leads: toNumber(raw.total_leads),
    total_bookings: toNumber(raw.total_bookings),
    total_commission: toNumber(raw.total_commission),
    notes: raw.notes ? String(raw.notes) : undefined,
    create_date: raw.create_date ? String(raw.create_date) : undefined,
  }
}

function computeMetrics(agents: Agent[]): AgentMetrics {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  return {
    total_agents: agents.length,
    active_agents: agents.filter((agent) => agent.status === "active").length,
    new_this_month: agents.filter((agent) => {
      if (!agent.create_date) return false
      const date = new Date(agent.create_date)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    }).length,
    total_bookings: agents.reduce((sum, agent) => sum + agent.total_bookings, 0),
  }
}

function filterAgents(
  agents: Agent[],
  search: string,
  filters: AgentFilterState,
  metricFilter: string | null,
): Agent[] {
  let result = [...agents]

  if (search.trim()) {
    const query = search.trim().toLowerCase()
    result = result.filter(
      (agent) =>
        agent.name.toLowerCase().includes(query) ||
        agent.email.toLowerCase().includes(query) ||
        agent.phone.includes(query) ||
        (agent.rera_number?.toLowerCase().includes(query) ?? false) ||
        (agent.agency_name?.toLowerCase().includes(query) ?? false) ||
        (agent.role_name?.toLowerCase().includes(query) ?? false),
    )
  }

  if (filters.status) {
    result = result.filter((agent) => agent.status === filters.status)
  }

  if (filters.agent_type) {
    result = result.filter((agent) => agent.agent_type === filters.agent_type)
  }

  if (filters.branch_id) {
    result = result.filter((agent) => agent.branch_id === filters.branch_id)
  }

  if (metricFilter === "active") {
    result = result.filter((agent) => agent.status === "active")
  }

  if (metricFilter === "new-this-month") {
    const now = new Date()
    result = result.filter((agent) => {
      if (!agent.create_date) return false
      const date = new Date(agent.create_date)
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    })
  }

  if (metricFilter === "total-bookings") {
    result = result.filter((agent) => agent.total_bookings > 0)
  }

  return result
}

let cachedAgentsPromise: Promise<Agent[]> | null = null
let cachedAgentsTimestamp = 0
const AGENTS_CACHE_TTL_MS = 5_000

async function fetchAllAgents(orgId?: number): Promise<Agent[]> {
  const now = Date.now()
  const resolvedOrgId = orgId ?? getOrgIdFromAuth(getStoredAuthUser()) ?? undefined

  if (cachedAgentsPromise && now - cachedAgentsTimestamp < AGENTS_CACHE_TTL_MS) {
    return cachedAgentsPromise
  }

  cachedAgentsTimestamp = now
  cachedAgentsPromise = fetchUsersFromList()
    .then((users) =>
      users.map((user) => userRecordToAgent(user, resolvedOrgId)).filter((agent) => agent._id),
    )
    .catch((error) => {
      cachedAgentsPromise = null
      cachedAgentsTimestamp = 0
      throw error
    })

  return cachedAgentsPromise
}

export function invalidateAgentsCache(): void {
  cachedAgentsPromise = null
  cachedAgentsTimestamp = 0
}

export async function fetchAgentList(params?: {
  search?: string
  filters?: AgentFilterState
  metricFilter?: string | null
  orgId?: number
}): Promise<{ agents: Agent[]; total: number }> {
  const search = params?.search ?? ""
  const filters = params?.filters ?? { status: "", agent_type: "", branch_id: "" }
  const metricFilter = params?.metricFilter ?? null

  const agents = await fetchAllAgents(params?.orgId)
  const filtered = filterAgents(agents, search, filters, metricFilter)
  return { agents: filtered, total: filtered.length }
}

export async function fetchAgentMetrics(orgId?: number): Promise<AgentMetrics> {
  const agents = await fetchAllAgents(orgId)
  return computeMetrics(agents)
}

function mergeAgentWithListMetrics(detail: Agent, listAgent?: Agent): Agent {
  if (!listAgent) return detail

  return {
    ...detail,
    agent_type: listAgent.agent_type,
    rera_number: listAgent.rera_number ?? detail.rera_number,
    commission_rate: listAgent.commission_rate ?? detail.commission_rate,
    branch_name: listAgent.branch_name ?? detail.branch_name,
    agency_name: listAgent.agency_name ?? detail.agency_name,
    assigned_project_ids:
      detail.assigned_project_ids.length > 0 ? detail.assigned_project_ids : listAgent.assigned_project_ids,
    assigned_project_names:
      detail.assigned_project_names.length > 0
        ? detail.assigned_project_names
        : listAgent.assigned_project_names,
    total_leads: listAgent.total_leads,
    total_bookings: listAgent.total_bookings,
    total_commission: listAgent.total_commission,
    notes: listAgent.notes ?? detail.notes,
  }
}

async function findCachedListAgent(agentId: string): Promise<Agent | undefined> {
  const now = Date.now()
  if (!cachedAgentsPromise || now - cachedAgentsTimestamp >= AGENTS_CACHE_TTL_MS) {
    return undefined
  }

  try {
    return (await cachedAgentsPromise).find((item) => item._id === agentId)
  } catch {
    return undefined
  }
}

export async function fetchAgentDetail(agentId: string, orgId?: number): Promise<Agent> {
  const resolvedOrgId = orgId ?? getOrgIdFromAuth(getStoredAuthUser()) ?? undefined

  try {
    const response = await fetch(`${URLS.USERS_LIST}/${agentId}`, {
      method: "GET",
      headers: agentAuthHeaders(),
    })

    if (response.ok) {
      const result = await parseJsonResponse<ApiEnvelope<RawRecord>>(response)
      const raw = result.data
      if (raw && typeof raw === "object" && result.code === 200) {
        const detail = userRecordToAgent(raw, resolvedOrgId)
        const listAgent = await findCachedListAgent(agentId)
        return mergeAgentWithListMetrics(detail, listAgent)
      }
    }
  } catch {
    // Fall back to list lookup below.
  }

  try {
    const listAgent = (await fetchAllAgents(resolvedOrgId)).find((item) => item._id === agentId)
    if (listAgent) return listAgent
  } catch {
    // Handled below.
  }

  throw new AgentApiError("Agent not found.", 404)
}

export async function fetchAgentRoles(): Promise<Array<{ _id: string; name: string }>> {
  const response = await fetch(URLS.ROLES, {
    method: "GET",
    headers: agentAuthHeaders(),
  })

  if (!response.ok) return []

  const result = await parseJsonResponse<unknown>(response)
  const items = Array.isArray(result)
    ? extractUsersFromApiResponse(result)
    : extractUsersFromApiResponse((result as RawRecord).data ?? result)

  return items
    .map((role) => ({
      _id: resolveId(role._id ?? role.id),
      name: String(role.role_name ?? role.name ?? "Unknown Role"),
    }))
    .filter((role) => role._id)
}

export async function updateAgentApi(agentId: string, payload: AgentFormPayload): Promise<void> {
  const response = await fetch(`${URLS.USER_UPDATE}/${agentId}`, {
    method: "PUT",
    headers: agentAuthHeaders(),
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      branch_id: payload.branch_id ?? "",
      status: payload.status,
      agent_type: payload.agent_type,
      rera_number: payload.rera_number,
      commission_rate: payload.commission_rate,
      address: payload.address,
      city: payload.city,
      state: payload.state,
      pincode: payload.pincode,
      pan_number: payload.pan_number,
      agency_name: payload.agency_name,
      assigned_project_ids: payload.assigned_project_ids ?? [],
      notes: payload.notes,
    }),
  })

  const result = await parseJsonResponse<ApiEnvelope<RawRecord>>(response).catch(() => null)

  if (!response.ok || (result?.code !== undefined && result.code !== 200)) {
    throw new AgentApiError(
      result?.msg || "Failed to update agent.",
      result?.code ?? response.status,
    )
  }

  invalidateAgentsCache()
}

export async function deleteAgentApi(agentId: string): Promise<void> {
  const response = await fetch(`${URLS.AGENT_DELETE}/${agentId}`, {
    method: "DELETE",
    headers: agentAuthHeaders(),
  })

  if (!response.ok) {
    const errorPayload = await parseJsonResponse<ApiEnvelope<unknown>>(response).catch(() => null)
    throw new AgentApiError(
      errorPayload?.msg || "Failed to delete agent.",
      errorPayload?.code ?? response.status,
    )
  }

  const payload = await parseJsonResponse<ApiEnvelope<unknown>>(response).catch(() => null)
  if (payload?.code !== undefined && payload.code !== 200) {
    throw new AgentApiError(payload.msg || "Failed to delete agent.", payload.code)
  }

  invalidateAgentsCache()
}

export async function toggleAgentStatusApi(agentId: string, status: AgentStatus): Promise<void> {
  const response = await fetch(`${URLS.USER_CHANGE_STATUS}/${agentId}`, {
    method: "PUT",
    headers: agentAuthHeaders(),
    body: JSON.stringify({ status }),
  })

  if (!response.ok) {
    const errorPayload = await parseJsonResponse<ApiEnvelope<unknown>>(response).catch(() => null)
    throw new AgentApiError(
      errorPayload?.msg || "Failed to update agent status.",
      errorPayload?.code ?? response.status,
    )
  }

  invalidateAgentsCache()
}
