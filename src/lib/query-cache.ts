/** localStorage key used by the React Query sync persister */
export const QUERY_CACHE_STORAGE_KEY = "map_query_cache"

/** Remove persisted React Query cache (call on logout). */
export function clearPersistedQueryCache(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(QUERY_CACHE_STORAGE_KEY)
  } catch {
    /* ignore storage errors */
  }
}
