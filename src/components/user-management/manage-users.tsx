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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import URLS from "@/config/urls"
import { permissionModules as modules } from "@/config/permissions-modules"
import {
  AUTH_USER_STORAGE_KEY,
  ROLE_TIER_LABELS,
  type RoleTier,
  canCreateUsers,
  canManageTargetUser,
  getAllUserRoleMeta,
  getAssignableTiers,
  getOrgIdFromAuth,
  getPermissionsFromRoleData,
  getRoleTier,
  getStoredAuthUser,
  hasAllBranchAccess,
  setUserRoleMeta,
} from "@/lib/auth"
import { useUserData } from "@/hooks/useUserData"
import { parseJsonResponse } from "@/lib/api"
import { cn } from "@/lib/utils"
import { formatDateForAgeing } from "@/lib/date-ageing"
import {
  themePrimaryAvatarClassName,
  themePrimaryBadgeClassName,
} from "@/lib/form-field-styles"
import { AddUserDialog, type UserFormData } from "./add-user-dialog"
import { EditUserDialog, type EditableUser } from "./edit-user-dialog"

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

function normalizeBranchId(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined
  return String(value)
}

async function fetchUsersList(token: string): Promise<Array<Record<string, unknown>>> {
  try {
    const response = await fetch(URLS.USERS_LIST, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) return []

    const result = await parseJsonResponse<Record<string, unknown>>(response)
    return extractUsersFromApiResponse(result.data ?? result)
  } catch {
    return []
  }
}

