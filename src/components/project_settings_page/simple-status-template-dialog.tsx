"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, MoreVertical, Pencil, Plus, Trash } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/hooks/use-toast"

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

export interface StatusItem {
  id?: string
  _id?: string
  name: string
  color: string
  aging?: "new" | "old"
  type?: "active" | "done" | "closed"
  sort_order?: number
  weightage?: string
}

export interface StatusTemplatePayloadItem {
  _id?: string
  name: string
  color: string
  sort_order: number
  weightage: string
  type: "active" | "done" | "closed"
  aging: "new" | "old"
}

export interface StatusTemplatePayload {
  template_name: string
  data: StatusTemplatePayloadItem[]
  status_template_id?: string
}

interface StatusTemplateData {
  id?: string
  name: string
  active: StatusItem[]
  done: StatusItem[]
  closed: StatusItem[]
}

interface StatusTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (payload: StatusTemplatePayload) => Promise<void> | void
  initialData?: StatusTemplateData
  title?: string
  saveButtonLabel?: string
  onStatusDelete?: (status: StatusItem, section: "active" | "done" | "closed") => void
}

const createTemporaryId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const calculateActiveWeightage = (index: number, total: number) => {
  if (total <= 1) {
    return "100"
  }

  if (index === 0) {
    return "0"
  }

  if (index === total - 1) {
    return "100"
  }

  const step = 100 / (total - 1)
  return Math.round(index * step).toString()
}

const normalizeStatusId = (status: StatusItem) => {
  const raw = status.id ?? status._id
  if (!raw) return ""
  if (typeof raw === "string") return raw
  if (typeof raw === "object" && "$oid" in raw) {
    return (raw as { $oid: string }).$oid
  }
  return String(raw)
}

const getStatusUniqueId = (status: StatusItem) => normalizeStatusId(status)

