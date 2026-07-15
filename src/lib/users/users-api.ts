import URLS from "@/config/urls"
import { parseJsonResponse } from "@/lib/api"

const USERS_LIST_TTL_MS = 60_000

let cachedUsersPromise: Promise<Array<Record<string, unknown>>> | null = null
let cachedUsersToken: string | null = null
let cachedUsersTimestamp = 0
let cachedUsersData: Array<Record<string, unknown>> | null = null

function extractUsersFromApiResponse(data: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>
    if (Array.isArray(record.users)) return record.users as Array<Record<string, unknown>>
    if (Array.isArray(record.data)) return record.data as Array<Record<string, unknown>>
    if (Array.isArray(record.items)) return record.items as Array<Record<string, unknown>>
  }

  return []
}

export function invalidateUsersListCache(): void {
  cachedUsersPromise = null
  cachedUsersToken = null
  cachedUsersTimestamp = 0
  cachedUsersData = null
}

/**
 * Deduplicated usersList fetch shared across User Management and concurrent callers.
 * In-flight requests for the same token share one promise; results cache for {@link USERS_LIST_TTL_MS}.
 */
export async function fetchUsersList(
  token: string,
  options?: { force?: boolean }
): Promise<Array<Record<string, unknown>>> {
  if (!token) return []

  const now = Date.now()

  if (
    !options?.force &&
    cachedUsersData &&
    cachedUsersToken === token &&
    now - cachedUsersTimestamp < USERS_LIST_TTL_MS
  ) {
    return cachedUsersData
  }

  if (
    !options?.force &&
    cachedUsersPromise &&
    cachedUsersToken === token &&
    now - cachedUsersTimestamp < USERS_LIST_TTL_MS
  ) {
    return cachedUsersPromise
  }

  if (options?.force) {
    invalidateUsersListCache()
  }

  cachedUsersToken = token
  cachedUsersTimestamp = now

  const task = (async () => {
    try {
      const response = await fetch(URLS.USERS_LIST, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) return []

      const result = await parseJsonResponse<Record<string, unknown>>(response)
      const users = extractUsersFromApiResponse(result.data ?? result)
      cachedUsersData = users
      return users
    } catch {
      return []
    } finally {
      cachedUsersPromise = null
    }
  })()

  cachedUsersPromise = task
  return task
}