async function fetchRolesList(token: string): Promise<Role[]> {
  try {
    const response = await fetch(URLS.ROLES, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) return []

    const result = await parseJsonResponse<unknown>(response)
    const items = Array.isArray(result)
      ? extractUsersFromApiResponse(result)
      : extractUsersFromApiResponse((result as Record<string, unknown>).data ?? result)

    return items
      .map((role) => ({
        _id: resolveUserId(role),
        name: String(role.role_name ?? role.name ?? "Unknown Role"),
      }))
      .filter((role) => role._id)
  } catch {
    return []
  }
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
      const apiBranch = normalizeBranchId(user.branch_id)

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

  const [selectedUser, setSelectedUser] = React.useState<User | null>(null)
  const [isPermissionSheetOpen, setIsPermissionSheetOpen] = React.useState(false)
  const [isLoadingPermissions, setIsLoadingPermissions] = React.useState(false)
  const [selectedUserRoleId, setSelectedUserRoleId] = React.useState<string | null>(null)
  const [modulePermissions, setModulePermissions] = React.useState<Record<string, boolean>>({})

  const fetchUsers = React.useCallback(async () => {
    const token = getAuthToken(router)
    if (!token) return

    try {
      setIsLoading(true)
      const rawUsers = await fetchUsersList(token)

      if (rawUsers.length > 0) {
        const authUser = getStoredAuthUser()
        const resolvedOrgId = orgId || getOrgIdFromAuth(authUser)
        setUsers(formatUsers(rawUsers, resolvedOrgId))
      } else {
        setUsers([])
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [router, toast, orgId])

  const fetchRoles = React.useCallback(async () => {
    const token = getAuthToken(router)
    if (!token) return

    try {
      const roleOptions = await fetchRolesList(token)
      if (roleOptions.length > 0) {
        setRoles(roleOptions)
      }
    } catch (error) {
      console.error("Error fetching roles:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching roles.",
        variant: "destructive",
      })
    }
  }, [router, toast])

  React.useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [fetchUsers, fetchRoles])

  const visibleUsers = React.useMemo(() => {
    return users.filter((user) => {
      if (accessibleBranchIds !== "all") {
        if (user.role_tier === "super_admin" || user.role_tier === "admin") return true
        if (!user.branch_id || !accessibleBranchIds.includes(user.branch_id)) return false
      }

      if (branchFilter !== "all") {
        if (user.role_tier === "super_admin" || user.role_tier === "admin") return true
        return user.branch_id === branchFilter
      }

      return true
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
      setUserRoleMeta(resolvedOrgId, userId, { role_tier, branch_id })
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

      await fetchUsers()
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
          role: user.role,
          role_tier: user.role_tier,
          branch_id: user.branch_id ?? "",
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

      persistUserMeta(user.id, user.role_tier, user.branch_id)

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, ...user } : u))
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

  const handleUserStatusChange = async (userId: string, currentStatus: string) => {
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
        await fetchUsers()
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

  const fetchRolePermissions = async (roleId: string) => {
    const token = getAuthToken(router)
    if (!token) return null

    try {
      const response = await fetch(URLS.ADD_ROLES_LIST, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) return null

      const data = await response.json()
      if (data.code === 200 && data.data?.items) {
        const roleData = data.data.items.find(
          (item: { _id: string }) => item._id === roleId
        )
        if (roleData) {
          const permissions: Record<string, boolean> = {}
          Object.keys(roleData).forEach((key) => {
            if (typeof roleData[key] === "number" && key !== "_id" && key !== "role_name") {
              permissions[key] = roleData[key] === 1
            }
          })
          return permissions
        }
      }
      return null
    } catch (error) {
      console.error("Error fetching role permissions:", error)
      return null
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
    setSelectedUserRoleId(user.role)

    const permissions = await fetchRolePermissions(user.role)
    if (permissions) {
      setModulePermissions(permissions)
    } else {
      const initialPermissions: Record<string, boolean> = {}
      modules.forEach((module) => {
        module.functions.forEach((func) => {
          initialPermissions[func.id] = false
        })
      })
      setModulePermissions(initialPermissions)
    }

    setIsLoadingPermissions(false)
  }

  const updatePermissionApi = async (
    roleId: string,
    permissionKey: string,
    value: boolean
  ) => {
    const token = getAuthToken(router)
    if (!token) return false

    try {
      const response = await fetch(`${URLS.ROLES_UPDATE}/${roleId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [permissionKey]: value ? 1 : 0 }),
      })

      const data = await response.json()
      return data.code === 200
    } catch (error) {
      console.error("Error updating permission:", error)
      return false
    }
  }

  const togglePermission = async (functionId: string) => {
    if (!selectedUserRoleId) return

    const authUser = getStoredAuthUser()
    const tier = authUser ? getRoleTier(authUser) : "branch_user"
    if (tier === "branch_manager" && !currentUserPermissions[functionId]) {
      toast({
        title: "Access denied",
        description: "You can only grant permissions that you have.",
        variant: "destructive",
      })
      return
    }

    const newValue = !modulePermissions[functionId]
    setModulePermissions((prev) => ({ ...prev, [functionId]: newValue }))

    const success = await updatePermissionApi(selectedUserRoleId, functionId, newValue)
    if (success) {
      toast({
        title: "Permission Updated",
        description: `Permission has been ${newValue ? "enabled" : "disabled"}.`,
      })
    } else {
      setModulePermissions((prev) => ({ ...prev, [functionId]: !newValue }))
      toast({
        title: "Error",
        description: "Failed to update permission. Please try again.",
        variant: "destructive",
      })
    }
  }

  const canEditPermissions = currentTier !== "branch_user"

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
      <Table>
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
          {hasAllBranchAccess(currentTier) && filterableBranches.length > 0 && (
            <div className="mb-4">
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="h-9 w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by branch" />
                </SelectTrigger>
                <FormSelectContent>
                  <FormSelectItem value="all">All Branches</FormSelectItem>
                  {filterableBranches.map((branch) => (
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
        assignableTiers={assignableTiers}
        onSave={handleSaveEdit}
      />

      <Sheet
        open={isPermissionSheetOpen}
        onOpenChange={(open) => {
          setIsPermissionSheetOpen(open)
          if (!open) {
            setSelectedUser(null)
            setSelectedUserRoleId(null)
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="text-xl font-semibold">User Permissions</SheetTitle>
            {selectedUser && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold",
                      themePrimaryAvatarClassName
                    )}
                  >
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{selectedUser.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className={themePrimaryBadgeClassName}>
                    {ROLE_TIER_LABELS[selectedUser.role_tier]}
                  </Badge>
                  <Badge variant="outline" className={themePrimaryBadgeClassName}>
                    {getRoleName(selectedUser)}
                  </Badge>
                  {selectedUser.branch_id && (
                    <Badge variant="outline">{getBranchName(selectedUser.branch_id)}</Badge>
                  )}
                  <Badge
                    className={
                      selectedUser.status === "Active"
                        ? "bg-green-500 text-white"
                        : "bg-orange-500 text-white"
                    }
                  >
                    {selectedUser.status}
                  </Badge>
                </div>
              </div>
            )}
          </SheetHeader>

          <div className="py-4">
            {isLoadingPermissions ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                <span className="ml-3 text-muted-foreground">Loading permissions...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="mb-4 text-sm text-muted-foreground">
                  {canEditPermissions
                    ? "Manage permissions for this user's role. Changes are saved automatically."
                    : "You have view-only access to this user's permissions."}
                </p>
                {modules.map((module) => (
                  <Collapsible
                    key={module.id}
                    className="overflow-hidden rounded-lg border"
                    defaultOpen={false}
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between p-3 transition-colors hover:bg-muted/50">
                      <span className="text-sm font-semibold" style={{ color: module.color }}>
                        {module.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {module.functions.filter((f) => modulePermissions[f.id]).length}/
                          {module.functions.length} enabled
                        </span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t bg-muted/30">
                        {module.functions.map((func, index) => {
                          const managerBlocked =
                            currentTier === "branch_manager" &&
                            !currentUserPermissions[func.id]
                          const switchDisabled = !canEditPermissions || managerBlocked

                          return (
                          <div
                            key={func.id}
                            className={`flex items-center justify-between p-3 transition-colors hover:bg-muted/50 ${
                              index !== module.functions.length - 1
                                ? "border-b border-border"
                                : ""
                            }`}
                          >
                            <div className="flex-1 pr-4">
                              <p className="text-sm font-medium text-foreground">{func.name}</p>
                              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                {func.description}
                              </p>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-2">
                              <span
                                className={`text-xs font-medium ${
                                  modulePermissions[func.id] ? "text-primary" : "text-muted-foreground"
                                }`}
                              >
                                {modulePermissions[func.id] ? "ON" : "OFF"}
                              </span>
                              <Switch
                                checked={modulePermissions[func.id] || false}
                                onCheckedChange={() => togglePermission(func.id)}
                                disabled={switchDisabled}
                                className="data-[state=checked]:bg-primary"
                              />
                            </div>
                          </div>
                          )
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
