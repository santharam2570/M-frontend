import { useMemo } from "react"

import { useRolePermissions } from "@/hooks/useRolePermissions"
import { useUserData } from "@/hooks/useUserData"
import { getRoleTier } from "@/lib/auth"

export type BookingViewScope = "all" | "team" | "own" | "none"

function getBookingViewScopeFromPermissions(
  permissions: Record<string, boolean> | null,
  roleTier: ReturnType<typeof getRoleTier>,
): BookingViewScope {
  if (roleTier === "super_admin" || roleTier === "admin") return "all"
  if (permissions?.booking !== true) return "none"
  if (permissions.booking_view_all === true) return "all"
  if (permissions.booking_view_team === true) return "team"
  if (permissions.booking_view_own === true) return "own"
  return "own"
}

export function useBookingPermissions() {
  const { userData, isAuthLoading, orgId } = useUserData()
  const { permissions, isLoading: isPermissionsLoading, hasPermission } =
    useRolePermissions(userData, orgId)

  const roleTier = useMemo(() => getRoleTier(userData), [userData])

  const viewScope = useMemo(
    () => getBookingViewScopeFromPermissions(permissions, roleTier),
    [permissions, roleTier]
  )

  return {
    userData,
    permissions,
    roleTier,
    isLoading: isAuthLoading || isPermissionsLoading,
    canViewBookings: hasPermission("booking"),
    canAddBooking: hasPermission("add_booking"),
    canEditBooking: hasPermission("edit_booking"),
    canDeleteBooking: hasPermission("delete_booking"),
    viewScope,
    hasPermission,
  }
}
