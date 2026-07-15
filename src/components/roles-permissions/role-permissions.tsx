"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, MoreVertical, Plus, Shield } from "lucide-react"

import { RoleFormDialog } from "@/components/roles-permissions/role-form-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import {
  FormSelectContent,
  FormSelectItem,
  Select,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useUserData } from "@/hooks/useUserData"
import {
  buildEmptyPermissions,
  createRole,
  deleteRole,
  fetchPermissionCatalog,
  fetchRolePermissions,
  fetchRoles,
  mergePermissionsWithCatalog,
  ROLES_UPDATED_EVENT,
  type PermissionModule,
  type Role,
  updateRoleName,
  updateRolePermission,
} from "@/lib/roles/roles-api"
import { getApiErrorMessage } from "@/lib/api"
import {
  formSelectTriggerClassName,
  themePrimaryButtonSmClassName,
} from "@/lib/form-field-styles"
import { getOrgIdFromAuth, getStoredAuthUser } from "@/lib/auth"
import { cn } from "@/lib/utils"

interface RolePermissionsProps {
  embedded?: boolean
}

function PermissionsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  )
}

export function RolePermissions({ embedded = false }: RolePermissionsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { orgId, userData, isAuthLoading, canManageRoles } = useUserData()

  const [roles, setRoles] = React.useState<Role[]>([])
  const [permissionModules, setPermissionModules] = React.useState<PermissionModule[]>([])
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>("")
  const [permissions, setPermissions] = React.useState<Record<string, boolean>>({})
  const [isLoadingRoles, setIsLoadingRoles] = React.useState(true)
  const [isLoadingCatalog, setIsLoadingCatalog] = React.useState(true)
  const [isLoadingPermissions, setIsLoadingPermissions] = React.useState(false)
  const [updatingPermissionId, setUpdatingPermissionId] = React.useState<string | null>(null)

  const [formDialogOpen, setFormDialogOpen] = React.useState(false)
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create")
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const resolvedOrgId = orgId || getOrgIdFromAuth(getStoredAuthUser())
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null
  const rolesRef = React.useRef(roles)
  const isUpdatingPermissionRef = React.useRef(false)
  const loadRolesPromiseRef = React.useRef<Promise<void> | null>(null)

  React.useEffect(() => {
    rolesRef.current = roles
  }, [roles])

  const loadCatalog = React.useCallback(async () => {
    setIsLoadingCatalog(true)
    try {
      const catalog = await fetchPermissionCatalog()
      setPermissionModules(catalog.modules)
    } catch (error) {
      console.error("Error loading permission catalog:", error)
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to load permission catalog."),
        variant: "destructive",
      })
      setPermissionModules([])
    } finally {
      setIsLoadingCatalog(false)
    }
  }, [toast])

  const loadRoles = React.useCallback(async (force = false) => {
    if (!resolvedOrgId) {
      setRoles([])
      setIsLoadingRoles(false)
      return
    }

    if (!force && loadRolesPromiseRef.current) {
      await loadRolesPromiseRef.current
      return
    }

    setIsLoadingRoles(true)

    const task = (async () => {
      try {
        const list = await fetchRoles(resolvedOrgId, undefined, { force })
        setRoles(list)

        setSelectedRoleId((current) => {
          if (current && list.some((role) => role.id === current)) return current
          return list[0]?.id ?? ""
        })
      } catch (error) {
        console.error("Error loading roles:", error)
        toast({
          title: "Error",
          description: getApiErrorMessage(error, "Failed to load roles."),
          variant: "destructive",
        })
      } finally {
        setIsLoadingRoles(false)
        loadRolesPromiseRef.current = null
      }
    })()

    loadRolesPromiseRef.current = task
    await task
  }, [resolvedOrgId, toast])

  React.useEffect(() => {
    if (isAuthLoading || !userData) return
    void loadCatalog()
    void loadRoles()
  }, [isAuthLoading, userData, loadCatalog, loadRoles])

  React.useEffect(() => {
    const handleRolesUpdated = () => {
      if (isUpdatingPermissionRef.current) return
      void loadRoles(true)
    }

    window.addEventListener(ROLES_UPDATED_EVENT, handleRolesUpdated)
    return () => {
      window.removeEventListener(ROLES_UPDATED_EVENT, handleRolesUpdated)
    }
  }, [loadRoles])

  React.useEffect(() => {
    if (!selectedRoleId || !resolvedOrgId) {
      setPermissions({})
      setIsLoadingPermissions(false)
      return
    }

    if (isLoadingRoles || isLoadingCatalog) {
      setIsLoadingPermissions(true)
      return
    }

    let cancelled = false
    setIsLoadingPermissions(true)

    void (async () => {
      const catalog = await fetchPermissionCatalog()
      const fetchedPermissions = await fetchRolePermissions(selectedRoleId, resolvedOrgId)

      if (cancelled) return

      if (fetchedPermissions) {
        const merged = mergePermissionsWithCatalog(catalog, fetchedPermissions)
        setPermissions(merged)
        setRoles((prev) =>
          prev.map((role) =>
            role.id === selectedRoleId
              ? { ...role, permissions: merged }
              : role
          )
        )
      } else {
        const selectedRoleFromList = rolesRef.current.find((role) => role.id === selectedRoleId)
        setPermissions(
          selectedRoleFromList
            ? mergePermissionsWithCatalog(catalog, selectedRoleFromList.permissions)
            : buildEmptyPermissions(catalog)
        )
      }

      setIsLoadingPermissions(false)
    })()

    return () => {
      cancelled = true
    }
  }, [selectedRoleId, resolvedOrgId, isLoadingRoles, isLoadingCatalog])

  const handleRoleChange = (roleId: string) => {
    setSelectedRoleId(roleId)
  }

  const openCreateDialog = () => {
    setFormMode("create")
    setFormDialogOpen(true)
  }

  const openEditDialog = () => {
    if (!selectedRole) return
    setFormMode("edit")
    setFormDialogOpen(true)
  }

  const handleCreateOrEditRole = async ({ name }: { name: string }) => {
    if (!resolvedOrgId) {
      toast({
        title: "Unable to save role",
        description: "Organization details are still loading. Please try again.",
        variant: "destructive",
      })
      return false
    }

    try {
      if (formMode === "create") {
        const created = await createRole({ name, org_id: resolvedOrgId })
        await loadRoles()
        setSelectedRoleId(created.id)
        toast({
          title: "Role created",
          description: `"${created.name}" has been added. Configure its permissions below.`,
        })
      } else if (selectedRole) {
        await updateRoleName(selectedRole.id, name, resolvedOrgId)
        await loadRoles()
        toast({
          title: "Role updated",
          description: `Role renamed to "${name}".`,
        })
      }
      return true
    } catch (error) {
      console.error("Error saving role:", error)
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to save role."),
        variant: "destructive",
      })
      return false
    }
  }

  const handleDeleteRole = async () => {
    if (!selectedRole || !resolvedOrgId) return

    setIsDeleting(true)
    try {
      await deleteRole(selectedRole.id, resolvedOrgId)
      await loadRoles()
      setDeleteDialogOpen(false)
      toast({
        title: "Role deleted",
        description: `"${selectedRole.name}" has been removed.`,
      })
    } catch (error) {
      console.error("Error deleting role:", error)
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to delete role."),
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const togglePermission = async (permissionId: string, checked: boolean) => {
    if (!selectedRole || !resolvedOrgId) {
      toast({
        title: "Unable to update permission",
        description: "Role data is still loading. Please try again in a moment.",
        variant: "destructive",
      })
      return
    }

    if (!canManageRoles) {
      toast({
        title: "Access denied",
        description: "You don't have permission to manage roles and permissions.",
        variant: "destructive",
      })
      return
    }

    if (updatingPermissionId) return

    const previousValue = permissions[permissionId] ?? false
    if (previousValue === checked) return

    setPermissions((prev) => ({ ...prev, [permissionId]: checked }))
    setUpdatingPermissionId(permissionId)
    isUpdatingPermissionRef.current = true

    const updatedPermissions = await updateRolePermission(
      selectedRole.id,
      permissionId,
      checked,
      resolvedOrgId,
      rolesRef.current
    )

    isUpdatingPermissionRef.current = false
    setUpdatingPermissionId(null)

    if (updatedPermissions) {
      setPermissions({ ...updatedPermissions })
      setRoles((prev) =>
        prev.map((role) =>
          role.id === selectedRole.id
            ? { ...role, permissions: { ...updatedPermissions } }
            : role
        )
      )
    } else {
      setPermissions((prev) => ({ ...prev, [permissionId]: previousValue }))
      toast({
        title: "Error",
        description: "Failed to update permission. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (isAuthLoading || !userData) {
    return (
      <div className={cn("flex w-full flex-col gap-4", !embedded && "mx-auto max-w-3xl pt-2")}>
        <Card className="border-none shadow-sm">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-full" />
            <PermissionsSkeleton />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!canManageRoles) {
    return (
      <div className={cn("flex w-full flex-col gap-4", !embedded && "mx-auto max-w-3xl pt-2")}>
        <Card className="border-none shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Shield className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Access restricted</p>
              <p className="text-sm text-muted-foreground">
                You don&apos;t have permission to manage roles and permissions.
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push("/settings/manage-users")}>
              Back to User Management
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("flex w-full flex-col gap-4", !embedded && "mx-auto max-w-3xl pt-2")}>
      {!embedded && (
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">Role Permissions</h1>
          <p className="text-sm text-muted-foreground">
            Select a role and manage permissions for different functions.
          </p>
        </div>
      )}

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-end sm:gap-3 sm:p-6">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="select-role" className="text-sm font-medium">
                Select Role
              </Label>
              {isLoadingRoles ? (
                <Skeleton className="h-10 w-full rounded-md" />
              ) : (
                <Select
                  value={selectedRoleId || undefined}
                  onValueChange={handleRoleChange}
                  disabled={roles.length === 0}
                >
                  <SelectTrigger
                    id="select-role"
                    size="form"
                    className={formSelectTriggerClassName}
                  >
                    <SelectValue
                      placeholder={roles.length === 0 ? "No roles available" : "Select a role"}
                    />
                  </SelectTrigger>
                  <FormSelectContent>
                    {roles.map((role) => (
                      <FormSelectItem key={role.id} value={role.id}>
                        {role.name}
                        {role.is_system ? " (System)" : ""}
                      </FormSelectItem>
                    ))}
                  </FormSelectContent>
                </Select>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    disabled={!selectedRole || isLoadingRoles}
                  >
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Role actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={openEditDialog} disabled={!selectedRole}>
                    Edit Role
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    disabled={!selectedRole || selectedRole.is_system}
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    Delete Role
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                type="button"
                size="sm"
                className={`${themePrimaryButtonSmClassName} h-10 px-4 text-sm`}
                onClick={openCreateDialog}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add New Role
              </Button>
            </div>
          </div>

          <div className="space-y-3 p-4 sm:p-6">
            {isLoadingRoles || isLoadingCatalog || isLoadingPermissions ? (
              <PermissionsSkeleton />
            ) : roles.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
                <Shield className="h-8 w-8 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">No roles yet</p>
                  <p className="text-sm text-muted-foreground">
                    Create your first role to start assigning permissions.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className={themePrimaryButtonSmClassName}
                  onClick={openCreateDialog}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add New Role
                </Button>
              </div>
            ) : permissionModules.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
                <Shield className="h-8 w-8 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">No permissions available</p>
                  <p className="text-sm text-muted-foreground">
                    Permission definitions could not be loaded from the server.
                  </p>
                </div>
              </div>
            ) : (
              permissionModules.map((module, moduleIndex) => (
                <Collapsible
                  key={module.id}
                  className="group/collapsible overflow-hidden rounded-lg border"
                  defaultOpen={moduleIndex === 0}
                >
                  <CollapsibleTrigger className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50">
                    <span
                      className="min-w-0 flex-1 truncate text-sm font-semibold"
                      style={{ color: module.color }}
                    >
                      {module.name}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {module.functions.filter((func) => permissions[func.id]).length}/
                        {module.functions.length}
                        <span className="hidden sm:inline"> enabled</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-in-out group-data-[state=open]/collapsible:rotate-90" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out data-[state=closed]:grid-rows-[0fr] data-[state=open]:grid-rows-[1fr]">
                    <div className="min-h-0 overflow-hidden">
                      <div className="border-t bg-muted/30">
                        {module.functions.map((func, index) => (
                          <div
                            key={func.id}
                            className={cn(
                              "flex items-center justify-between p-3 transition-colors hover:bg-muted/50",
                              index !== module.functions.length - 1 && "border-b border-border"
                            )}
                          >
                            <div className="flex-1 pr-4">
                              <p className="text-sm font-medium text-foreground">{func.name}</p>
                              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                {func.description}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span
                                className={cn(
                                  "text-xs font-medium",
                                  permissions[func.id] ? "text-primary" : "text-muted-foreground"
                                )}
                              >
                                {permissions[func.id] ? "ON" : "OFF"}
                              </span>
                              <Switch
                                checked={Boolean(permissions[func.id])}
                                onCheckedChange={(checked) => void togglePermission(func.id, checked)}
                                disabled={
                                  !canManageRoles ||
                                  !selectedRole ||
                                  isLoadingPermissions ||
                                  updatingPermissionId !== null
                                }
                                className="data-[state=checked]:bg-primary"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <RoleFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        mode={formMode}
        initialName={formMode === "edit" ? selectedRole?.name ?? "" : ""}
        existingNames={roles.map((role) => role.name)}
        onSave={handleCreateOrEditRole}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {selectedRole?.name ?? "this role"}
              </span>
              . Users assigned to this role will need to be reassigned. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault()
                void handleDeleteRole()
              }}
            >
              {isDeleting ? "Deleting..." : "Delete Role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
