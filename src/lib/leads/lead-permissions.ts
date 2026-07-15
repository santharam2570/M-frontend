import {
  canPerformAction,
  getRoleTier,
  resolveAuthUserId,
  type RoleTier,
  type StoredAuthUser,
} from "@/lib/auth"
import { resolveLeadBranchId } from "@/lib/users/assignable-users"

export type LeadViewScope = "all" | "team" | "own" | "none"

export interface LeadViewScopeFilterContext {
  userId?: string
  branchId?: string
  teamUserIds?: string[]
}

export interface LeadViewScopeFilterOptions {
  identity: LeadUserIdentity
  branchId?: string
  userBranchMap?: Map<string, string>
}

export interface LeadUserIdentity {
  id?: string
  name?: string
  email?: string
}

export function hasLeadPermission(
  permissions: Record<string, boolean> | null | undefined,
  key: string,
): boolean {
  return permissions?.[key] === true
}

export function canViewLeadListFromPermissions(
  permissions: Record<string, boolean> | null | undefined,
): boolean {
  return hasLeadPermission(permissions, "lead")
}

export function canAddLeadFromPermissions(
  permissions: Record<string, boolean> | null | undefined,
): boolean {
  return hasLeadPermission(permissions, "add_lead")
}

export function canEditLeadFromPermissions(
  permissions: Record<string, boolean> | null | undefined,
): boolean {
  return hasLeadPermission(permissions, "edit_lead")
}

export function canDeleteLeadFromPermissions(
  permissions: Record<string, boolean> | null | undefined,
): boolean {
  return hasLeadPermission(permissions, "delete_lead")
}

export function canViewLeadDocumentsFromPermissions(
  permissions: Record<string, boolean> | null | undefined,
): boolean {
  return hasLeadPermission(permissions, "view_lead_documents")
}

export function canAddLeadDocumentFromPermissions(
  permissions: Record<string, boolean> | null | undefined,
): boolean {
  return hasLeadPermission(permissions, "add_lead_document")
}

export function canDeleteLeadDocumentFromPermissions(
  permissions: Record<string, boolean> | null | undefined,
): boolean {
  return hasLeadPermission(permissions, "delete_lead_document")
}

export function canDownloadLeadDocumentFromPermissions(
  permissions: Record<string, boolean> | null | undefined,
): boolean {
  return hasLeadPermission(permissions, "download_lead_document")
}

export function getLeadViewScopeFromPermissions(
  permissions: Record<string, boolean> | null | undefined,
  roleTier?: RoleTier,
): LeadViewScope {
  if (roleTier === "super_admin") return "all"

  if (!canViewLeadListFromPermissions(permissions) && roleTier !== "admin") {
    return "none"
  }

  // Admin with lead module access sees the org-wide list (still branch-scoped by API).
  if (roleTier === "admin") {
    return canViewLeadListFromPermissions(permissions) ? "all" : "none"
  }

  if (!canViewLeadListFromPermissions(permissions)) return "none"
  if (hasLeadPermission(permissions, "lead_view_all")) return "all"
  if (hasLeadPermission(permissions, "lead_view_team")) return "team"
  if (hasLeadPermission(permissions, "lead_view_own")) return "own"

  return "own"
}

export function getLeadViewScope(user: StoredAuthUser | null): LeadViewScope {
  if (!user) return "none"

  const tier = getRoleTier(user)
  if (tier === "super_admin" || tier === "admin") return "all"
  if (tier === "branch_manager") return "team"
  if (canPerformAction(user, "lead")) return "all"

  return "none"
}

export function canViewLeadList(user: StoredAuthUser | null): boolean {
  return getLeadViewScope(user) !== "none"
}

export function canAddLead(user: StoredAuthUser | null): boolean {
  return canPerformAction(user, "add_lead")
}

export function canEditLead(user: StoredAuthUser | null): boolean {
  return canPerformAction(user, "edit_lead")
}

export function canDeleteLead(user: StoredAuthUser | null): boolean {
  return canPerformAction(user, "delete_lead")
}

export function canViewLeadDocuments(user: StoredAuthUser | null): boolean {
  return canPerformAction(user, "view_lead_documents")
}

export function canAddLeadDocument(user: StoredAuthUser | null): boolean {
  return canPerformAction(user, "add_lead_document")
}

export function canDeleteLeadDocument(user: StoredAuthUser | null): boolean {
  return canPerformAction(user, "delete_lead_document")
}

export function canDownloadLeadDocument(user: StoredAuthUser | null): boolean {
  return canPerformAction(user, "download_lead_document")
}

function resolveRecordUserId(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim()
  }
  if (typeof value === "object") {
    const record = value as { _id?: unknown; id?: unknown; $oid?: unknown }
    if (record.$oid != null) return String(record.$oid).trim()
    if (record._id != null) return resolveRecordUserId(record._id)
    if (record.id != null) return String(record.id).trim()
  }
  return ""
}

function normalizeIdentityValue(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ""
}

export function getLeadAssignedToId(lead: Record<string, unknown>): string {
  const assignedTo = resolveRecordUserId(lead.assigned_to)
  if (assignedTo) return assignedTo

  const assigned = resolveRecordUserId(lead.assigned)
  if (assigned) return assigned

  return ""
}

