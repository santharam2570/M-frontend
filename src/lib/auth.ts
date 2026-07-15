"use client";

import URLS from "@/config/urls";
import { parseJsonResponse } from "@/lib/api";
import { clearPersistedQueryCache } from "@/lib/query-cache";
import { resolveBranchObjectId } from "@/lib/branches/branch-id";

export interface Organization {
  id?: string;
  org_id?: number;
  organization_name?: string;
  email?: string;
  two_step?: string;
  [key: string]: unknown;
}

export type RoleTier =
  | "super_admin"
  | "admin"
  | "branch_manager"
  | "branch_user";

export interface Branch {
  id: string;
  org_id: number;
  name: string;
  code: string;
  status: "active" | "inactive";
  manager_user_id?: string;
  /** Legacy numeric branch_id from the Branch collection (not the document _id). */
  legacy_branch_id?: number;
}

export interface UserRoleMeta {
  role_tier: RoleTier;
  branch_id?: string;
}

export interface RoleData {
  id?: string;
  org_id?: number;
  role_name?: string;
  role_tier?: RoleTier;
  [key: string]: unknown;
}

export interface AuthUserResult {
  id?: string;
  email?: string;
  name?: string;
  org_id?: number;
  status?: string;
  role_tier?: RoleTier;
  branch_id?: string;
  [key: string]: unknown;
}

export interface LoginResponseData {
  result?: AuthUserResult;
  access_token?: string;
  refresh_token?: string;
  roleData?: RoleData;
  organization?: Organization;
  planData?: Record<string, unknown>;
  rename?: unknown[];
}

export interface SignupResponseData {
  user?: string | number;
  access_token?: string;
  refresh_token?: string;
  organization?: Organization;
  roleData?: RoleData;
}

export interface SignupParams {
  email: string;
  planId?: string | null;
  trial?: string | null;
  partnerId?: string | null;
  coupon?: string | null;
}

export interface ApiEnvelope<T> {
  data?: T;
  code?: number;
  msg?: string;
}

export interface StoredAuthUser extends LoginResponseData {
  access_token: string;
}

export interface PendingAuth {
  email: string;
  userId: string;
  loginData: LoginResponseData;
  flow: "signup" | "login";
}

export class AuthApiError extends Error {
  code: number;

  constructor(message: string, code: number) {
    super(message);
    this.name = "AuthApiError";
    this.code = code;
  }
}

const AUTH_STORAGE_KEY = "map_user";
const PENDING_AUTH_KEY = "map_auth_pending";
const BRANCHES_STORAGE_PREFIX = "map_branches_v2_";
const USER_META_STORAGE_PREFIX = "map_user_meta_";
const ACTIVE_BRANCH_KEY = "map_active_branch";

export const AUTH_USER_STORAGE_KEY = AUTH_STORAGE_KEY;

export const ROLE_TIER_LABELS: Record<RoleTier, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  branch_manager: "Branch Manager",
  branch_user: "Branch User",
};

/** Who each tier is allowed to create or manage */
export const ASSIGNABLE_TIERS: Record<RoleTier, RoleTier[]> = {
  super_admin: ["admin", "branch_manager", "branch_user"],
  admin: ["branch_manager", "branch_user"],
  branch_manager: ["branch_user"],
  branch_user: [],
};

const TIER_RANK: Record<RoleTier, number> = {
  super_admin: 4,
  admin: 3,
  branch_manager: 2,
  branch_user: 1,
};

function branchesKey(orgId: number): string {
  return `${BRANCHES_STORAGE_PREFIX}${orgId}`;
}

function userMetaKey(orgId: number): string {
  return `${USER_META_STORAGE_PREFIX}${orgId}`;
}

export function getOrgIdFromAuth(user: StoredAuthUser | LoginResponseData | null): number {
  const fromResult = user?.result?.org_id;
  if (fromResult) return Number(fromResult);

  const fromOrganization = user?.organization?.org_id;
  if (fromOrganization) return Number(fromOrganization);

  const fromRole = user?.roleData?.org_id;
  if (fromRole) return Number(fromRole);

  const fromOrganizationId = user?.organization?.id;
  if (fromOrganizationId) {
    const parsed = Number(fromOrganizationId);
    if (parsed) return parsed;
  }

  return 0;
}

