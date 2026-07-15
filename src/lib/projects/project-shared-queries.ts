import type { QueryClient } from "@tanstack/react-query"
import {
  coerceProjectUnits,
  fetchProjectDetail,
  fetchProjectDocuments,
  fetchProjectMatchedLeads,
  fetchProjectSiteVisits,
  fetchProjectUnits,
  invalidateProjectSettingsCache,
} from "@/lib/projects/project-api"
import type { MatchedLead, Project } from "@/lib/projects/types"

export const PROJECT_SETTINGS_QUERY_KEY = ["project-settings-list"] as const
export const PROJECT_STATUS_OPTIONS_QUERY_KEY = ["project-status-options"] as const
export const UNIT_STATUS_OPTIONS_QUERY_KEY = ["unit-status-options"] as const

/**
 * Mark cached project settings stale without an immediate network refetch.
 * Clears the module-level TTL cache and soft-invalidates React Query so
 * optimistic UI stays, and the next navigation/open refetches once.
 */
export function invalidateProjectSettingsQueries(queryClient: QueryClient): Promise<void> {
  invalidateProjectSettingsCache()
  return queryClient.invalidateQueries({
    queryKey: PROJECT_SETTINGS_QUERY_KEY,
    refetchType: "none",
  })
}

export function projectDetailQueryKey(projectId: string) {
  return ["project-detail", projectId] as const
}

export function projectMatchedLeadsQueryKey(projectId: string) {
  return ["project-matched-leads", projectId] as const
}

/**
 * Load project core data in one parallel batch. Prefer dedicated endpoint
 * results when present; fall back to fields embedded on the detail payload.
 */
export async function fetchProjectDetailBundle(projectId: string): Promise<Project> {
  const [detail, units, siteVisits, documents] = await Promise.all([
    fetchProjectDetail(projectId),
    fetchProjectUnits(projectId).then(coerceProjectUnits).catch(() => [] as Project["units"]),
    fetchProjectSiteVisits(projectId).catch(() => [] as Project["site_visits"]),
    fetchProjectDocuments(projectId).catch(() => [] as Project["documents"]),
  ])

  const detailUnits = coerceProjectUnits(detail.units)

  return {
    ...detail,
    units: units.length > 0 ? units : detailUnits,
    site_visits: siteVisits.length > 0 ? siteVisits : detail.site_visits,
    documents: documents.length > 0 ? documents : detail.documents ?? [],
  }
}

export async function fetchMatchedLeadsSafe(projectId: string): Promise<MatchedLead[]> {
  try {
    return await fetchProjectMatchedLeads(projectId)
  } catch {
    return []
  }
}
