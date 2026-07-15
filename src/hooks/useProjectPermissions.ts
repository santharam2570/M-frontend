import { useMemo } from "react"

import { useRolePermissions } from "@/hooks/useRolePermissions"
import { useUserData } from "@/hooks/useUserData"
import { getRoleTier, getUserBranchId, hasAllBranchAccess } from "@/lib/auth"

export type ProjectViewScope = "all" | "team" | "own" | "none"

function getProjectViewScopeFromPermissions(
  permissions: Record<string, boolean> | null,
  roleTier: ReturnType<typeof getRoleTier>,
): ProjectViewScope {
  if (roleTier === "super_admin" || roleTier === "admin") return "all"
  if (permissions?.project !== true) return "none"
  if (permissions.project_view_all === true) return "all"
  if (permissions.project_view_team === true) return "team"
  if (permissions.project_view_own === true) return "own"
  // Module access without an explicit scope defaults to own records.
  return "own"
}

export function useProjectPermissions() {
  const { userData, isAuthLoading, orgId } = useUserData()
  const { permissions, isLoading: isPermissionsLoading, hasPermission } =
    useRolePermissions(userData, orgId)

  const roleTier = useMemo(() => getRoleTier(userData), [userData])
  const branchId = useMemo(() => getUserBranchId(userData), [userData])
  const canAccessAllBranches = useMemo(
    () => hasAllBranchAccess(roleTier),
    [roleTier],
  )

  const viewScope = useMemo(
    () => getProjectViewScopeFromPermissions(permissions, roleTier),
    [permissions, roleTier],
  )

  return {
    userData,
    permissions,
    roleTier,
    branchId,
    canAccessAllBranches,
    isLoading: isAuthLoading || isPermissionsLoading,
    canViewProjects: hasPermission("project"),
    canAddProject: hasPermission("add_project"),
    canEditProject: hasPermission("edit_project"),
    canDeleteProject: hasPermission("delete_project"),
    viewScope,
    hasPermission,
  }
}
