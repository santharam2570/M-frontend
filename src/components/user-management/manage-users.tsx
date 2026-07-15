"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  MoreVertical,
  ChevronUp,
  ChevronDown,
  Search,
  Pencil,
  KeyRound,
  UserPlus,
  UserMinus,
  X,
} from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  FormSelectContent,
  FormSelectItem,
  Select,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import URLS from "@/config/urls"
import {
  AUTH_USER_STORAGE_KEY,
  ROLE_TIER_LABELS,
  type Branch,
  type RoleTier,
  canCreateUsers,
  canManageTargetUser,
  getAllUserRoleMeta,
  getAssignableTiers,
  getEditableTiers,
  getOrgIdFromAuth,
  getPermissionsFromRoleData,
  getRoleTier,
  getStoredAuthUser,
  hasAllBranchAccess,
  isSuperAdminUser,
  patchAuthUserRolePermissions,
  resolveAuthUserId,
  setUserRoleMeta,
} from "@/lib/auth"
import { resolveBranchObjectId } from "@/lib/branches/branch-id"
import { useUserData } from "@/hooks/useUserData"
import {
  buildEmptyPermissions,
  fetchPermissionCatalog,
  fetchRoles,
  fetchUserPermissions,
  updateUserPermission,
  type PermissionModule,
} from "@/lib/roles/roles-api"
import { fetchUsersList, invalidateUsersListCache } from "@/lib/users/users-api"
import { formatDateForAgeing } from "@/lib/date-ageing"
import { themePrimaryBadgeClassName } from "@/lib/form-field-styles"
import { AddUserDialog, type UserFormData } from "./add-user-dialog"
import { EditUserDialog, type EditableUser } from "./edit-user-dialog"
import { UserPermissionsSheet, type UserDetailsSavePayload } from "./user-permissions-sheet"

interface User {
  id: string
  name: string
  email: string
  phone: string
  role: string
  role_name: string
  role_tier: RoleTier
  branch_id?: string
  created: string
  status: "Active" | "Inactive"
  aadhaar_number?: string
  aadhaar_document?: string
  pan_number?: string
  pan_document?: string
  address?: string
  source?: string
  referred_by?: string
  reference_contact_number?: string
  passport_number?: string
}

interface Role {
  _id: string
  name: string
}

function getAuthToken(router: ReturnType<typeof useRouter>): string | null {
  const storedData = localStorage.getItem(AUTH_USER_STORAGE_KEY)
  if (!storedData) {
    router.push("/login")
    return null
  }

  const token = JSON.parse(storedData)?.access_token as string | undefined
  if (!token) {
    router.push("/login")
    return null
  }

  return token
}

function isActiveUserStatus(status: unknown): boolean {
  if (status === undefined || status === null || status === "") return true
  const normalized = String(status).trim().toLowerCase()
  return normalized === "active" || normalized === "1" || normalized === "true"
}

function resolveUserId(user: Record<string, unknown>): string {
  const id = user._id ?? user.id ?? user.user_id

  if (typeof id === "string") return id
  if (typeof id === "number") return String(id)

  if (id && typeof id === "object" && "$oid" in id) {
    return String((id as { $oid?: string }).$oid ?? "")
  }

  return ""
}

function normalizeBranchId(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined

  if (typeof value === "object") {
    if ("$oid" in value) {
      const oid = (value as { $oid?: string }).$oid
      return oid ? String(oid) : undefined
    }

    const record = value as Record<string, unknown>
    if ("_id" in record || "id" in record || "branch_id" in record) {
      return normalizeBranchId(record._id ?? record.id ?? record.branch_id)
    }
  }

  const normalized = String(value).trim()
  return normalized || undefined
}

function resolveUserBranchId(user: Record<string, unknown>, orgId?: number): string | undefined {
  const direct = normalizeBranchId(user.branch_id ?? user.branchId)
  if (direct) return resolveBranchObjectId(direct, orgId) ?? direct

  if (user.branch && typeof user.branch === "object") {
    const branch = user.branch as Record<string, unknown>
    const fromBranch = normalizeBranchId(branch._id ?? branch.id ?? branch.branch_id)
    if (fromBranch) return resolveBranchObjectId(fromBranch, orgId) ?? fromBranch
  }

  return undefined
}

