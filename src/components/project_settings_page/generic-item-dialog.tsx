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

interface GenericItemDialogProps {
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: { name: string; color: string }) => void
  nameLabel: string
  saveButtonLabel: string
  initialData?: { name: string; color: string }
}

export function GenericItemDialog({
  title,
  open,
  onOpenChange,
  onSave,
  nameLabel,
  saveButtonLabel,
  initialData,
}: GenericItemDialogProps) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState<string>("#E2E8F0")
  const [itemName, setItemName] = useState("")
  const [tempSelectedColor, setTempSelectedColor] = useState<string>("#E2E8F0")

  useEffect(() => {
    if (initialData && open) {
      setSelectedColor(initialData.color)
      setItemName(initialData.name)
      setTempSelectedColor(initialData.color)
    } else if (!initialData && open) {
      setSelectedColor("#E2E8F0")
      setItemName("")
      setTempSelectedColor("#E2E8F0")
    }
  }, [initialData, open])

  const handleSave = () => {
    onSave({ name: itemName, color: tempSelectedColor })
    setSelectedColor(tempSelectedColor)
    setColorPickerOpen(false)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setTempSelectedColor(selectedColor)
    setColorPickerOpen(false)
    onOpenChange(false)
  }

  const handleColorSelect = (color: string) => {
    setTempSelectedColor(color)
    setColorPickerOpen(false)
  }

  const isValid = tempSelectedColor && itemName.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={formModalContentClassName}>
        <DialogHeader className={formModalHeaderClassName}>
          <DialogTitle className={formModalTitleClassName}>{title}</DialogTitle>
          <DialogDescription className={formModalDescriptionClassName}>
            {initialData
              ? `Update the ${nameLabel.toLowerCase()}.`
              : `Enter the ${nameLabel.toLowerCase()}.`}
          </DialogDescription>
        </DialogHeader>

        <div className={formModalBodyClassName}>
          <div className={formModalFieldsClassName}>
            <div className={formModalFieldGroupClassName}>
              <Label htmlFor="item-name" className={formModalLabelClassName}>
                {nameLabel}
              </Label>
              <div className="relative">
                <Input
                  id="item-name"
                  placeholder={`Enter ${nameLabel.toLowerCase()}`}
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className={cn(formInputClassName, "pr-10")}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="h-6 w-6 rounded-full border border-input hover:border-ring transition-all flex-shrink-0"
                        style={{ backgroundColor: tempSelectedColor }}
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
                              tempSelectedColor === color
                                ? "border-foreground scale-110"
                                : "border-transparent hover:scale-105"
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => handleColorSelect(color)}
                          >
                            {tempSelectedColor === color && (
                              <Check className="h-3 w-3 text-white mx-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={formModalFooterClassName}>
          <Button
            className={formModalFooterButtonClassName}
            onClick={handleSave}
            disabled={!isValid}
          >
            {saveButtonLabel}
          </Button>
          <Button
            variant="outline"
            className={formModalFooterButtonClassName}
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
