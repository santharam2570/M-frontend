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

const currencies = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "JPY", label: "JPY (¥)" },
  { value: "CAD", label: "CAD ($)" },
  { value: "AUD", label: "AUD ($)" },
  { value: "INR", label: "INR (₹)" },
]

const fieldTypes = [
  { value: "text", label: "Text" },
  { value: "dropdown-single", label: "Choices (Single)" },
  { value: "dropdown-multiple", label: "Choices (Multiple)" },
  { value: "date", label: "Date" },
  { value: "number", label: "Number" },
  { value: "checkbox", label: "Checkbox" },
  { value: "money", label: "Money" },
  { value: "phone", label: "Phone" },
]

interface DropdownOption {
  id: number
  name: string
  color: string
}

interface CustomFieldData {
  id?: number
  name: string
  type: string
  options?: DropdownOption[]
  currency?: string
}

interface CustomFieldDialogProps {
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: CustomFieldData) => void
  initialData?: CustomFieldData
}

export function CustomFieldDialog({ title, open, onOpenChange, onSave, initialData }: CustomFieldDialogProps) {
  const [fieldName, setFieldName] = useState("")
  const [fieldType, setFieldType] = useState<string>("")
  const [dropdownOptions, setDropdownOptions] = useState<DropdownOption[]>([])
  const [newOptionName, setNewOptionName] = useState("")
  const [newOptionColor, setNewOptionColor] = useState("#3B82F6")
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [currency, setCurrency] = useState<string>("USD")
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const [editingOptionId, setEditingOptionId] = useState<number | null>(null)
  const [editingOptionName, setEditingOptionName] = useState("")
  const [editingOptionColor, setEditingOptionColor] = useState("")

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFieldName(initialData.name)
        setFieldType(initialData.type)
        setDropdownOptions(initialData.options || [])
        setCurrency(initialData.currency || "USD")
      } else {
        // Reset form for new field
        setFieldName("")
        setFieldType("")
        setDropdownOptions([])
        setNewOptionName("")
        setNewOptionColor("#3B82F6")
        setCurrency("USD")
      }
      setFormErrors({})
    }
  }, [open, initialData])

  const handleAddOption = () => {
    if (newOptionName.trim()) {
      if (editingOptionId !== null) {
        // Update existing option
        setDropdownOptions(
          dropdownOptions.map((option) =>
            option.id === editingOptionId ? { ...option, name: newOptionName.trim(), color: newOptionColor } : option,
          ),
        )
        setEditingOptionId(null)
      } else {
        // Add new option
        const newOption: DropdownOption = {
          id: Date.now(),
          name: newOptionName.trim(),
          color: newOptionColor,
        }
        setDropdownOptions([...dropdownOptions, newOption])
      }
      setNewOptionName("")
      setNewOptionColor("#3B82F6")
      setFormErrors({ ...formErrors, options: "" })
    }
  }

  const handleRemoveOption = (id: number) => {
    setDropdownOptions(dropdownOptions.filter((option) => option.id !== id))
  }

  const handleEditOption = (option: DropdownOption) => {
    setEditingOptionId(option.id)
    setEditingOptionName(option.name)
    setEditingOptionColor(option.color)
    setNewOptionName(option.name)
    setNewOptionColor(option.color)
  }

  const handleColorSelect = (color: string) => {
    setNewOptionColor(color)
    setColorPickerOpen(false)
  }

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {}

    if (!fieldName.trim()) {
      errors.name = "Field name is required"
    }

    if (!fieldType) {
      errors.type = "Field type is required"
    }

    if ((fieldType === "dropdown-single" || fieldType === "dropdown-multiple") && dropdownOptions.length === 0) {
      errors.options = "At least one option is required"
    }

    if (fieldType === "money" && !currency) {
      errors.currency = "Currency is required"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = () => {
    if (validateForm()) {
      const data: CustomFieldData = {
        id: initialData?.id,
        name: fieldName.trim(),
        type: fieldType,
      }

      if (fieldType === "dropdown-single" || fieldType === "dropdown-multiple") {
        data.options = dropdownOptions
      }

      if (fieldType === "money") {
        data.currency = currency
      }

      onSave(data)
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  const isDropdownType = fieldType === "dropdown-single" || fieldType === "dropdown-multiple"
  const isMoneyType = fieldType === "money"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={formModalContentClassName}>
        <DialogHeader className={formModalHeaderClassName}>
          <DialogTitle className={formModalTitleClassName}>{title}</DialogTitle>
          <DialogDescription className={formModalDescriptionClassName}>
            {initialData ? "Update the custom field details below." : "Enter the custom field details below."}
          </DialogDescription>
        </DialogHeader>

        <div className={formModalBodyClassName}>
          <div className={formModalFieldsClassName}>
          <div className={formModalFieldGroupClassName}>
            <Label htmlFor="field-name" className={formModalLabelClassName}>
              Field Name <span className={formModalRequiredClassName}>*</span>
            </Label>
            <Input
              id="field-name"
              placeholder="Enter field name"
              value={fieldName}
              onChange={(e) => {
                setFieldName(e.target.value)
                if (e.target.value.trim()) {
                  setFormErrors({ ...formErrors, name: "" })
                }
              }}
              className={cn(formInputClassName, formErrors.name && "border-red-500")}
            />
            {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
          </div>

          <div className={formModalFieldGroupClassName}>
            <Label htmlFor="field-type" className={formModalLabelClassName}>
              Field Type <span className={formModalRequiredClassName}>*</span>
            </Label>
            <Select
              value={fieldType}
              onValueChange={(value) => {
                setFieldType(value)
                setFormErrors({ ...formErrors, type: "" })
              }}
            >
              <SelectTrigger
                id="field-type"
                size="form"
                className={cn(formSelectTriggerClassName, formErrors.type && "border-red-500")}
              >
                <SelectValue placeholder="Select field type" />
              </SelectTrigger>
              <FormSelectContent>
                {fieldTypes.map((type) => (
                  <FormSelectItem key={type.value} value={type.value}>
                    {type.label}
                  </FormSelectItem>
                ))}
              </FormSelectContent>
            </Select>
            {formErrors.type && <p className="text-red-500 text-xs mt-1">{formErrors.type}</p>}
          </div>

          {isDropdownType && (
            <div className="grid gap-4 border p-4 rounded-md">
              <div className="flex justify-between items-center">
                <Label>
                  Dropdown Options <span className="text-red-500">*</span>
                </Label>
                {formErrors.options && <p className="text-red-500 text-xs">{formErrors.options}</p>}
              </div>

              <div className="grid gap-3">
                {dropdownOptions.map((option) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: option.color }} />
                    <span className="flex-1">{option.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditOption(option)}
                    >
                      <Pencil className="h-4 w-4 text-blue-500" />
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
                          className="h-6 w-6 rounded-full border border-gray-200 hover:border-gray-300 transition-all flex-shrink-0"
                          style={{ backgroundColor: newOptionColor }}
                          aria-label="Select color"
                          type="button"
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-[220px] p-3" align="end">
                        <div className="grid grid-cols-6 gap-1.5">
                          {colors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={`
                                h-6 w-6 rounded-full border transition-all
                                ${
                                  newOptionColor === color
                                    ? "border-gray-900 scale-110"
                                    : "border-transparent hover:scale-105"
                                }
                              `}
                              style={{ backgroundColor: color }}
                              onClick={() => handleColorSelect(color)}
                            >
                              {newOptionColor === color && <Check className="h-3 w-3 text-white mx-auto" />}
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
                  {editingOptionId !== null ? <Check className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}{" "}
                  {editingOptionId !== null ? "Update" : "Add"}
                </Button>
                {editingOptionId !== null && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingOptionId(null)
                      setNewOptionName("")
                      setNewOptionColor("#3B82F6")
                    }}
                    className="ml-2"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}

          {isMoneyType && (
            <div className={formModalFieldGroupClassName}>
              <Label htmlFor="currency" className={formModalLabelClassName}>
                Currency <span className={formModalRequiredClassName}>*</span>
              </Label>
              <Select
                value={currency}
                onValueChange={(value) => {
                  setCurrency(value)
                  setFormErrors({ ...formErrors, currency: "" })
                }}
              >
                <SelectTrigger
                  id="currency"
                  size="form"
                  className={cn(formSelectTriggerClassName, formErrors.currency && "border-red-500")}
                >
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <FormSelectContent>
                  {currencies.map((curr) => (
                    <FormSelectItem key={curr.value} value={curr.value}>
                      {curr.label}
                    </FormSelectItem>
                  ))}
                </FormSelectContent>
              </Select>
              {formErrors.currency && <p className="text-red-500 text-xs mt-1">{formErrors.currency}</p>}
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

