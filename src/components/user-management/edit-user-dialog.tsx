"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormSelectContent, FormSelectItem, Select, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  formModalTitleClassName,
  formSelectTriggerClassName,
} from "@/lib/form-field-styles"
import {
  ROLE_TIER_LABELS,
  type Branch,
  type RoleTier,
} from "@/lib/auth"
import type { UserFormData } from "./add-user-dialog"

interface Role {
  _id: string
  name: string
}

export interface EditableUser extends UserFormData {
  id: string
  status: "Active" | "Inactive"
  created: string
}

interface EditUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: EditableUser | null
  roles: Role[]
  branches: Branch[]
  assignableTiers: RoleTier[]
  onSave: (user: EditableUser) => Promise<boolean>
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  roles,
  branches,
  assignableTiers,
  onSave,
}: EditUserDialogProps) {
  const [formData, setFormData] = React.useState<EditableUser | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  const needsBranch =
    formData?.role_tier === "branch_manager" || formData?.role_tier === "branch_user"

  React.useEffect(() => {
    if (user && open) {
      setFormData({ ...user })
    }
  }, [user, open])

  const handleSave = async () => {
    if (!formData) return

    setIsSaving(true)
    try {
      const success = await onSave(formData)
      if (success) {
        onOpenChange(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={formModalContentClassName}>
        <DialogHeader className={formModalHeaderClassName}>
          <DialogTitle className={formModalTitleClassName}>Edit User</DialogTitle>
          <DialogDescription className={formModalDescriptionClassName}>
            Update the user details below.
          </DialogDescription>
        </DialogHeader>

        {formData && (
          <div className={formModalBodyClassName}>
            <div className={formModalFieldsClassName}>
              <div className={formModalFieldGroupClassName}>
                <Label htmlFor="edit-user-name" className={formModalLabelClassName}>
                  Name
                </Label>
                <Input
                  id="edit-user-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => (prev ? { ...prev, name: e.target.value } : null))
                  }
                  className={formInputClassName}
                />
              </div>

              <div className={formModalFieldGroupClassName}>
                <Label htmlFor="edit-user-email" className={formModalLabelClassName}>
                  Email
                </Label>
                <Input
                  id="edit-user-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => (prev ? { ...prev, email: e.target.value } : null))
                  }
                  className={formInputClassName}
                />
              </div>

              <div className={formModalFieldGroupClassName}>
                <Label htmlFor="edit-user-phone" className={formModalLabelClassName}>
                  Phone
                </Label>
                <Input
                  id="edit-user-phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => (prev ? { ...prev, phone: e.target.value } : null))
                  }
                  className={formInputClassName}
                />
              </div>

              <div className={formModalFieldGroupClassName}>
                <Label htmlFor="edit-user-role-tier" className={formModalLabelClassName}>
                  Role Tier
                </Label>
                <Select
                  value={formData.role_tier}
                  onValueChange={(value: RoleTier) =>
                    setFormData((prev) =>
                      prev
                        ? {
                            ...prev,
                            role_tier: value,
                            branch_id:
                              value === "super_admin" || value === "admin"
                                ? undefined
                                : prev.branch_id,
                          }
                        : null
                    )
                  }
                >
                  <SelectTrigger id="edit-user-role-tier" className={formSelectTriggerClassName}>
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
              </div>

              {needsBranch && (
                <div className={formModalFieldGroupClassName}>
                  <Label htmlFor="edit-user-branch" className={formModalLabelClassName}>
                    Branch
                  </Label>
                  <Select
                    value={formData.branch_id ?? ""}
                    onValueChange={(value) =>
                      setFormData((prev) => (prev ? { ...prev, branch_id: value } : null))
                    }
                  >
                    <SelectTrigger id="edit-user-branch" className={formSelectTriggerClassName}>
                      <SelectValue placeholder="Select a branch" />
                    </SelectTrigger>
                    <FormSelectContent>
                      {branches
                        .filter((b) => b.status === "active")
                        .map((branch) => (
                          <FormSelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </FormSelectItem>
                        ))}
                    </FormSelectContent>
                  </Select>
                </div>
              )}

              <div className={formModalFieldGroupClassName}>
                <Label htmlFor="edit-user-role" className={formModalLabelClassName}>
                  Permission Role
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData((prev) => (prev ? { ...prev, role: value } : null))
                  }
                >
                  <SelectTrigger id="edit-user-role" className={formSelectTriggerClassName}>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <FormSelectContent>
                    {roles.map((role) => (
                      <FormSelectItem key={role._id} value={role._id}>
                        {role.name}
                      </FormSelectItem>
                    ))}
                  </FormSelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <div className={formModalFooterClassName}>
          <Button
            className={formModalFooterButtonClassName}
            onClick={handleSave}
            disabled={isSaving || !formData}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            variant="outline"
            className={formModalFooterButtonClassName}
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
