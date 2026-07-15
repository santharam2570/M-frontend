import {
  getAllUserRoleMeta,
  getOrgIdFromAuth,
  getRoleTier,
  getUserBranchId,
  hasAllBranchAccess,
  type RoleTier,
  type StoredAuthUser,
} from "@/lib/auth"
import { resolveBranchObjectId } from "@/lib/branches/branch-id"
import { getLeadCreateById } from "@/lib/leads/lead-permissions"

export type AssignableUser = {
  id: string
  name: string
  branch_id?: string
  role_tier?: RoleTier
}

function normalizeBranchId(value: unknown, orgId?: number): string | undefined {
  if (value === null || value === undefined || value === "") return undefined

  if (typeof value === "object") {
    if ("$oid" in value) {
      const oid = (value as { $oid?: string }).$oid
      return oid ? resolveBranchObjectId(oid, orgId) : undefined
    }

    const record = value as Record<string, unknown>
    if ("_id" in record || "id" in record || "branch_id" in record) {
      return normalizeBranchId(record._id ?? record.id ?? record.branch_id, orgId)
    }
  }

  return resolveBranchObjectId(value, orgId)
}

function resolveRecordUserId(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim()

  if (typeof value === "number") return String(value)

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    if ("$oid" in record) {
      const oid = (record as { $oid?: string }).$oid
      if (oid) return String(oid)
    }
    if (record._id != null) return resolveRecordUserId(record._id)
    if (record.id != null) return resolveRecordUserId(record.id)
  }

  return ""
}

function resolveUserId(user: Record<string, unknown>): string {
  const direct = resolveRecordUserId(user._id ?? user.id ?? user.user_id)
  return direct
}

export function resolveUserBranchIdFromRecord(
  user: Record<string, unknown>,
  orgId?: number,
): string | undefined {
  const direct = normalizeBranchId(user.branch_id ?? user.branchId, orgId)
  if (direct) return direct

  if (user.branch && typeof user.branch === "object") {
    const branch = user.branch as Record<string, unknown>
    const fromBranch = normalizeBranchId(branch._id ?? branch.id ?? branch.branch_id, orgId)
    if (fromBranch) return fromBranch
  }

  const userId = resolveUserId(user)
  if (userId && orgId) {
    const fromMeta = getAllUserRoleMeta(orgId)[userId]?.branch_id
    if (fromMeta) {
      return normalizeBranchId(fromMeta, orgId)
    }
  }

  return undefined
}

function isActiveUserStatus(status: unknown): boolean {
  if (status === undefined || status === null || status === "") return true
  const normalized = String(status).trim().toLowerCase()
  return normalized === "active" || normalized === "1" || normalized === "true"
}

export function mapApiUsersToAssignableUsers(
  users: Array<Record<string, unknown>>,
  orgId?: number,
): AssignableUser[] {
  const metaMap = orgId ? getAllUserRoleMeta(orgId) : {}

  return users
    .filter((user) => isActiveUserStatus(user.status))
    .map((user) => {
      const id = resolveUserId(user)
      const name = String(user.name ?? user.user_name ?? user.full_name ?? "").trim()
      const apiTier = user.role_tier as RoleTier | undefined
      const meta = metaMap[id]

      return {
        id,
        name,
        branch_id: resolveUserBranchIdFromRecord(user, orgId),
        role_tier: apiTier ?? meta?.role_tier,
      }
    })
    .filter((user) => user.id && user.name)
}

export function buildUserBranchMap(users: AssignableUser[]): Map<string, string> {
  const map = new Map<string, string>()
  users.forEach((user) => {
    if (user.id && user.branch_id) {
      map.set(user.id, user.branch_id)
    }
  })
  return map
}

function resolveAssignedToId(lead: Record<string, unknown>): string {
  const assignedTo = resolveRecordUserId(lead.assigned_to)
  if (assignedTo) return assignedTo

  return resolveRecordUserId(lead.assigned)
}

