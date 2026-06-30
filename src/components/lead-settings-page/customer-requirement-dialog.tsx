"use client"

import { useState, useEffect } from "react"
import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
} from "@/lib/form-field-styles"

const colors = [
  "#E2E8F0",
  "#EF4444",
  "#F43F5E",
  "#EC4899",
  "#D946EF",
  "#A855F7",
  "#8B5CF6",
  "#6366F1",
  "#3B82F6",
  "#0EA5E9",
  "#06B6D4",
  "#14B8A6",
  "#10B981",
  "#22C55E",
  "#84CC16",
  "#EAB308",
  "#F59E0B",
  "#F97316",
  "#C2410C",
  "#B91C1C",
  "#BE185D",
  "#6B21A8",
  "#3730A3",
  "#1E3A8A",
]

export interface CustomerRequirementData {
  id?: number
  name: string
  color: string
  type?: string
}

interface CustomerRequirementDialogProps {
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: CustomerRequirementData) => void
  initialData?: CustomerRequirementData
}

export function CustomerRequirementDialog({
  title,
  open,
  onOpenChange,
  onSave,
  initialData,
}: CustomerRequirementDialogProps) {
  const [requirementName, setRequirementName] = useState("")
  const [requirementColor, setRequirementColor] = useState("#E2E8F0")
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (!open) return

    if (initialData) {
      setRequirementName(initialData.name)
      setRequirementColor(initialData.color || "#E2E8F0")
    } else {
      setRequirementName("")
      setRequirementColor("#E2E8F0")
    }

    setFormErrors({})
  }, [open, initialData])

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {}

    if (!requirementName.trim()) {
      errors.name = "Requirement name is required"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = () => {
    if (!validateForm()) return

    onSave({
      id: initialData?.id,
      name: requirementName.trim(),
      color: requirementColor,
      type: "text",
    })
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  const handleColorSelect = (color: string) => {
    setRequirementColor(color)
    setColorPickerOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={formModalContentClassName}>
        <DialogHeader className={formModalHeaderClassName}>
          <DialogTitle className={formModalTitleClassName}>{title}</DialogTitle>
          <DialogDescription className={formModalDescriptionClassName}>
            {initialData
              ? "Update the Interested In details below."
              : "Enter the Interested In details below."}
          </DialogDescription>
        </DialogHeader>

        <div className={formModalBodyClassName}>
          <div className={formModalFieldsClassName}>
            <div className={formModalFieldGroupClassName}>
              <Label htmlFor="requirement-name" className={formModalLabelClassName}>
                Requirement Name <span className={formModalRequiredClassName}>*</span>
              </Label>
              <div className="relative">
                <Input
                  id="requirement-name"
                  placeholder="Enter requirement name"
                  value={requirementName}
                  onChange={(e) => {
                    setRequirementName(e.target.value)
                    if (e.target.value.trim()) {
                      setFormErrors({ ...formErrors, name: "" })
                    }
                  }}
                  className={cn(formInputClassName, "pr-10", formErrors.name && "border-red-500")}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="h-6 w-6 flex-shrink-0 rounded-full border border-input transition-all hover:border-ring"
                        style={{ backgroundColor: requirementColor }}
                        aria-label="Select color"
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-[220px] p-3" align="end">
                      <div className="grid grid-cols-6 gap-1.5">
                        {colors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={cn(
                              "h-6 w-6 rounded-full border transition-all",
                              requirementColor === color
                                ? "scale-110 border-foreground"
                                : "border-transparent hover:scale-105",
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => handleColorSelect(color)}
                          >
                            {requirementColor === color && (
                              <Check className="mx-auto h-3 w-3 text-white" />
                            )}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              {formErrors.name && <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>}
            </div>
          </div>
        </div>

        <div className={formModalFooterClassName}>
          <Button className={formModalFooterButtonClassName} onClick={handleSave}>
            {initialData ? "Update" : "Save"}
          </Button>
          <Button variant="outline" className={formModalFooterButtonClassName} onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
