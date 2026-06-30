"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormSelectContent, FormSelectItem, Select, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  formInputClassName,
  formModalBodyClassName,
  formModalContentClassName,
  formModalDescriptionClassName,
  formModalFieldGroupClassName,
  formModalFieldsClassName,
  formModalFooterButtonClassName,
  formModalFooterClassName,
  formModalHeaderClassName,
  formModalLabelClassName,
  formModalRequiredClassName,
  formModalTitleClassName,
  formSelectTriggerClassName,
  themePrimaryButtonSmClassName,
} from "@/lib/form-field-styles"
import {
  ROLE_TIER_LABELS,
  type Branch,
  type RoleTier,
  getOrgIdFromAuth,
  getStoredAuthUser,
  fetchBranches,
} from "@/lib/auth"

export interface UserFormData {
  name: string
  email: string
  phone: string
  role: string
  role_tier: RoleTier
  branch_id?: string
}

interface Role {
  _id: string
  name: string
}

interface FormErrors {
  name: boolean
  email: boolean
  phone: boolean
  role: boolean
  role_tier: boolean
  branch_id: boolean
  messages: {
    name: string
    email: string
    phone: string
    role: string
    role_tier: string
    branch_id: string
  }
}

const emptyFormErrors: FormErrors = {
  name: false,
  email: false,
  phone: false,
  role: false,
  role_tier: false,
  branch_id: false,
  messages: { name: "", email: "", phone: "", role: "", role_tier: "", branch_id: "" },
}

interface AddUserDialogProps {
  roles: Role[]
  assignableTiers: RoleTier[]
  branches?: Branch[]
  branchesLoading?: boolean
  defaultBranchId?: string
  onSave: (data: UserFormData) => Promise<boolean>
}