export function SimpleStatusTemplateDialog({
  open,
  onOpenChange,
  onSave,
  initialData,
  title,
  saveButtonLabel,
  onStatusDelete,
}: StatusTemplateDialogProps) {
  const [templateName, setTemplateName] = useState("")
  const [activeStatuses, setActiveStatuses] = useState<StatusItem[]>([])
  const [doneStatuses, setDoneStatuses] = useState<StatusItem[]>([])
  const [closedStatuses, setClosedStatuses] = useState<StatusItem[]>([])

  const [newStatusName, setNewStatusName] = useState("")
  const [newStatusColor, setNewStatusColor] = useState("#3B82F6")
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [currentSection, setCurrentSection] = useState<"active" | "done" | "closed">("active")
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const [isSaving, setIsSaving] = useState(false)
  const [deletingStatusId, setDeletingStatusId] = useState<string | null>(null)
  const { toast } = useToast()

  const defaultActiveStatuses = useMemo<StatusItem[]>(
    () => [
      { id: createTemporaryId(), name: "Not Started", color: "#E2E8F0", aging: "new", type: "active" },
      { id: createTemporaryId(), name: "In Progress", color: "#3B82F6", aging: "new", type: "active" },
      { id: createTemporaryId(), name: "Stuck", color: "#F97316", aging: "new", type: "active" },
    ],
    []
  )

  const defaultDoneStatuses = useMemo<StatusItem[]>(
    () => [{ id: createTemporaryId(), name: "Done", color: "#10B981", aging: "new", type: "done" }],
    []
  )

  const defaultClosedStatuses = useMemo<StatusItem[]>(
    () => [{ id: createTemporaryId(), name: "Completed", color: "#22C55E", aging: "new", type: "closed" }],
    []
  )

  const getStatusesBySection = (section: "active" | "done" | "closed") => {
    if (section === "active") return activeStatuses
    if (section === "done") return doneStatuses
    return closedStatuses
  }

  const setStatusesBySection = (section: "active" | "done" | "closed", updater: (statuses: StatusItem[]) => StatusItem[]) => {
    if (section === "active") {
      setActiveStatuses((prev) => updater(prev))
    } else if (section === "done") {
      setDoneStatuses((prev) => updater(prev))
    } else {
      setClosedStatuses((prev) => updater(prev))
    }
  }

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        setTemplateName(initialData.name)
        setActiveStatuses(initialData.active || [])
        setDoneStatuses(initialData.done || [])
        setClosedStatuses(initialData.closed || [])
      } else {
        // Reset form for new template
        setTemplateName("")
        setActiveStatuses(defaultActiveStatuses)
        setDoneStatuses(defaultDoneStatuses)
        setClosedStatuses(defaultClosedStatuses)
      }
      setFormErrors({})
      setNewStatusName("")
      setNewStatusColor("#3B82F6")
      setEditingStatusId(null)
    }
  }, [open, initialData, defaultActiveStatuses, defaultDoneStatuses, defaultClosedStatuses])

  const handleAddStatus = (section: "active" | "done" | "closed") => {
    if (newStatusName.trim()) {
      const targetStatuses = getStatusesBySection(section)
      const existingStatus =
        editingStatusId !== null
          ? targetStatuses.find((status) => getStatusUniqueId(status) === editingStatusId)
          : undefined

      const baseId = existingStatus ? getStatusUniqueId(existingStatus) : createTemporaryId()

      const newStatus: StatusItem = {
        ...existingStatus,
        id: existingStatus?.id ?? baseId,
        _id: existingStatus?._id,
        name: newStatusName.trim(),
        color: newStatusColor,
        aging: existingStatus?.aging ?? "new",
        type: section,
      }

      if (editingStatusId !== null) {
        // Update existing status
        setStatusesBySection(section, (statuses) =>
          statuses.map((status) => (getStatusUniqueId(status) === editingStatusId ? newStatus : status))
        )
      } else {
        // Add new status
        setStatusesBySection(section, (statuses) => [...statuses, newStatus])
      }

      setNewStatusName("")
      setNewStatusColor("#3B82F6")
      setEditingStatusId(null)
    }
  }

  const handleRemoveStatus = (status: StatusItem, section: "active" | "done" | "closed") => {
    const uniqueId = getStatusUniqueId(status)
    setStatusesBySection(section, (statuses) => statuses.filter((item) => getStatusUniqueId(item) !== uniqueId))
    if (editingStatusId === uniqueId) {
      setEditingStatusId(null)
      setNewStatusName("")
      setNewStatusColor("#3B82F6")
    }
    onStatusDelete?.(status, section)
    toast({
      title: "Status deleted",
      description: "The status was removed successfully.",
    })
  }

  const handleEditStatus = (status: StatusItem, section: "active" | "done" | "closed") => {
    const uniqueId = getStatusUniqueId(status)
    setEditingStatusId(uniqueId)
    setNewStatusName(status.name)
    setNewStatusColor(status.color)
    setCurrentSection(section)
  }

  const handleColorSelect = (color: string) => {
    setNewStatusColor(color)
    setColorPickerOpen(false)
  }

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {}

    if (!templateName.trim()) {
      errors.name = "Template name is required"
    }

    if (activeStatuses.length === 0) {
      errors.active = "At least one active status is required"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const buildSectionPayload = (
    statuses: StatusItem[],
    section: "active" | "done" | "closed"
  ): StatusTemplatePayloadItem[] => {
    return statuses
      .filter((status) => status.name.trim())
      .map((status, index) => ({
        _id: status._id,
        name: status.name.trim(),
        color: status.color,
        sort_order: status.sort_order ?? index + 1,
        weightage:
          status.weightage ??
          (section === "active" ? calculateActiveWeightage(index, statuses.length) : "100"),
        type: status.type ?? section,
        aging: status.aging ?? "new",
      }))
  }

  const handleSave = async () => {
    if (validateForm()) {
      const payload: StatusTemplatePayload = {
        template_name: templateName.trim(),
        data: [
          ...buildSectionPayload(activeStatuses, "active"),
          ...buildSectionPayload(doneStatuses, "done"),
          ...buildSectionPayload(closedStatuses, "closed"),
        ],
        status_template_id: initialData?.id,
      }

      try {
        setIsSaving(true)
        await onSave(payload)
        onOpenChange(false)
      } catch (error) {
        console.error("Failed to save status template", error)
      } finally {
        setIsSaving(false)
      }
    }
  }

  const renderStatusList = (statuses: StatusItem[], section: "active" | "done" | "closed", sectionTitle: string) => {
    return (
      <div className="grid gap-2 mt-3">
        <div className="flex justify-between items-center">
          <Label>{sectionTitle}</Label>
          {formErrors[section] && <p className="text-red-500 text-xs">{formErrors[section]}</p>}
        </div>

        <div className="grid gap-1.5">
          {statuses.map((status, index) => {
            const statusId = getStatusUniqueId(status) || `${section}-${index}`
            return (
              <div key={statusId} className="flex items-center gap-2 py-1 px-2 border rounded-md text-sm">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: status.color }} />
                <span className="flex-1">{status.name}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditStatus(status, section)}>
                      <Pencil className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    {section !== "closed" && (
                      <DropdownMenuItem
                        onClick={() => {
                          if (!deletingStatusId) {
                            void handleRemoveStatus(status, section)
                          }
                        }}
                        className="text-red-500"
                        disabled={deletingStatusId === statusId}
                      >
                        <Trash className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}
        </div>

        {(currentSection === section || editingStatusId === null) && (
          <div className="flex items-center gap-2 mt-1">
            <div className="relative flex-1">
              <Input
                placeholder={`Add ${sectionTitle.toLowerCase()} status`}
                value={currentSection === section ? newStatusName : ""}
                onChange={(e) => {
                  if (currentSection === section) {
                    setNewStatusName(e.target.value)
                  }
                }}
                className="pr-10"
                onFocus={() => setCurrentSection(section)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && currentSection === section) {
                    e.preventDefault()
                    handleAddStatus(section)
                  }
                }}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Popover open={colorPickerOpen && currentSection === section} onOpenChange={setColorPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="h-6 w-6 rounded-full border border-gray-200 hover:border-gray-300 transition-all flex-shrink-0"
                      style={{ backgroundColor: currentSection === section ? newStatusColor : "#3B82F6" }}
                      aria-label="Select color"
                      type="button"
                      onClick={() => setCurrentSection(section)}
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
                              newStatusColor === color
                                ? "border-gray-900 scale-110"
                                : "border-transparent hover:scale-105"
                            }
                          `}
                          style={{ backgroundColor: color }}
                          onClick={() => handleColorSelect(color)}
                        >
                          {newStatusColor === color && <Check className="h-3 w-3 text-white mx-auto" />}
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
              onClick={() => handleAddStatus(section)}
              disabled={!newStatusName.trim() || currentSection !== section || isSaving}
            >
              {editingStatusId !== null && currentSection === section ? (
                <Check className="h-4 w-4 mr-1" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}{" "}
              {editingStatusId !== null && currentSection === section ? "Update" : "Add"}
            </Button>
            {editingStatusId !== null && currentSection === section && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingStatusId(null)
                  setNewStatusName("")
                  setNewStatusColor("#3B82F6")
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title ?? (initialData ? "Edit Status Template" : "Add Status Template")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-3">
          <div className="grid gap-2">
            <Label htmlFor="template-name">
              Template Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="template-name"
              placeholder="Enter template name"
              value={templateName}
              onChange={(e) => {
                setTemplateName(e.target.value)
                if (e.target.value.trim()) {
                  setFormErrors({ ...formErrors, name: "" })
                }
              }}
              className={formErrors.name ? "border-red-500" : ""}
            />
            {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
          </div>

          {renderStatusList(activeStatuses, "active", "Active")}
          {renderStatusList(doneStatuses, "done", "Done")}
          {renderStatusList(closedStatuses, "closed", "Closed")}
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            className="bg-black hover:bg-gray-800 text-white"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : saveButtonLabel ?? (initialData ? "Update" : "Save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