function getLeadAssignedToName(lead: Record<string, unknown>): string {
  if (typeof lead.assigned_to_name === "string" && lead.assigned_to_name.trim()) {
    return lead.assigned_to_name.trim()
  }

  if (typeof lead.assigned_to === "object" && lead.assigned_to !== null && "name" in lead.assigned_to) {
    return String((lead.assigned_to as { name?: string }).name ?? "").trim()
  }

  if (typeof lead.assigned === "object" && lead.assigned !== null && "name" in lead.assigned) {
    return String((lead.assigned as { name?: string }).name ?? "").trim()
  }

  if (typeof lead.assigned === "string" && lead.assigned.trim()) {
    return lead.assigned.trim()
  }

  if (typeof lead.assigned_to === "string" && lead.assigned_to.trim()) {
    const value = lead.assigned_to.trim()
    if (!/^[a-f0-9]{24}$/i.test(value)) {
      return value
    }
  }

  return ""
}

export function getLeadCreateById(lead: Record<string, unknown>): string {
  const createBy = resolveRecordUserId(lead.create_by)
  if (createBy) return createBy

  const createByAlt = resolveRecordUserId(lead.createBy)
  if (createByAlt) return createByAlt

  return ""
}

export function getCurrentUserIdentity(
  user: StoredAuthUser | null,
): LeadUserIdentity {
  if (!user) return {}

  const id = resolveAuthUserId(user) || undefined
  const name =
    typeof user.result?.name === "string"
      ? user.result.name.trim()
      : typeof user.name === "string"
        ? user.name.trim()
        : undefined
  const email =
    typeof user.result?.email === "string"
      ? user.result.email.trim()
      : typeof user.email === "string"
        ? user.email.trim()
        : undefined

  return { id, name, email }
}

export function getCurrentUserIdFromAuth(
  user: StoredAuthUser | null,
): string | undefined {
  return getCurrentUserIdentity(user).id
}

export function isOwnLead(
  lead: Record<string, unknown>,
  identity: LeadUserIdentity,
): boolean {
  const userId = normalizeIdentityValue(identity.id)
  const userName = normalizeIdentityValue(identity.name)
  const userEmail = normalizeIdentityValue(identity.email)

  if (!userId && !userName && !userEmail) return false

  const assignedToId = normalizeIdentityValue(getLeadAssignedToId(lead))
  const createById = normalizeIdentityValue(getLeadCreateById(lead))
  const assignedToName = normalizeIdentityValue(getLeadAssignedToName(lead))

  if (userId && (assignedToId === userId || createById === userId)) {
    return true
  }

  if (userName && assignedToName === userName) {
    return true
  }

  if (userName && typeof lead.assigned_to === "string") {
    const assignedToRaw = normalizeIdentityValue(lead.assigned_to)
    if (assignedToRaw === userName) return true
  }

  if (userEmail && typeof lead.email === "string") {
    if (normalizeIdentityValue(lead.email) === userEmail && (assignedToId === userId || createById === userId)) {
      return true
    }
  }

  return false
}

export function isTeamLead(
  lead: Record<string, unknown>,
  branchId: string | undefined,
  userBranchMap: Map<string, string>,
): boolean {
  if (!branchId) return false

  const leadBranchId = resolveLeadBranchId(lead, userBranchMap)
  return leadBranchId === branchId
}

export function getTeamUserIdsForBranch(
  branchId: string | undefined,
  users: Array<{ id: string; branch_id?: string }>,
): string[] {
  if (!branchId) return []
  return users.filter((user) => user.branch_id === branchId).map((user) => user.id)
}

export function filterLeadsByViewScope<T extends Record<string, unknown>>(
  leads: T[],
  viewScope: LeadViewScope,
  options: LeadViewScopeFilterOptions,
): T[] {
  const { identity, branchId, userBranchMap } = options

  if (viewScope === "none") return []
  if (viewScope === "all") return leads
  if (viewScope === "own") {
    const hasIdentity = Boolean(
      identity.id?.trim() || identity.name?.trim() || identity.email?.trim(),
    )
    if (!hasIdentity) return []
    return leads.filter((lead) => isOwnLead(lead, identity))
  }
  if (viewScope === "team") {
    if (!branchId) return []
    return leads.filter((lead) => isTeamLead(lead, branchId, userBranchMap))
  }

  return leads
}

export function requiresLeadViewScopeFilter(viewScope: LeadViewScope): boolean {
  return viewScope !== "all"
}

export function buildLeadViewScopeFilters(
  viewScope: LeadViewScope,
  context: LeadViewScopeFilterContext = {},
): Array<{
  field: string
  indictor: string
  field_orgin: string
  selected_values: string[]
}> {
  const { userId, teamUserIds } = context

  if (viewScope === "own" && userId) {
    return [
      {
        field: "assigned_to",
        indictor: "is",
        field_orgin: "default",
        selected_values: [userId],
      },
    ]
  }

  if (viewScope === "team" && teamUserIds && teamUserIds.length > 0) {
    return [
      {
        field: "assigned_to",
        indictor: "is",
        field_orgin: "default",
        selected_values: teamUserIds,
      },
    ]
  }

  return []
}
