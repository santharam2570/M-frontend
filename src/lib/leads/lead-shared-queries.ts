import URLS from "@/config/urls"
import { parseJsonResponse } from "@/lib/api"
import { getOrgIdFromAuth, type StoredAuthUser } from "@/lib/auth"
import {
  fetchAssignableUsers,
  type AssignableUser,
} from "@/lib/users/assignable-users"
import type { QueryClient } from "@tanstack/react-query"

export const LEAD_SETTINGS_QUERY_KEY = ["lead-settings-list"] as const
export const PROJECT_LIST_QUERY_KEY = ["project-list", { length: 500 }] as const
export const LEAD_DETAIL_STALE_MS = 5 * 60 * 1000

export function assignableUsersQueryKey(orgId?: number) {
  return ["assignable-users", orgId ?? "unknown"] as const
}

export type LeadSettingsListData = {
  lead_status?: Array<Record<string, unknown>>
  customer_type?: Array<Record<string, unknown>>
  customer_requirement?: Array<Record<string, unknown>>
  source?: Array<Record<string, unknown>>
  lead_source?: Array<Record<string, unknown>>
  payment_terms?: Array<Record<string, unknown>>
  payment_term?: Array<Record<string, unknown>>
  industry?: Array<Record<string, unknown>>
  application?: Array<Record<string, unknown>>
  not_qualified_reasons?: Array<Record<string, unknown>>
  not_qualified_reason?: Array<Record<string, unknown>>
  settings?: Array<Record<string, unknown>>
  [key: string]: unknown
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

let leadSettingsInFlight: Promise<LeadSettingsListData> | null = null
let leadSettingsInFlightToken: string | null = null

/**
 * Mark cached lead settings stale without an immediate network refetch.
 * Active screens keep their optimistic UI; the next navigation/open refetches.
 */
export function invalidateLeadSettingsCache(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: LEAD_SETTINGS_QUERY_KEY,
    refetchType: "none",
  })
}

export async function fetchLeadSettingsList(
  token?: string,
): Promise<LeadSettingsListData> {
  const authToken = token ?? getAuthToken()
  if (!authToken) {
    throw new Error("Authentication required")
  }

  // Deduplicate concurrent callers (settings page + leads list / filters).
  if (leadSettingsInFlight && leadSettingsInFlightToken === authToken) {
    return leadSettingsInFlight
  }

  leadSettingsInFlightToken = authToken
  leadSettingsInFlight = (async () => {
    try {
      const response = await fetch(URLS.LEAD_SETTINGS_LIST, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Lead settings request failed: ${response.status}`)
      }

      const result = await parseJsonResponse<{
        code?: number
        data?: LeadSettingsListData
        msg?: string
      }>(response)

      if (Number(result.code) !== 200 || !result.data) {
        throw new Error(result.msg || "Failed to load lead settings")
      }

      return result.data
    } finally {
      leadSettingsInFlight = null
      leadSettingsInFlightToken = null
    }
  })()

  return leadSettingsInFlight
}

export async function fetchCachedAssignableUsers(
  token?: string,
  orgId?: number,
  user?: StoredAuthUser | null,
): Promise<AssignableUser[]> {
  const authToken = token ?? getAuthToken()
  if (!authToken) {
    throw new Error("Authentication required")
  }

  const resolvedOrgId = orgId ?? getOrgIdFromAuth(user ?? null)

  return fetchAssignableUsers(authToken, resolvedOrgId, {
    usersList: URLS.USERS_LIST,
    activeUsersList: URLS.ACTIVE_USERS_LIST,
  })
}