function matchesBranchFilter(userBranchId: string | undefined, branchFilter: string): boolean {
  if (branchFilter === "all") return true
  if (!userBranchId) return false
  return userBranchId === branchFilter
}

function formatUsers(
  data: Array<Record<string, unknown>>,
  orgId: number
): User[] {
  const metaMap = getAllUserRoleMeta(orgId)

  return data
    .map((user) => {
      const id = resolveUserId(user)
      const meta = metaMap[id]
      const apiTier = user.role_tier as RoleTier | undefined
      const apiBranch = resolveUserBranchId(user, orgId)

      return {
        id,
        name: String(user.name ?? user.user_name ?? user.full_name ?? ""),
        email: String(user.email ?? ""),
        phone: String(user.phone ?? ""),
        role: String(user.role ?? user.role_id ?? ""),
        role_name: String(user.role_name ?? ""),
        role_tier: apiTier ?? meta?.role_tier ?? "branch_user",
        branch_id: apiBranch ?? meta?.branch_id,
        created: String(user.create_date ?? user.created_at ?? user.created ?? ""),
        status: isActiveUserStatus(user.status) ? ("Active" as const) : ("Inactive" as const),
        aadhaar_number: String(user.aadhaar_number ?? user.aadhaar ?? "").trim() || undefined,
        aadhaar_document: String(user.aadhaar_document ?? user.aadhaar_doc ?? "").trim() || undefined,
        pan_number: String(user.pan_number ?? user.pan ?? "").trim() || undefined,
        pan_document: String(user.pan_document ?? user.pan_doc ?? "").trim() || undefined,
        address: String(user.address ?? "").trim() || undefined,
        source: String(user.source ?? "").trim() || undefined,
        referred_by: String(user.referred_by ?? user.referredBy ?? "").trim() || undefined,
        reference_contact_number:
          String(user.reference_contact_number ?? user.reference_contact ?? user.reference_phone ?? "")
            .trim() || undefined,
        passport_number: String(user.passport_number ?? user.passport ?? "").trim() || undefined,
      }
    })
    .filter((user) => user.id)
}

function UsersTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  )
}

