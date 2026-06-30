import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AUTH_USER_STORAGE_KEY,
  type Branch,
  type RoleTier,
  type StoredAuthUser,
  canAccessBranch,
  canAssignRoleTier,
  canManageBranches,
  canManageTargetUser,
  canViewUserInManagement,
  canPerformAction,
  ensureDefaultUserMeta,
  getAccessibleBranchIds,
  getOrgIdFromAuth,
  getRoleTier,
  getStoredAuthUser,
  getUserBranchId,
  BRANCHES_UPDATED_EVENT,
  fetchBranches,
} from "@/lib/auth";

export function useUserData() {
  const [userData, setUserData] = useState<StoredAuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedData = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (storedData) {
      try {
        const parsed = ensureDefaultUserMeta(JSON.parse(storedData) as StoredAuthUser);
        setUserData(parsed);
      } catch {
        router.push("/login");
      }
    } else {
      router.push("/login");
    }
    setIsAuthLoading(false);
  }, [router]);

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

  const refreshBranches = useCallback(async () => {
    const resolvedOrgId = orgId || getOrgIdFromAuth(getStoredAuthUser());
    if (!resolvedOrgId) {
      setBranches([]);
      setBranchesLoading(false);
      return;
    }

    setBranchesLoading(true);
    try {
      const list = await fetchBranches(resolvedOrgId);
      setBranches(list);
    } finally {
      setBranchesLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void refreshBranches();
  }, [refreshBranches]);

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
    getBranchName: (id: string) =>
      branches.find((b: Branch) => b.id === id)?.name ?? id,
  };
}

export default useUserData;
