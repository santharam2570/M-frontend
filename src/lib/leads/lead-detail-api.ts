import URLS from "@/config/urls"
import { parseJsonResponse } from "@/lib/api"
import { LEAD_DETAIL_STALE_MS } from "@/lib/leads/lead-shared-queries"

export { LEAD_DETAIL_STALE_MS }

export function leadDetailQueryKey(leadId: string) {
  return ["lead-detail", leadId] as const
}

export function leadActivityQueryKey(leadId: string) {
  return ["lead-activity", leadId] as const
}

export function leadAssociatesQueryKey(leadId: string) {
  return ["lead-associates", leadId] as const
}

export function leadMatchedProjectsQueryKey(leadId: string) {
  return ["lead-matched-projects", leadId] as const
}

export function leadDetailSnapshotQueryKey(leadId: string) {
  return ["lead-detail-snapshot", leadId] as const
}

function getAuthHeaders(): Record<string, string> {
  const storedData = localStorage.getItem("map_user")
  if (!storedData) {
    throw new Error("User not authenticated")
  }
  const userData = JSON.parse(storedData) as { access_token?: string }
  if (!userData.access_token) {
    throw new Error("Authentication token not found")
  }
  return {
    Authorization: `Bearer ${userData.access_token}`,
    "Content-Type": "application/json",
  }
}

/** Merge React Query + effect AbortSignals so Strict Mode cleanup cancels in-flight work. */
export function mergeAbortSignals(
  ...signals: Array<AbortSignal | undefined>
): AbortSignal | undefined {
  const active = signals.filter((signal): signal is AbortSignal => Boolean(signal))
  if (active.length === 0) return undefined
  if (active.length === 1) return active[0]
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any(active)
  }

  const controller = new AbortController()
  const onAbort = () => controller.abort()
  for (const signal of active) {
    if (signal.aborted) {
      controller.abort()
      return controller.signal
    }
    signal.addEventListener("abort", onAbort, { once: true })
  }
  return controller.signal
}

export async function fetchLeadDetailRaw(
  leadId: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${URLS.LEAD_DETAIL}/${leadId}`, {
    method: "GET",
    headers: getAuthHeaders(),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Lead detail request failed: ${response.status}`)
  }

  const result = await parseJsonResponse<{
    code?: number
    data?: Record<string, unknown>
    msg?: string
  }>(response)

  if (Number(result.code) !== 200 || !result.data) {
    throw new Error(result.msg || "Failed to fetch lead details")
  }

  return result.data
}

export async function fetchLeadActivityRaw(
  leadId: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const query = new URLSearchParams({
    order: "desc",
    sort: "create_date",
  })

  const response = await fetch(`${URLS.LEAD_ACTIVITY}/${leadId}?${query.toString()}`, {
    method: "GET",
    headers: getAuthHeaders(),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Activity request failed: ${response.status}`)
  }

  const result = await parseJsonResponse<{
    code?: number
    data?: unknown
    msg?: string
  }>(response)

  if (Number(result.code) !== 200 || result.data == null) {
    throw new Error(result.msg || "Failed to fetch activity data")
  }

  return result.data
}

export async function fetchLeadAssociatesRaw(
  leadId: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${URLS.LEAD_ASSOCIATES}/${leadId}`, {
    method: "GET",
    headers: getAuthHeaders(),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Lead associates request failed: ${response.status}`)
  }

  const result = await parseJsonResponse<{
    code?: number
    data?: Record<string, unknown>
    msg?: string
  }>(response)

  if (Number(result.code) !== 200 || !result.data) {
    throw new Error(result.msg || "Failed to fetch lead associates")
  }

  return result.data
}
