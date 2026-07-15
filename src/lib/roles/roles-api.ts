"use client";

import { permissionModules as staticPermissionModules } from "@/config/permissions-modules";
import URLS from "@/config/urls";
import { parseJsonResponse } from "@/lib/api";
import {
  AUTH_USER_STORAGE_KEY,
  type ApiEnvelope,
  getAuthRolePermissions,
  getOrgIdFromAuth,
  getPermissionsFromRoleData,
  getStoredAuthUser,
  resolveRoleIdFromAuth,
} from "@/lib/auth";

export interface PermissionFunction {
  id: string;
  name: string;
  description: string;
}

export interface PermissionModule {
  id: string;
  name: string;
  color: string;
  functions: PermissionFunction[];
}

export interface PermissionCatalog {
  modules: PermissionModule[];
}

export interface Role {
  id: string;
  name: string;
  org_id: number;
  is_system?: boolean;
  permissions: Record<string, boolean>;
}

type RoleRawRecord = Record<string, unknown>;

export class RolesApiError extends Error {
  code: number;

  constructor(message: string, code = 500) {
    super(message);
    this.name = "RolesApiError";
    this.code = code;
  }
}

const ROLES_STORAGE_PREFIX = "map_roles_v5_";
export const ROLES_UPDATED_EVENT = "map-roles-updated";

type RolesRequestCacheEntry = {
  promise?: Promise<Role[]>;
  roles?: Role[];
};

const rolesRequestCache = new Map<number, RolesRequestCacheEntry>();
let cachedPermissionCatalog: PermissionCatalog | null = null;
let permissionCatalogPromise: Promise<PermissionCatalog> | null = null;

function rolesStorageKey(orgId: number): string {
  return `${ROLES_STORAGE_PREFIX}${orgId}`;
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { access_token?: string };
    return parsed.access_token ?? null;
  } catch {
    return null;
  }
}

