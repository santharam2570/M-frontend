"use client"

import { useState, useEffect } from "react"
import { Check, Plus, Trash, MoreVertical, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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

interface StatusItem {
  id?: string
  aging: 'new' | 'old'
  color: string
  name: string
  type: 'active' | 'done' | 'closed'
  sort_order: number
  weightage: string
  
  // Optional fields for old statuses
  _id?: string
  create_date?: string
  create_date_utc?: string
  create_time?: string
  date_aging?: string
  modify_date?: number
  org_id?: number
  status_template_id?: string
  template_details?: {
    _id?: string
    create_date?: string
    create_date_utc?: string
    create_time?: string
    date_aging?: string
    default?: string
    org_id?: string
    template_name?: string
  }
  template_name?: string
}

interface StatusTemplateData {
  id?: string
  name: string
  active: StatusItem[]
  done: StatusItem[]
  closed: StatusItem[]
  org_id?: number
  default?: string
}

interface StatusTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: StatusTemplateData) => void
  initialData?: StatusTemplateData
}

export function StatusTemplateDialog({ open, onOpenChange, onSave, initialData }: StatusTemplateDialogProps) {
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
  const [deletingStatusId, setDeletingStatusId] = useState<string | null>(null)
  const { toast } = useToast()
  const getStatusUniqueId = (status: StatusItem) => status._id || status.id || ""


  useEffect(() => {
    if (open) {
      if (initialData) {
        setTemplateName(initialData.name)
        setActiveStatuses(initialData.active || [])
        setDoneStatuses(initialData.done || [])
        setClosedStatuses(initialData.closed || [])
      } else {
        setTemplateName("")
        setActiveStatuses([
          { name: "Not Started", color: "#E2E8F0", aging: 'new', type: 'active', sort_order: 1, weightage: '1' },
          { name: "In Progress", color: "#3B82F6", aging: 'new', type: 'active', sort_order: 2, weightage: '1' },
          { name: "Stuck", color: "#F97316", aging: 'new', type: 'active', sort_order: 3, weightage: '1' },
        ])
        setDoneStatuses([{ name: "Done", color: "#10B981", aging: 'new', type: 'done', sort_order: 1, weightage: '1' }])
        setClosedStatuses([{ name: "Completed", color: "#22C55E", aging: 'new', type: 'closed', sort_order: 1, weightage: '1' }])
      }
      setFormErrors({})
      setNewStatusName("")
      setNewStatusColor("#3B82F6")
      setEditingStatusId(null)
    }
  }, [open, initialData])

  const handleAddStatus = (section: "active" | "done" | "closed") => {
    if (newStatusName.trim()) {
      // Find the status we're editing to get its existing aging value
      let agingValue: 'new' | 'old' = 'new';
      if (editingStatusId !== null) {
        const existingStatus = section === "active" 
          ? activeStatuses.find(s => s._id === editingStatusId || s.id === editingStatusId)
          : section === "done" 
            ? doneStatuses.find(s => s._id === editingStatusId || s.id === editingStatusId)
            : closedStatuses.find(s => s._id === editingStatusId || s.id === editingStatusId);
        if (existingStatus) {
          agingValue = existingStatus.aging;
        }
      }

      const newStatus: StatusItem = {
        name: newStatusName.trim(),
        color: newStatusColor,
        aging: agingValue,
        type: section,
        sort_order: section === "active" ? activeStatuses.length + 1 : 
                   section === "done" ? doneStatuses.length + 1 : 
                   closedStatuses.length + 1,
        weightage: '1'
      }

      if (editingStatusId !== null) {
        // Since editingStatusId is already a string, no need to convert
        const editingStatusIdStr = editingStatusId;
        
        // Find the status to update based on _id for existing statuses or id for new ones
        const updateStatus = (statuses: StatusItem[], setStatuses: (statuses: StatusItem[]) => void) => {
          const statusToUpdate = statuses.find(status => 
            status._id === editingStatusIdStr || 
            status.id === editingStatusIdStr
          );
          
          if (statusToUpdate) {
            setStatuses(statuses.map(status => 
              (status._id === editingStatusIdStr || 
               status.id === editingStatusIdStr)
                ? { ...status, ...newStatus }
                : status
            ));
          }
        }

        if (section === "active") {
          updateStatus(activeStatuses, setActiveStatuses);
        } else if (section === "done") {
          updateStatus(doneStatuses, setDoneStatuses);
        } else if (section === "closed") {
          updateStatus(closedStatuses, setClosedStatuses);
        }
      } else {
        if (section === "active") {
          setActiveStatuses([...activeStatuses, newStatus])
        } else if (section === "done") {
          setDoneStatuses([...doneStatuses, newStatus])
        } else if (section === "closed") {
          setClosedStatuses([...closedStatuses, newStatus])
        }
      }

      setNewStatusName("")
      setNewStatusColor("#3B82F6")
      setEditingStatusId(null)
    }
  }

  const handleRemoveStatus = (status: StatusItem, section: "active" | "done" | "closed") => {
    const uniqueId = getStatusUniqueId(status)
    if (section === "active") {
      setActiveStatuses((prev) => prev.filter((item) => getStatusUniqueId(item) !== uniqueId))
    } else if (section === "done") {
      setDoneStatuses((prev) => prev.filter((item) => getStatusUniqueId(item) !== uniqueId))
    } else {
      setClosedStatuses((prev) => prev.filter((item) => getStatusUniqueId(item) !== uniqueId))
    }

    if (editingStatusId === uniqueId) {
      setEditingStatusId(null)
      setNewStatusName("")
      setNewStatusColor("#3B82F6")
    }

    toast({
      title: "Status deleted",
      description: "The status was removed successfully.",
    })
  }

  const handleEditStatus = (status: StatusItem, section: "active" | "done" | "closed") => {
    // Use _id if it exists, otherwise use id
    setEditingStatusId(status._id || status.id || null)
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

  const handleSave = () => {
    if (validateForm()) {
      const data: StatusTemplateData = {
        id: initialData?.id,
        name: templateName.trim(),
        active: activeStatuses,
        done: doneStatuses,
        closed: closedStatuses,
      }

      onSave(data)
      onOpenChange(false)
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
          {statuses.map((status, index) => (
            <div
              key={getStatusUniqueId(status) || `${status.name}-${index}`}
              className="flex items-center gap-2 py-1 px-2 border rounded-md text-sm"
            >
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
                      disabled={deletingStatusId === getStatusUniqueId(status)}
                    >
                      <Trash className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
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
              disabled={!newStatusName.trim() || currentSection !== section}
            >
              {editingStatusId !== null && currentSection === section ? (
                <Check className="h-4 w-4 mr-1" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}{' '}
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
          <DialogTitle>{initialData ? "Edit Status Template" : "Add Status Template"}</DialogTitle>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="bg-black hover:bg-gray-800 text-white" onClick={handleSave}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
