"use client"

import { useState, useEffect } from "react"
import { Check, Plus, Trash, Pencil } from "lucide-react"

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, FormSelectContent, FormSelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import URLS from "@/config/urls"
import { useRouter } from "next/navigation"
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

const statusTypes = [
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

interface StatusOption {
  id: number
  name: string
  color: string
}
interface AddStatusDialogProps {
  onSave: (data: { id: string | number; name: string; color: string; fieldType: string }) => void
}

export function AddStatusDialog({ onSave }: AddStatusDialogProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [statusName, setStatusName] = useState("")
  const [selectedColor, setSelectedColor] = useState("#E2E8F0")
  const [statusType, setStatusType] = useState("")
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([])
  const [newOptionName, setNewOptionName] = useState("")
  const [newOptionColor, setNewOptionColor] = useState(THEME_PRIMARY_COLOR)
  const [nameColorPickerOpen, setNameColorPickerOpen] = useState(false)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [editingOptionId, setEditingOptionId] = useState<number | null>(null)
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const storedData = localStorage.getItem("map_user")
    if (storedData) {
      const userData = JSON.parse(storedData)
      if (!userData) {
        router.push("/login")
      }
    } else {
      router.push("/login")
    }
  }, [router])

  const resetForm = () => {
    setStatusName("")
    setSelectedColor("#E2E8F0")
    setStatusType("")
    setStatusOptions([])
    setNewOptionName("")
    setNewOptionColor(THEME_PRIMARY_COLOR)
    setEditingOptionId(null)
    setFormErrors({})
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      resetForm()
    }
  }

  const handleAddOption = () => {
    if (!newOptionName.trim()) return

    if (editingOptionId !== null) {
      setStatusOptions(
        statusOptions.map((option) =>
          option.id === editingOptionId
            ? { ...option, name: newOptionName.trim(), color: newOptionColor }
            : option,
        ),
      )
      setEditingOptionId(null)
    } else {
      setStatusOptions([
        ...statusOptions,
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
    setStatusOptions(statusOptions.filter((option) => option.id !== id))
  }

  const handleEditOption = (option: StatusOption) => {
    setEditingOptionId(option.id)
    setNewOptionName(option.name)
    setNewOptionColor(option.color)
  }

  const handleNameColorSelect = (color: string) => {
    setSelectedColor(color)
    setNameColorPickerOpen(false)
  }

  const handleColorSelect = (color: string) => {
    setNewOptionColor(color)
    setColorPickerOpen(false)
  }

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {}

    if (!statusName.trim()) {
      errors.name = "Status name is required"
    }

    if (!statusType) {
      errors.type = "Type is required"
    }

    if (
      (statusType === "dropdown-single" || statusType === "dropdown-multiple") &&
      statusOptions.length === 0
    ) {
      errors.options = "At least one option is required"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    const fetchToken = async () => {
      const storedData = localStorage.getItem("map_user")
      if (!storedData) {
        router.push("/login")
        return null
      }

      const userData = JSON.parse(storedData)
      const token = userData?.access_token

      if (!token) {
        router.push("/login")
        return null
      }

      return token
    }

    setIsSaving(true)

    try {
      const payload = {
        name: statusName.trim(),
        color: selectedColor,
        weightage: 0,
        default: 0,
        type: "lead_status",
        info: JSON.stringify({
          field_type: statusType,
          ...(statusType === "dropdown-single" || statusType === "dropdown-multiple"
            ? {
                options: statusOptions.map((option) => ({
                  name: option.name,
                  color: option.color,
                })),
              }
            : {}),
        }),
      }

      const response = await fetch(URLS.ADD_LEAD_SETTINGS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await fetchToken()}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok && data.code === 200) {
        toast({
          title: "Lead Status Added",
          description: `The lead status "${statusName}" has been added successfully.`,
        })

        const created = data.data || {}
        onSave({
          id: created._id?.$oid || created._id || new Date().getTime(),
          name: statusName.trim(),
          color: (created.color as string) || selectedColor,
          fieldType: statusType,
        })

        setOpen(false)
        resetForm()
      } else {
        throw new Error(data.msg || "Failed to add lead status")
      }
    } catch (error) {
      console.error("Error adding lead status:", error)
      toast({
        title: "Error",
        description: "Failed to add status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const isDropdownType = statusType === "dropdown-single" || statusType === "dropdown-multiple"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="text-sm h-8 px-3">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Lead Status
        </Button>
      </DialogTrigger>
      <DialogContent className={formModalContentClassName}>
        <DialogHeader className={formModalHeaderClassName}>
          <DialogTitle className={formModalTitleClassName}>Add Status</DialogTitle>
          <DialogDescription className={formModalDescriptionClassName}>
            Enter the status name and type below.
          </DialogDescription>
        </DialogHeader>

        <div className={formModalBodyClassName}>
          <div className={formModalFieldsClassName}>
            <div className={formModalFieldGroupClassName}>
              <Label htmlFor="status-name" className={formModalLabelClassName}>
                Status Name <span className={formModalRequiredClassName}>*</span>
              </Label>
              <div className="relative">
                <Input
                  id="status-name"
                  placeholder="Enter status name"
                  value={statusName}
                  onChange={(e) => setStatusName(e.target.value)}
                  className={cn(formInputClassName, "pr-10")}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Popover open={nameColorPickerOpen} onOpenChange={setNameColorPickerOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="h-6 w-6 flex-shrink-0 rounded-full border border-input transition-all hover:border-ring"
                        style={{ backgroundColor: selectedColor }}
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
                              selectedColor === color
                                ? "scale-110 border-foreground"
                                : "border-transparent hover:scale-105",
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => handleNameColorSelect(color)}
                          >
                            {selectedColor === color && (
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
              <Label htmlFor="status-type" className={formModalLabelClassName}>
                Type <span className={formModalRequiredClassName}>*</span>
              </Label>
              <Select
                value={statusType}
                onValueChange={(value) => {
                  setStatusType(value)
                  setFormErrors({ ...formErrors, type: "" })
                  if (value !== "dropdown-single" && value !== "dropdown-multiple") {
                    setStatusOptions([])
                    setNewOptionName("")
                    setNewOptionColor(THEME_PRIMARY_COLOR)
                    setEditingOptionId(null)
                  }
                }}
              >
                <SelectTrigger
                  id="status-type"
                  size="form"
                  className={cn(formSelectTriggerClassName, formErrors.type && "border-red-500")}
                >
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <FormSelectContent>
                  {statusTypes.map((type) => (
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
                  {statusOptions.map((option) => (
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
