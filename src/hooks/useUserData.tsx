import { useCallback, useEffect, useMemo, useState, createContext, useContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AUTH_PERMISSIONS_UPDATED_EVENT,
  type Branch,
  type RoleTier,
  type StoredAuthUser,
  canAccessBranch,
  canAccessSettings,
  canAssignRoleTier,
  canManageBranches,
  canManageRoles,
  canManageTargetUser,
  canManageUsers,
  canViewUserInManagement,
  canPerformAction,
  ensureDefaultUserMeta,
  getAccessibleBranchIds,
  getOrgIdFromAuth,
  getRoleTier,
  getStoredAuthUser,
  getUserBranchId,
  resolveAuthUserId,
  BRANCHES_UPDATED_EVENT,
  fetchBranches,
} from "@/lib/auth";

type UserDataContextValue = ReturnType<typeof useUserDataState>;

const UserDataContext = createContext<UserDataContextValue | null>(null);

function useUserDataState() {
  const [userData, setUserData] = useState<StoredAuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const router = useRouter();

  const hydrateAuthUser = useCallback(() => {
    const stored = getStoredAuthUser();
    if (!stored) return false;

    setUserData((current) => {
      if (!current) return ensureDefaultUserMeta(stored);

      const currentId = resolveAuthUserId(current);
      const nextId = resolveAuthUserId(stored);
      const currentToken = current.access_token;
      const nextToken = stored.access_token;

      // Avoid re-render loops when only permission map was silently synced.
      if (
        currentId === nextId &&
        currentToken === nextToken &&
        JSON.stringify(current.roleData ?? {}) === JSON.stringify(stored.roleData ?? {})
      ) {
        return current;
      }

      return ensureDefaultUserMeta(stored);
    });
    return true;
  }, []);

  useEffect(() => {
    if (!hydrateAuthUser()) {
      const path = window.location.pathname
      const isPublicAuthRoute =
        path.startsWith("/login") ||
        path.startsWith("/sign-up") ||
        path.startsWith("/welcome") ||
        path.startsWith("/reset-password") ||
        path.startsWith("/set-password") ||
        path.startsWith("/setup-complete") ||
        path.startsWith("/two-step") ||
        path.startsWith("/organization-profile")

      if (!isPublicAuthRoute) {
        router.push("/login")
      }
    }
    setIsAuthLoading(false)
  }, [hydrateAuthUser, router])

  useEffect(() => {
    const handleAuthPermissionsUpdated = () => {
      hydrateAuthUser();
    };

    window.addEventListener(AUTH_PERMISSIONS_UPDATED_EVENT, handleAuthPermissionsUpdated);
    return () => {
      window.removeEventListener(
        AUTH_PERMISSIONS_UPDATED_EVENT,
        handleAuthPermissionsUpdated
      );
    };
  }, [hydrateAuthUser]);

  const roleTier = useMemo(() => getRoleTier(userData), [userData]);
  const branchId = useMemo(() => getUserBranchId(userData), [userData]);
  const orgId = useMemo(() => getOrgIdFromAuth(userData), [userData]);
  const accessibleBranchIds = useMemo(
    () => getAccessibleBranchIds(userData),
    [userData]
  );
  const canManageBranchesFlag = useMemo(
    () => canManageBranches(userData),
    [userData]
  );
  const canManageRolesFlag = useMemo(() => canManageRoles(userData), [userData]);
  const canManageUsersFlag = useMemo(() => canManageUsers(userData), [userData]);
  const canAccessSettingsFlag = useMemo(
    () => canAccessSettings(userData),
    [userData]
  );

  const refreshBranches = useCallback(async () => {
    const resolvedOrgId = orgId || getOrgIdFromAuth(getStoredAuthUser());
    if (!resolvedOrgId) {
      setBranches([]);
      setBranchesLoading(false);
      return;
    }

    setBranchesLoading(true);
    try {
      // Branch managers need the full catalog for user/branch assignment UIs.
      const list = await fetchBranches(resolvedOrgId, undefined, {
        all: canManageBranchesFlag,
      });
      setBranches(list);
    } finally {
      setBranchesLoading(false);
    }
  }, [orgId, canManageBranchesFlag]);

  // Wait until auth hydration finishes and orgId is known so we do not fire
  // branch_list with orgId=0 and then again with the real org / ?all=1.
  useEffect(() => {
    if (isAuthLoading || !orgId) return;
    void refreshBranches();
  }, [isAuthLoading, orgId, refreshBranches]);

  useEffect(() => {
    const handleBranchesUpdated = () => {
      void refreshBranches();
    };

    window.addEventListener(BRANCHES_UPDATED_EVENT, handleBranchesUpdated);
    return () => {
      window.removeEventListener(BRANCHES_UPDATED_EVENT, handleBranchesUpdated);
    };
  }, [refreshBranches]);

  return {
    userData,
    isAuthLoading,
    roleTier,
    branchId,
    orgId,
    branches,
    branchesLoading,
    refreshBranches,
    accessibleBranchIds,
    hasTier: (...tiers: RoleTier[]) => tiers.includes(roleTier),
    can: (permissionKey: string) => canPerformAction(userData, permissionKey),
    canAccessBranch: (id: string) => canAccessBranch(userData, id),
    canManageUser: (target: { id: string; role_tier?: RoleTier; branch_id?: string }) =>
      canManageTargetUser(userData, target),
    canViewUser: (target: { id: string; role_tier?: RoleTier; branch_id?: string }) =>
      canViewUserInManagement(userData, target),
    canAssignTier: (tier: RoleTier) => canAssignRoleTier(userData, tier),
    canManageBranches: canManageBranchesFlag,
    canManageRoles: canManageRolesFlag,
    canManageUsers: canManageUsersFlag,
    canAccessSettings: canAccessSettingsFlag,
    getBranchName: (id: string) =>
      branches.find((b: Branch) => b.id === id)?.name ?? id,
  };
}

/**
 * Single app-wide auth/branch state. Without this, every `useUserData()`
 * consumer independently called `branch_list` (often 4–5 times per page).
 */
export function UserDataProvider({ children }: { children: ReactNode }) {
  const value = useUserDataState();
  return (
    <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>
  );
}

export function useUserData() {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error("useUserData must be used within a UserDataProvider");
  }
  return context;
}

export default useUserData;