function authHeaders(token?: string): HeadersInit {
  const resolved = token ?? getAuthToken();
  if (!resolved) {
    throw new RolesApiError("You are not logged in. Please sign in again.", 401);
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${resolved}`,
  };
}

function resolveRoleId(raw: RoleRawRecord): string {
  const id = raw._id ?? raw.id ?? raw.role_id;
  if (id && typeof id === "object" && "$oid" in (id as object)) {
    return String((id as { $oid?: string }).$oid ?? "");
  }
  return String(id ?? "");
}

export function getCatalogPermissionIds(catalog: PermissionCatalog): string[] {
  return catalog.modules.flatMap((module) => module.functions.map((func) => func.id));
}

export function getCachedPermissionCatalog(): PermissionCatalog | null {
  return cachedPermissionCatalog;
}

export function buildEmptyPermissions(
  catalog: PermissionCatalog | null = cachedPermissionCatalog
): Record<string, boolean> {
  if (!catalog) return {};

  const permissions: Record<string, boolean> = {};
  for (const id of getCatalogPermissionIds(catalog)) {
    permissions[id] = false;
  }
  return permissions;
}

export function mergePermissionsWithCatalog(
  catalog: PermissionCatalog,
  values: Record<string, boolean> | null | undefined
): Record<string, boolean> {
  const merged = buildEmptyPermissions(catalog);
  if (!values) return merged;

  for (const [key, value] of Object.entries(values)) {
    if (key in merged) {
      merged[key] = Boolean(value);
    }
  }

  return merged;
}

function mergeCatalogWithStatic(catalog: PermissionCatalog): PermissionCatalog {
  const modulesById = new Map(
    catalog.modules.map((module) => [module.id, { ...module, functions: [...module.functions] }])
  );

  for (const staticModule of staticPermissionModules) {
    const existing = modulesById.get(staticModule.id);
    if (!existing) {
      modulesById.set(staticModule.id, staticModule);
      continue;
    }

    const existingIds = new Set(existing.functions.map((func) => func.id));
    const missingFunctions = staticModule.functions.filter((func) => !existingIds.has(func.id));
    if (missingFunctions.length > 0) {
      existing.functions.push(...missingFunctions);
    }
  }

  const orderedIds = [
    ...catalog.modules.map((module) => module.id),
    ...staticPermissionModules
      .map((module) => module.id)
      .filter((id) => !catalog.modules.some((module) => module.id === id)),
  ];

  return {
    modules: [...new Set(orderedIds)]
      .map((id) => modulesById.get(id))
      .filter((module): module is PermissionModule => module !== undefined),
  };
}

function resolvePermissionCatalog(catalog: PermissionCatalog | null): PermissionCatalog {
  if (catalog && catalog.modules.length > 0) {
    return mergeCatalogWithStatic(catalog);
  }

  if (staticPermissionModules.length > 0) {
    return { modules: staticPermissionModules };
  }

  return catalog ?? { modules: [] };
}

function normalizePermissionCatalog(payload: unknown): PermissionCatalog | null {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const rawModules = Array.isArray(record.modules) ? record.modules : null;
  if (!rawModules) return null;

  const modules = rawModules
    .map((module) => {
      if (!module || typeof module !== "object") return null;

      const moduleRecord = module as Record<string, unknown>;
      const functions = Array.isArray(moduleRecord.functions)
        ? moduleRecord.functions
            .map((func) => {
              if (!func || typeof func !== "object") return null;
              const funcRecord = func as Record<string, unknown>;
              const id = String(funcRecord.id ?? "").trim();
              if (!id) return null;

              return {
                id,
                name: String(funcRecord.name ?? id),
                description: String(funcRecord.description ?? ""),
              };
            })
            .filter((func): func is PermissionFunction => func !== null)
        : [];

      const id = String(moduleRecord.id ?? "").trim();
      if (!id || functions.length === 0) return null;

      return {
        id,
        name: String(moduleRecord.name ?? id),
        color: String(moduleRecord.color ?? "#6366f1"),
        functions,
      };
    })
    .filter((module): module is PermissionModule => module !== null);

  if (modules.length === 0) return null;
  return { modules };
}

export async function fetchPermissionCatalog(
  token?: string,
  options?: { force?: boolean }
): Promise<PermissionCatalog> {
  if (!options?.force && cachedPermissionCatalog) {
    return cachedPermissionCatalog;
  }

  if (!options?.force && permissionCatalogPromise) {
    return permissionCatalogPromise;
  }

  const resolvedToken = token ?? getAuthToken();
  if (!resolvedToken) {
    return cachedPermissionCatalog ?? resolvePermissionCatalog(null);
  }

  const task = (async () => {
    try {
      const response = await fetch(URLS.PERMISSIONS_CATALOG, {
        method: "GET",
        headers: authHeaders(resolvedToken),
      });

      if (!response.ok) {
        return cachedPermissionCatalog ?? resolvePermissionCatalog(null);
      }

      const payload = await parseJsonResponse<ApiEnvelope<unknown>>(response);
      if (payload.code !== undefined && payload.code !== 200) {
        return cachedPermissionCatalog ?? resolvePermissionCatalog(null);
      }

      const catalog = normalizePermissionCatalog(payload.data);
      const resolved = resolvePermissionCatalog(catalog);
      cachedPermissionCatalog = resolved;
      return resolved;
    } catch {
      return cachedPermissionCatalog ?? resolvePermissionCatalog(null);
    } finally {
      permissionCatalogPromise = null;
    }
  })();

  permissionCatalogPromise = task;
  return task;
}

export function getAllPermissionKeys(catalog?: PermissionCatalog | null): string[] {
  const resolved = catalog ?? cachedPermissionCatalog;
  return resolved ? getCatalogPermissionIds(resolved) : [];
}

function toPermissionBoolean(value: unknown): boolean | null {
  if (typeof value === "number") return value === 1;
  if (typeof value === "boolean") return value;
  if (value === "1" || value === "0") return value === "1";
  return null;
}

const RESERVED_ROLE_FIELDS = new Set([
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

function collectPermissionValuesFromRoleRecord(
  record: RoleRawRecord
): Partial<Record<string, boolean>> {
  const permissions: Partial<Record<string, boolean>> = {};

  for (const [key, value] of Object.entries(record)) {
    if (RESERVED_ROLE_FIELDS.has(key)) continue;

    const parsed = toPermissionBoolean(value);
    if (parsed !== null) {
      permissions[key] = parsed;
    }
  }

  const nested = record.permissions;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    for (const [key, value] of Object.entries(nested as Record<string, unknown>)) {
      const parsed = toPermissionBoolean(value);
      if (parsed !== null) {
        permissions[key] = parsed;
      }
    }
  }

  return permissions;
}

export function parsePermissionsFromRoleRecord(
  record: RoleRawRecord,
  catalog: PermissionCatalog | null = cachedPermissionCatalog
): Record<string, boolean> {
  const parsed = collectPermissionValuesFromRoleRecord(record);

  if (catalog) {
    return mergePermissionsWithCatalog(catalog, parsed as Record<string, boolean>);
  }

  const permissions: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "boolean") {
      permissions[key] = value;
    }
  }
  return permissions;
}

function normalizeRoleNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

/** Legacy client-side template IDs that should not be shown as API roles. */
const REMOVED_SYSTEM_ROLE_IDS = new Set([
  "manager",
  "standard user",
  "standarduser",
  "standard_user",
  "administrator",
]);

function isRemovedSystemRole(_name: string, id?: string): boolean {
  const idKey = normalizeRoleNameKey(id ?? "");
  return REMOVED_SYSTEM_ROLE_IDS.has(idKey);
}

function getAuthPermissionsForRoleId(
  roleId: string
): Record<string, boolean> | null {
  const authUser = getStoredAuthUser();
  if (!authUser?.roleData) return null;

  const authRoleId = resolveRoleIdFromAuth(authUser);
  if (authRoleId && authRoleId !== roleId) return null;

  return getPermissionsFromRoleData(authUser.roleData);
}

function roleRecordHasApiPermissions(record: RoleRawRecord): boolean {
  const nested = record.permissions;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return Object.keys(nested).length > 0;
  }

  return Object.entries(record).some(([key, value]) => {
    if (RESERVED_ROLE_FIELDS.has(key)) return false;
    return toPermissionBoolean(value) !== null;
  });
}

function normalizeRole(
  raw: RoleRawRecord,
  orgId: number,
  cachedRoles: Role[] = []
): Role | null {
  const id = resolveRoleId(raw);
  const rawName = String(raw.role_name ?? raw.name ?? "").trim();
  if (!id || !rawName) return null;

  if (isRemovedSystemRole(rawName, id)) return null;

  const name = rawName;
  const is_system = Boolean(raw.is_system ?? raw.is_system_role);
  const fromApi = parsePermissionsFromRoleRecord(raw);
  const hasApiPermissions = roleRecordHasApiPermissions(raw);

  let permissions = fromApi;

  if (!hasApiPermissions) {
    const cached = cachedRoles.find((role) => role.id === id);
    if (cached && Object.keys(cached.permissions).length > 0) {
      permissions = cached.permissions;
    } else {
      const fromAuth = getAuthPermissionsForRoleId(id);
      if (fromAuth) {
        permissions = cachedPermissionCatalog
          ? mergePermissionsWithCatalog(cachedPermissionCatalog, fromAuth)
          : fromAuth;
      }
    }
  }

  return {
    id,
    name,
    org_id: Number(raw.org_id ?? orgId),
    is_system,
    permissions,
  };
}

function extractRoleList(payload: unknown): RoleRawRecord[] {
  if (Array.isArray(payload)) {
    return payload as RoleRawRecord[];
  }

  if (payload && typeof payload === "object") {
    const record = payload as RoleRawRecord;
    if (Array.isArray(record.items)) return record.items as RoleRawRecord[];
    if (Array.isArray(record.data)) return record.data as RoleRawRecord[];
    if (Array.isArray(record.roles)) return record.roles as RoleRawRecord[];
    if (Array.isArray(record.result)) return record.result as RoleRawRecord[];
    if (Array.isArray(record.users)) return record.users as RoleRawRecord[];

    const nested = record.data;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return extractRoleList(nested);
    }
  }

  return [];
}

export function getStoredRoles(orgId: number): Role[] {
  if (typeof window === "undefined" || !orgId) return [];
  try {
    const raw = localStorage.getItem(rolesStorageKey(orgId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Role[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((role) => role && !isRemovedSystemRole(role.name, role.id))
      .map((role) => ({
        ...role,
        name: role.name,
        is_system: Boolean(role.is_system),
      }));
  } catch {
    return [];
  }
}

export function saveRoles(orgId: number, roles: Role[]): Role[] {
  if (typeof window === "undefined" || !orgId) return roles;
  localStorage.setItem(rolesStorageKey(orgId), JSON.stringify(roles));
  return roles;
}

function notifyRolesUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ROLES_UPDATED_EVENT));
  }
}

function syncRolesCache(orgId: number, roles: Role[], notify = false): Role[] {
  saveRoles(orgId, roles);
  rolesRequestCache.set(orgId, { roles });
  if (notify) notifyRolesUpdated();
  return roles;
}

async function readRolesResponse<T>(response: Response): Promise<T> {
  const payload = await parseJsonResponse<ApiEnvelope<T>>(response);

  if (!response.ok || (payload.code !== undefined && payload.code !== 200)) {
    throw new RolesApiError(
      payload.msg || "Role request failed.",
      payload.code ?? response.status
    );
  }

  return payload.data as T;
}

function permissionsToApiFlags(permissions: Record<string, boolean>): Record<string, number> {
  const flags: Record<string, number> = {};
  for (const [key, enabled] of Object.entries(permissions)) {
    flags[key] = enabled ? 1 : 0;
  }
  return flags;
}

export async function fetchRoleById(
  roleId: string,
  orgId: number,
  token?: string
): Promise<Role | null> {
  const resolvedOrgId = orgId || getOrgIdFromAuth(getStoredAuthUser());
  const resolvedToken = token ?? getAuthToken();
  if (!roleId || !resolvedOrgId || !resolvedToken) return null;

  try {
    const response = await fetch(`${URLS.ROLES_UPDATE}/${roleId}`, {
      method: "GET",
      headers: authHeaders(resolvedToken),
    });

    if (!response.ok) return null;

    const payload = await parseJsonResponse<ApiEnvelope<RoleRawRecord>>(response);
    if (payload.code !== undefined && payload.code !== 200) return null;
    if (!payload.data) return null;

    return normalizeRole(payload.data, resolvedOrgId);
  } catch {
    return null;
  }
}

export async function fetchRolePermissions(
  roleId: string,
  orgId: number,
  token?: string
): Promise<Record<string, boolean> | null> {
  const resolvedOrgId = orgId || getOrgIdFromAuth(getStoredAuthUser());
  if (!roleId || !resolvedOrgId) return null;

  const resolvedToken = token ?? getAuthToken();
  const catalog = resolvedToken
    ? await fetchPermissionCatalog(resolvedToken)
    : cachedPermissionCatalog;

  if (resolvedToken) {
    const role = await fetchRoleById(roleId, resolvedOrgId, resolvedToken);
    if (role) {
      return catalog
        ? mergePermissionsWithCatalog(catalog, role.permissions)
        : role.permissions;
    }

    try {
      const roles = await fetchRoles(resolvedOrgId, resolvedToken, { force: true });
      const fromList = roles.find((item) => item.id === roleId);
      if (fromList) {
        return catalog
          ? mergePermissionsWithCatalog(catalog, fromList.permissions)
          : fromList.permissions;
      }
    } catch {
      // Fall through to local cache.
    }
  }

  const fromAuth =
    getAuthPermissionsForRoleId(roleId) ?? getAuthRolePermissions(getStoredAuthUser());
  if (fromAuth) {
    return catalog ? mergePermissionsWithCatalog(catalog, fromAuth) : fromAuth;
  }

  const fromCache = getStoredRoles(resolvedOrgId).find((role) => role.id === roleId);
  if (fromCache) {
    return catalog
      ? mergePermissionsWithCatalog(catalog, fromCache.permissions)
      : fromCache.permissions;
  }

  return null;
}

async function fetchRolesFromNetwork(
  resolvedOrgId: number,
  resolvedToken: string
): Promise<Role[]> {
  const existingRoles = getStoredRoles(resolvedOrgId);

  try {
    await fetchPermissionCatalog(resolvedToken);
    const response = await fetch(URLS.ROLES, {
      method: "GET",
      headers: authHeaders(resolvedToken),
    });

    if (!response.ok) {
      return existingRoles;
    }

    const payload = await parseJsonResponse<{ code?: number; data?: unknown }>(response);
    if (payload.code !== undefined && payload.code !== 200) {
      return existingRoles;
    }

    const rawList = extractRoleList(payload.data ?? payload);
    const roles = rawList
      .map((item) => normalizeRole(item, resolvedOrgId, existingRoles))
      .filter((role): role is Role => role !== null);

    if (roles.length > 0) {
      saveRoles(resolvedOrgId, roles);
      return roles;
    }

    return existingRoles;
  } catch {
    return existingRoles;
  }
}

export async function fetchRoles(
  orgId: number,
  token?: string,
  options?: { force?: boolean }
): Promise<Role[]> {
  const resolvedOrgId = orgId || getOrgIdFromAuth(getStoredAuthUser());
  const resolvedToken = token ?? getAuthToken();

  if (!resolvedOrgId) return [];

  if (!resolvedToken) {
    return [];
  }

  if (!options?.force) {
    const cached = rolesRequestCache.get(resolvedOrgId);
    if (cached?.roles) return cached.roles;
    if (cached?.promise) return cached.promise;
  } else {
    rolesRequestCache.delete(resolvedOrgId);
  }

  const promise = fetchRolesFromNetwork(resolvedOrgId, resolvedToken)
    .then((roles) => {
      rolesRequestCache.set(resolvedOrgId, { roles });
      return roles;
    })
    .catch(() => {
      rolesRequestCache.delete(resolvedOrgId);
      return getStoredRoles(resolvedOrgId);
    });

  rolesRequestCache.set(resolvedOrgId, { promise });
  return promise;
}

export async function createRole(input: {
  name: string;
  org_id: number;
  permissions?: Record<string, boolean>;
}): Promise<Role> {
  const roleName = input.name.trim();
  const permissions = input.permissions;

  const resolvedToken = getAuthToken();
  if (!resolvedToken) {
    throw new RolesApiError("You are not logged in. Please sign in again.", 401);
  }

  await fetchPermissionCatalog(resolvedToken);

  const response = await fetch(URLS.ROLES, {
    method: "POST",
    headers: authHeaders(resolvedToken),
    body: JSON.stringify({
      role_name: roleName,
      org_id: input.org_id,
      ...(permissions ? permissionsToApiFlags(permissions) : {}),
    }),
  });

  const data = await readRolesResponse<RoleRawRecord | RoleRawRecord[]>(response);
  const raw = Array.isArray(data) ? data[0] : data;
  const created = raw ? normalizeRole(raw, input.org_id) : null;

  if (created) {
    const existing = getStoredRoles(input.org_id);
    syncRolesCache(input.org_id, [...existing, created], true);
    return created;
  }

  if (raw) {
    const id = resolveRoleId(raw);
    const rawName = String(raw.role_name ?? raw.name ?? roleName).trim();
    if (id && rawName) {
      const fromApi: Role = {
        id,
        name: rawName,
        org_id: Number(raw.org_id ?? input.org_id),
        is_system: Boolean(raw.is_system ?? raw.is_system_role),
        permissions: parsePermissionsFromRoleRecord(raw),
      };
      const existing = getStoredRoles(input.org_id);
      syncRolesCache(input.org_id, [...existing, fromApi], true);
      return fromApi;
    }
  }

  throw new RolesApiError("Failed to create role.", 400);
}

export async function updateRoleName(roleId: string, name: string, orgId: number): Promise<Role> {
  const roleName = name.trim();
  const existing = getStoredRoles(orgId);
  const current = existing.find((role) => role.id === roleId);

  if (!current) {
    throw new RolesApiError("Role not found.", 404);
  }

  const updated: Role = { ...current, name: roleName };
  const resolvedToken = getAuthToken();

  if (!resolvedToken) {
    const next = existing.map((role) => (role.id === roleId ? updated : role));
    syncRolesCache(orgId, next, true);
    return updated;
  }

  try {
    const response = await fetch(`${URLS.ROLES_UPDATE}/${roleId}`, {
      method: "PUT",
      headers: authHeaders(resolvedToken),
      body: JSON.stringify({ role_name: roleName }),
    });

    const data = await readRolesResponse<RoleRawRecord>(response);
    const fromApi = data ? normalizeRole(data, orgId) : null;
    const result = fromApi ?? updated;

    const next = existing.map((role) => (role.id === roleId ? { ...role, ...result } : role));
    syncRolesCache(orgId, next, true);
    return next.find((role) => role.id === roleId) ?? result;
  } catch {
    const next = existing.map((role) =>
      role.id === roleId ? { ...role, name: roleName } : role
    );
    syncRolesCache(orgId, next, true);
    return next.find((role) => role.id === roleId) ?? updated;
  }
}

export async function updateRolePermission(
  roleId: string,
  permissionKey: string,
  enabled: boolean,
  orgId: number,
  knownRoles?: Role[]
): Promise<Record<string, boolean> | null> {
  const existing =
    knownRoles && knownRoles.length > 0 ? knownRoles : getStoredRoles(orgId);
  let current = existing.find((role) => role.id === roleId);

  if (!current && knownRoles?.length) {
    syncRolesCache(orgId, knownRoles);
    current = knownRoles.find((role) => role.id === roleId);
  }

  if (!current) return null;

  const applyPermissionsUpdate = (
    updatedPermissions: Record<string, boolean>
  ): Record<string, boolean> => {
    const next = existing.map((role) =>
      role.id === roleId ? { ...role, permissions: updatedPermissions } : role
    );
    syncRolesCache(orgId, next, true);
    return updatedPermissions;
  };

  const resolvedToken = getAuthToken();

  if (!resolvedToken) {
    const updatedPermissions = {
      ...current.permissions,
      [permissionKey]: enabled,
    };
    return applyPermissionsUpdate(updatedPermissions);
  }

  try {
    const response = await fetch(`${URLS.ROLES_UPDATE}/${roleId}`, {
      method: "PUT",
      headers: authHeaders(resolvedToken),
      body: JSON.stringify({ [permissionKey]: enabled ? 1 : 0 }),
    });

    const payload = await parseJsonResponse<ApiEnvelope<RoleRawRecord>>(response);
    if (!response.ok || (payload.code !== undefined && payload.code !== 200)) {
      return null;
    }

    if (payload.data) {
      const normalized = normalizeRole(payload.data, orgId);
      if (normalized) {
        rolesRequestCache.delete(orgId);
        return applyPermissionsUpdate(normalized.permissions);
      }
    }

    const updatedPermissions = {
      ...current.permissions,
      [permissionKey]: enabled,
    };

    return applyPermissionsUpdate(updatedPermissions);
  } catch {
    return null;
  }
}

export async function deleteRole(roleId: string, orgId: number): Promise<void> {
  const existing = getStoredRoles(orgId);
  const current = existing.find((role) => role.id === roleId);

  if (!current) {
    throw new RolesApiError("Role not found.", 404);
  }

  if (current.is_system) {
    throw new RolesApiError("System roles cannot be deleted.", 400);
  }

  const resolvedToken = getAuthToken();

  if (resolvedToken) {
    try {
      const response = await fetch(`${URLS.ROLES}/${roleId}`, {
        method: "DELETE",
        headers: authHeaders(resolvedToken),
      });

      const payload = await parseJsonResponse<ApiEnvelope<unknown>>(response);
      if (!response.ok || (payload.code !== undefined && payload.code !== 200)) {
        throw new RolesApiError(payload.msg || "Failed to delete role.", payload.code ?? response.status);
      }
    } catch (error) {
      if (error instanceof RolesApiError) throw error;
      // Fall through to local delete when API is unavailable.
    }
  }

  const next = existing.filter((role) => role.id !== roleId);
  syncRolesCache(orgId, next, true);
}

type UserPermissionsApiData = {
  role_id?: string;
  role_name?: string;
  permissions?: Record<string, unknown>;
  overrides?: Record<string, unknown>;
};

function parsePermissionFlags(
  raw: Record<string, unknown> | null | undefined
): Record<string, boolean> {
  if (!raw || typeof raw !== "object") return {};
  const permissions: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(raw)) {
    const parsed = toPermissionBoolean(value);
    if (parsed !== null) {
      permissions[key] = parsed;
    }
  }
  return permissions;
}

export async function fetchUserPermissions(
  userId: string,
  token?: string
): Promise<Record<string, boolean> | null> {
  if (!userId) return null;

  const resolvedToken = token ?? getAuthToken();
  if (!resolvedToken) return null;

  const catalog = await fetchPermissionCatalog(resolvedToken);

  try {
    const response = await fetch(`${URLS.USER_PERMISSIONS}/${userId}/permissions`, {
      method: "GET",
      headers: authHeaders(resolvedToken),
    });

    const payload = await parseJsonResponse<ApiEnvelope<UserPermissionsApiData>>(response);
    if (!response.ok || (payload.code !== undefined && payload.code !== 200)) {
      return null;
    }

    const permissions = parsePermissionFlags(payload.data?.permissions);
    return mergePermissionsWithCatalog(catalog, permissions);
  } catch {
    return null;
  }
}

/**
 * Effective permissions for the currently authenticated user
 * (role defaults + Active User permission overrides).
 *
 * Deduplicated across concurrent callers (nav, lead list, filters, etc.) so
 * `user_permissions` is only requested once per token within the TTL window.
 */
let effectivePermissionsInFlight: Promise<Record<string, boolean> | null> | null = null
let effectivePermissionsCache: {
  token: string
  data: Record<string, boolean> | null
  at: number
} | null = null
const EFFECTIVE_PERMISSIONS_TTL_MS = 5 * 60 * 1000

export function invalidateCurrentUserEffectivePermissionsCache() {
  effectivePermissionsInFlight = null
  effectivePermissionsCache = null
}

export async function fetchCurrentUserEffectivePermissions(
  token?: string
): Promise<Record<string, boolean> | null> {
  const resolvedToken = token ?? getAuthToken()
  if (!resolvedToken) return null

  if (
    effectivePermissionsCache &&
    effectivePermissionsCache.token === resolvedToken &&
    Date.now() - effectivePermissionsCache.at < EFFECTIVE_PERMISSIONS_TTL_MS
  ) {
    return effectivePermissionsCache.data
  }

  if (effectivePermissionsInFlight) {
    return effectivePermissionsInFlight
  }

  effectivePermissionsInFlight = (async () => {
    try {
      const response = await fetch(URLS.USER_SELF_PERMISSIONS, {
        method: "GET",
        headers: authHeaders(resolvedToken),
      })

      const payload = await parseJsonResponse<
        ApiEnvelope<{ roleData?: Record<string, unknown>; planData?: unknown }>
      >(response)

      if (!response.ok || (payload.code !== undefined && payload.code !== 200)) {
        effectivePermissionsCache = {
          token: resolvedToken,
          data: null,
          at: Date.now(),
        }
        return null
      }

      const roleData = payload.data?.roleData
      if (!roleData) {
        effectivePermissionsCache = {
          token: resolvedToken,
          data: null,
          at: Date.now(),
        }
        return null
      }

      const catalog = await fetchPermissionCatalog(resolvedToken)
      const permissions = getPermissionsFromRoleData(
        roleData as Parameters<typeof getPermissionsFromRoleData>[0]
      )
      const merged = mergePermissionsWithCatalog(catalog, permissions)
      effectivePermissionsCache = {
        token: resolvedToken,
        data: merged,
        at: Date.now(),
      }
      return merged
    } catch {
      effectivePermissionsCache = {
        token: resolvedToken,
        data: null,
        at: Date.now(),
      }
      return null
    } finally {
      effectivePermissionsInFlight = null
    }
  })()

  return effectivePermissionsInFlight
}

export async function updateUserPermission(
  userId: string,
  permissionKey: string,
  enabled: boolean,
  token?: string
): Promise<{ permissions: Record<string, boolean> } | { error: string }> {
  if (!userId || !permissionKey) {
    return { error: "Missing user or permission." };
  }

  const resolvedToken = token ?? getAuthToken();
  if (!resolvedToken) {
    return { error: "You are not logged in. Please sign in again." };
  }

  try {
    const response = await fetch(`${URLS.USER_PERMISSIONS}/${userId}/permissions`, {
      method: "PUT",
      headers: authHeaders(resolvedToken),
      body: JSON.stringify({ [permissionKey]: enabled ? 1 : 0 }),
    });

    const payload = await parseJsonResponse<ApiEnvelope<UserPermissionsApiData>>(response);
    if (!response.ok || (payload.code !== undefined && payload.code !== 200)) {
      return { error: payload.msg || "Failed to update permission." };
    }

    const catalog = await fetchPermissionCatalog(resolvedToken);
    const permissions = mergePermissionsWithCatalog(
      catalog,
      parsePermissionFlags(payload.data?.permissions)
    );
    return { permissions };
  } catch {
    return { error: "Failed to update permission. Please try again." };
  }
}