export function getRoleTier(user: StoredAuthUser | LoginResponseData | null): RoleTier {
  const fromUser = user?.result?.role_tier;
  if (fromUser) return fromUser;

  const fromRoleData = user?.roleData?.role_tier;
  if (fromRoleData) return fromRoleData;

  const userId = resolveAuthUserId(user ?? {});
  const orgId = getOrgIdFromAuth(user);
  if (userId && orgId) {
    const meta = getUserRoleMeta(orgId, userId);
    if (meta?.role_tier) return meta.role_tier;
  }

  const roleName = String(user?.roleData?.role_name ?? "").toLowerCase();
  if (roleName.includes("super")) return "super_admin";
  if (roleName.includes("admin")) return "admin";
  if (roleName.includes("manager")) return "branch_manager";
  return "branch_user";
}

export function getUserBranchId(user: StoredAuthUser | LoginResponseData | null): string | undefined {
  const orgId = getOrgIdFromAuth(user);
  const fromUser = user?.result?.branch_id;
  if (fromUser) {
    return resolveBranchObjectId(fromUser, orgId) ?? String(fromUser);
  }

  const userId = resolveAuthUserId(user ?? {});
  if (userId && orgId) {
    const fromMeta = getUserRoleMeta(orgId, userId)?.branch_id;
    if (fromMeta) {
      return resolveBranchObjectId(fromMeta, orgId) ?? fromMeta;
    }
  }
  return undefined;
}

export function hasAllBranchAccess(tier: RoleTier): boolean {
  return tier === "super_admin" || tier === "admin";
}

export function getAccessibleBranchIds(
  user: StoredAuthUser | LoginResponseData | null
): string[] | "all" {
  const tier = getRoleTier(user);
  // Org-wide roles can select any branch even when a home branch_id is set.
  if (hasAllBranchAccess(tier)) return "all";

  const branchId = getUserBranchId(user);
  return branchId ? [branchId] : [];
}

export function filterBranchesForUser<T extends { id: string }>(
  branches: T[],
  user: StoredAuthUser | LoginResponseData | null,
): T[] {
  const access = getAccessibleBranchIds(user);
  if (access === "all") return branches;

  const scoped = branches.filter((branch) => access.includes(branch.id));
  return scoped;
}

export function canAccessBranch(
  user: StoredAuthUser | LoginResponseData | null,
  branchId: string
): boolean {
  const access = getAccessibleBranchIds(user);
  return access === "all" || access.includes(branchId);
}

export function getUserRoleMeta(orgId: number, userId: string): UserRoleMeta | null {
  if (typeof window === "undefined" || !orgId || !userId) return null;
  try {
    const raw = localStorage.getItem(userMetaKey(orgId));
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, UserRoleMeta>;
    return map[userId] ?? null;
  } catch {
    return null;
  }
}

export function setUserRoleMeta(
  orgId: number,
  userId: string,
  meta: UserRoleMeta
): void {
  if (typeof window === "undefined" || !orgId || !userId) return;
  try {
    const key = userMetaKey(orgId);
    const raw = localStorage.getItem(key);
    const map: Record<string, UserRoleMeta> = raw ? JSON.parse(raw) : {};
    map[userId] = meta;
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* ignore storage errors */
  }
}

export function getAllUserRoleMeta(orgId: number): Record<string, UserRoleMeta> {
  if (typeof window === "undefined" || !orgId) return {};
  try {
    const raw = localStorage.getItem(userMetaKey(orgId));
    return raw ? (JSON.parse(raw) as Record<string, UserRoleMeta>) : {};
  } catch {
    return {};
  }
}

