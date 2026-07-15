import { useMemo } from "react"

import { useRolePermissions } from "@/hooks/useRolePermissions"
import { useUserData } from "@/hooks/useUserData"
import { getRoleTier } from "@/lib/auth"

export type AgentViewScope = "all" | "team" | "own" | "none"

function getAgentViewScopeFromPermissions(
  permissions: Record<string, boolean> | null,
  roleTier: ReturnType<typeof getRoleTier>,
): AgentViewScope {
  if (roleTier === "super_admin" || roleTier === "admin") return "all"
  if (permissions?.agent !== true) return "none"
  if (permissions.agent_view_all === true) return "all"
  if (permissions.agent_view_team === true) return "team"
  if (permissions.agent_view_own === true) return "own"
  return "own"
}

export function useAgentPermissions() {
  const { userData, isAuthLoading, orgId } = useUserData()
  const { permissions, isLoading: isPermissionsLoading, hasPermission } =
    useRolePermissions(userData, orgId)

  const roleTier = useMemo(() => getRoleTier(userData), [userData])

  const viewScope = useMemo(
    () => getAgentViewScopeFromPermissions(permissions, roleTier),
    [permissions, roleTier]
  )

  return {
    userData,
    permissions,
    roleTier,
    isLoading: isAuthLoading || isPermissionsLoading,
    canViewAgents: hasPermission("agent"),
    canAddAgent: hasPermission("add_agent"),
    canEditAgent: hasPermission("edit_agent"),
    canDeleteAgent: hasPermission("delete_agent"),
    viewScope,
    hasPermission,
  }
}