export function resolveLeadBranchId(
  lead: Record<string, unknown>,
  userBranchMap: Map<string, string>,
  orgId?: number,
): string | undefined {
  const direct = normalizeBranchId(lead.branch_id ?? lead.branchId, orgId)
  if (direct) return direct

  if (lead.branch && typeof lead.branch === "object") {
    const fromBranch = normalizeBranchId(
      (lead.branch as Record<string, unknown>)._id ??
        (lead.branch as Record<string, unknown>).id,
      orgId,
    )
    if (fromBranch) return fromBranch
  }

  const assignedToId = resolveAssignedToId(lead)
  if (assignedToId && userBranchMap.has(assignedToId)) {
    return userBranchMap.get(assignedToId)
  }

  const createById = getLeadCreateById(lead)
  if (createById && userBranchMap.has(createById)) {
    return userBranchMap.get(createById)
  }

  return undefined
}

export function getLeadAssignmentBranchId(
  lead: Record<string, unknown>,
  userBranchMap: Map<string, string>,
  authUser: StoredAuthUser | null,
): string | undefined {
  const orgId = getOrgIdFromAuth(authUser)
  const leadBranchId = resolveLeadBranchId(lead, userBranchMap, orgId)
  if (leadBranchId) return leadBranchId

  const userBranchId = getUserBranchId(authUser)
  if (userBranchId) return userBranchId

  return undefined
}

export function filterAssignableUsersForLead(
  users: AssignableUser[],
  lead: Record<string, unknown>,
  userBranchMap: Map<string, string>,
  authUser: StoredAuthUser | null,
): AssignableUser[] {
  if (users.length === 0) return users

  const orgId = getOrgIdFromAuth(authUser)
  const currentAssigneeId = resolveAssignedToId(lead)
  const currentAssigneeName =
    typeof lead.assigned_to_name === "string"
      ? lead.assigned_to_name.trim()
      : typeof lead.assigned_to === "string" &&
          lead.assigned_to.trim() &&
          !/^[a-f0-9]{24}$/i.test(lead.assigned_to.trim())
        ? lead.assigned_to.trim()
        : ""
  const branchId = getLeadAssignmentBranchId(lead, userBranchMap, authUser)
  const normalizedBranchId = branchId
    ? resolveBranchObjectId(branchId, orgId) ?? branchId
    : undefined
  const roleTier = getRoleTier(authUser)
  const canSeeAllBranches = hasAllBranchAccess(roleTier)

  const isCurrentAssignee = (user: AssignableUser) =>
    (currentAssigneeId && user.id === currentAssigneeId) ||
    (currentAssigneeName &&
      user.name.trim().toLowerCase() === currentAssigneeName.toLowerCase())

  // API already scopes active_users_list by actor branch; skip client filter when
  // branch metadata is missing from the user payload.
  const anyUserHasBranch = users.some((user) => Boolean(user.branch_id))
  if (!anyUserHasBranch && !canSeeAllBranches) {
    return users
  }

  if (!normalizedBranchId) {
    if (canSeeAllBranches) return users
    const userBranchId = getUserBranchId(authUser)
    if (!userBranchId) return users
    return users.filter(
      (user) =>
        isCurrentAssignee(user) ||
        user.branch_id === userBranchId ||
        hasAllBranchAccess(user.role_tier),
    )
  }

  return users.filter((user) => {
    if (isCurrentAssignee(user)) return true
    const userBranch = user.branch_id
      ? resolveBranchObjectId(user.branch_id, orgId) ?? user.branch_id
      : undefined
    if (userBranch === normalizedBranchId) return true
    if (canSeeAllBranches && hasAllBranchAccess(user.role_tier) && !userBranch) {
      return true
    }
    return false
  })
}

export function mapAssignableUsersToDropdownOptions(
  users: AssignableUser[],
  color = "#003399",
): Array<{ value: string; label: string; color: string }> {
  return users
    .map((user) => ({
      value: user.id,
      label: user.name,
      color,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

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

export async function fetchAssignableUsers(
  token: string,
  orgId?: number,
  endpoints: { usersList: string; activeUsersList: string },
): Promise<AssignableUser[]> {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }

  const fetchFromEndpoint = async (endpoint: string): Promise<AssignableUser[]> => {
    const response = await fetch(endpoint, { method: "GET", headers })
    if (!response.ok) return []

    const result = await response.json()
    const users = extractUsersFromApiResponse(result)
    return mapApiUsersToAssignableUsers(users, orgId)
  }

  const results = await Promise.allSettled([
    fetchFromEndpoint(endpoints.activeUsersList),
    fetchFromEndpoint(endpoints.usersList),
  ])

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.length > 0) {
      return result.value
    }
  }

  return []
}