export function getStoredBranches(orgId: number): Branch[] {
  if (typeof window === "undefined" || !orgId) return [];
  try {
    const raw = localStorage.getItem(branchesKey(orgId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Branch[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBranches(orgId: number, branches: Branch[]): void {
  if (typeof window === "undefined" || !orgId) return;
  localStorage.setItem(branchesKey(orgId), JSON.stringify(branches));
}

export function getBranchById(orgId: number, branchId: string): Branch | undefined {
  return getStoredBranches(orgId).find((b) => b.id === branchId);
}

export const BRANCHES_UPDATED_EVENT = "map-branches-updated";

let cachedBranchesPromise: Promise<Branch[]> | null = null;
let cachedBranchesOrgId: string | null = null;
let cachedBranchesTimestamp = 0;
const BRANCHES_CACHE_TTL_MS = 60_000;

type BranchRawRecord = Record<string, unknown>;

export class BranchApiError extends Error {
  code: number;

  constructor(message: string, code = 500) {
    super(message);
    this.name = "BranchApiError";
    this.code = code;
  }
}

function getBranchAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const userData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "{}");
    return userData.access_token ?? null;
  } catch {
    return null;
  }
}

function branchAuthHeaders(token?: string): HeadersInit {
  const resolved = token ?? getBranchAuthToken();
  if (!resolved) {
    throw new BranchApiError("You are not logged in. Please sign in again.", 401);
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${resolved}`,
  };
}

function normalizeBranchStatus(value: unknown): Branch["status"] {
  if (value === "inactive" || value === 0 || value === "0" || value === false) {
    return "inactive";
  }
  return "active";
}

function resolveBranchId(raw: BranchRawRecord): string {
  const id = raw.id ?? raw._id;
  if (id && typeof id === "object" && "$oid" in (id as object)) {
    return String((id as { $oid?: string }).$oid ?? "");
  }
  if (id != null && String(id).trim()) {
    return String(id).trim();
  }
  return "";
}

function readLegacyBranchId(raw: BranchRawRecord): number | undefined {
  const value = raw.branch_id;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return undefined;
}

function normalizeBranch(raw: BranchRawRecord, orgId: number): Branch | null {
  const id = resolveBranchId(raw);
  const name = String(raw.name ?? raw.branch_name ?? raw.branch ?? "").trim();
  if (!id || !name) return null;

  const code = String(raw.code ?? raw.branch_code ?? name.slice(0, 3))
    .trim()
    .toUpperCase();

  const legacyBranchId = readLegacyBranchId(raw);

  return {
    id,
    org_id: Number(raw.org_id ?? orgId),
    name,
    code,
    status: normalizeBranchStatus(raw.status),
    manager_user_id: raw.manager_user_id ? String(raw.manager_user_id) : undefined,
    ...(legacyBranchId != null ? { legacy_branch_id: legacyBranchId } : {}),
  };
}

function extractBranchList(payload: unknown): BranchRawRecord[] {
  if (Array.isArray(payload)) {
    return payload as BranchRawRecord[];
  }

  if (payload && typeof payload === "object") {
    const record = payload as BranchRawRecord;
    if (Array.isArray(record.data)) return record.data as BranchRawRecord[];
    if (Array.isArray(record.branches)) return record.branches as BranchRawRecord[];
    if (Array.isArray(record.items)) return record.items as BranchRawRecord[];
    if (Array.isArray(record.branch_list)) return record.branch_list as BranchRawRecord[];
    if (Array.isArray(record.result)) return record.result as BranchRawRecord[];

    const nested = record.data;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return extractBranchList(nested);
    }
  }

  return [];
}

function notifyBranchesUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(BRANCHES_UPDATED_EVENT));
  }
}

function invalidateBranchesMemoryCache(): void {
  cachedBranchesPromise = null;
  cachedBranchesOrgId = null;
  cachedBranchesTimestamp = 0;
}

function syncBranchesCache(orgId: number, branches: Branch[], notify = false): Branch[] {
  saveBranches(orgId, branches);
  // Mutations must not leave an in-memory promise serving pre-mutation data.
  invalidateBranchesMemoryCache();
  if (notify) notifyBranchesUpdated();
  return branches;
}

async function readBranchResponse<T>(response: Response): Promise<T> {
  const payload = await parseJsonResponse<ApiEnvelope<T>>(response);

  if (!response.ok || (payload.code !== undefined && payload.code !== 200)) {
    throw new BranchApiError(
      payload.msg || "Branch request failed.",
      payload.code ?? response.status
    );
  }

  return payload.data as T;
}

async function fetchBranchesUncached(
  orgId: number,
  token?: string,
  options?: { all?: boolean }
): Promise<Branch[]> {
  const resolvedToken = token ?? getBranchAuthToken();
  if (!resolvedToken) {
    return [];
  }

  try {
    const url = options?.all
      ? `${URLS.BRANCH_LIST}?all=1`
      : URLS.BRANCH_LIST;
    const response = await fetch(url, {
      method: "GET",
      headers: branchAuthHeaders(resolvedToken),
    });

    if (!response.ok) {
      return [];
    }

    const payload = await parseJsonResponse<{ code?: number; data?: unknown; msg?: string }>(
      response
    );

    if (payload.code !== undefined && payload.code !== 200) {
      return [];
    }

    const rawList = Array.isArray(payload)
      ? extractBranchList(payload)
      : extractBranchList(payload.data ?? payload);

    const resolvedOrgId =
      orgId || getOrgIdFromAuth(getStoredAuthUser()) || Number(rawList[0]?.org_id ?? 0);

    const branches = rawList
      .map((item) => normalizeBranch(item, resolvedOrgId))
      .filter((branch): branch is Branch => branch !== null);

    const cacheOrgId = resolvedOrgId || branches[0]?.org_id;
    if (cacheOrgId) {
      saveBranches(cacheOrgId, branches);
    }

    return branches;
  } catch {
    return [];
  }
}

export async function fetchBranches(
  orgId: number,
  token?: string,
  options?: { force?: boolean; all?: boolean }
): Promise<Branch[]> {
  const baseOrgId = orgId || getOrgIdFromAuth(getStoredAuthUser());
  const now = Date.now();
  const scopedKey = String(baseOrgId);
  const allKey = `${baseOrgId}:all`;
  const cacheKey = options?.all ? allKey : scopedKey;

  if (!options?.force && cachedBranchesPromise && now - cachedBranchesTimestamp < BRANCHES_CACHE_TTL_MS) {
    // Exact cache hit.
    if (cachedBranchesOrgId === cacheKey) {
      return cachedBranchesPromise;
    }
    // A full (?all=1) catalog satisfies scoped requests.
    if (!options?.all && cachedBranchesOrgId === allKey) {
      return cachedBranchesPromise;
    }
  }

  if (options?.force) {
    cachedBranchesPromise = null;
    cachedBranchesOrgId = null;
    cachedBranchesTimestamp = 0;
  }

  cachedBranchesTimestamp = now;
  cachedBranchesOrgId = cacheKey;
  cachedBranchesPromise = fetchBranchesUncached(baseOrgId, token, {
    all: options?.all,
  }).catch((error) => {
    cachedBranchesPromise = null;
    cachedBranchesOrgId = null;
    cachedBranchesTimestamp = 0;
    throw error;
  });

  return cachedBranchesPromise;
}

export interface CreateBranchInput {
  name: string;
  code: string;
  org_id: number;
}

export async function createBranch(
  input: CreateBranchInput,
  token?: string
): Promise<Branch> {
  const branchCode = input.code.trim().toUpperCase();
  const fallbackId = `branch_${branchCode.toLowerCase()}_${Date.now()}`;
  const fallback: Branch = {
    id: fallbackId,
    org_id: input.org_id,
    name: input.name.trim(),
    code: branchCode,
    status: "active",
  };

  const resolvedToken = token ?? getBranchAuthToken();
  if (!resolvedToken) {
    const existing = getStoredBranches(input.org_id);
    const next = [...existing, fallback];
    syncBranchesCache(input.org_id, next, true);
    return fallback;
  }

  try {
    const response = await fetch(URLS.ADD_BRANCH, {
      method: "POST",
      headers: branchAuthHeaders(resolvedToken),
      body: JSON.stringify({
        name: input.name.trim(),
        code: branchCode,
        org_id: input.org_id,
      }),
    });

    const data = await readBranchResponse<BranchRawRecord | BranchRawRecord[]>(response);
    const raw = Array.isArray(data) ? data[0] : data;
    const created = raw ? normalizeBranch(raw, input.org_id) : null;

    if (created) {
      const existing = getStoredBranches(input.org_id);
      syncBranchesCache(input.org_id, [...existing, created], true);
      return created;
    }
  } catch {
    // Fall through to local storage.
  }

  const existing = getStoredBranches(input.org_id);
  const next = [...existing, fallback];
  syncBranchesCache(input.org_id, next, true);
  return fallback;
}

export interface UpdateBranchInput {
  id: string;
  name: string;
  code: string;
  org_id: number;
}

export async function updateBranch(
  input: UpdateBranchInput,
  token?: string
): Promise<Branch> {
  const branchCode = input.code.trim().toUpperCase();
  const updated: Branch = {
    id: input.id,
    org_id: input.org_id,
    name: input.name.trim(),
    code: branchCode,
    status: "active",
  };

  const resolvedToken = token ?? getBranchAuthToken();
  if (!resolvedToken) {
    const existing = getStoredBranches(input.org_id);
    const next = existing.map((b) => (b.id === input.id ? { ...b, ...updated } : b));
    syncBranchesCache(input.org_id, next, true);
    return next.find((b) => b.id === input.id) ?? updated;
  }

  try {
    const response = await fetch(`${URLS.BRANCH_UPDATE}/${input.id}`, {
      method: "PUT",
      headers: branchAuthHeaders(resolvedToken),
      body: JSON.stringify({
        name: input.name.trim(),
        code: branchCode,
        org_id: input.org_id,
      }),
    });

    const data = await readBranchResponse<BranchRawRecord>(response);
    const fromApi = data ? normalizeBranch(data, input.org_id) : null;
    const result = fromApi ?? updated;

    const existing = getStoredBranches(input.org_id);
    const next = existing.map((b) => (b.id === input.id ? { ...b, ...result } : b));
    syncBranchesCache(input.org_id, next, true);
    return next.find((b) => b.id === input.id) ?? result;
  } catch {
    const existing = getStoredBranches(input.org_id);
    const next = existing.map((b) =>
      b.id === input.id ? { ...b, name: updated.name, code: updated.code } : b
    );
    syncBranchesCache(input.org_id, next, true);
    return next.find((b) => b.id === input.id) ?? updated;
  }
}

export async function toggleBranchStatus(
  branch: Branch,
  token?: string
): Promise<Branch> {
  const newStatus: Branch["status"] =
    branch.status === "active" ? "inactive" : "active";

  const resolvedToken = token ?? getBranchAuthToken();
  if (!resolvedToken) {
    const existing = getStoredBranches(branch.org_id);
    const next = existing.map((b) =>
      b.id === branch.id ? { ...b, status: newStatus } : b
    );
    syncBranchesCache(branch.org_id, next, true);
    return { ...branch, status: newStatus };
  }

  try {
    const response = await fetch(`${URLS.BRANCH_DELETE}/${branch.id}`, {
      method: "PUT",
      headers: branchAuthHeaders(resolvedToken),
      body: JSON.stringify({ status: newStatus }),
    });

    await readBranchResponse<unknown>(response);
  } catch {
    // Fall through to local update.
  }

  const existing = getStoredBranches(branch.org_id);
  const next = existing.map((b) =>
    b.id === branch.id ? { ...b, status: newStatus } : b
  );
  syncBranchesCache(branch.org_id, next, true);
  return { ...branch, status: newStatus };
}

export function getActiveBranchFilter(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_BRANCH_KEY);
}

export function setActiveBranchFilter(branchId: string | null): void {
  if (typeof window === "undefined") return;
  if (branchId) {
    localStorage.setItem(ACTIVE_BRANCH_KEY, branchId);
  } else {
    localStorage.removeItem(ACTIVE_BRANCH_KEY);
  }
}

const ROLE_DATA_RESERVED_FIELDS = new Set([
  "_id",
  "id",
  "role_id",
  "role_name",
  "name",
  "org_id",
  "is_system",
  "is_system_role",
  "create_by",
  "create_date",
  "created_at",
  "updated_at",
  "permissions",
]);

function toRolePermissionBoolean(value: unknown): boolean | null {
  if (typeof value === "number") return value === 1;
  if (typeof value === "boolean") return value;
  if (value === "1" || value === "0") return value === "1";
  return null;
}

export function resolveMongoId(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (typeof value === "object") {
    const record = value as { $oid?: unknown; _id?: unknown; id?: unknown };
    if (record.$oid != null) return String(record.$oid).trim();
    if (record._id != null) return resolveMongoId(record._id);
    if (record.id != null) return String(record.id).trim();
  }
  return "";
}

export function resolveRoleIdFromAuth(
  user: StoredAuthUser | LoginResponseData | null
): string {
  if (!user) return "";

  const roleData = user.roleData;
  if (roleData) {
    const fromRoleData =
      resolveMongoId(roleData.id) ||
      resolveMongoId(roleData._id) ||
      resolveMongoId(roleData.role_id);
    if (fromRoleData) return fromRoleData;
  }

  const result = user.result;
  if (result) {
    const fromResult =
      resolveMongoId(result.role) || resolveMongoId(result.role_id);
    if (fromResult) return fromResult;
  }

  return "";
}

export function getPermissionsFromRoleData(
  roleData: RoleData | undefined
): Record<string, boolean> {
  if (!roleData) return {};
  const permissions: Record<string, boolean> = {};
  Object.entries(roleData).forEach(([key, value]) => {
    if (ROLE_DATA_RESERVED_FIELDS.has(key)) return;

    const parsed = toRolePermissionBoolean(value);
    if (parsed !== null) {
      permissions[key] = parsed;
    }
  });

  const nested = roleData.permissions;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    Object.entries(nested as Record<string, unknown>).forEach(([key, value]) => {
      const parsed = toRolePermissionBoolean(value);
      if (parsed !== null) {
        permissions[key] = parsed;
      }
    });
  }

  return permissions;
}

export function getAuthRolePermissions(
  user: StoredAuthUser | LoginResponseData | null
): Record<string, boolean> | null {
  if (!user?.roleData) return null;

  // Always return the parsed map when roleData exists — including all-false
  // maps from user overrides that intentionally revoke role defaults.
  return getPermissionsFromRoleData(user.roleData);
}

export const AUTH_PERMISSIONS_UPDATED_EVENT = "map-auth-permissions-updated";

function permissionMapsEqual(
  left: Record<string, boolean>,
  right: Record<string, boolean>
): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if (Boolean(left[key]) !== Boolean(right[key])) return false;
  }
  return true;
}

export function patchAuthUserRolePermissions(
  permissions: Record<string, boolean>,
  options?: { silent?: boolean }
): StoredAuthUser | null {
  const stored = getStoredAuthUser();
  if (!stored) return null;

  const currentPermissions = getPermissionsFromRoleData(stored.roleData);
  if (permissionMapsEqual(currentPermissions, permissions)) {
    return stored;
  }

  const nextRoleData: RoleData = {
    ...(stored.roleData ?? {}),
    ...Object.fromEntries(
      Object.entries(permissions).map(([key, enabled]) => [key, enabled ? 1 : 0])
    ),
  };

  const next: StoredAuthUser = {
    ...stored,
    roleData: nextRoleData,
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
  if (!options?.silent && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_PERMISSIONS_UPDATED_EVENT));
  }
  return next;
}

export function canPerformAction(
  user: StoredAuthUser | null,
  permissionKey: string
): boolean {
  if (!user) return false;
  const tier = getRoleTier(user);
  if (tier === "super_admin") return true;

  const perms = getPermissionsFromRoleData(user.roleData);
  return perms[permissionKey] === true;
}

export function canViewUserInManagement(
  actor: StoredAuthUser | null,
  target: { id: string; role_tier?: RoleTier; branch_id?: string }
): boolean {
  if (!actor) return false;

  const actorTier = getRoleTier(actor);
  const targetBranchId =
    target.branch_id != null && target.branch_id !== ""
      ? String(target.branch_id)
      : undefined;

  if (actorTier === "super_admin" || actorTier === "admin") {
    return true;
  }

  if (actorTier === "branch_manager") {
    const actorBranch = getUserBranchId(actor);
    // Branch managers must not browse org-wide Admin/Super Admin accounts.
    if (hasAllBranchAccess(target.role_tier ?? "branch_user")) return false;
    if (!actorBranch) return false;
    return Boolean(targetBranchId && actorBranch === targetBranchId);
  }

  if (actorTier === "branch_user") {
    const actorBranch = getUserBranchId(actor);
    if (!actorBranch) return target.id === resolveAuthUserId(actor);
    return actorBranch === targetBranchId;
  }

  return false;
}

export function canManageTargetUser(
  actor: StoredAuthUser | null,
  target: { id: string; role_tier?: RoleTier; branch_id?: string }
): boolean {
  if (!actor) return false;
  const actorTier = getRoleTier(actor);
  const targetTier = target.role_tier ?? "branch_user";
  const actorId = resolveAuthUserId(actor);

  if (target.id === actorId) return true;

  if (actorTier === "branch_user") return false;
  if (actorTier === "super_admin") return targetTier !== "super_admin";
  if (TIER_RANK[actorTier] <= TIER_RANK[targetTier]) return false;

  if (actorTier === "branch_manager") {
    const actorBranch = getUserBranchId(actor);
    return actorBranch != null && actorBranch === target.branch_id;
  }

  return true;
}

/** Super Admin tier users keep backend role/tier values locked in user management. */
export function isSuperAdminUser(user: { role_tier?: RoleTier }): boolean {
  return user.role_tier === "super_admin";
}

export function canAssignRoleTier(actor: StoredAuthUser | null, tier: RoleTier): boolean {
  if (!actor) return false;
  return getAssignableTiers(actor).includes(tier);
}

/** Role tiers the actor may assign when creating or editing users */
export function getAssignableTiers(user: StoredAuthUser | null): RoleTier[] {
  if (!user) return [];

  const fromTier = ASSIGNABLE_TIERS[getRoleTier(user)] ?? [];
  if (fromTier.length > 0) return fromTier;

  const perms = getPermissionsFromRoleData(user.roleData);
  if (perms.manage_settings) return ASSIGNABLE_TIERS.admin;
  if (perms.manage_admins) return ["admin", "branch_manager", "branch_user"];
  if (perms.manage_branch_managers) return ["branch_manager", "branch_user"];
  if (perms.manage_branch_users) return ["branch_user"];

  return [];
}

/** Include the user's current tier when editing so unchanged tiers remain selectable */
export function getEditableTiers(
  actor: StoredAuthUser | null,
  currentTier?: RoleTier
): RoleTier[] {
  const assignable = getAssignableTiers(actor);
  if (currentTier && !assignable.includes(currentTier)) {
    return [currentTier, ...assignable];
  }
  return assignable;
}

export function canCreateUsers(user: StoredAuthUser | null): boolean {
  return getAssignableTiers(user).length > 0;
}

export function canManageBranches(user: StoredAuthUser | null): boolean {
  if (!user) return false;
  const tier = getRoleTier(user);
  if (tier === "super_admin" || tier === "admin") return true;

  const perms = getPermissionsFromRoleData(user.roleData);
  return perms.manage_branches === true || perms.manage_settings === true;
}

export function canManageRoles(user: StoredAuthUser | null): boolean {
  if (!user) return false;
  const tier = getRoleTier(user);
  if (tier === "super_admin" || tier === "admin") return true;

  const perms = getPermissionsFromRoleData(user.roleData);
  return perms.manage_roles === true;
}

export function canManageUsers(user: StoredAuthUser | null): boolean {
  if (!user) return false;
  const tier = getRoleTier(user);
  if (tier === "super_admin" || tier === "admin" || tier === "branch_manager") {
    return true;
  }

  const perms = getPermissionsFromRoleData(user.roleData);
  return perms.manage_users === true;
}

export function canAccessSettings(user: StoredAuthUser | null): boolean {
  if (!user) return false;
  const tier = getRoleTier(user);
  if (tier === "super_admin") return true;

  const perms = getPermissionsFromRoleData(user.roleData);
  return (
    perms.settings === true ||
    perms.manage_settings === true ||
    perms.manage_users === true ||
    perms.manage_roles === true ||
    perms.manage_branches === true ||
    perms.manage_lead_settings === true
  );
}

export function ensureDefaultUserMeta(user: StoredAuthUser): StoredAuthUser {
  const orgId = getOrgIdFromAuth(user);
  const userId = resolveAuthUserId(user);
  if (!orgId || !userId) return user;

  const existing = getUserRoleMeta(orgId, userId);
  const roleTier =
    user.result?.role_tier ??
    user.roleData?.role_tier ??
    existing?.role_tier ??
    getRoleTier(user);
  const branchIdRaw = user.result?.branch_id ?? existing?.branch_id;
  const branchId = branchIdRaw
    ? resolveBranchObjectId(branchIdRaw, orgId) ?? String(branchIdRaw)
    : undefined;

  const meta: UserRoleMeta = {
    role_tier: roleTier,
    ...(branchId ? { branch_id: branchId } : {}),
  };

  if (
    !existing ||
    existing.role_tier !== meta.role_tier ||
    existing.branch_id !== meta.branch_id
  ) {
    setUserRoleMeta(orgId, userId, meta);
  }

  return {
    ...user,
    result: {
      ...user.result,
      role_tier: roleTier,
      ...(branchId ? { branch_id: branchId } : {}),
    },
  };
}

async function readAuthResponse<T>(response: Response): Promise<T> {
  let payload: ApiEnvelope<T>;

  try {
    payload = await parseJsonResponse<ApiEnvelope<T>>(response);
  } catch {
    throw new AuthApiError("Invalid response from server.", response.status);
  }

  if (payload.code !== 200) {
    throw new AuthApiError(
      payload.msg || "Request failed. Please try again.",
      payload.code ?? response.status
    );
  }

  if (!payload.data) {
    throw new AuthApiError("Missing response data from server.", 500);
  }

  return payload.data;
}

export async function authPost<T>(
  url: string,
  body: Record<string, unknown>
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")

    throw new AuthApiError(
      isTimeout
        ? "The server took too long to respond. Please try again."
        : "Unable to reach the server. Please check your connection.",
      0
    );
  }

  return readAuthResponse<T>(response);
}

export async function login(
  email: string,
  password: string
): Promise<LoginResponseData> {
  return authPost<LoginResponseData>(URLS.LOGIN, {
    email: email.trim(),
    password,
  });
}

function formatPlanDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function resolveSignupPlanDates(trial?: string | null) {
  const planStartDate = new Date();
  const planEndDate = new Date(planStartDate);
  const isTrial =
    trial == null ||
    trial === "" ||
    trial.toLowerCase() === "yes" ||
    trial === "1" ||
    trial.toLowerCase() === "true";

  planEndDate.setDate(planEndDate.getDate() + (isTrial ? 14 : 365));

  return {
    plan_start_date: formatPlanDate(planStartDate),
    plan_end_date: formatPlanDate(planEndDate),
  };
}

export async function signup(params: SignupParams): Promise<SignupResponseData> {
  const planDates = resolveSignupPlanDates(params.trial);

  const body: Record<string, unknown> = {
    email: params.email.trim(),
    plan_id: params.planId ?? "",
    trial: params.trial ?? "Yes",
    partner_id: params.partnerId ?? "",
    ...planDates,
  };

  if (params.coupon) {
    body.coupon = params.coupon;
  }

  return authPost<SignupResponseData>(URLS.SIGNUP, body);
}

export function resolveSignupUserId(data: SignupResponseData): string {
  const userId = data.user;
  return userId != null ? String(userId) : "";
}

async function readAuthResponseOptionalData<T>(
  response: Response
): Promise<T | undefined> {
  let payload: ApiEnvelope<T>;

  try {
    payload = await parseJsonResponse<ApiEnvelope<T>>(response);
  } catch {
    throw new AuthApiError("Invalid response from server.", response.status);
  }

  if (payload.code !== 200) {
    throw new AuthApiError(
      payload.msg || "Request failed. Please try again.",
      payload.code ?? response.status
    );
  }

  return payload.data;
}

export async function createNewPassword(
  userId: string,
  password: string
): Promise<LoginResponseData | undefined> {
  let response: Response;

  try {
    response = await fetch(URLS.CREATE_NEW_PASSWORD, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        new_password: password,
      }),
    });
  } catch {
    throw new AuthApiError(
      "Unable to reach the server. Please check your connection.",
      0
    );
  }

  return readAuthResponseOptionalData<LoginResponseData>(response);
}

export function resolveAuthUserId(data: LoginResponseData): string {
  const result = data.result;
  if (!result) return "";

  return (
    resolveMongoId(result.id) ||
    resolveMongoId(result._id) ||
    resolveMongoId(result.user_id)
  );
}

export function requiresTwoStepVerification(data: LoginResponseData): boolean {
  return data.organization?.two_step === "email";
}

export function saveAuthUser(data: LoginResponseData): StoredAuthUser {
  if (!data.access_token) {
    throw new AuthApiError("Missing access token in login response.", 500);
  }

  const stored: StoredAuthUser = ensureDefaultUserMeta({
    ...data,
    access_token: data.access_token,
  });

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stored));
  return stored;
}

export function getStoredAuthUser(): StoredAuthUser | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuthUser) : null;
  } catch {
    return null;
  }
}

export function savePendingAuth(pending: PendingAuth): void {
  sessionStorage.setItem(PENDING_AUTH_KEY, JSON.stringify(pending));
}

export function getPendingAuth(): PendingAuth | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(PENDING_AUTH_KEY);
    return raw ? (JSON.parse(raw) as PendingAuth) : null;
  } catch {
    return null;
  }
}

export function clearPendingAuth(): void {
  sessionStorage.removeItem(PENDING_AUTH_KEY);
}

export function clearStoredAuthUser(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  clearPersistedQueryCache();
}
