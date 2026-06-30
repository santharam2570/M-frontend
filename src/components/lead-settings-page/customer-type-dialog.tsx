"use client"

import { useState, useEffect } from "react"
import { Check, Plus, Trash, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, FormSelectContent, FormSelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  THEME_PRIMARY_COLOR,
} from "@/lib/form-field-styles"

const customerTypeFieldTypes = [
  { value: "text", label: "Text" },
  { value: "dropdown-single", label: "Dropdown" },
  { value: "dropdown-multiple", label: "Multi-select" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
]

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

export interface MultiselectOption {
  name: string
  color: string
}

export interface TypeOption {
  id: number
  name: string
  color: string
}

export interface CustomerTypeData {
  id?: number
  name: string
  color: string
  type: string
  options?: TypeOption[]
  /** @deprecated Use options instead */
  multiselectValues?: MultiselectOption[]
}

interface CustomerTypeDialogProps {
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: CustomerTypeData) => void
  initialData?: CustomerTypeData
}

export function CustomerTypeDialog({
  title,
  open,
  onOpenChange,
  onSave,
  initialData,
}: CustomerTypeDialogProps) {
  const [customerTypeName, setCustomerTypeName] = useState("")
  const [customerTypeColor, setCustomerTypeColor] = useState("#E2E8F0")
  const [customerTypeFieldType, setCustomerTypeFieldType] = useState("")
  const [typeOptions, setTypeOptions] = useState<TypeOption[]>([])
  const [newOptionName, setNewOptionName] = useState("")
  const [newOptionColor, setNewOptionColor] = useState(THEME_PRIMARY_COLOR)
  const [nameColorPickerOpen, setNameColorPickerOpen] = useState(false)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [editingOptionId, setEditingOptionId] = useState<number | null>(null)
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (!open) return

    if (initialData) {
      setCustomerTypeName(initialData.name)
      setCustomerTypeColor(initialData.color || "#E2E8F0")
      setCustomerTypeFieldType(initialData.type)
      setTypeOptions(
        initialData.options ||
          initialData.multiselectValues?.map((option, index) => ({
            id: index + 1,
            name: option.name,
            color: option.color,
          })) ||
          [],
      )
    } else {
      setCustomerTypeName("")
      setCustomerTypeColor("#E2E8F0")
      setCustomerTypeFieldType("")
      setTypeOptions([])
    }

    setNewOptionName("")
    setNewOptionColor(THEME_PRIMARY_COLOR)
    setEditingOptionId(null)
    setFormErrors({})
  }, [open, initialData])

  const handleAddOption = () => {
    if (!newOptionName.trim()) return

    if (editingOptionId !== null) {
      setTypeOptions(
        typeOptions.map((option) =>
          option.id === editingOptionId
            ? { ...option, name: newOptionName.trim(), color: newOptionColor }
            : option,
        ),
      )
      setEditingOptionId(null)
    } else {
      setTypeOptions([
        ...typeOptions,
        {
          id: Date.now(),
          name: newOptionName.trim(),
          color: newOptionColor,
        },
      ])
    }

    setNewOptionName("")
    setNewOptionColor(THEME_PRIMARY_COLOR)
    setFormErrors({ ...formErrors, options: "" })
  }

  const handleRemoveOption = (id: number) => {
    setTypeOptions(typeOptions.filter((option) => option.id !== id))
  }

  const handleEditOption = (option: TypeOption) => {
    setEditingOptionId(option.id)
    setNewOptionName(option.name)
    setNewOptionColor(option.color)
  }

  const handleNameColorSelect = (color: string) => {
    setCustomerTypeColor(color)
    setNameColorPickerOpen(false)
  }

  const handleColorSelect = (color: string) => {
    setNewOptionColor(color)
    setColorPickerOpen(false)
  }

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {}

    if (!customerTypeName.trim()) {
      errors.name = "Customer type name is required"
    }

    if (!customerTypeFieldType) {
      errors.type = "Type is required"
    }

    if (
      (customerTypeFieldType === "dropdown-single" ||
        customerTypeFieldType === "dropdown-multiple") &&
      typeOptions.length === 0
    ) {
      errors.options = "At least one option is required"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = () => {
    if (!validateForm()) return

    const data: CustomerTypeData = {
      id: initialData?.id,
      name: customerTypeName.trim(),
      color: customerTypeColor,
      type: customerTypeFieldType,
    }

    if (
      customerTypeFieldType === "dropdown-single" ||
      customerTypeFieldType === "dropdown-multiple"
    ) {
      data.options = typeOptions
    }

    onSave(data)
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  const isDropdownType =
    customerTypeFieldType === "dropdown-single" || customerTypeFieldType === "dropdown-multiple"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={formModalContentClassName}>
        <DialogHeader className={formModalHeaderClassName}>
          <DialogTitle className={formModalTitleClassName}>{title}</DialogTitle>
          <DialogDescription className={formModalDescriptionClassName}>
            {initialData
              ? "Update the customer type name and type below."
              : "Enter the customer type name and type below."}
          </DialogDescription>
        </DialogHeader>

        <div className={formModalBodyClassName}>
          <div className={formModalFieldsClassName}>
            <div className={formModalFieldGroupClassName}>
              <Label htmlFor="customer-type-name" className={formModalLabelClassName}>
                Customer Type Name <span className={formModalRequiredClassName}>*</span>
              </Label>
              <div className="relative">
                <Input
                  id="customer-type-name"
                  placeholder="Enter customer type name"
                  value={customerTypeName}
                  onChange={(e) => setCustomerTypeName(e.target.value)}
                  className={cn(formInputClassName, "pr-10")}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Popover open={nameColorPickerOpen} onOpenChange={setNameColorPickerOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="h-6 w-6 flex-shrink-0 rounded-full border border-input transition-all hover:border-ring"
                        style={{ backgroundColor: customerTypeColor }}
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
                              customerTypeColor === color
                                ? "scale-110 border-foreground"
                                : "border-transparent hover:scale-105",
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => handleNameColorSelect(color)}
                          >
                            {customerTypeColor === color && (
                              <Check className="mx-auto h-3 w-3 text-white" />
                            )}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div className={formModalFieldGroupClassName}>
              <Label htmlFor="customer-type-field-type" className={formModalLabelClassName}>
                Type <span className={formModalRequiredClassName}>*</span>
              </Label>
              <Select
                value={customerTypeFieldType}
                onValueChange={(value) => {
                  setCustomerTypeFieldType(value)
                  setFormErrors({ ...formErrors, type: "" })
                  if (value !== "dropdown-single" && value !== "dropdown-multiple") {
                    setTypeOptions([])
                    setNewOptionName("")
                    setNewOptionColor(THEME_PRIMARY_COLOR)
                    setEditingOptionId(null)
                  }
                }}
              >
                <SelectTrigger
                  id="customer-type-field-type"
                  size="form"
                  className={cn(formSelectTriggerClassName, formErrors.type && "border-red-500")}
                >
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <FormSelectContent>
                  {customerTypeFieldTypes.map((type) => (
                    <FormSelectItem key={type.value} value={type.value}>
                      {type.label}
                    </FormSelectItem>
                  ))}
                </FormSelectContent>
              </Select>
              {formErrors.type && <p className="mt-1 text-xs text-red-500">{formErrors.type}</p>}
            </div>

            {isDropdownType && (
              <div className="grid gap-4 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <Label>
                    Dropdown Options <span className="text-red-500">*</span>
                  </Label>
                  {formErrors.options && <p className="text-xs text-red-500">{formErrors.options}</p>}
                </div>

                <div className="grid gap-3">
                  {typeOptions.map((option) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full" style={{ backgroundColor: option.color }} />
                      <span className="flex-1 text-sm">{option.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditOption(option)}
                      >
                        <Pencil className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRemoveOption(option.id)}
                      >
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Add new option"
                      value={newOptionName}
                      onChange={(e) => setNewOptionName(e.target.value)}
                      className={cn(formInputClassName, "pr-10")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddOption()
                        }
                      }}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="h-6 w-6 flex-shrink-0 rounded-full border border-gray-200 transition-all hover:border-gray-300"
                            style={{ backgroundColor: newOptionColor }}
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
                                  newOptionColor === color
                                    ? "scale-110 border-gray-900"
                                    : "border-transparent hover:scale-105",
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => handleColorSelect(color)}
                              >
                                {newOptionColor === color && (
                                  <Check className="mx-auto h-3 w-3 text-white" />
                                )}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddOption}
                    disabled={!newOptionName.trim()}
                  >
                    {editingOptionId !== null ? (
                      <>
                        <Check className="mr-1 h-4 w-4" />
                        Update
                      </>
                    ) : (
                      <>
                        <Plus className="mr-1 h-4 w-4" />
                        Add
                      </>
                    )}
                  </Button>
                  {editingOptionId !== null && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingOptionId(null)
                        setNewOptionName("")
                        setNewOptionColor(THEME_PRIMARY_COLOR)
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            )}
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
