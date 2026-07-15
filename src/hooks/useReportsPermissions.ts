import { useRolePermissions } from "@/hooks/useRolePermissions"
import { useUserData } from "@/hooks/useUserData"

export function useReportsPermissions() {
  const { userData, isAuthLoading, orgId } = useUserData()
  const { permissions, isLoading: isPermissionsLoading, hasPermission } =
    useRolePermissions(userData, orgId)

  const isLoading = isAuthLoading || isPermissionsLoading

  return {
    userData,
    permissions,
    isLoading,
    isPermissionResolved: !isLoading,
    canViewReports: hasPermission("reports"),
    hasPermission,
  }
}
