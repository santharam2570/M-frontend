import URLS from "@/config/urls"
import { parseJsonResponse } from "@/lib/api"

export interface LeadMetricsData {
  active_leads: number
  created_this_week: number
  converted_this_week: number
  aging_leads: number
  aging_days: number
  followup_today: number
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
    created_this_month: toNumber(raw.created_this_month),
    converted_this_month: toNumber(raw.converted_this_month),
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
