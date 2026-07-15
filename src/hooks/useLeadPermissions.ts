import { useMemo } from "react"

import { useRolePermissions } from "@/hooks/useRolePermissions"
import { useUserData } from "@/hooks/useUserData"
import { getRoleTier, getUserBranchId, hasAllBranchAccess } from "@/lib/auth"
import { getLeadViewScopeFromPermissions } from "@/lib/leads/lead-permissions"

export function useLeadPermissions() {
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
    () => getLeadViewScopeFromPermissions(permissions, roleTier),
    [permissions, roleTier],
  )

  return {
    userData,
    permissions,
    roleTier,
    branchId,
    canAccessAllBranches,
    isLoading: isAuthLoading || isPermissionsLoading,
    canViewLeads: hasPermission("lead"),
    canAddLead: hasPermission("add_lead"),
    canEditLead: hasPermission("edit_lead"),
    canDeleteLead: hasPermission("delete_lead"),
    canViewLeadDocuments: hasPermission("view_lead_documents"),
    canAddLeadDocument: hasPermission("add_lead_document"),
    canDeleteLeadDocument: hasPermission("delete_lead_document"),
    canDownloadLeadDocument: hasPermission("download_lead_document"),
    canExportLead: hasPermission("export_lead"),
    viewScope,
    hasPermission,
  }
}
