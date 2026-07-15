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
  themePrimaryButtonSmClassName,
} from "@/lib/form-field-styles"

export interface RoleFormValues {
  name: string
}

interface RoleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initialName?: string
  existingNames?: string[]
  onSave: (values: RoleFormValues) => Promise<boolean>
}

export function RoleFormDialog({
  open,
  onOpenChange,
  mode,
  initialName = "",
  existingNames = [],
  onSave,
}: RoleFormDialogProps) {
  const [name, setName] = React.useState(initialName)
  const [error, setError] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setName(initialName)
      setError("")
    }
  }, [open, initialName])

  const validate = (value: string): string => {
    const trimmed = value.trim()
    if (!trimmed) return "Role name is required."
    if (trimmed.length < 2) return "Role name must be at least 2 characters."
    if (trimmed.length > 64) return "Role name must be 64 characters or fewer."

    const normalized = trimmed.toLowerCase()
    const duplicate = existingNames.some(
      (existing) =>
        existing.toLowerCase() === normalized &&
        existing.toLowerCase() !== initialName.trim().toLowerCase()
    )
    if (duplicate) return "A role with this name already exists."

    return ""
  }

  const handleSave = async () => {
    const validationError = validate(name)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSaving(true)
    try {
      const success = await onSave({ name: name.trim() })
      if (success) {
        onOpenChange(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const title = mode === "create" ? "Add New Role" : "Edit Role"
  const description =
    mode === "create"
      ? "Create a custom role and configure its permissions after saving."
      : "Update the role name. Permission settings remain unchanged."

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={formModalContentClassName}>
        <DialogHeader className={formModalHeaderClassName}>
          <DialogTitle className={formModalTitleClassName}>{title}</DialogTitle>
          <DialogDescription className={formModalDescriptionClassName}>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className={formModalBodyClassName}>
          <div className={formModalFieldsClassName}>
            <div className={formModalFieldGroupClassName}>
              <Label htmlFor="role-name" className={formModalLabelClassName}>
                Role Name <span className={formModalRequiredClassName}>*</span>
              </Label>
              <Input
                id="role-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  if (error) setError("")
                }}
                placeholder="e.g. Sales Executive"
                className={cn(formInputClassName, error && "border-destructive")}
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    void handleSave()
                  }
                }}
              />
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </div>
          </div>
        </div>

        <div className={formModalFooterClassName}>
          <Button
            className={cn(formModalFooterButtonClassName, themePrimaryButtonSmClassName)}
            onClick={() => void handleSave()}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : mode === "create" ? "Create Role" : "Save Changes"}
          </Button>
          <Button
            type="button"
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
