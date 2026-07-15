import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

import {
  AUTH_PERMISSIONS_UPDATED_EVENT,
  getAuthRolePermissions,
  getOrgIdFromAuth,
  getRoleTier,
  getStoredAuthUser,
  patchAuthUserRolePermissions,
  resolveAuthUserId,
  resolveRoleIdFromAuth,
  type StoredAuthUser,
} from "@/lib/auth"
import {
  fetchCurrentUserEffectivePermissions,
  getStoredRoles,
  invalidateCurrentUserEffectivePermissionsCache,
  ROLES_UPDATED_EVENT,
} from "@/lib/roles/roles-api"

function permissionsHaveEnabledValues(
  permissions: Record<string, boolean> | null | undefined
): boolean {
  if (!permissions) return false
  return Object.values(permissions).some(Boolean)
}

function permissionMapsEqual(
  left: Record<string, boolean> | null | undefined,
  right: Record<string, boolean> | null | undefined
): boolean {
  if (left === right) return true
  if (!left || !right) return false
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  for (const key of keys) {
    if (Boolean(left[key]) !== Boolean(right[key])) return false
  }
  return true
}

/**
 * Resolve the current user's effective permissions.
 * Prefer login/auth roleData (includes Active User overrides) over role cache.
 */
function getImmediateRolePermissions(
  user: StoredAuthUser | null,
  orgId: number
): Record<string, boolean> | null {
  const fromAuth = getAuthRolePermissions(user)
  if (fromAuth && Object.keys(fromAuth).length > 0) return fromAuth

  const roleId = resolveRoleIdFromAuth(user)
  const resolvedOrgId = orgId || getOrgIdFromAuth(user)

  if (roleId && resolvedOrgId) {
    const cachedRole = getStoredRoles(resolvedOrgId).find((role) => role.id === roleId)
    if (cachedRole && permissionsHaveEnabledValues(cachedRole.permissions)) {
      return cachedRole.permissions
    }
  }

  return fromAuth
}

/**
 * Start with a stable empty state on both server and client so nav/permission
 * consumers do not hydrate with different trees (localStorage is client-only).
 * Cached permissions are applied in useLayoutEffect before paint.
 */
function getInitialPermissionsState(): {
  permissions: Record<string, boolean> | null
  isLoading: boolean
} {
  return { permissions: null, isLoading: true }
}

export function useRolePermissions(
  user: StoredAuthUser | null,
  orgId: number
) {
  const [permissions, setPermissions] = useState<Record<string, boolean> | null>(
    () => getInitialPermissionsState().permissions
  )
  const [isLoading, setIsLoading] = useState(
    () => getInitialPermissionsState().isLoading
  )

  // Stabilize identity deps so roleData patches do not retrigger the fetch loop.
  const userId = resolveAuthUserId(user ?? {})
  const accessToken = user?.access_token ?? null
  const roleTier = getRoleTier(user)
  const refreshInFlightRef = useRef(false)
  const orgIdRef = useRef(orgId)
  const accessTokenRef = useRef(accessToken)

  useLayoutEffect(() => {
    orgIdRef.current = orgId
    accessTokenRef.current = accessToken
  }, [accessToken, orgId])

  const setPermissionsIfChanged = useCallback(
    (next: Record<string, boolean> | null) => {
      setPermissions((current) =>
        permissionMapsEqual(current, next) ? current : next
      )
    },
    []
  )

  const hydrateFromKnownSources = useCallback(() => {
    const cachedUser = getStoredAuthUser()
    const cached = getImmediateRolePermissions(cachedUser, orgIdRef.current)
    if (cached) {
      setPermissionsIfChanged(cached)
      setIsLoading(false)
    }
    return cached
  }, [setPermissionsIfChanged])

  useLayoutEffect(() => {
    hydrateFromKnownSources()
  }, [hydrateFromKnownSources, orgId, userId])

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) return
    refreshInFlightRef.current = true

    const cachedUser = getStoredAuthUser()
    const resolvedOrgId = orgIdRef.current || getOrgIdFromAuth(cachedUser)
    const resolvedUserId = resolveAuthUserId(cachedUser ?? {})

    if (!resolvedUserId || !resolvedOrgId) {
      const fallback = getAuthRolePermissions(cachedUser)
      setPermissionsIfChanged(fallback)
      setIsLoading(false)
      refreshInFlightRef.current = false
      return
    }

    const seed = hydrateFromKnownSources()
    if (!seed) {
      setIsLoading(true)
    }

    try {
      const perms = await fetchCurrentUserEffectivePermissions(
        accessTokenRef.current ?? cachedUser?.access_token
      )
      if (perms) {
        setPermissionsIfChanged(perms)
        // Sync storage silently — avoids userData → refresh loops.
        patchAuthUserRolePermissions(perms, { silent: true })
        return
      }

      const fallback = getImmediateRolePermissions(cachedUser, resolvedOrgId)
      if (fallback) {
        setPermissionsIfChanged(fallback)
      }
    } finally {
      setIsLoading(false)
      refreshInFlightRef.current = false
    }
  }, [hydrateFromKnownSources, setPermissionsIfChanged])

  useEffect(() => {
    void refresh()
  }, [orgId, refresh, userId])

  useEffect(() => {
    const handleRolesUpdated = () => {
      invalidateCurrentUserEffectivePermissionsCache()
      void refresh()
    }

    const handleAuthPermissionsUpdated = () => {
      hydrateFromKnownSources()
    }

    window.addEventListener(ROLES_UPDATED_EVENT, handleRolesUpdated)
    window.addEventListener(AUTH_PERMISSIONS_UPDATED_EVENT, handleAuthPermissionsUpdated)
    return () => {
      window.removeEventListener(ROLES_UPDATED_EVENT, handleRolesUpdated)
      window.removeEventListener(
        AUTH_PERMISSIONS_UPDATED_EVENT,
        handleAuthPermissionsUpdated
      )
    }
  }, [hydrateFromKnownSources, refresh])

  const hasPermission = useCallback(
    (key: string) => {
      if (roleTier === "super_admin") return true
      return permissions?.[key] === true
    },
    [permissions, roleTier]
  )

  return { permissions, isLoading, hasPermission, roleTier }
}
