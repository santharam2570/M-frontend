const BRANCHES_STORAGE_PREFIX = "map_branches_v2_"
const AUTH_STORAGE_KEY = "map_user"
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i

type StoredBranch = {
  id: string
  legacy_branch_id?: number
}

export function isMongoObjectId(value: string): boolean {
  return OBJECT_ID_PATTERN.test(value.trim())
}

function readOrgIdFromStorage(): number | undefined {
  if (typeof window === "undefined") return undefined
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as {
      result?: { org_id?: number }
      organization?: { org_id?: number }
    }
    const orgId = parsed.result?.org_id ?? parsed.organization?.org_id
    return orgId ? Number(orgId) : undefined
  } catch {
    return undefined
  }
}

function readBranchesFromStorage(orgId: number): StoredBranch[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(`${BRANCHES_STORAGE_PREFIX}${orgId}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as StoredBranch[]) : []
  } catch {
    return []
  }
}

function readLegacyBranchId(branch: StoredBranch): number | undefined {
  const legacy = branch.legacy_branch_id
  return typeof legacy === "number" && Number.isFinite(legacy) ? legacy : undefined
}

/**
 * Normalize any branch reference (ObjectId string or legacy integer branch_id)
 * to the Branch document ObjectId string used in the UI and API.
 */
export function resolveBranchObjectId(
  branchRef: unknown,
  orgId?: number,
): string | undefined {
  if (branchRef === null || branchRef === undefined || branchRef === "") {
    return undefined
  }

  if (typeof branchRef === "object") {
    const record = branchRef as Record<string, unknown>
    if ("$oid" in record) {
      const oid = String((record as { $oid?: string }).$oid ?? "").trim()
      return oid || undefined
    }
    return resolveBranchObjectId(record._id ?? record.id ?? record.branch_id, orgId)
  }

  const trimmed = String(branchRef).trim()
  if (!trimmed) return undefined
  if (isMongoObjectId(trimmed)) return trimmed

  const resolvedOrgId = orgId ?? readOrgIdFromStorage()
  if (!resolvedOrgId) return trimmed

  const branches = readBranchesFromStorage(resolvedOrgId)
  if (/^\d+$/.test(trimmed)) {
    const legacyId = Number(trimmed)
    const match = branches.find((branch) => readLegacyBranchId(branch) === legacyId)
    if (match) return match.id
  }

  const byId = branches.find((branch) => branch.id === trimmed)
  return byId?.id ?? trimmed
}
