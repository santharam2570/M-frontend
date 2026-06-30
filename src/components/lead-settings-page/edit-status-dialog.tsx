"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Check, Plus, Trash, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, FormSelectContent, FormSelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import URLS from "@/config/urls"
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
  // Row 1
  "#E2E8F0",
  "#EF4444",
  "#F43F5E",
  "#EC4899",
  "#D946EF",
  "#A855F7",
  // Row 2
  "#8B5CF6",
  "#6366F1",
  "#3B82F6",
  "#0EA5E9",
  "#06B6D4",
  "#14B8A6",
  // Row 3
  "#10B981",
  "#22C55E",
  "#84CC16",
  "#EAB308",
  "#F59E0B",
  "#F97316",
  // Row 4
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

interface Status {
  id: string | number
  name: string
  color: string
  isDefault: boolean
  createdOn: string
  fieldType?: string
  options?: StatusOption[]
}

interface EditStatusDialogProps {
  status: Status | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (
    id: string | number,
    data: {
      name: string
      color: string
      fieldType?: string
      options?: { name: string; color: string }[]
    },
  ) => void
}

export function EditStatusDialog(props: EditStatusDialogProps) {
  const { onUpdate, onOpenChange, status, open } = props;
  const { toast } = useToast()
  const router = useRouter()
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState<string>("#E2E8F0")
  const [statusName, setStatusName] = useState("")
  const [statusType, setStatusType] = useState("")
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([])
  const [newOptionName, setNewOptionName] = useState("")
  const [newOptionColor, setNewOptionColor] = useState(THEME_PRIMARY_COLOR)
  const [optionColorPickerOpen, setOptionColorPickerOpen] = useState(false)
  const [editingOptionId, setEditingOptionId] = useState<number | null>(null)
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})

  // const handleUpdateStatus = async (id: number, data: { name: string; color: string }) => {
  //   try {
  //     const storedData = localStorage.getItem("map_user");
  //     if (!storedData) {
  //       console.error("No user data found in localStorage");
  //       showToast({
  //         title: "Error",
  //         description: "User not logged in. Please log in again.",
  //         variant: "destructive",
  //       });
  //       return;
  //     }
  
  //     const userData = JSON.parse(storedData);
  //     const token = userData?.access_token;
  
  //     if (!token) {
  //       console.error("Access token is missing");
  //       showToast({
  //         title: "Error",
  //         description: "Access token is missing. Please log in again.",
  //         variant: "destructive",
  //       });
  //       return;
  //     }
  
  //     const payload = {
  //       _id: id,
  //       name: data.name,
  //       color: data.color,
  //       type: "lead_status",
  //       create_date: new Date().toLocaleDateString("en-GB"),
  //       create_time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
  //       default: "0",
  //       demo_data: "0",
  //       info: "",
  //       lost: "0",
  //       org_id: "165",
  //       settings: "[]",
  //       sort_order: "6",
  //       title: "",
  //       weightage: "0",
  //       won: "0",
  //     };
  
  //     const response = await fetch(`${URLS.SALES_MODULE_ALL_SETTINGS_UPDATE}/${id}`, {
  //       method: "PUT",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${token}`,
  //       },
  //       body: JSON.stringify(payload),
  //     });
  
  //     const result = await response.json();
  
  //     if (response.ok) {
  //       showToast({
  //         title: "Status Updated",
  //         description: `The status "${data.name}" has been updated successfully.`,
  //       });
  //     } else {
  //       console.error("Update failed:", result);
  //       showToast({
  //         title: "Update Failed",
  //         description: result.msg || "There was an error updating the status. Please try again.",
  //         variant: "destructive",
  //       });
  //     }
  //   } catch (error) {
  //     console.error("Network error:", error);
  //     showToast({
  //       title: "Network Error",
  //       description: "Failed to update status due to a network issue.",
  //       variant: "destructive",
  //     });
  //   }
  // }

  // Update form when status changes
  
  
  
  
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

  const handleOptionColorSelect = (color: string) => {
    setNewOptionColor(color)
    setOptionColorPickerOpen(false)
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

  const handleUpdate = async () => {
    const storedData = localStorage.getItem("map_user");
    if (!storedData) {
      console.error("No user data found in localStorage");
      router.push("/login");
      return;
    }
  
    const userData = JSON.parse(storedData);
    const token = userData?.access_token;
  
    if (!token) {
      console.error("Access token is missing");
      router.push("/login");
      return;
    }
  
    if (status) {
      if (!validateForm()) return

      try {
        const response = await fetch(`${URLS.UPDATE_LEAD_SETTINGS}/${status.id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: statusName,
            color: selectedColor,
            type: "lead_status",
            default: status.isDefault ? 1 : 0,
            weightage: 0,
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
          }),
        })

        const data = await response.json()

        if (response.ok && data.code === 200) {
          console.log("Status updated successfully:", data);
          onUpdate(status.id, {
            name: statusName,
            color: selectedColor,
            fieldType: statusType,
            options: statusOptions.map((option) => ({
              name: option.name,
              color: option.color,
            })),
          });
          onOpenChange(false);
          toast({
            title: "Status updated",
            description: `The status "${statusName}" has been updated successfully.`,
          });
        } else {
          console.error("Failed to update status:", data);
          toast({
            title: "Update failed",
            description: `Error: ${data.msg || "Something went wrong"}`,
          });
        }
      } catch (error) {
        console.error("Error updating status:", error);
        toast({
          title: "Error",
          description: `Failed to update status. Please try again.`,
        });
      }
    }
  };
  
  
  useEffect(() => {
    if (status) {
      setSelectedColor(status.color)
      setStatusName(status.name)
      setStatusType(status.fieldType || "text")
      setStatusOptions(status.options || [])
      setNewOptionName("")
      setNewOptionColor(THEME_PRIMARY_COLOR)
      setEditingOptionId(null)
      setFormErrors({})
    }
  }, [status])

  // Removed duplicate handleUpdate function to resolve redeclaration error

  const handleCancel = () => {
    onOpenChange(false)
  }

  const handleColorSelect = (color: string) => {
    setSelectedColor(color)
    setColorPickerOpen(false)
  }

  const isDropdownType = statusType === "dropdown-single" || statusType === "dropdown-multiple"
  const isValid = selectedColor && statusName.trim().length > 0 && statusType.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={formModalContentClassName}>
        <DialogHeader className={formModalHeaderClassName}>
          <DialogTitle className={formModalTitleClassName}>Edit Status</DialogTitle>
          <DialogDescription className={formModalDescriptionClassName}>
            Update the status name, color, and type below.
          </DialogDescription>
        </DialogHeader>

        <div className={formModalBodyClassName}>
          <div className={formModalFieldsClassName}>
            <div className={formModalFieldGroupClassName}>
              <Label htmlFor="status-name" className={formModalLabelClassName}>
                Status Name
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
                  <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="h-6 w-6 rounded-full border border-input hover:border-ring transition-all flex-shrink-0"
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
                                ? "border-foreground scale-110"
                                : "border-transparent hover:scale-105"
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => handleColorSelect(color)}
                          >
                            {selectedColor === color && <Check className="h-3 w-3 text-white mx-auto" />}
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
                Type
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
                      <Popover open={optionColorPickerOpen} onOpenChange={setOptionColorPickerOpen}>
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
                                    ? "border-foreground scale-110"
                                    : "border-transparent hover:scale-105",
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => handleOptionColorSelect(color)}
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
            onClick={handleUpdate}
            disabled={!isValid}
          >
            Update
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
