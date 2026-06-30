"use client";

import URLS from "@/config/urls";
import { parseJsonResponse } from "@/lib/api";
import { clearPersistedQueryCache } from "@/lib/query-cache";

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
const BRANCHES_STORAGE_PREFIX = "map_branches_";
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
  return "super_admin";
}

export function getUserBranchId(user: StoredAuthUser | LoginResponseData | null): string | undefined {
  const fromUser = user?.result?.branch_id;
  if (fromUser) return fromUser;

  const userId = resolveAuthUserId(user ?? {});
  const orgId = getOrgIdFromAuth(user);
  if (userId && orgId) {
    return getUserRoleMeta(orgId, userId)?.branch_id;
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
  if (hasAllBranchAccess(tier)) return "all";

  const branchId = getUserBranchId(user);
  return branchId ? [branchId] : [];
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
    if (raw) return JSON.parse(raw) as Branch[];

    const defaults: Branch[] = [
      { id: "branch_a", org_id: orgId, name: "Branch A", code: "A", status: "active" },
      { id: "branch_b", org_id: orgId, name: "Branch B", code: "B", status: "active" },
      { id: "branch_c", org_id: orgId, name: "Branch C", code: "C", status: "active" },
    ];
    localStorage.setItem(branchesKey(orgId), JSON.stringify(defaults));
    return defaults;
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
  const id = raw._id ?? raw.id ?? raw.branch_id;
  if (id && typeof id === "object" && "$oid" in (id as object)) {
    return String((id as { $oid?: string }).$oid ?? "");
  }
  return String(id ?? "");
}

function normalizeBranch(raw: BranchRawRecord, orgId: number): Branch | null {
  const id = resolveBranchId(raw);
  const name = String(raw.name ?? raw.branch_name ?? raw.branch ?? "").trim();
  if (!id || !name) return null;

  const code = String(raw.code ?? raw.branch_code ?? name.slice(0, 3))
    .trim()
    .toUpperCase();

  return {
    id,
    org_id: Number(raw.org_id ?? orgId),
    name,
    code,
    status: normalizeBranchStatus(raw.status),
    manager_user_id: raw.manager_user_id ? String(raw.manager_user_id) : undefined,
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

function syncBranchesCache(orgId: number, branches: Branch[], notify = false): Branch[] {
  saveBranches(orgId, branches);
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

export async function fetchBranches(orgId: number, token?: string): Promise<Branch[]> {
  const resolvedToken = token ?? getBranchAuthToken();
  if (!resolvedToken) {
    return orgId ? getStoredBranches(orgId) : [];
  }

  try {
    const response = await fetch(URLS.BRANCH_LIST, {
      method: "GET",
      headers: branchAuthHeaders(resolvedToken),
    });

    if (!response.ok) {
      return orgId ? getStoredBranches(orgId) : [];
    }

    const payload = await parseJsonResponse<{ code?: number; data?: unknown; msg?: string }>(
      response
    );

    if (payload.code !== undefined && payload.code !== 200) {
      return orgId ? getStoredBranches(orgId) : [];
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
    if (branches.length > 0 && cacheOrgId) {
      saveBranches(cacheOrgId, branches);
      return branches;
    }

    return cacheOrgId ? getStoredBranches(cacheOrgId) : branches;
  } catch {
    return orgId ? getStoredBranches(orgId) : [];
  }
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

export function getPermissionsFromRoleData(
  roleData: RoleData | undefined
): Record<string, boolean> {
  if (!roleData) return {};
  const permissions: Record<string, boolean> = {};
  Object.keys(roleData).forEach((key) => {
    if (typeof roleData[key] === "number" && key !== "_id" && key !== "role_name") {
      permissions[key] = roleData[key] === 1;
    }
  });
  return permissions;
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
    if (hasAllBranchAccess(target.role_tier ?? "branch_user")) return true;
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

  if (actorTier === "branch_user") return false;
  if (actorTier === "super_admin") return targetTier !== "super_admin" || target.id === resolveAuthUserId(actor);
  if (TIER_RANK[actorTier] <= TIER_RANK[targetTier]) return false;

  if (actorTier === "branch_manager") {
    const actorBranch = getUserBranchId(actor);
    return actorBranch != null && actorBranch === target.branch_id;
  }

  return true;
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

export function ensureDefaultUserMeta(user: StoredAuthUser): StoredAuthUser {
  const orgId = getOrgIdFromAuth(user);
  const userId = resolveAuthUserId(user);
  if (!orgId || !userId) return user;

  const existing = getUserRoleMeta(orgId, userId);
  if (!existing) {
    setUserRoleMeta(orgId, userId, { role_tier: "super_admin" });
    return {
      ...user,
      result: { ...user.result, role_tier: "super_admin" },
    };
  }

  if (!user.result?.role_tier) {
    return {
      ...user,
      result: { ...user.result, role_tier: existing.role_tier, branch_id: existing.branch_id },
    };
  }

  return user;
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
  const userId = data.result?.id;
  return userId != null ? String(userId) : "";
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
