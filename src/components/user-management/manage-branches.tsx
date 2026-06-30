"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { GitBranch, MoreVertical, Pencil, Plus, Power } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { useUserData } from "@/hooks/useUserData"
import {
  ROLE_TIER_LABELS,
  type Branch,
  getOrgIdFromAuth,
  getStoredAuthUser,
  createBranch,
  fetchBranches,
  toggleBranchStatus,
  updateBranch,
} from "@/lib/auth"
import {
  formInputClassName,
  formModalBodyClassName,
  formModalContentClassName,
  formModalFieldGroupClassName,
  formModalFieldsClassName,
  formModalFooterButtonClassName,
  formModalFooterClassName,
  formModalHeaderClassName,
  formModalLabelClassName,
  formModalTitleClassName,
  themePrimaryButtonSmClassName,
} from "@/lib/form-field-styles"

function slugifyCode(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 12)
}

export function ManageBranches() {
  const router = useRouter()
  const { toast } = useToast()
  const { orgId, roleTier, userData, isAuthLoading, canManageBranches } = useUserData()
  const [branches, setBranches] = React.useState<Branch[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingBranch, setEditingBranch] = React.useState<Branch | null>(null)
  const [name, setName] = React.useState("")
  const [code, setCode] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  const loadBranches = React.useCallback(async () => {
    const resolvedOrgId = orgId || getOrgIdFromAuth(getStoredAuthUser())
    if (!resolvedOrgId) return

    setIsLoading(true)
    try {
      const list = await fetchBranches(resolvedOrgId)
      setBranches(list)
    } catch (error) {
      console.error("Error loading branches:", error)
      toast({
        title: "Error",
        description: "Failed to load branches. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [orgId, toast])

  React.useEffect(() => {
    if (isAuthLoading || !userData) return

    if (!canManageBranches) return

    void loadBranches()
  }, [isAuthLoading, userData, canManageBranches, loadBranches])

  const openCreate = () => {
    setEditingBranch(null)
    setName("")
    setCode("")
    setDialogOpen(true)
  }

  const openEdit = (branch: Branch) => {
    setEditingBranch(branch)
    setName(branch.name)
    setCode(branch.code)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const resolvedOrgId = orgId || getOrgIdFromAuth(getStoredAuthUser())
    if (!resolvedOrgId) return

    if (!name.trim()) {
      toast({ title: "Validation", description: "Branch name is required.", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      const branchCode = (code.trim() || slugifyCode(name)).toUpperCase()

      if (editingBranch) {
        await updateBranch({
          id: editingBranch.id,
          name: name.trim(),
          code: branchCode,
          org_id: resolvedOrgId,
        })
        toast({ title: "Success", description: "Branch updated." })
      } else {
        await createBranch({
          name: name.trim(),
          code: branchCode,
          org_id: resolvedOrgId,
        })
        toast({ title: "Success", description: "Branch created." })
      }

      setDialogOpen(false)
      await loadBranches()
    } catch (error) {
      console.error("Error saving branch:", error)
      toast({
        title: "Error",
        description: "Failed to save branch. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleStatus = async (branch: Branch) => {
    try {
      const updated = await toggleBranchStatus(branch)
      toast({
        title: "Branch updated",
        description: `${branch.name} is now ${updated.status}.`,
      })
      await loadBranches()
    } catch (error) {
      console.error("Error updating branch status:", error)
      toast({
        title: "Error",
        description: "Failed to update branch status.",
        variant: "destructive",
      })
    }
  }

  if (isAuthLoading || !userData) {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!canManageBranches) {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <h1 className="text-xl font-semibold text-foreground">Branch Management</h1>
        <Card className="border-none shadow-sm">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              You don&apos;t have permission to manage branches.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Signed in as <strong>{ROLE_TIER_LABELS[roleTier]}</strong>. Only Admin, Super Admin,
              or users with Manage Branches / Manage Settings permission can access this page.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/settings/manage-users")}
            >
              Back to User Management
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Branch Management</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage branches for your organization ({ROLE_TIER_LABELS[roleTier]}).
          </p>
        </div>
        <Button size="sm" className={themePrimaryButtonSmClassName} onClick={openCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Branch
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px] text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : branches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    No branches yet. Add your first branch to get started.
                  </TableCell>
                </TableRow>
              ) : (
                branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-muted-foreground" />
                        {branch.name}
                      </div>
                    </TableCell>
                    <TableCell>{branch.code}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          branch.status === "active"
                            ? "bg-green-500 text-white hover:bg-green-600"
                            : "bg-orange-500 text-white hover:bg-orange-600"
                        }
                      >
                        {branch.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(branch)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void handleToggleStatus(branch)}>
                            <Power className="mr-2 h-4 w-4" />
                            {branch.status === "active" ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={formModalContentClassName}>
          <DialogHeader className={formModalHeaderClassName}>
            <DialogTitle className={formModalTitleClassName}>
              {editingBranch ? "Edit Branch" : "Add Branch"}
            </DialogTitle>
            <DialogDescription>
              Branches scope user access and data visibility across your organization.
            </DialogDescription>
          </DialogHeader>
          <div className={formModalBodyClassName}>
            <div className={formModalFieldsClassName}>
              <div className={formModalFieldGroupClassName}>
                <Label className={formModalLabelClassName}>Branch Name</Label>
                <Input
                  className={formInputClassName}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (!editingBranch) setCode(slugifyCode(e.target.value).toUpperCase())
                  }}
                  placeholder="e.g. Branch A"
                />
              </div>
              <div className={formModalFieldGroupClassName}>
                <Label className={formModalLabelClassName}>Code</Label>
                <Input
                  className={formInputClassName}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A"
                />
              </div>
            </div>
          </div>
          <div className={formModalFooterClassName}>
            <Button
              className={formModalFooterButtonClassName}
              onClick={() => void handleSave()}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button variant="outline" className={formModalFooterButtonClassName} onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
