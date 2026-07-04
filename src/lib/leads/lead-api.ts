import URLS from "@/config/urls"
import { parseJsonResponse } from "@/lib/api"

export interface LeadMetricsData {
  active_leads: number
  created_this_week: number
  converted_this_week: number
  aging_leads: number
  aging_days: number
  followup_today: number
  followups_this_week: number
  pending_followups: number
  created_this_month: number
  converted_this_month: number
}

type RawRecord = Record<string, unknown>

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem("map_user") ?? "{}"
    const parsed = JSON.parse(stored) as { access_token?: string }
    return parsed?.access_token ?? null
  } catch {
    return null
  }
}

function unwrapMetricsPayload(data: unknown): RawRecord {
  if (!data || typeof data !== "object") return {}

  const raw = data as RawRecord
  if (raw.metrics && typeof raw.metrics === "object") {
    return raw.metrics as RawRecord
  }

  return raw
}

function normalizeLeadMetrics(data: unknown): LeadMetricsData {
  const raw = unwrapMetricsPayload(data)

  return {
    active_leads: toNumber(raw.active_leads),
    created_this_week: toNumber(raw.created_this_week),
    converted_this_week: toNumber(raw.converted_this_week),
    aging_leads: toNumber(raw.aging_leads),
    aging_days: toNumber(raw.aging_days, 7),
    followup_today: toNumber(
      raw.followup_today ??
        raw.today_followup ??
        raw.follow_up_today ??
        raw.followups_today,
    ),
    followups_this_week: toNumber(
      raw.followups_this_week ??
        raw.followup_this_week ??
        raw.this_week_followups ??
        raw.follow_ups_this_week,
    ),
    pending_followups: toNumber(
      raw.pending_followups ??
        raw.overdue_followups ??
        raw.overdue_followup_count ??
        raw.pending_followup,
    ),
    created_this_month: toNumber(raw.created_this_month),
    converted_this_month: toNumber(
      raw.converted_this_month ??
        raw.bookings_converted_this_month ??
        raw.converted_bookings_this_month,
    ),
  }
}

export async function fetchLeadMetrics(
  token?: string,
  agingDays = 7,
): Promise<LeadMetricsData> {
  const authToken = token ?? getAuthToken()
  if (!authToken) {
    throw new Error("Authentication required")
  }

  const safeAgingDays = agingDays >= 1 ? agingDays : 7
  const response = await fetch(
    `${URLS.LEAD_METRICS}?aging_days=${safeAgingDays}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      cache: "no-store",
    },
  )

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = await parseJsonResponse<{ code?: number; data?: unknown }>(response)
  if (Number(result.code) !== 200 || !result.data) {
    throw new Error("Failed to load lead metrics")
  }

  const metrics = normalizeLeadMetrics(result.data)

  return metrics
}

function getLeadAuthHeaders(token?: string | null): Record<string, string> {
  const authToken = token ?? getAuthToken()
  if (!authToken) {
    throw new Error("Authentication required")
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
  }
}

const SUGGESTED_PROJECTS_STORAGE_KEY = "map_lead_suggested_projects"

function readSuggestedProjectsStorage(): Record<string, string[]> {
  if (typeof window === "undefined") return {}

  try {
    const raw = localStorage.getItem(SUGGESTED_PROJECTS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {}
  } catch {
    return {}
  }
}

function writeSuggestedProjectsStorage(data: Record<string, string[]>): void {
  if (typeof window === "undefined") return
  localStorage.setItem(SUGGESTED_PROJECTS_STORAGE_KEY, JSON.stringify(data))
}

export function getStoredLeadSuggestedProjects(leadId: string): string[] {
  if (!leadId) return []
  const stored = readSuggestedProjectsStorage()[leadId]
  return Array.isArray(stored) ? stored.filter(Boolean) : []
}

export function setStoredLeadSuggestedProjects(leadId: string, projectIds: string[]): void {
  if (!leadId) return
  const next = readSuggestedProjectsStorage()
  next[leadId] = projectIds
  writeSuggestedProjectsStorage(next)
}

export async function fetchLeadSuggestedProjects(
  leadId: string,
  token?: string,
): Promise<string[]> {
  const authToken = token ?? getAuthToken()
  if (!authToken || !leadId) {
    return getStoredLeadSuggestedProjects(leadId)
  }

  try {
    const response = await fetch(`${URLS.LEAD_SUGGESTED_PROJECTS}/${leadId}`, {
      method: "GET",
      headers: getLeadAuthHeaders(authToken),
      cache: "no-store",
    })

    const result = await parseJsonResponse<{ code?: number; data?: unknown }>(response)
    if (Number(result.code) === 200 && Array.isArray(result.data)) {
      const projectIds = result.data.map((id) => String(id)).filter(Boolean)
      setStoredLeadSuggestedProjects(leadId, projectIds)
      return projectIds
    }
  } catch {
    // Fall back to browser storage below.
  }

  return getStoredLeadSuggestedProjects(leadId)
}

export async function updateLeadSuggestedProjects(
  leadId: string,
  projectIds: string[],
  token?: string,
): Promise<void> {
  if (!leadId) {
    throw new Error("Lead id is required")
  }

  setStoredLeadSuggestedProjects(leadId, projectIds)

  const authToken = token ?? getAuthToken()
  if (!authToken) {
    throw new Error("Authentication required")
  }

  const response = await fetch(`${URLS.LEAD_SUGGESTED_PROJECTS}/${leadId}`, {
    method: "PUT",
    headers: getLeadAuthHeaders(authToken),
    body: JSON.stringify({ suggested_projects: projectIds }),
  })

  const result = await parseJsonResponse<{ code?: number; msg?: string }>(response)
  if (Number(result.code) !== 200) {
    throw new Error(result.msg || "Failed to update suggested projects")
  }
}