export function AddUserDialog({
  roles,
  assignableTiers,
  branches: branchesProp,
  branchesLoading: branchesLoadingProp = false,
  defaultBranchId,
  onSave,
}: AddUserDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [branchOptions, setBranchOptions] = React.useState<Branch[]>([])
  const [branchesLoadingLocal, setBranchesLoadingLocal] = React.useState(false)
  const [formData, setFormData] = React.useState<UserFormData>({
    name: "",
    email: "",
    phone: "",
    role: "",
    role_tier: assignableTiers[assignableTiers.length - 1] ?? "branch_user",
    branch_id: defaultBranchId,
  })
  const [formErrors, setFormErrors] = React.useState<FormErrors>(emptyFormErrors)

  const needsBranch = formData.role_tier === "branch_manager" || formData.role_tier === "branch_user"
  const roleSelectValue =
    formData.role && roles.some((role) => role._id === formData.role) ? formData.role : ""
  const branchesLoading = branchesProp ? branchesLoadingProp : branchesLoadingLocal
  const activeBranchOptions = React.useMemo(
    () => (branchesProp ?? branchOptions).filter((branch) => branch.status === "active"),
    [branchesProp, branchOptions]
  )

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "",
      role_tier: assignableTiers[assignableTiers.length - 1] ?? "branch_user",
      branch_id: defaultBranchId,
    })
    setFormErrors(emptyFormErrors)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  React.useEffect(() => {
    if (!open || branchesProp) return

    let cancelled = false

    const loadBranches = async () => {
      setBranchesLoadingLocal(true)
      try {
        const authUser = getStoredAuthUser()
        const token = authUser?.access_token
        if (!token) {
          if (!cancelled) setBranchOptions([])
          return
        }

        const orgId = getOrgIdFromAuth(authUser)
        const list = (await fetchBranches(orgId, token)).filter((branch) => branch.status === "active")

        if (!cancelled) setBranchOptions(list)
      } finally {
        if (!cancelled) setBranchesLoadingLocal(false)
      }
    }

    void loadBranches()
    return () => {
      cancelled = true
    }
  }, [open, branchesProp])

  const validateForm = () => {
    const errors = {
      name: "",
      email: "",
      phone: "",
      role: !formData.role ? "Please select a role" : "",
      role_tier: !formData.role_tier ? "Please select a role tier" : "",
      branch_id: "",
    }

    if (!formData.name) {
      errors.name = "Name is required"
    } else if (!/^[A-Za-z\s]{3,}$/.test(formData.name)) {
      errors.name = "Name should contain only letters and spaces (min 3 characters)"
    }

    if (!formData.email) {
      errors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address"
    }

    if (!formData.phone) {
      errors.phone = "Phone number is required"
    } else if (!/^[0-9+\-\s]+$/.test(formData.phone)) {
      errors.phone = "Phone number can only contain numbers, +, and -"
    } else if (formData.phone.replace(/[^0-9]/g, "").length < 10) {
      errors.phone = "Phone number must be at least 10 digits"
    }

    if (needsBranch && !formData.branch_id) {
      errors.branch_id = "Please select a branch"
    }

    setFormErrors({
      name: !!errors.name,
      email: !!errors.email,
      phone: !!errors.phone,
      role: !!errors.role,
      role_tier: !!errors.role_tier,
      branch_id: !!errors.branch_id,
      messages: errors,
    })

    return Object.values(errors).every((error) => !error)
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setIsSaving(true)
    try {
      const success = await onSave(formData)
      if (success) {
        handleOpenChange(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className={cn(themePrimaryButtonSmClassName, "shrink-0 sm:ml-auto")}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className={formModalContentClassName}>
        <DialogHeader className={formModalHeaderClassName}>
          <DialogTitle className={formModalTitleClassName}>Add New User</DialogTitle>
          <DialogDescription className={formModalDescriptionClassName}>
            Enter the user details below. An invitation will be sent to their email.
          </DialogDescription>
        </DialogHeader>

        <div className={formModalBodyClassName}>
          <div className={formModalFieldsClassName}>
            <div className={formModalFieldGroupClassName}>
              <Label htmlFor="add-user-name" className={formModalLabelClassName}>
                Name <span className={formModalRequiredClassName}>*</span>
              </Label>
              <Input
                id="add-user-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter full name"
                className={cn(formInputClassName, formErrors.name && "border-destructive")}
              />
              {formErrors.messages.name ? (
                <p className="text-xs text-destructive">{formErrors.messages.name}</p>
              ) : null}
            </div>

            <div className={formModalFieldGroupClassName}>
              <Label htmlFor="add-user-email" className={formModalLabelClassName}>
                Email <span className={formModalRequiredClassName}>*</span>
              </Label>
              <Input
                id="add-user-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="example@domain.com"
                className={cn(formInputClassName, formErrors.email && "border-destructive")}
              />
              {formErrors.messages.email ? (
                <p className="text-xs text-destructive">{formErrors.messages.email}</p>
              ) : null}
            </div>

            <div className={formModalFieldGroupClassName}>
              <Label htmlFor="add-user-phone" className={formModalLabelClassName}>
                Phone <span className={formModalRequiredClassName}>*</span>
              </Label>
              <Input
                id="add-user-phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="e.g., 1234567890 or +1-234-567-8901"
                className={cn(formInputClassName, formErrors.phone && "border-destructive")}
              />
              {formErrors.messages.phone ? (
                <p className="text-xs text-destructive">{formErrors.messages.phone}</p>
              ) : null}
            </div>

            <div className={formModalFieldGroupClassName}>
              <Label htmlFor="add-user-role-tier" className={formModalLabelClassName}>
                Role Tier <span className={formModalRequiredClassName}>*</span>
              </Label>
              <Select
                value={formData.role_tier}
                onValueChange={(value: RoleTier) =>
                  setFormData((prev) => ({
                    ...prev,
                    role_tier: value,
                    branch_id:
                      value === "super_admin" || value === "admin"
                        ? undefined
                        : prev.branch_id ?? defaultBranchId,
                  }))
                }
              >
                <SelectTrigger
                  id="add-user-role-tier"
                  className={cn(formSelectTriggerClassName, formErrors.role_tier && "border-destructive")}
                >
                  <SelectValue placeholder="Select role tier" />
                </SelectTrigger>
                <FormSelectContent>
                  {assignableTiers.map((tier) => (
                    <FormSelectItem key={tier} value={tier}>
                      {ROLE_TIER_LABELS[tier]}
                    </FormSelectItem>
                  ))}
                </FormSelectContent>
              </Select>
              {formErrors.messages.role_tier ? (
                <p className="text-xs text-destructive">{formErrors.messages.role_tier}</p>
              ) : null}
            </div>

            {needsBranch && (
              <div className={formModalFieldGroupClassName}>
                <Label htmlFor="add-user-branch" className={formModalLabelClassName}>
                  Branch <span className={formModalRequiredClassName}>*</span>
                </Label>
                <Select
                  value={formData.branch_id ?? ""}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      branch_id: value || undefined,
                    }))
                  }
                  disabled={branchesLoading || activeBranchOptions.length === 0}
                >
                  <SelectTrigger
                    id="add-user-branch"
                    className={cn(formSelectTriggerClassName, formErrors.branch_id && "border-destructive")}
                  >
                    <SelectValue
                      placeholder={
                        branchesLoading
                          ? "Loading branches..."
                          : activeBranchOptions.length === 0
                            ? "No branches available"
                            : "Select a branch"
                      }
                    />
                  </SelectTrigger>
                  <FormSelectContent>
                    {activeBranchOptions.map((branch) => (
                      <FormSelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </FormSelectItem>
                    ))}
                  </FormSelectContent>
                </Select>
                {formErrors.messages.branch_id ? (
                  <p className="text-xs text-destructive">{formErrors.messages.branch_id}</p>
                ) : null}
              </div>
            )}

            <div className={formModalFieldGroupClassName}>
              <Label htmlFor="add-user-role" className={formModalLabelClassName}>
                Permission Role <span className={formModalRequiredClassName}>*</span>
              </Label>
              <Select
                value={roleSelectValue}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}
                disabled={roles.length === 0}
              >
                <SelectTrigger
                  id="add-user-role"
                  className={cn(formSelectTriggerClassName, formErrors.role && "border-destructive")}
                >
                  <SelectValue
                    placeholder={roles.length === 0 ? "No roles available" : "Select a role"}
                  />
                </SelectTrigger>
                <FormSelectContent>
                  {roles.map((role) => (
                    <FormSelectItem key={role._id} value={role._id}>
                      {role.name}
                    </FormSelectItem>
                  ))}
                </FormSelectContent>
              </Select>
              {formErrors.messages.role ? (
                <p className="text-xs text-destructive">{formErrors.messages.role}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className={formModalFooterClassName}>
          <Button
            className={formModalFooterButtonClassName}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            variant="outline"
            className={formModalFooterButtonClassName}
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