export function ManageUsers() {
  const router = useRouter()
  const { toast } = useToast()
  const {
    userData,
    isAuthLoading,
    roleTier: currentTier,
    orgId,
    branches,
    branchesLoading,
    accessibleBranchIds,
    getBranchName,
  } = useUserData()

  const [branchFilter, setBranchFilter] = React.useState<string>("all")
  const [currentUserPermissions, setCurrentUserPermissions] = React.useState<
    Record<string, boolean>
  >({})

  const assignableTiers = React.useMemo(
    () => getAssignableTiers(userData),
    [userData]
  )

  const canAddUsers = canCreateUsers(userData)

  React.useEffect(() => {
    if (userData?.roleData) {
      setCurrentUserPermissions(getPermissionsFromRoleData(userData.roleData))
    }
  }, [userData])

  const [activeTab, setActiveTab] = React.useState("active")
  const [searchTerm, setSearchTerm] = React.useState("")
  const [sortColumn, setSortColumn] = React.useState("")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc")
  const [users, setUsers] = React.useState<User[]>([])
  const [roles, setRoles] = React.useState<Role[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [userToEdit, setUserToEdit] = React.useState<EditableUser | null>(null)

  const editAssignableTiers = React.useMemo(
    () => getEditableTiers(userData, userToEdit?.role_tier),
    [userData, userToEdit?.role_tier]
  )

  const [selectedUser, setSelectedUser] = React.useState<User | null>(null)
  const [isPermissionSheetOpen, setIsPermissionSheetOpen] = React.useState(false)
  const [isLoadingPermissions, setIsLoadingPermissions] = React.useState(false)
  const [modulePermissions, setModulePermissions] = React.useState<Record<string, boolean>>({})
  const [permissionModules, setPermissionModules] = React.useState<PermissionModule[]>([])

  const applyUsersFromRaw = React.useCallback(
    (rawUsers: Array<Record<string, unknown>>) => {
      const resolvedOrgId = orgId || getOrgIdFromAuth(getStoredAuthUser())
      setUsers(rawUsers.length > 0 ? formatUsers(rawUsers, resolvedOrgId) : [])
    },
    [orgId]
  )

  const reloadUsers = React.useCallback(
    async (options?: { force?: boolean; showLoading?: boolean }) => {
      const token = getAuthToken(router)
      if (!token) return

      if (options?.showLoading !== false) setIsLoading(true)
      try {
        const rawUsers = await fetchUsersList(token, { force: options?.force })
        applyUsersFromRaw(rawUsers)
      } catch (error) {
        console.error("Error fetching users:", error)
        toast({
          title: "Error",
          description: "Failed to load users. Please try again.",
          variant: "destructive",
        })
      } finally {
        if (options?.showLoading !== false) setIsLoading(false)
      }
    },
    [router, toast, applyUsersFromRaw]
  )

  // Wait for auth hydration so we do not fetch once with orgId=0 and again with the real org.
  // Key off user id (not roleData) so permission-sync updates do not refetch users/roles.
  const authReady = !isAuthLoading && Boolean(userData)
  const currentUserId = resolveAuthUserId(userData ?? {})

  React.useEffect(() => {
    if (!authReady || !currentUserId) return

    let cancelled = false

    const loadInitialData = async () => {
      const token = getAuthToken(router)
      if (!token) return

      setIsLoading(true)
      try {
        const resolvedOrgId = orgId || getOrgIdFromAuth(userData)
        const [rawUsers, roleOptions] = await Promise.all([
          fetchUsersList(token),
          fetchRoles(resolvedOrgId, token),
        ])

        if (cancelled) return

        applyUsersFromRaw(rawUsers)
        setRoles(
          roleOptions.map((role) => ({
            _id: role.id,
            name: role.name,
          }))
        )
      } catch (error) {
        if (cancelled) return
        console.error("Error loading user management data:", error)
        toast({
          title: "Error",
          description: "Failed to load users. Please try again.",
          variant: "destructive",
        })
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadInitialData()
    return () => {
      cancelled = true
    }
    // userData intentionally omitted: only currentUserId / orgId gate reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [authReady, currentUserId, orgId, router, toast, applyUsersFromRaw])

  const visibleUsers = React.useMemo(() => {
    return users.filter((user) => {
      if (accessibleBranchIds !== "all") {
        if (hasAllBranchAccess(user.role_tier)) return true
        if (!user.branch_id || !accessibleBranchIds.includes(user.branch_id)) return false
      }

      return matchesBranchFilter(user.branch_id, branchFilter)
    })
  }, [users, accessibleBranchIds, branchFilter])

  const filteredUsers = React.useMemo(
    () =>
      visibleUsers.filter(
        (user) =>
          (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ROLE_TIER_LABELS[user.role_tier].toLowerCase().includes(searchTerm.toLowerCase()) ||
            (roles.find((r) => r._id === user.role)?.name ?? user.role_name ?? "")
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            (user.branch_id ? getBranchName(user.branch_id) : "")
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) &&
          (activeTab === "active" ? user.status === "Active" : user.status === "Inactive")
      ),
    [visibleUsers, searchTerm, activeTab, roles, getBranchName]
  )

  const sortedUsers = React.useMemo(() => {
    if (!sortColumn) return filteredUsers
    return [...filteredUsers].sort((a, b) => {
      const aVal = String(a[sortColumn as keyof User] ?? "")
      const bVal = String(b[sortColumn as keyof User] ?? "")
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }, [filteredUsers, sortColumn, sortDirection])

  const activeUserCount = visibleUsers.filter((user) => user.status === "Active").length
  const inactiveUserCount = visibleUsers.filter((user) => user.status === "Inactive").length

  const persistUserMeta = (userId: string, role_tier: RoleTier, branch_id?: string) => {
    const resolvedOrgId = orgId || getOrgIdFromAuth(getStoredAuthUser())
    if (resolvedOrgId) {
      const normalizedBranchId = branch_id
        ? resolveBranchObjectId(branch_id, resolvedOrgId) ?? branch_id
        : undefined
      setUserRoleMeta(resolvedOrgId, userId, { role_tier, branch_id: normalizedBranchId })
    }
  }

  const handleSort = (column: string) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const handleAddUser = async (formData: UserFormData): Promise<boolean> => {
    const token = getAuthToken(router)
    if (!token) return false

    try {
      const response = await fetch(URLS.ADD_USER, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          role_tier: formData.role_tier,
          branch_id: formData.branch_id ?? "",
        }),
      })

      const data = await response.json()
      if (!response.ok || data.code === 400) {
        toast({
          title: "Error",
          description: data.msg || "Failed to add user.",
          variant: "destructive",
        })
        return false
      }

      const newUserId = String(data.data?._id ?? data.data?.id ?? "")
      if (newUserId) {
        persistUserMeta(newUserId, formData.role_tier, formData.branch_id)
      }

      invalidateUsersListCache()
      await reloadUsers({ force: true, showLoading: false })
      toast({ title: "Success", description: "User added successfully!" })
      return true
    } catch (error) {
      console.error("Error adding user:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }

  const handleSaveEdit = async (user: EditableUser): Promise<boolean> => {
    const token = getAuthToken(router)
    if (!token) return false

    const originalUser = users.find((u) => u.id === user.id)
    const role = isSuperAdminUser(originalUser ?? user) ? originalUser!.role : user.role
    const role_tier = isSuperAdminUser(originalUser ?? user)
      ? originalUser!.role_tier
      : user.role_tier
    const branch_id = isSuperAdminUser(originalUser ?? user)
      ? originalUser!.branch_id
      : user.branch_id

    try {
      const response = await fetch(`${URLS.USER_UPDATE}/${user.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          phone: user.phone,
          role,
          role_tier,
          branch_id: branch_id ?? "",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.msg || "Failed to update user.",
          variant: "destructive",
        })
        return false
      }

      if (!isSuperAdminUser(originalUser ?? user)) {
        persistUserMeta(user.id, role_tier, branch_id)
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? {
                ...u,
                ...user,
                role,
                role_tier,
                branch_id,
              }
            : u
        )
      )
      toast({ title: "Success", description: "User updated successfully!" })
      return true
    } catch (error) {
      console.error("Error updating user:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }

  const handleSaveUserDetails = async (details: UserDetailsSavePayload): Promise<boolean> => {
    if (!selectedUser) return false

    const token = getAuthToken(router)
    if (!token) return false

    try {
      const response = await fetch(`${URLS.USER_UPDATE}/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: selectedUser.name,
          email: selectedUser.email,
          phone: selectedUser.phone,
          role: selectedUser.role,
          role_tier: selectedUser.role_tier,
          branch_id: selectedUser.branch_id ?? "",
          aadhaar_number: details.aadhaar_number,
          pan_number: details.pan_number,
          address: details.address,
          source: details.source,
          referred_by: details.referred_by,
          reference_contact_number: details.reference_contact_number,
          passport_number: details.passport_number,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.msg || "Failed to update user details.",
          variant: "destructive",
        })
        return false
      }

      const updatedDetails = {
        aadhaar_number: details.aadhaar_number || undefined,
        pan_number: details.pan_number || undefined,
        address: details.address || undefined,
        source: details.source || undefined,
        referred_by: details.referred_by || undefined,
        reference_contact_number: details.reference_contact_number || undefined,
        passport_number: details.passport_number || undefined,
      }

      setUsers((prev) =>
        prev.map((user) =>
          user.id === selectedUser.id ? { ...user, ...updatedDetails } : user
        )
      )
      setSelectedUser((prev) => (prev ? { ...prev, ...updatedDetails } : prev))
      toast({ title: "Success", description: "User details updated successfully!" })
      setIsPermissionSheetOpen(false)
      setSelectedUser(null)
      return true
    } catch (error) {
      console.error("Error updating user details:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }

  const handleUploadAadhaarDocument = async (file: File): Promise<string | null> => {
    if (!selectedUser) return null

    const token = getAuthToken(router)
    if (!token) return null

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, WEBP, or PDF file.",
        variant: "destructive",
      })
      return null
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Aadhaar document must be under 5 MB.",
        variant: "destructive",
      })
      return null
    }

    try {
      const formData = new FormData()
      formData.append("name", selectedUser.name)
      formData.append("email", selectedUser.email)
      formData.append("phone", selectedUser.phone)
      formData.append("role", selectedUser.role)
      formData.append("role_tier", selectedUser.role_tier)
      formData.append("branch_id", selectedUser.branch_id ?? "")
      formData.append("aadhaar_number", selectedUser.aadhaar_number ?? "")
      formData.append("pan_number", selectedUser.pan_number ?? "")
      formData.append("address", selectedUser.address ?? "")
      formData.append("source", selectedUser.source ?? "")
      formData.append("referred_by", selectedUser.referred_by ?? "")
      formData.append("reference_contact_number", selectedUser.reference_contact_number ?? "")
      formData.append("passport_number", selectedUser.passport_number ?? "")
      formData.append("aadhaar_document", file)

      const response = await fetch(`${URLS.USER_UPDATE}/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()
      if (!response.ok || data.code === 400) {
        toast({
          title: "Error",
          description: data.msg || "Failed to upload Aadhaar document.",
          variant: "destructive",
        })
        return null
      }

      const uploadedDocument = String(
        data.data?.aadhaar_document ?? data.data?.aadhaar_doc ?? file.name
      )

      setUsers((prev) =>
        prev.map((user) =>
          user.id === selectedUser.id
            ? { ...user, aadhaar_document: uploadedDocument }
            : user
        )
      )
      setSelectedUser((prev) =>
        prev ? { ...prev, aadhaar_document: uploadedDocument } : prev
      )
      toast({ title: "Success", description: "Aadhaar document uploaded successfully!" })
      return uploadedDocument
    } catch (error) {
      console.error("Error uploading Aadhaar document:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
      return null
    }
  }

  const handleUploadPanDocument = async (file: File): Promise<string | null> => {
    if (!selectedUser) return null

    const token = getAuthToken(router)
    if (!token) return null

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, WEBP, or PDF file.",
        variant: "destructive",
      })
      return null
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "PAN document must be under 5 MB.",
        variant: "destructive",
      })
      return null
    }

    try {
      const formData = new FormData()
      formData.append("name", selectedUser.name)
      formData.append("email", selectedUser.email)
      formData.append("phone", selectedUser.phone)
      formData.append("role", selectedUser.role)
      formData.append("role_tier", selectedUser.role_tier)
      formData.append("branch_id", selectedUser.branch_id ?? "")
      formData.append("aadhaar_number", selectedUser.aadhaar_number ?? "")
      formData.append("pan_number", selectedUser.pan_number ?? "")
      formData.append("address", selectedUser.address ?? "")
      formData.append("source", selectedUser.source ?? "")
      formData.append("referred_by", selectedUser.referred_by ?? "")
      formData.append("reference_contact_number", selectedUser.reference_contact_number ?? "")
      formData.append("passport_number", selectedUser.passport_number ?? "")
      formData.append("pan_document", file)

      const response = await fetch(`${URLS.USER_UPDATE}/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()
      if (!response.ok || data.code === 400) {
        toast({
          title: "Error",
          description: data.msg || "Failed to upload PAN document.",
          variant: "destructive",
        })
        return null
      }

      const uploadedDocument = String(
        data.data?.pan_document ?? data.data?.pan_doc ?? file.name
      )

      setUsers((prev) =>
        prev.map((user) =>
          user.id === selectedUser.id ? { ...user, pan_document: uploadedDocument } : user
        )
      )
      setSelectedUser((prev) =>
        prev ? { ...prev, pan_document: uploadedDocument } : prev
      )
      toast({ title: "Success", description: "PAN document uploaded successfully!" })
      return uploadedDocument
    } catch (error) {
      console.error("Error uploading PAN document:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
      return null
    }
  }

  const handleUserStatusChange = async (userId: string, currentStatus: string) => {
    const targetUser = users.find((user) => user.id === userId)
    if (targetUser && isSuperAdminUser(targetUser) && currentStatus === "Active") {
      toast({
        title: "Action blocked",
        description: "Super Admin users cannot be deactivated.",
        variant: "destructive",
      })
      return
    }

    const newStatus = currentStatus === "Active" ? "inactive" : "active"
    const originalUsers = [...users]

    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.id === userId
          ? { ...user, status: newStatus === "active" ? "Active" : "Inactive" }
          : user
      )
    )

    const token = getAuthToken(router)
    if (!token) return

    try {
      const response = await fetch(`${URLS.USER_CHANGE_STATUS}/${userId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()
      if (response.ok && data.code === 200) {
        invalidateUsersListCache()
        toast({
          title: "Success",
          description: data.msg || "User status successfully updated!",
        })
      } else {
        setUsers(originalUsers)
        toast({
          title: "Error",
          description: data?.msg || "Failed to update user status.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating user status:", error)
      setUsers(originalUsers)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleResetPassword = async (email: string) => {
    try {
      const response = await fetch(URLS.FORGOT_PASSWORD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()
      if (response.ok) {
        toast({
          title: "Password Reset",
          description: data.msg || "Reset password link sent to registered email.",
        })
      } else {
        toast({
          title: "Error",
          description: data.msg || "Failed to send reset password link.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error resetting password:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUserSelect = async (user: User) => {
    const authUser = getStoredAuthUser()
    if (!authUser || !canManageTargetUser(authUser, user)) {
      toast({
        title: "Access denied",
        description: "You cannot manage permissions for this user.",
        variant: "destructive",
      })
      return
    }

    setSelectedUser(user)
    setIsPermissionSheetOpen(true)
    setIsLoadingPermissions(true)

    const token = getAuthToken(router)
    if (!token) {
      setIsLoadingPermissions(false)
      return
    }

    // fetchUserPermissions already loads (and caches) the permission catalog.
    const permissions = await fetchUserPermissions(user.id, token)
    const catalog = await fetchPermissionCatalog(token)
    setPermissionModules(catalog.modules)
    setModulePermissions(permissions ?? buildEmptyPermissions(catalog))

    setIsLoadingPermissions(false)
  }

  const togglePermission = async (functionId: string) => {
    if (!selectedUser) return

    if (isSuperAdminUser(selectedUser)) {
      toast({
        title: "Action blocked",
        description: "Super Admin permissions cannot be modified.",
        variant: "destructive",
      })
      return
    }

    const authUser = getStoredAuthUser()
    const tier = authUser ? getRoleTier(authUser) : "branch_user"
    if (
      (tier === "branch_manager" || tier === "branch_user") &&
      !currentUserPermissions[functionId]
    ) {
      toast({
        title: "Access denied",
        description: "You can only grant permissions that you have.",
        variant: "destructive",
      })
      return
    }

    const newValue = !modulePermissions[functionId]
    setModulePermissions((prev) => ({ ...prev, [functionId]: newValue }))

    const token = getAuthToken(router)
    if (!token) {
      setModulePermissions((prev) => ({ ...prev, [functionId]: !newValue }))
      return
    }

    const result = await updateUserPermission(selectedUser.id, functionId, newValue, token)
    if ("permissions" in result) {
      setModulePermissions(result.permissions)

      // If we just edited the signed-in user's overrides, refresh their session
      // permissions so nav/actions match Active User permission changes immediately.
      const currentUserId = resolveAuthUserId(getStoredAuthUser() ?? {})
      if (currentUserId && currentUserId === selectedUser.id) {
        patchAuthUserRolePermissions(result.permissions)
        setCurrentUserPermissions(result.permissions)
      }

      toast({
        title: "Permission Updated",
        description: `Permission has been ${newValue ? "enabled" : "disabled"} for this user.`,
      })
    } else {
      setModulePermissions((prev) => ({ ...prev, [functionId]: !newValue }))
      toast({
        title: "Error",
        description: result.error || "Failed to update permission. Please try again.",
        variant: "destructive",
      })
    }
  }

  const canEditPermissions =
    (currentTier === "super_admin" ||
      currentTier === "admin" ||
      currentTier === "branch_manager" ||
      currentUserPermissions.manage_users === true ||
      currentUserPermissions.manage_roles === true) &&
    (!selectedUser || !isSuperAdminUser(selectedUser))

  const canEditUserDetails =
    currentTier === "super_admin" ||
    currentTier === "admin" ||
    currentTier === "branch_manager" ||
    currentUserPermissions.manage_users === true

  const defaultBranchId =
    accessibleBranchIds !== "all" ? accessibleBranchIds[0] : undefined

  const activeBranches = React.useMemo(
    () => branches.filter((branch) => branch.status === "active"),
    [branches]
  )

  const filterableBranches = React.useMemo(() => {
    if (accessibleBranchIds === "all") return activeBranches

    const scoped = activeBranches.filter((branch) =>
      accessibleBranchIds.includes(branch.id)
    )

    return scoped.length > 0 ? scoped : activeBranches
  }, [activeBranches, accessibleBranchIds])

  const dynamicBranchFilterOptions = React.useMemo(() => {
    const branchIdsWithUsers = new Set<string>()

    for (const user of users) {
      if (user.branch_id) {
        branchIdsWithUsers.add(user.branch_id)
      }
    }

    const fromCatalog = filterableBranches.filter((branch) => branchIdsWithUsers.has(branch.id))
    const catalogIds = new Set(fromCatalog.map((branch) => branch.id))

    const fromUsers: Branch[] = Array.from(branchIdsWithUsers)
      .filter((id) => !catalogIds.has(id))
      .map((id) => ({
        id,
        org_id: orgId || 0,
        name: getBranchName(id),
        code: id.slice(0, 3).toUpperCase(),
        status: "active" as const,
      }))

    return [...fromCatalog, ...fromUsers].sort((a, b) => a.name.localeCompare(b.name))
  }, [users, filterableBranches, getBranchName, orgId])

  React.useEffect(() => {
    if (
      branchFilter !== "all" &&
      !dynamicBranchFilterOptions.some((branch) => branch.id === branchFilter)
    ) {
      setBranchFilter("all")
    }
  }, [branchFilter, dynamicBranchFilterOptions])

  const getRoleName = (user: User) =>
    user.role_name || roles.find((role) => role._id === user.role)?.name || "Unknown Role"

  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) return null
    return sortDirection === "asc" ? (
      <ChevronUp className="ml-1 inline h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 inline h-4 w-4" />
    )
  }

  const renderUserTable = () => {
    if (isLoading) {
      return <UsersTableSkeleton />
    }

    if (sortedUsers.length === 0) {
      return (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No users found.
        </div>
      )
    }

    return (
      <div className="responsive-table-wrap">
      <Table className="min-w-[800px]">
        <TableHeader>
          <TableRow>
            <TableHead
              className="w-[180px] cursor-pointer text-left"
              onClick={() => handleSort("name")}
            >
              Name {renderSortIcon("name")}
            </TableHead>
            <TableHead
              className="w-[220px] cursor-pointer text-left"
              onClick={() => handleSort("email")}
            >
              Email {renderSortIcon("email")}
            </TableHead>
            <TableHead className="w-[140px] text-left">Phone</TableHead>
            <TableHead
              className="w-[130px] cursor-pointer text-left"
              onClick={() => handleSort("role_tier")}
            >
              Tier {renderSortIcon("role_tier")}
            </TableHead>
            <TableHead className="w-[120px] text-left">Branch</TableHead>
            <TableHead
              className="w-[140px] cursor-pointer text-left"
              onClick={() => handleSort("role")}
            >
              Permission Role {renderSortIcon("role")}
            </TableHead>
            <TableHead
              className="w-[200px] cursor-pointer text-left"
              onClick={() => handleSort("created")}
            >
              Created {renderSortIcon("created")}
            </TableHead>
            <TableHead className="w-[100px] text-left">Status</TableHead>
            <TableHead className="w-[80px] text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedUsers.map((user) => (
            <TableRow key={user.id} className="[&>td]:py-2">
              <TableCell className="font-medium">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="cursor-pointer text-left text-primary hover:underline"
                        onClick={() => handleUserSelect(user)}
                      >
                        {user.name}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>Click to view/manage permissions</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
              <TableCell className="text-muted-foreground">{user.email}</TableCell>
              <TableCell className="text-muted-foreground">{user.phone || "—"}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="font-normal">
                  {ROLE_TIER_LABELS[user.role_tier]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {user.branch_id ? getBranchName(user.branch_id) : "All"}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={themePrimaryBadgeClassName}>
                  {getRoleName(user)}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDateForAgeing(user.created)}
              </TableCell>
              <TableCell>
                <Badge
                  className={
                    user.status === "Active"
                      ? "bg-green-500 font-normal text-white hover:bg-green-600"
                      : "bg-orange-500 font-normal text-white hover:bg-orange-600"
                  }
                >
                  {user.status}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[180px]">
                      {user.status === "Active" && (
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => {
                            setUserToEdit({ ...user })
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onSelect={() => handleResetPassword(user.email)}
                      >
                        <KeyRound className="mr-2 h-4 w-4" />
                        <span>Reset Password</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={`cursor-pointer ${
                          user.status === "Active"
                            ? "text-red-600 focus:text-red-600"
                            : "text-green-600 focus:text-green-600"
                        }`}
                        disabled={user.status === "Active" && isSuperAdminUser(user)}
                        onClick={() => handleUserStatusChange(user.id, user.status)}
                      >
                        {user.status === "Active" ? (
                          <>
                            <UserMinus className="mr-2 h-4 w-4" />
                            <span>Make Inactive</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-2 h-4 w-4" />
                            <span>Make Active</span>
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {ROLE_TIER_LABELS[currentTier]}
            {currentTier === "branch_manager" || currentTier === "branch_user"
              ? ` · ${getBranchName(defaultBranchId ?? "")}`
              : ""}
          </p>
        </div>
        {canAddUsers && (
          <AddUserDialog
            roles={roles}
            assignableTiers={assignableTiers}
            branches={filterableBranches}
            branchesLoading={branchesLoading}
            defaultBranchId={defaultBranchId}
            onSave={handleAddUser}
          />
        )}
      </div>

      <Card className="border-none shadow-sm">
        <CardContent>
          {hasAllBranchAccess(currentTier) && dynamicBranchFilterOptions.length > 0 && (
            <div className="mb-4">
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="h-9 w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by branch" />
                </SelectTrigger>
                <FormSelectContent>
                  <FormSelectItem value="all">All Branches</FormSelectItem>
                  {dynamicBranchFilterOptions.map((branch) => (
                    <FormSelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </FormSelectItem>
                  ))}
                </FormSelectContent>
              </Select>
            </div>
          )}

          <Tabs defaultValue="active" className="w-full" onValueChange={setActiveTab}>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                <TabsTrigger value="active">
                  Active Users ({activeUserCount})
                </TabsTrigger>
                <TabsTrigger value="inactive">
                  Inactive Users ({inactiveUserCount})
                </TabsTrigger>
              </TabsList>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search users..."
                  className="h-9 pl-8 pr-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <TabsContent value="active" className="mt-0">
              {renderUserTable()}
            </TabsContent>
            <TabsContent value="inactive" className="mt-0">
              {renderUserTable()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <EditUserDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        user={userToEdit}
        roles={roles}
        branches={filterableBranches}
        assignableTiers={editAssignableTiers}
        protectRoleAndTier={userToEdit ? isSuperAdminUser(userToEdit) : false}
        onSave={handleSaveEdit}
      />

      <UserPermissionsSheet
        open={isPermissionSheetOpen}
        onOpenChange={(open) => {
          setIsPermissionSheetOpen(open)
          if (!open) {
            setSelectedUser(null)
          }
        }}
        user={selectedUser}
        permissions={modulePermissions}
        permissionModules={permissionModules}
        isLoading={isLoadingPermissions}
        canEdit={canEditUserDetails}
        canEditPermissions={canEditPermissions}
        currentTier={currentTier}
        currentUserPermissions={currentUserPermissions}
        onTogglePermission={togglePermission}
        onSaveDetails={handleSaveUserDetails}
        onUploadAadhaarDocument={handleUploadAadhaarDocument}
        onUploadPanDocument={handleUploadPanDocument}
      />
    </div>
  )
}
