"use client"
import { useState, useRef, useEffect, useMemo, type ComponentType, type ReactNode } from "react"
import { useParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import URLS from "@/config/urls"
import {
  Phone,
  Mail,
  Calendar,
  Activity,
  MessageSquare,
  Clock,
  PanelLeft,
  Search,
  Bell,
  User,
  ChevronRight,
  FileText,
  ThumbsDown,
  ChevronDown,
  Plus,
  CheckSquare,
  FileEdit,
  Send,
  Check,
  Pencil,
  FileIcon,
  Download,
  ExternalLink,
  ImageIcon,
  FileSpreadsheet,
  FileIcon as FilePdf,
  X,
  Tag,
  Users,
  AlertTriangle,
  Building,
  Hash,
  Shield,
  Link as Linkedin,
  Award,
  Briefcase,
  MessageCircle,
  Info,
  Package,
  UserPlus,
  Target,
  Globe,
  MapPin,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  formInputClassName,
  formModalLabelClassName,
  formSelectTriggerClassName,
  formTextareaClassName,
  leadDetailBodyClassName,
  leadDetailBodyMutedClassName,
  leadDetailCaptionClassName,
  leadDetailCardClassName,
  leadDetailActionButtonClassName,
  leadDetailActivityCardClassName,
  leadDetailContactRowClassName,
  leadDetailContentAreaClassName,
  leadDetailDashedEmptyClassName,
  leadDetailFieldLabelClassName,
  leadDetailFieldValueClassName,
  leadDetailHeaderClassName,
  leadDetailIconBoxClassName,
  leadDetailIconBoxSmClassName,
  leadDetailListItemClassName,
  leadDetailPageBackgroundClassName,
  leadDetailPopoverClassName,
  leadDetailSidebarFieldLabelClassName,
  leadDetailSidebarFieldValueClassName,
  leadDetailInlineFieldClassName,
  leadDetailMetaLabelClassName,
  leadDetailMetaTextClassName,
  leadDetailPageTitleClassName,
  leadDetailSectionTitleClassName,
  leadDetailSubsectionLabelClassName,
  leadDetailTabBarClassName,
  leadDetailTimelineLineClassName,
} from "@/lib/form-field-styles"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetClose,
  sheetFormContentClassName,
  formModalHeaderClassName,
  formModalFooterClassName,
  formModalFooterButtonClassName,
  formModalFieldGroupClassName,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DateAgeingBadge } from "@/components/ui/date-ageing-badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { format } from "date-fns"
import {
  Select,
  SelectContent,
  SelectItem,
  FormSelectContent,
  FormSelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MultiSelect } from "@/components/ui/multi-select"
import SendEmail from "@/components/compose-email/send-email"
import EmailPreviewSheet, { type EmailHistory } from "@/components/compose-email/email-details"
import { EditableField } from "./editable-field"
import { EditableTitle } from "./editable-title"
import { AddContactDrawer } from "@/components/all-contacts/add-contact-drawer"
import { EditContactDrawer } from "@/components/all-contacts/edit-contact-drawer"
import { useToast } from "@/hooks/use-toast"
import { useLeadPermissions } from "@/hooks/useLeadPermissions"
import { getOrgIdFromAuth } from "@/lib/auth"
import {
  buildUserBranchMap,
  filterAssignableUsersForLead,
  type AssignableUser,
} from "@/lib/users/assignable-users"
import {
  LEAD_SETTINGS_QUERY_KEY,
  PROJECT_LIST_QUERY_KEY,
  LEAD_DETAIL_STALE_MS,
  assignableUsersQueryKey,
  fetchCachedAssignableUsers,
  fetchLeadSettingsList,
} from "@/lib/leads/lead-shared-queries"
import {
  fetchLeadActivityRaw,
  fetchLeadAssociatesRaw,
  fetchLeadDetailRaw,
  leadActivityQueryKey,
  leadAssociatesQueryKey,
  leadDetailQueryKey,
  leadDetailSnapshotQueryKey,
  leadMatchedProjectsQueryKey,
  mergeAbortSignals,
} from "@/lib/leads/lead-detail-api"
import AddNoteDrawer from "@/components/all-notes/add-note-drawer"
import { DeleteItemAlert } from "@/components/ui/delete-item-alert"
import { Trash2 } from "lucide-react"
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon"
import { useRouter } from 'next/navigation'
import { AddTaskSheet } from "@/components/all-details-followup-tasks/add-task-sheet"
import { useTimeline } from "@/hooks/use-timeline"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { CalendarIcon, Loader2 } from "lucide-react"
import { EditTaskSheet } from "@/components/all-details-followup-tasks/edit-task-sheet"
import { VISIT_TIME_OPTIONS, mergeTaskUserLists, normalizeAssociatesUsers } from "@/components/all-lists-followup-tasks/config"
import { useAiChatContext } from "@/components/ai-chat/ai-chat-context"
import { SuggestedProjectsCard } from "@/components/lead-detail-page/suggested-projects-card"
import {
  fetchLeadMatchedProjects,
  fetchProjectList,
  matchProjectsForLead,
} from "@/lib/projects/project-api"
import type { MatchedProject } from "@/lib/projects/types"
import { getStoredLeadSuggestedProjects } from "@/lib/leads/lead-api"
import React from "react"
// Move CustomFieldDisplay component outside of the main component
const CustomFieldDisplay = ({ 
  field, 
  editingCustomField, 
  setEditingCustomField, 
  customFieldEditValue, 
  setCustomFieldEditValue,
  handleSingleValueSave,
  handleMultipleValueSave
}: { 
  field: any;
  editingCustomField: any;
  setEditingCustomField: any;
  customFieldEditValue: any;
  setCustomFieldEditValue: any;
  handleSingleValueSave: (fieldId: string, value: string) => Promise<void>;
  handleMultipleValueSave: (fieldId: string, values: string[]) => Promise<void>;
}) => {
  // console.log("field", field)
  
  const isEditing = editingCustomField?.fieldId === field._id

  const handleCustomFieldUpdate = (value: any) => {
    if (field.field_type === "dropdown-multiple") {
      // For multiselect, map selected names to their IDs
      const selectedIds = Array.isArray(value) 
        ? value.map(selectedName => {
            const option = field.field_value.find((opt: any) => opt.name === selectedName)
            return option ? option._id : selectedName
          })
        : []
      handleMultipleValueSave(field._id, selectedIds)
    } else if (field.field_type === "dropdown-single") {
      // For dropdown, find the ID of the selected option
      const selectedOption = field.field_value.find((opt: any) => opt.name === value)
      const selectedId = selectedOption ? selectedOption._id : value
      handleSingleValueSave(field._id, selectedId)
    } else {
      // For other fields, save the actual value
      handleSingleValueSave(field._id, value)
      console.log("value", value)
    }
  }

  const startEditCustomField = () => {
    let initialValue: any = ""
    
    if (field.field_type === "dropdown-single") {
      const selectedOption = field.field_value.find((opt: any) => opt._id === field.single_value)
      initialValue = selectedOption ? selectedOption.name : ""
    } else if (field.field_type === "dropdown-multiple") {
      initialValue = Array.isArray(field.multiple_value)
        ? field.multiple_value.map((id: any) => {
            const option = field.field_value.find((opt: any) => opt._id === id)
            return option ? option.name : ""
          }).filter(Boolean)
        : []
    } else if (field.field_type === "checkbox") {
      initialValue = field.single_value === "True"
    } else {
      initialValue = field.single_value || ""
    }

    setEditingCustomField({
      fieldId: field._id,
      fieldType: field.field_type,
      value: initialValue,
      isMultiSelect: field.field_type === "dropdown-multiple"
    })
    setCustomFieldEditValue(initialValue)
  }

  const saveCustomField = () => {
    if (editingCustomField) {
      handleCustomFieldUpdate(customFieldEditValue)
      setEditingCustomField(null)
      setCustomFieldEditValue(null)
    }
  }

  const cancelCustomFieldEdit = () => {
    setEditingCustomField(null)
    setCustomFieldEditValue(null)
  }

  // Helper function to get field type icon
  const getFieldIcon = () => {
    switch (field.field_type) {
      case "dropdown-single":
        return <ChevronDown className="h-4 w-4 text-muted-foreground mr-2" />
      case "dropdown-multiple":
        return <CheckSquare className="h-4 w-4 text-muted-foreground mr-2" />
      case "checkbox":
        return <CheckSquare className="h-4 w-4 text-muted-foreground mr-2" />
      case "date":
        return <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
      case "money":
        return <Hash className="h-4 w-4 text-muted-foreground mr-2" />
      case "phone":
        return <Phone className="h-4 w-4 text-muted-foreground mr-2" />
      case "number":
        return <Hash className="h-4 w-4 text-muted-foreground mr-2" />
      default:
        return <Tag className="h-4 w-4 text-muted-foreground mr-2" />
    }
  }

  if (field.field_type === "dropdown-single") {
    // Find the selected option name based on the saved ID
    const selectedOption = field.field_value.find((opt: any) => opt._id === field.single_value)
    const displayValue = selectedOption ? selectedOption.name : ""

    return (
      <div className="flex items-center">
        {getFieldIcon()}
        <div className="flex-1">
          <p className={leadDetailFieldLabelClassName}>{field.field_name}</p>
          {isEditing ? (
            <div className="flex items-center mt-1">
              <div className="flex-1">
                <Select
                  value={customFieldEditValue}
                  onValueChange={(value) => setCustomFieldEditValue(value)}
                >
                  <SelectTrigger className={cn(leadDetailInlineFieldClassName, "p-1")}>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {field.field_value.map((value: any) => (
                      <SelectItem key={value._id} value={value.name}>
                        {value.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex ml-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={saveCustomField}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={cancelCustomFieldEdit}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              <p className={cn(leadDetailFieldValueClassName, "overflow-hidden text-ellipsis")}>{displayValue || "-"}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 ml-1 text-transparent hover:text-foreground"
                onClick={startEditCustomField}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  } else if (field.field_type === "dropdown-multiple") {
    // Convert saved IDs to option names for display
    const selectedValues = Array.isArray(field.multiple_value)
      ? field.multiple_value.map((id: any) => {
          const option = field.field_value.find((opt: any) => opt._id === id)
          return option ? option.name : ""
        }).filter(Boolean)
      : []

    return (
      <div className="flex items-center">
        {getFieldIcon()}
        <div className="flex-1">
          <p className={leadDetailFieldLabelClassName}>{field.field_name}</p>
          {isEditing ? (
            <div className="flex items-center mt-1">
              <div className="flex-1">
                <MultiSelect
                  options={field.field_value.map((value: any) => ({
                    label: value.name,
                    value: value.name
                  }))}
                  selected={customFieldEditValue || []}
                  onChange={(selected) => setCustomFieldEditValue(selected)}
                  placeholder="Select options"
                />
              </div>
              <div className="flex ml-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={saveCustomField}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={cancelCustomFieldEdit}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              <p className={cn(leadDetailFieldValueClassName, "overflow-hidden text-ellipsis")}>
                {selectedValues.join(", ") || "-"}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 ml-1 text-transparent hover:text-foreground"
                onClick={startEditCustomField}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  } else if (field.field_type === "checkbox") {
    return (
      <div className="flex items-center">
        {getFieldIcon()}
        <div className="flex-1">
          <p className={leadDetailFieldLabelClassName}>{field.field_name}</p>
          {isEditing ? (
            <div className="flex items-center mt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={customFieldEditValue}
                  onChange={(e) => setCustomFieldEditValue(e.target.checked)}
                  className="h-4 w-4"
                />
              </div>
              <div className="flex ml-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={saveCustomField}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={cancelCustomFieldEdit}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={field.single_value === "True"}
                disabled
                className="h-4 w-4 mr-2"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 ml-1 text-transparent hover:text-foreground"
                onClick={startEditCustomField}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  } else if (field.field_type === "money") {
    return (
      <div className="flex items-center">
        {getFieldIcon()}
        <div className="flex-1">
          <p className={leadDetailFieldLabelClassName}>{field.field_name}</p>
          {isEditing ? (
            <div className="flex items-center mt-1">
              <div className="flex items-center">
                <span className="mr-1">{field.currency_symbol || ""}</span>
                <Input
                  value={customFieldEditValue}
                  onChange={(e) => setCustomFieldEditValue(e.target.value)}
                  className={cn(leadDetailInlineFieldClassName, "p-1 no-spinner")}
                  type="number"
                  inputMode="decimal"
                  pattern="[0-9]*"
                />
              </div>
              <div className="flex ml-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={saveCustomField}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={cancelCustomFieldEdit}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              <p className={cn(leadDetailFieldValueClassName, "overflow-hidden text-ellipsis")}>
                {field.currency_symbol || ""}{field.single_value || "-"}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 ml-1 text-transparent hover:text-foreground"
                onClick={startEditCustomField}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  } else if (field.field_type === "date") {
    return (
      <div className="flex items-center">
        {getFieldIcon()}
        <div className="flex-1">
          <p className={leadDetailFieldLabelClassName}>{field.field_name}</p>
          {isEditing ? (
            <div className="flex items-center mt-1">
              <div className="relative">
                <Input
                  value={customFieldEditValue}
                  onChange={(e) => setCustomFieldEditValue(e.target.value)}
                  className={cn(leadDetailInlineFieldClassName, "p-1")}
                    type="date"
                    style={{
                      colorScheme: 'light',
                      WebkitAppearance: 'none',
                      MozAppearance: 'textfield'
                    }}
                  />
                  <style jsx>{`
                    input[type="date"]::-webkit-calendar-picker-indicator {
                      position: absolute;
                      right: 8px;
                      top: 50%;
                      transform: translateY(-50%);
                      cursor: pointer;
                      opacity: 0.7;
                    }
                    input[type="date"]::-webkit-calendar-picker-indicator:hover {
                      opacity: 1;
                    }
                  `}</style>
              </div>
              <div className="flex ml-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={saveCustomField}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={cancelCustomFieldEdit}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              <p className={cn(leadDetailFieldValueClassName, "overflow-hidden text-ellipsis")}>
                {field.single_value || "-"}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 ml-1 text-transparent hover:text-foreground"
                onClick={startEditCustomField}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // For all other field types (textbox, number, phone)
  return (
    <div className="flex items-center">
      {getFieldIcon()}
      <div className="flex-1">
        <p className={leadDetailFieldLabelClassName}>{field.field_name}</p>
        {isEditing ? (
          <div className="flex items-center mt-1">
            <Input
              value={customFieldEditValue}
              onChange={(e) => setCustomFieldEditValue(e.target.value)}
              className={cn(leadDetailInlineFieldClassName, "p-1", field.field_type === "number" && "no-spinner")}
              type={field.field_type === "number" ? "number" : "text"}
              inputMode={field.field_type === "number" ? "decimal" : undefined}
              pattern={field.field_type === "number" ? "[0-9]*" : undefined}
            />
            <div className="flex ml-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={saveCustomField}>
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={cancelCustomFieldEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center">
            <p className={cn(leadDetailFieldValueClassName, "overflow-hidden text-ellipsis")}>
              {field.single_value || "-"}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 ml-1 text-transparent hover:text-foreground"
              onClick={startEditCustomField}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

type LeadDetailApiRecord = Record<string, unknown>

const getNameFromApiField = (value: unknown, fallback = ""): string => {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          return (item as { name?: string }).name ?? ""
        }
        return String(item)
      })
      .filter(Boolean)
      .join(", ")
  }
  if (typeof value === "string") return value
  return fallback
}

const getIdFromApiField = (value: unknown, fallback = ""): string => {
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0]
    if (typeof first === "object" && first !== null) {
      const id = (first as { _id?: string | { $oid?: string } })._id
      if (typeof id === "object" && id !== null && "$oid" in id) {
        return id.$oid ?? fallback
      }
      return typeof id === "string" ? id : fallback
    }
    return String(first)
  }
  if (typeof value === "string") return value
  return fallback
}

function getSettingItemIdFromApi(item: unknown): string {
  if (typeof item === "string") return item.trim()
  if (typeof item === "object" && item !== null) {
    const record = item as { _id?: string | { $oid?: string }; id?: string | number }
    if (record._id) {
      if (typeof record._id === "object" && "$oid" in record._id) {
        return String(record._id.$oid ?? "")
      }
      return String(record._id)
    }
    return String(record.id ?? "")
  }
  return ""
}

const getIdsFromApiField = (value: unknown, fallback = ""): string => {
  if (value == null || value === "") return fallback
  if (typeof value === "string") return value.trim()
  if (Array.isArray(value)) {
    return value
      .map((item) => getSettingItemIdFromApi(item))
      .filter(Boolean)
      .join(", ")
  }
  if (typeof value === "object") {
    return getSettingItemIdFromApi(value) || fallback
  }
  return fallback
}

const getIdListFromApiField = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === "string" || typeof item === "number") {
        return String(item).trim()
      }
      return getSettingItemIdFromApi(item)
    })
    .filter(Boolean)
}

function resolveLeadSettingId(item: {
  _id?: string | { $oid?: string }
  id?: string | number
}): string {
  if (item._id && typeof item._id === "object" && "$oid" in item._id) {
    return String(item._id.$oid ?? "")
  }
  return String(item._id ?? item.id ?? "")
}

function mapLeadSettingItems<T extends Record<string, unknown>>(
  items: T[] = [],
): Array<T & { _id: string }> {
  return items.map((item) => ({
    ...item,
    _id: resolveLeadSettingId(item as { _id?: string | { $oid?: string }; id?: string | number }),
  }))
}

function resolveLeadSettingDropdownValue(
  valueId: string,
  valueName: string,
  items: Array<{ _id: string; name?: string }>,
): string {
  const id = valueId?.trim() || ""
  const name = valueName?.trim() || ""

  if (id && items.some((item) => item._id === id)) {
    return id
  }

  if (name) {
    const matchByName = items.find(
      (item) => item.name?.trim().toLowerCase() === name.toLowerCase(),
    )
    if (matchByName) return matchByName._id
  }

  if (id) {
    const matchByIdAsName = items.find(
      (item) => item.name?.trim().toLowerCase() === id.toLowerCase(),
    )
    if (matchByIdAsName) return matchByIdAsName._id
  }

  return id || name
}

function mapLeadSettingDropdownOptions(
  items: Array<{ _id: string; name?: string; sort_order?: number }> = [],
) {
  return [...items]
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))
    .map((item) => ({
      label: String(item.name ?? ""),
      value: item._id,
    }))
    .filter((option) => option.label && option.value)
}

const getColorFromApiField = (value: unknown, fallback = ""): string => {
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0]
    if (typeof first === "object" && first !== null) {
      return (first as { color?: string }).color ?? fallback
    }
  }
  if (typeof value === "string") return value
  return fallback
}

const formatLeadHeaderDateTime = (dateStr?: string, timeStr?: string) => {
  if (!dateStr?.trim()) return "—"
  const time = timeStr?.trim() || ""
  try {
    const combined = time ? `${dateStr} ${time}` : dateStr
    const date = new Date(combined)
    if (!Number.isNaN(date.getTime())) {
      return format(date, "dd/MM/yyyy hh:mm a")
    }
  } catch {
    // fall through to raw values
  }
  return [dateStr, time].filter(Boolean).join(" ")
}

const formatContactDateOfBirth = (dateStr?: string) => {
  if (!dateStr?.trim()) return ""
  try {
    const date = new Date(dateStr)
    if (!Number.isNaN(date.getTime())) {
      return format(date, "dd-MM-yyyy")
    }
  } catch {
    // fall through to raw value
  }
  return dateStr.split(" ")[0] ?? dateStr
}

const getLeadStatusMetaFromApi = (raw: LeadDetailApiRecord): Record<string, unknown> | null => {
  const field = raw.lead_status_name
  if (Array.isArray(field) && field.length > 0) {
    const first = field[0]
    if (typeof first === "object" && first !== null) {
      return first as Record<string, unknown>
    }
  }
  if (typeof field === "object" && field !== null && !Array.isArray(field)) {
    return field as Record<string, unknown>
  }
  return null
}

const normalizeLeadDetail = (raw: LeadDetailApiRecord) => {
  const customerTypeName =
    getNameFromApiField(raw.customer_type_name) ||
    (typeof raw.customer_type === "string" ? raw.customer_type : "")
  const customerRequirementName =
    getNameFromApiField(raw.customer_requirement_name) ||
    (typeof raw.customer_requirement === "string" ? raw.customer_requirement : "")
  const leadStatusName = getNameFromApiField(raw.lead_status_name)
  const sourceName = getNameFromApiField(raw.source_name)
  const paymentName = getNameFromApiField(raw.payment_name)
  const industryName = getNameFromApiField(raw.industry_name)
  const applicationName = getNameFromApiField(raw.application_name)
  const purposeName =
    getNameFromApiField(raw.purpose_name) ||
    (typeof raw.purpose === "string" ? raw.purpose : "")
  const assignedName = getNameFromApiField(raw.assigned)

  return {
    _id: String(raw._id ?? ""),
    id: String(raw._id ?? ""),
    name: String(raw.name ?? ""),
    company_name: String(raw.company_name ?? raw.project_name ?? ""),
    project_name: String(raw.project_name ?? ""),
    email: String(raw.email ?? ""),
    phone: String(raw.phone ?? ""),
    description: String(raw.description ?? ""),
    url: String(raw.url ?? ""),
    lead_no: String(raw.lead_no ?? ""),
    create_date: String(raw.create_date ?? ""),
    create_time: String(raw.create_time ?? ""),
    createBy: String(raw.createBy ?? ""),
    date_aging: String(raw.date_aging ?? ""),
    next_followup_dates:
      typeof raw.next_followup_dates === "string" ? raw.next_followup_dates : "",
    address1: String(raw.address1 ?? ""),
    address2: String(raw.address2 ?? ""),
    city: String(raw.city ?? ""),
    state: String(raw.state ?? ""),
    country: String(raw.country ?? ""),
    pincode: String(raw.pincode ?? ""),
    position: String(raw.position ?? ""),
    lead_type: String(raw.lead_type ?? ""),
    alternate_phone: String(raw.alternate_phone ?? ""),
    alternate_email: String(raw.alternate_email ?? ""),
    whatsapp_no: String(raw.whatsapp_no ?? ""),
    linkedin: String(raw.linkedin ?? ""),
    campaign_name: String(raw.campaign_name ?? ""),
    about_company: String(raw.about_company ?? ""),
    customer_type:
      getIdFromApiField(raw.customer_type_name) ||
      (typeof raw.customer_type === "string" ? raw.customer_type : ""),
    customer_type_name: customerTypeName,
    lead_status:
      getIdFromApiField(raw.lead_status_name, String(raw.lead_status ?? "")) ||
      String(raw.lead_status ?? ""),
    lead_status_name: leadStatusName,
    lead_status_color:
      getColorFromApiField(raw.lead_status_name, String(raw.lead_status_color ?? "")) ||
      String(raw.lead_status_color ?? ""),
    source:
      getIdFromApiField(raw.source_name, String(raw.source ?? "")) ||
      String(raw.source ?? ""),
    source_name: sourceName,
    lead_industry:
      getIdFromApiField(raw.industry_name, String(raw.lead_industry ?? "")) ||
      String(raw.lead_industry ?? ""),
    lead_industry_name: industryName,
    application:
      getIdFromApiField(raw.application_name, String(raw.application ?? "")) ||
      String(raw.application ?? ""),
    lead_application_name: applicationName,
    assigned_to:
      getIdFromApiField(raw.assigned, String(raw.assigned_to ?? "")) ||
      String(raw.assigned_to ?? ""),
    assigned:
      assignedName ||
      (typeof raw.assigned === "string" ? raw.assigned : ""),
    not_qualified_reason: String(raw.not_qualified_reason ?? ""),
    not_qualified_note: String(raw.not_qualified_note ?? ""),
    not_qualified_date: String(raw.not_qualified_date ?? ""),
    not_qualified_time: String(raw.not_qualified_time ?? ""),
    product_quantity: Array.isArray(raw.product_quantity) ? raw.product_quantity : [],
    modify_date: String(raw.modify_date ?? ""),
    modify_time: String(raw.modify_time ?? ""),
    designation: String(raw.designation ?? raw.position ?? ""),
    location: String(raw.location ?? ""),
    current_staying: String(raw.current_staying ?? ""),
    purpose:
      getIdFromApiField(raw.purpose_name, String(raw.purpose ?? "")) ||
      String(raw.purpose ?? ""),
    purpose_name: purposeName,
    budget: String(raw.budget ?? ""),
    timeline: String(raw.timeline ?? ""),
    payment:
      getIdFromApiField(raw.payment_name, String(raw.payment ?? "")) ||
      String(raw.payment ?? ""),
    payment_name: paymentName,
    dob: String(raw.dob ?? ""),
    sod: String(raw.sod ?? ""),
    referred_by: String(raw.referred_by ?? ""),
    referred_mobile_no: String(raw.referred_mobile_no ?? raw.referred_mobile ?? ""),
    gstin: String(raw.gstin ?? ""),
    stage: String(raw.stage ?? ""),
    lead_status_meta: getLeadStatusMetaFromApi(raw),
    status: String(raw.status ?? "active"),
    target_date: String(raw.target_date ?? raw.next_followup_dates ?? ""),
    converted_date: String(raw.converted_date ?? ""),
    customer_requirement:
      getIdsFromApiField(raw.customer_requirement) ||
      getIdsFromApiField(raw.customer_requirement_name) ||
      String(raw.customer_requirement ?? ""),
    customer_requirement_name: customerRequirementName,
    teams: Array.isArray(raw.teams) ? raw.teams : [],
    suggested_projects: getIdListFromApiField(raw.suggested_projects),
    industry:
      getIdFromApiField(raw.industry_name, String(raw.industry ?? raw.lead_industry ?? "")) ||
      String(raw.industry ?? raw.lead_industry ?? ""),
  }
}

const OPTIMISTIC_ACTIVITY_TTL_MS = 120_000

const isOptimisticActivityId = (id: unknown) => String(id ?? "").startsWith("optimistic-")

const getOptimisticActivityTimestamp = (item: Record<string, unknown>) => {
  const ts = item.create_date_timestamp
  if (typeof ts === "string" || typeof ts === "number") {
    const time = new Date(ts).getTime()
    if (!Number.isNaN(time)) return time
  }
  return Date.now()
}

const getAuthHeaders = (): Record<string, string> => {
  const storedData = localStorage.getItem("map_user")
  if (!storedData) {
    throw new Error("User not authenticated")
  }
  const userData = JSON.parse(storedData)
  if (!userData.access_token) {
    throw new Error("Authentication token not found")
  }
  return {
    Authorization: `Bearer ${userData.access_token}`,
    "Content-Type": "application/json",
  }
}

interface LeadActivityTimelineItem {
  _id?: string
  category_name: string
  text_info: string
  create_date: string
  create_time: string
  createBy: string
  [key: string]: unknown
}

interface LeadActivityNote {
  _id?: string
  note: string
  createBy: string
  create_date: string
  create_time?: string
  [key: string]: unknown
}

interface LeadActivityEmail {
  _id?: string
  subject: string
  to: string
  cc?: string
  createBy: string
  create_date: string
  create_time: string
  read?: boolean
  thread_id?: string
  fromEmail?: string
  from?: string
  content?: string
  attachment?: string[]
  [key: string]: unknown
}

interface LeadActivityDocument {
  _id?: string
  id?: string
  user_file_name: string
  type: string
  size: string
  createBy: string
  create_date: string
  document: string
  shared?: boolean
  [key: string]: unknown
}

const getDocumentId = (doc: LeadActivityDocument) => String(doc._id ?? doc.id ?? "")

const applyDeletedDocumentFilter = (
  documents: LeadActivityDocument[],
  deletedIds: Set<string>,
) => {
  if (deletedIds.size === 0) return documents
  return documents.filter((doc) => !deletedIds.has(getDocumentId(doc)))
}

const reconcileDeletedDocumentIds = (
  serverDocuments: LeadActivityDocument[],
  deletedIds: Set<string>,
) => {
  for (const id of [...deletedIds]) {
    const stillOnServer = serverDocuments.some((doc) => getDocumentId(doc) === id)
    if (!stillOnServer) {
      deletedIds.delete(id)
    }
  }
}

interface LeadActivityData {
  notes: LeadActivityNote[]
  email: LeadActivityEmail[]
  document: LeadActivityDocument[]
  timeline: LeadActivityTimelineItem[]
}

const EMPTY_ACTIVITY_DATA: LeadActivityData = {
  notes: [],
  email: [],
  document: [],
  timeline: [],
}

const normalizeActivityData = (data: unknown): LeadActivityData => {
  if (!data || typeof data !== "object") {
    return EMPTY_ACTIVITY_DATA
  }

  const record = data as Record<string, unknown>
  return {
    notes: Array.isArray(record.notes) ? record.notes : [],
    email: Array.isArray(record.email) ? record.email : [],
    document: Array.isArray(record.document) ? record.document : [],
    timeline: Array.isArray(record.timeline) ? record.timeline : [],
  }
}

interface UnifiedActivityItem {
  _id: string
  category_name: string
  text_info: string
  create_date: string
  create_time: string
  createBy: string
  sortTimestamp: string
}

const getActivitySortTimestamp = (item: Record<string, unknown>): string => {
  const timestamp = item.create_date_timestamp ?? item.create_date_utc ?? item.create_date
  return typeof timestamp === "string" ? timestamp : ""
}

const getActivityCreateBy = (item: Record<string, unknown>): string => {
  const createBy = item.createBy
  if (typeof createBy === "string" && createBy.trim()) {
    return createBy
  }
  const createById = item.create_by
  return typeof createById === "string" ? createById : ""
}

const ACTIVITY_DEDUPE_WINDOW_MS = 5 * 60 * 1000

const getActivityTimestampMs = (item: Record<string, unknown>): number => {
  const time = new Date(getActivitySortTimestamp(item)).getTime()
  return Number.isNaN(time) ? 0 : time
}

const normalizeComparableText = (value: string) =>
  value.toLowerCase().replace(/[\s,_-]+/g, "").trim()

const extractUploadedDocumentName = (text: string) => {
  const match = text.match(/uploaded document:?\s*(.+)$/i)
  return match?.[1]?.trim() ?? ""
}

const areComparableFileNames = (a: string, b: string) => {
  const normalizedA = normalizeComparableText(a)
  const normalizedB = normalizeComparableText(b)
  if (!normalizedA || !normalizedB) return false
  if (normalizedA === normalizedB) return true

  const stripExt = (name: string) => name.replace(/\.[^.]+$/, "")
  const baseA = stripExt(normalizedA)
  const baseB = stripExt(normalizedB)
  return baseA === baseB || baseA.includes(baseB) || baseB.includes(baseA)
}

const isActivityWithinDedupeWindow = (
  a: Record<string, unknown>,
  b: Record<string, unknown>,
) => {
  const timeDiff = Math.abs(getActivityTimestampMs(a) - getActivityTimestampMs(b))
  return timeDiff <= ACTIVITY_DEDUPE_WINDOW_MS
}

const haveSameActivityAuthor = (
  a: Record<string, unknown>,
  b: Record<string, unknown>,
) => {
  const authorA = getActivityCreateBy(a)
  const authorB = getActivityCreateBy(b)
  if (!authorA || !authorB) return true
  return authorA === authorB
}

const isDocumentActivityMatch = (
  timelineItem: LeadActivityTimelineItem,
  fileName: string,
) => {
  const category = String(timelineItem.category_name ?? timelineItem.action ?? "").toLowerCase()
  if (category !== "document") return false

  const text = String(timelineItem.text_info ?? "")
  if (!/uploaded document/i.test(text)) return false

  const timelineFileName = extractUploadedDocumentName(text)
  return areComparableFileNames(timelineFileName, fileName)
}

const isDocumentCoveredByTimeline = (
  doc: LeadActivityDocument,
  timeline: LeadActivityTimelineItem[],
) => {
  const fileName = String(doc.user_file_name ?? "")
  if (!fileName) return false

  const docRecord = doc as Record<string, unknown>
  return timeline.some((item) => {
    if (!isDocumentActivityMatch(item, fileName)) return false
    return (
      isActivityWithinDedupeWindow(docRecord, item as Record<string, unknown>) &&
      haveSameActivityAuthor(docRecord, item as Record<string, unknown>)
    )
  })
}

const isNoteCoveredByTimeline = (
  note: LeadActivityNote,
  timeline: LeadActivityTimelineItem[],
) => {
  const noteText = String(note.note ?? "").trim()
  if (!noteText) return false

  const noteRecord = note as Record<string, unknown>
  return timeline.some((item) => {
    const category = String(item.category_name ?? "").toLowerCase()
    const text = String(item.text_info ?? "").trim()
    const isNoteEntry = category === "note" || /^added a note/i.test(text)
    if (!isNoteEntry) return false

    const timelineNoteText = text.replace(/^added a note:?\s*/i, "").trim()
    const textsMatch =
      timelineNoteText === noteText ||
      timelineNoteText.includes(noteText) ||
      noteText.includes(timelineNoteText)
    if (!textsMatch) return false

    return (
      isActivityWithinDedupeWindow(noteRecord, item as Record<string, unknown>) &&
      haveSameActivityAuthor(noteRecord, item as Record<string, unknown>)
    )
  })
}

const isEmailCoveredByTimeline = (
  email: LeadActivityEmail,
  timeline: LeadActivityTimelineItem[],
) => {
  const subject = String(email.subject ?? "").trim()
  if (!subject) return false

  const emailRecord = email as Record<string, unknown>
  return timeline.some((item) => {
    const category = String(item.category_name ?? "").toLowerCase()
    const text = String(item.text_info ?? "").trim()
    const isEmailEntry = category === "email" || /^sent (an )?email/i.test(text)
    if (!isEmailEntry) return false

    const timelineSubject = text.replace(/^sent (an )?email:?\s*/i, "").trim()
    const subjectsMatch =
      timelineSubject === subject ||
      timelineSubject.includes(subject) ||
      subject.includes(timelineSubject)
    if (!subjectsMatch) return false

    return (
      isActivityWithinDedupeWindow(emailRecord, item as Record<string, unknown>) &&
      haveSameActivityAuthor(emailRecord, item as Record<string, unknown>)
    )
  })
}

const isDeleteTimelineEntry = (item: LeadActivityTimelineItem) => {
  const category = String(item.category_name ?? item.action ?? "").toLowerCase()
  const text = String(item.text_info ?? "")
  return category === "delete" || /deleted/i.test(text)
}

const isDeleteActivityCoveredByTimeline = (
  deleteEntry: LeadActivityTimelineItem,
  timeline: LeadActivityTimelineItem[],
) => {
  const deleteRecord = deleteEntry as Record<string, unknown>
  return timeline.some((item) => {
    if (!isDeleteTimelineEntry(item)) return false
    return isActivityWithinDedupeWindow(
      deleteRecord,
      item as Record<string, unknown>,
    )
  })
}

const LEAD_FIELD_DISPLAY_NAMES: Record<string, string> = {
  lead_status: "Status",
  assigned_to: "Assigned To",
  source: "Source",
  customer_type: "Customer Type",
  industry: "Industry Type",
  application: "Application",
  name: "Name",
  company_name: "Company Name",
  position: "Position",
  email: "Email",
  url: "Website",
  description: "Description",
  lead_no: "Lead Number",
  whatsapp_no: "WhatsApp Number",
  alternate_email: "Alternate Email",
  campaign_name: "Campaign Name",
  linkedin: "LinkedIn",
  address1: "Address Line 1",
  address2: "Address Line 2",
  city: "City",
  state: "State",
  country: "Country",
  pincode: "Pincode",
  project_name: "Project Name",
  designation: "Designation",
  location: "Preferred Location",
  current_staying: "Current Staying",
  customer_requirement: "Interested In",
  purpose: "Purpose",
  budget: "Budget",
  timeline: "Timeline",
  payment: "Payment",
  dob: "DOB",
  sod: "SOD",
  referred_by: "Referred By",
  referred_mobile_no: "Referred Mobile No",
  phone: "Mobile Number",
  alternate_phone: "Alt Mobile No",
  gstin: "GSTIN",
  stage: "Stage",
  lead_type: "Lead Type",
  status: "Status",
  target_date: "Next Follow-up",
}

const LEAD_FIELD_TIMELINE_LABELS: Record<string, string> = {
  ...LEAD_FIELD_DISPLAY_NAMES,
  description: "Description",
}

const TIMELINE_FIELD_LABEL_ALIASES: Record<string, string> = {
  Requirement: "Description",
  Description: "Description",
}

const normalizeTimelineFieldLabel = (label: string) =>
  TIMELINE_FIELD_LABEL_ALIASES[label] ?? label

const formatTimelineValue = (value: unknown): string => {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)

  if (Array.isArray(value)) {
    return value
      .map((item) => formatTimelineValue(item))
      .filter(Boolean)
      .join(", ")
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    for (const key of ["name", "label", "title", "value"] as const) {
      const candidate = record[key]
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate
      }
    }
  }

  return ""
}

const formatFieldUpdateTimelineText = (
  fieldLabel: string,
  fromValue: string,
  toValue: string,
) => {
  const fromText = fromValue.trim() || "empty"
  const toText = toValue.trim() || "empty"
  return `Updated ${fieldLabel} from "${fromText}" to "${toText}"`
}

const getTimelineFieldLabel = (text: string) => {
  const match = text.match(/^Updated (.+?)(?:\s+from\b|$)/)
  return normalizeTimelineFieldLabel(match?.[1]?.trim() ?? "")
}

const isGenericFieldUpdateTimeline = (text: string) => {
  const trimmed = text.trim()
  return trimmed.startsWith("Updated ") && !trimmed.includes(' from "')
}

const getTimelineDisplayText = (item: Record<string, unknown>): string => {
  const textInfo = String(item.text_info ?? item.title ?? "").trim()
  const fromData = item.from_data
  const toData = item.to_data
  const fromText = formatTimelineValue(fromData)
  const toText = formatTimelineValue(toData)

  if (
    (fromData != null || toData != null) &&
    (fromText.trim() !== "" || toText.trim() !== "") &&
    !textInfo.includes(' from "')
  ) {
    const fieldLabel = textInfo.startsWith("Updated ")
      ? textInfo.slice("Updated ".length)
      : "field"
    return formatFieldUpdateTimelineText(fieldLabel, fromText, toText)
  }

  return textInfo || "Activity"
}

const enrichTimelineItems = (timeline: LeadActivityTimelineItem[]) =>
  timeline.map((item) => ({
    ...item,
    text_info: getTimelineDisplayText(item as Record<string, unknown>),
  }))

const dedupeGenericFieldUpdateTimeline = (timeline: LeadActivityTimelineItem[]) => {
  const getTimestamp = (item: LeadActivityTimelineItem) => {
    const time = new Date(
      getActivitySortTimestamp(item as Record<string, unknown>),
    ).getTime()
    return Number.isNaN(time) ? 0 : time
  }

  return timeline.filter((item) => {
    const text = String(item.text_info ?? "")
    if (!isGenericFieldUpdateTimeline(text)) return true

    const fieldLabel = getTimelineFieldLabel(text)
    const itemTime = getTimestamp(item)

    const hasDetailedNearby = timeline.some((other) => {
      if (other === item) return false
      const otherText = String(other.text_info ?? "")
      if (!otherText.includes(' from "')) return false
      if (getTimelineFieldLabel(otherText) !== fieldLabel) return false
      return Math.abs(getTimestamp(other) - itemTime) < 5 * 60 * 1000
    })

    return !hasDetailedNearby
  })
}

const dedupeDeleteTimeline = (timeline: LeadActivityTimelineItem[]) => {
  const kept: LeadActivityTimelineItem[] = []

  for (const item of timeline) {
    if (!isDeleteTimelineEntry(item)) {
      kept.push(item)
      continue
    }

    const itemRecord = item as Record<string, unknown>
    const isDuplicate = kept.some((existing) => {
      if (!isDeleteTimelineEntry(existing)) return false
      return isActivityWithinDedupeWindow(
        itemRecord,
        existing as Record<string, unknown>,
      )
    })

    if (!isDuplicate) {
      kept.push(item)
    }
  }

  return kept
}

const dedupeDocumentTimeline = (timeline: LeadActivityTimelineItem[]) => {
  const kept: LeadActivityTimelineItem[] = []

  for (const item of timeline) {
    const category = String(item.category_name ?? "").toLowerCase()
    const text = String(item.text_info ?? "")
    const isDocumentUpload =
      category === "document" && /uploaded document/i.test(text)

    if (!isDocumentUpload) {
      kept.push(item)
      continue
    }

    const fileName = extractUploadedDocumentName(text)
    const itemRecord = item as Record<string, unknown>
    const isDuplicate = kept.some((existing) => {
      if (!isDocumentActivityMatch(existing, fileName)) return false
      return (
        isActivityWithinDedupeWindow(
          itemRecord,
          existing as Record<string, unknown>,
        ) &&
        haveSameActivityAuthor(
          itemRecord,
          existing as Record<string, unknown>,
        )
      )
    })

    if (!isDuplicate) {
      kept.push(item)
    }
  }

  return kept
}

const processTimelineForDisplay = (timeline: LeadActivityTimelineItem[]) =>
  dedupeDeleteTimeline(
    dedupeDocumentTimeline(
      dedupeGenericFieldUpdateTimeline(enrichTimelineItems(timeline)),
    ),
  )

interface PreservedActivityOptions {
  documentUploads?: LeadActivityDocument[]
  deleteTimeline?: LeadActivityTimelineItem[]
}

const getDropdownFieldDisplayValue = (
  field: string,
  valueId: string,
  leadData: Record<string, unknown>,
  leadSettings: {
    leadStatuses: Array<{ _id: string; name: string }>
    customerTypes: Array<{ _id: string; name: string }>
    customerRequirements: Array<{ _id: string; name: string }>
    sources: Array<{ _id: string; name: string }>
    paymentTerms: Array<{ _id: string; name: string }>
    industries: Array<{ _id: string; name: string }>
    applications: Array<{ _id: string; name: string }>
  },
  users: Array<{ _id: string; name: string }>,
) => {
  if (field === "lead_status") {
    return (
      leadSettings.leadStatuses.find((status) => status._id === valueId)?.name ||
      String(leadData.lead_status_name ?? valueId)
    )
  }
  if (field === "assigned_to") {
    return (
      users.find((user) => user._id === valueId)?.name ||
      String(leadData.assigned ?? valueId)
    )
  }
  if (field === "customer_type") {
    return (
      leadSettings.customerTypes.find((type) => type._id === valueId)?.name ||
      String(leadData.customer_type_name ?? valueId)
    )
  }
  if (field === "source") {
    return (
      leadSettings.sources.find((source) => source._id === valueId)?.name ||
      String(leadData.source_name ?? valueId)
    )
  }
  if (field === "payment") {
    return (
      leadSettings.paymentTerms.find((term) => term._id === valueId)?.name ||
      String(leadData.payment_name ?? valueId)
    )
  }
  if (field === "industry") {
    return (
      leadSettings.industries.find((industry) => industry._id === valueId)?.name ||
      String(leadData.lead_industry_name ?? valueId)
    )
  }
  if (field === "application") {
    return (
      leadSettings.applications.find((application) => application._id === valueId)?.name ||
      String(leadData.lead_application_name ?? valueId)
    )
  }
  if (field === "customer_requirement") {
    const ids = valueId
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
    if (ids.length === 0) {
      return String(leadData.customer_requirement_name ?? valueId)
    }
    return ids
      .map(
        (id) =>
          leadSettings.customerRequirements.find((item) => item._id === id)?.name || id,
      )
      .join(", ")
  }
  if (field === "purpose") {
    const purposeOptions = getPurposeOptionsForLeadDetail(
      String(leadData.customer_type ?? ""),
      String(leadData.customer_type_name ?? ""),
      leadSettings.customerTypes as CustomerTypeSettingRecord[],
    )
    return (
      getLeadDetailDropdownOption(purposeOptions, valueId)?.label ||
      String(leadData.purpose_name ?? valueId)
    )
  }
  return String(leadData[field] ?? valueId)
}

const ASSIGNED_TO_COLOR = "#003399"

type LeadDetailDropdownOption = {
  value: string
  label: string
  color: string
}

type LeadSettingInfoOption = {
  name?: string
  color?: string
}

type LeadStatusSettingRecord = Record<string, unknown> & {
  _id?: string
  name?: string
  info?: unknown
  options?: unknown
  stages?: unknown
  field_type?: string
  fieldType?: string
}

function parseLeadSettingInfo(info: unknown): Record<string, unknown> {
  if (!info) return {}
  if (typeof info === "object") return info as Record<string, unknown>
  if (typeof info !== "string" || !info.trim()) return {}

  try {
    const parsed = JSON.parse(info)
    return typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : {}
  } catch {
    return { field_type: info }
  }
}

function mapStageOptionsFromRaw(
  rawOptions: unknown,
): LeadDetailDropdownOption[] {
  if (!Array.isArray(rawOptions)) return []

  return rawOptions
    .map((option) => {
      if (typeof option === "string") {
        const name = option.trim()
        if (!name) return null
        return { value: name, label: name, color: "#64748b" }
      }

      if (typeof option === "object" && option !== null) {
        const record = option as LeadSettingInfoOption
        const name = record.name?.trim()
        if (!name) return null
        return {
          value: name,
          label: name,
          color: record.color || "#64748b",
        }
      }

      return null
    })
    .filter((option): option is LeadDetailDropdownOption => option !== null)
}

function getStageOptionsFromStatusItem(
  item?: LeadStatusSettingRecord | null,
): LeadDetailDropdownOption[] {
  if (!item) return []

  const info = parseLeadSettingInfo(item.info)
  const rawOptions =
    item.options ??
    info.options ??
    item.stages ??
    info.stages

  return mapStageOptionsFromRaw(rawOptions)
}

function getStageOptionsForLeadDetail(
  leadStatusId: string,
  leadStatusName: string,
  leadStatuses: LeadStatusSettingRecord[],
  leadStatusMeta?: LeadStatusSettingRecord | null,
): LeadDetailDropdownOption[] {
  const statusId = leadStatusId.trim()
  const statusName = leadStatusName.trim().toLowerCase()

  const matchingStatus = leadStatuses.find((item) => {
    const itemId = String(item._id ?? "").trim()
    if (statusId && itemId && itemId === statusId) return true
    if (statusId && itemId && itemId.toLowerCase() === statusId.toLowerCase()) return true
    const itemName = item.name?.trim().toLowerCase() || ""
    if (statusName && itemName && itemName === statusName) return true
    if (statusId && itemName && itemName === statusId.toLowerCase()) return true
    return false
  })

  const optionsFromSettings = getStageOptionsFromStatusItem(matchingStatus)
  if (optionsFromSettings.length > 0) return optionsFromSettings

  return getStageOptionsFromStatusItem(leadStatusMeta)
}

type CustomerTypeSettingRecord = Record<string, unknown> & {
  _id?: string
  name?: string
  info?: unknown
  options?: unknown
  field_type?: string
  fieldType?: string
}

function getCustomerTypeFieldType(item?: CustomerTypeSettingRecord | null): string {
  if (!item) return "text"
  const info = parseLeadSettingInfo(item.info)
  return String(item.field_type || item.fieldType || info.field_type || "text")
}

function getPurposeOptionsFromCustomerTypeItem(
  item?: CustomerTypeSettingRecord | null,
): LeadDetailDropdownOption[] {
  if (!item) return []

  const fieldType = getCustomerTypeFieldType(item)
  if (!fieldType.includes("dropdown")) return []

  const info = parseLeadSettingInfo(item.info)
  const rawOptions = item.options ?? info.options

  return mapStageOptionsFromRaw(rawOptions)
}

function getPurposeOptionsForLeadDetail(
  customerTypeId: string,
  customerTypeName: string,
  customerTypes: CustomerTypeSettingRecord[],
): LeadDetailDropdownOption[] {
  const typeId = customerTypeId.trim()
  const typeName = customerTypeName.trim().toLowerCase()

  const matchingType = customerTypes.find((item) => {
    const itemId = String(item._id ?? "").trim()
    if (typeId && itemId && itemId === typeId) return true
    if (typeId && itemId && itemId.toLowerCase() === typeId.toLowerCase()) return true
    const itemName = item.name?.trim().toLowerCase() || ""
    if (typeName && itemName && itemName === typeName) return true
    if (typeId && itemName && itemName === typeId.toLowerCase()) return true
    return false
  })

  return getPurposeOptionsFromCustomerTypeItem(matchingType)
}

function shouldClearPurposeForCustomerType(
  nextOptions: LeadDetailDropdownOption[],
  nextFieldType: string,
  currentPurpose: string,
  currentPurposeName: string,
): boolean {
  const fieldType = nextFieldType.toLowerCase()
  if (!fieldType.includes("dropdown") || nextOptions.length === 0) return false

  const current = (currentPurposeName || currentPurpose || "").trim().toLowerCase()
  if (!current) return false

  return !nextOptions.some(
    (option) =>
      option.value.toLowerCase() === current || option.label.toLowerCase() === current,
  )
}

function getLeadDetailDropdownOption(
  options: LeadDetailDropdownOption[],
  value?: string | null,
) {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase()
  return options.find(
    (option) =>
      option.value.toLowerCase() === normalized || option.label.toLowerCase() === normalized,
  )
}

function LeadDetailFieldDropdown({
  currentValue,
  placeholder,
  options,
  onChange,
  fallbackLabel,
  fallbackColor = "#64748b",
  align = "end",
  variant = "solid",
  triggerClassName,
  readOnly = false,
}: {
  currentValue?: string | null
  placeholder: string
  options: LeadDetailDropdownOption[]
  onChange: (value: string) => void
  fallbackLabel?: string
  fallbackColor?: string
  align?: "start" | "end" | "center"
  variant?: "solid" | "soft"
  triggerClassName?: string
  readOnly?: boolean
}) {
  const selectedOption = getLeadDetailDropdownOption(options, currentValue)
  const displayLabel = selectedOption?.label || fallbackLabel || placeholder
  const displayColor = selectedOption?.color || fallbackColor
  const hasValue = Boolean(selectedOption || fallbackLabel?.trim())

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium",
        hasValue
          ? variant === "soft"
            ? readOnly
              ? ""
              : "hover:opacity-90"
            : readOnly
              ? ""
              : "text-white hover:opacity-90"
          : "rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 text-muted-foreground",
        triggerClassName,
      )}
      style={
        hasValue
          ? variant === "soft"
            ? {
                backgroundColor: `${displayColor}18`,
                color: displayColor,
                border: `1px solid ${displayColor}30`,
              }
            : { backgroundColor: displayColor }
          : undefined
      }
    >
      <span className="max-w-[160px] truncate">{displayLabel}</span>
      {!readOnly ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : null}
    </span>
  )

  if (readOnly) {
    return badge
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium focus:outline-none transition-colors",
            hasValue
              ? variant === "soft"
                ? "hover:opacity-90"
                : "text-white hover:opacity-90"
              : "rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 text-muted-foreground",
            triggerClassName,
          )}
          style={
            hasValue
              ? variant === "soft"
                ? {
                    backgroundColor: `${displayColor}18`,
                    color: displayColor,
                    border: `1px solid ${displayColor}30`,
                  }
                : { backgroundColor: displayColor }
              : undefined
          }
        >
          <span className="max-w-[160px] truncate">{displayLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="min-w-[10rem] max-w-[16rem] max-h-[280px] overflow-y-auto"
      >
        {options.length === 0 ? (
          <DropdownMenuItem disabled className="text-muted-foreground">
            No options available
          </DropdownMenuItem>
        ) : (
          options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              className="flex cursor-pointer items-center gap-2"
              onClick={() => onChange(option.value)}
            >
              <div
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: option.color }}
              />
              <span className="break-words">{option.label}</span>
              {selectedOption?.value === option.value && (
                <Check className="ml-auto h-4 w-4 shrink-0" />
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const buildUnifiedActivityList = (
  data: LeadActivityData,
  preserved: PreservedActivityOptions = {},
): UnifiedActivityItem[] => {
  const items: UnifiedActivityItem[] = []
  const preservedDeletes = (preserved.deleteTimeline ?? []).filter(
    (entry) => !isDeleteActivityCoveredByTimeline(entry, data.timeline),
  )
  const processedTimeline = processTimelineForDisplay([
    ...preservedDeletes,
    ...data.timeline,
  ])

  processedTimeline.forEach((item, index) => {
    items.push({
      _id: `timeline-${String(item._id ?? index)}`,
      category_name: String(item.category_name ?? item.action ?? "activity"),
      text_info: String(item.text_info ?? item.title ?? "Activity"),
      create_date: String(item.create_date ?? ""),
      create_time: String(item.create_time ?? ""),
      createBy: getActivityCreateBy(item),
      sortTimestamp: getActivitySortTimestamp(item),
    })
  })

  data.notes.forEach((item, index) => {
    if (isNoteCoveredByTimeline(item, processedTimeline)) return

    const noteText = String(item.note ?? "").trim()
    items.push({
      _id: `note-${String(item._id ?? index)}`,
      category_name: "note",
      text_info: noteText ? `Added a note: ${noteText}` : "Added a note",
      create_date: String(item.create_date ?? ""),
      create_time: String(item.create_time ?? ""),
      createBy: getActivityCreateBy(item),
      sortTimestamp: getActivitySortTimestamp(item),
    })
  })

  data.email.forEach((item, index) => {
    if (isEmailCoveredByTimeline(item, processedTimeline)) return

    const subject = String(item.subject ?? "")
    items.push({
      _id: `email-${String(item._id ?? index)}`,
      category_name: "email",
      text_info: subject ? `Sent email: ${subject}` : "Sent an email",
      create_date: String(item.create_date ?? ""),
      create_time: String(item.create_time ?? ""),
      createBy: getActivityCreateBy(item),
      sortTimestamp: getActivitySortTimestamp(item),
    })
  })

  const seenDocumentIds = new Set<string>()
  const documentSources = [
    ...(preserved.documentUploads ?? []),
    ...data.document,
  ].filter((item) => {
    const docId = getDocumentId(item)
    if (!docId) return true
    if (seenDocumentIds.has(docId)) return false
    seenDocumentIds.add(docId)
    return true
  })

  documentSources.forEach((item, index) => {
    if (isDocumentCoveredByTimeline(item, processedTimeline)) return

    const fileName = String(item.user_file_name ?? "")
    items.push({
      _id: `document-${String(item._id ?? item.id ?? index)}`,
      category_name: "document",
      text_info: fileName ? `Uploaded document: ${fileName}` : "Uploaded a document",
      create_date: String(item.create_date ?? ""),
      create_time: String(item.create_time ?? ""),
      createBy: getActivityCreateBy(item),
      sortTimestamp: getActivitySortTimestamp(item),
    })
  })

  return items.sort((a, b) => {
    const aTime = new Date(a.sortTimestamp).getTime()
    const bTime = new Date(b.sortTimestamp).getTime()

    if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
      return bTime - aTime
    }

    return b._id.localeCompare(a._id)
  })
}

const createOptimisticActivityFields = () => {
  const now = new Date()
  return {
    create_date: format(now, "dd/MM/yyyy"),
    create_time: format(now, "hh:mm a"),
    create_date_timestamp: now.toISOString(),
    create_date_utc: format(now, "yyyy-MM-dd HH:mm:ss"),
  }
}

function DetailInfoRow({
  icon: Icon,
  label,
  value,
  actions,
}: {
  icon?: React.ComponentType<{ className?: string }>
  label: string
  value?: string
  actions?: React.ReactNode
}) {
  return (
    <div className={leadDetailContactRowClassName}>
      {Icon ? (
        <div className={leadDetailIconBoxClassName}>
          <Icon className="h-4 w-4" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className={leadDetailSidebarFieldLabelClassName}>{label}</p>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className={cn(leadDetailSidebarFieldValueClassName, "break-words")}>{value?.trim() || "—"}</p>
          {actions}
        </div>
      </div>
    </div>
  )
}

function ContactDetailRow({
  icon: Icon,
  label,
  value,
  actions,
  trailing,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value?: string | null
  actions?: ReactNode
  trailing?: ReactNode
}) {
  const displayValue = value?.trim() ? value : "—"

  return (
    <div className={leadDetailContactRowClassName}>
      <div className={leadDetailIconBoxClassName}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={leadDetailSidebarFieldLabelClassName}>{label}</p>
        <div className="mt-0.5 flex items-start justify-between gap-2">
          <p
            className={cn(
              leadDetailSidebarFieldValueClassName,
              "break-words",
              value?.trim() ? "text-foreground" : "text-muted-foreground/60",
            )}
          >
            {displayValue}
          </p>
          <div className="flex items-center gap-0.5 shrink-0">
            {actions}
            {trailing}
          </div>
        </div>
      </div>
    </div>
  )
}

type LeadDetailSnapshot = {
  leadData: Record<string, unknown>
  associatesData: Record<string, unknown>
  taskList: unknown[]
  contactsList: unknown[]
  customFields: unknown[]
  activityData: LeadActivityData
  preservedDocumentUploads: LeadActivityDocument[]
  preservedDeleteTimeline: LeadActivityTimelineItem[]
  suggestedProjects?: MatchedProject[]
  fetchedAt?: number
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  // Snapshot of a previously-loaded lead, cached in memory per id. Lets the
  // page render instantly when navigating back to a lead instead of flashing
  // the full-screen "Loading lead details..." spinner every time.
  const detailCacheId = Array.isArray(params.id) ? params.id[0] : params.id
  const cachedDetail = detailCacheId
    ? queryClient.getQueryData<LeadDetailSnapshot>(
        leadDetailSnapshotQueryKey(detailCacheId),
      )
    : undefined
  const activeLeadIdRef = useRef(detailCacheId)
  const [loading, setLoading] = useState(!cachedDetail)
  const [error, setError] = useState<string | null>(null)
  const [isEmailSheetOpen, setIsEmailSheetOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<{_id: string; contact_name: string; email: string; associate_to: string} | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<EmailHistory | null>(null)
  const [isTaskSheetOpen, setIsTaskSheetOpen] = useState(false)
  const [taskCompletionDrawerOpen, setTaskCompletionDrawerOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [completionNote, setCompletionNote] = useState("")
  const [nextFollowUpDate, setNextFollowUpDate] = useState<Date | undefined>(undefined)
  const [inTime, setInTime] = useState<string>("")
  const [outTime, setOutTime] = useState<string>("")
  const [selectedTaskType, setSelectedTaskType] = useState<string | null>(null)
  const [currentDueDate, setCurrentDueDate] = useState<string>("")
  const [isHovering, setIsHovering] = useState(false)
  const [isEditingDesignation, setIsEditingDesignation] = useState(false)
  const [contactSheetOpen, setContactSheetOpen] = useState(false)
  const [noteDrawerOpen, setNoteDrawerOpen] = useState(false)
  const [noteToEdit, setNoteToEdit] = useState<LeadActivityNote | null>(null)
  const [contactsList, setContactsList] = useState<any[]>((cachedDetail?.contactsList as any[]) ?? [])
  const [editContactDrawerOpen, setEditContactDrawerOpen] = useState(false)
  const [selectedContactForEdit, setSelectedContactForEdit] = useState<any>(null)
  const [taskList, setTaskList] = useState<any[]>((cachedDetail?.taskList as any[]) ?? [])
  const { toast } = useToast()
  const {
    userData,
    isLoading: isPermissionsLoading,
    canViewLeads,
    canEditLead,
    canViewLeadDocuments,
    canAddLeadDocument,
    canDeleteLeadDocument,
    canDownloadLeadDocument,
  } = useLeadPermissions()
  const [showNotQualifiedDialog, setShowNotQualifiedDialog] = useState(false)
  const [notQualifiedNotes, setNotQualifiedNotes] = useState("")
  const [selectedNotQualifiedReason, setSelectedNotQualifiedReason] = useState("")
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{previousStatusId: string, newStatusId: string} | null>(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showEditDrawer, setShowEditDrawer] = React.useState(false)
  const [customFields, setCustomFields] = useState<any[]>((cachedDetail?.customFields as any[]) ?? [])
  const [activityDisplayLimit, setActivityDisplayLimit] = useState(5)
  const [showMoreDetails, setShowMoreDetails] = useState(true)
  const contactInfoRef = useRef<HTMLElement>(null)

  // Function to handle field updates
  const { addTimelineActivity } = useTimeline()
  const [leadData, setLeadData] = useState<Record<string, any>>((cachedDetail?.leadData as Record<string, any>) ?? {
    id: "",
    _id: "",
    name: "",
    company_name: "",
    assigned_to: "",
    assigned: "",
    position: "",
    email: "",
    phone: "",
    lead_status: "",
    lead_status_name: "",
    lead_status_color: "",
    source: "",
    source_name:"",
    industry: "",
    customer_type: "",
    customer_type_name: "",
    url: "",
    create_date: "",
    create_time: "",
    createBy: "",
    lastContact: "",
    stageChanged: "",
    next_followup_dates: "",
    date_aging: "",
    probability: "",
    description: "",
    custom_fields: [] as any[],
    tags: [] as any[],
    notes: [] as any[],
    activities: [] as any[],
    address1: "",
    address2: "",
    country: "",
    city: "",
    state: "",
    pincode: "",
    lead_type: "",
    // Old CRM fields
    lead_no: "",
    alternate_phone: "",
    whatsapp_no: "",
    not_qualified_reason: "",
    not_qualified_note: "",
    not_qualified_date: "",
    not_qualified_time: "",
    alternate_email: "",
    campaign_name: "",
    about_company: "",
    lead_industry_name: "",
    application: "",
    lead_application_name: "",
    linkedin: "",
    product_quantity: [] as any[],
    modify_date: "",
    modify_time: "",
    designation: "",
    location: "",
    current_staying: "",
    purpose: "",
    purpose_name: "",
    budget: "",
    timeline: "",
    payment: "",
    payment_name: "",
    dob: "",
    sod: "",
    referred_by: "",
    referred_mobile_no: "",
    gstin: "",
    stage: "",
    lead_status_meta: null as Record<string, unknown> | null,
    status: "active",
    target_date: "",
    converted_date: "",
    customer_requirement: "",
    customer_requirement_name: "",
    teams: [] as string[],
    suggested_projects: [] as string[],
    project_name: "",
  })
  const [editedDesignation, setEditedDesignation] = useState(leadData.position)
  const [leadSettings, setLeadSettings] = useState({
    sources: [] as any[],
    paymentTerms: [] as any[],
    customerTypes: [] as any[],
    customerRequirements: [] as any[],
    leadStatuses: [] as any[],
    industries: [] as any[],
    applications: [] as any[],
    notQualifiedReasons: [] as any[],
  })
  const [activityData, setActivityData] = useState<LeadActivityData>(cachedDetail?.activityData ?? EMPTY_ACTIVITY_DATA)
  const [preservedDocumentUploads, setPreservedDocumentUploads] = useState<LeadActivityDocument[]>(
    cachedDetail?.preservedDocumentUploads ?? [],
  )
  const [preservedDeleteTimeline, setPreservedDeleteTimeline] = useState<LeadActivityTimelineItem[]>(
    cachedDetail?.preservedDeleteTimeline ?? [],
  )
  const [activityLoading, setActivityLoading] = useState(false)
  const [suggestedProjects, setSuggestedProjects] = useState<MatchedProject[]>(
    cachedDetail?.suggestedProjects ?? [],
  )
  const [isLoadingSuggestedProjects, setIsLoadingSuggestedProjects] = useState(false)
  const loadGenerationRef = useRef(0)
  const detailAbortRef = useRef<AbortController | null>(null)

  const [associatesData, setAssociatesData] = useState<Record<string, any>>((cachedDetail?.associatesData as Record<string, any>) ?? {
    contacts: [] as any[],
    tasks: [] as any[],
    users: [] as any[],
    settingsListUsers: [] as any[],
    teams: [] as any[],
    custom_fields: [] as any[],
  });

  // Add state for company name editing popup
  const [isCompanyEditOpen, setIsCompanyEditOpen] = useState(false)
  const [editedCompanyName, setEditedCompanyName] = useState("")
  const companyEditRef = useRef(null)
  const companyNameRef = useRef(null)
  const recentlyDeletedDocumentIdsRef = useRef<Set<string>>(new Set())
  const [documentToDelete, setDocumentToDelete] = useState<{ id: string; name: string } | null>(null)

  const currentUserId = useMemo(() => {
    if (typeof window === "undefined") return undefined
    try {
      const userDetails = JSON.parse(localStorage.getItem("map_user") || "{}")
      return String(
        userDetails.result?.id ??
          userDetails.result?._id ??
          userDetails.id ??
          "",
      ) || undefined
    } catch {
      return undefined
    }
  }, [])

  const leadId = useMemo(() => {
    const id = params.id
    return Array.isArray(id) ? id[0] : id
  }, [params.id])

  const { setContext: setAiChatContext } = useAiChatContext()

  useEffect(() => {
    if (!leadId) {
      setAiChatContext({ type: "general" })
      return
    }

    setAiChatContext({
      type: "lead",
      lead: {
        leadId,
        leadName: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        status: leadData.status,
        stage: leadData.stage,
        budget: leadData.budget,
        location: leadData.location,
        customerRequirement:
          leadData.customer_requirement_name || leadData.customer_requirement,
        timeline: leadData.timeline,
      },
    })

    return () => {
      setAiChatContext({ type: "general" })
    }
  }, [
    leadData.budget,
    leadData.customer_requirement,
    leadData.customer_requirement_name,
    leadData.email,
    leadData.location,
    leadData.name,
    leadData.phone,
    leadData.stage,
    leadData.status,
    leadData.timeline,
    leadId,
    setAiChatContext,
  ])

  const [branchAssignableUsers, setBranchAssignableUsers] = useState<AssignableUser[]>([])
  const userBranchMap = useMemo(
    () => buildUserBranchMap(branchAssignableUsers),
    [branchAssignableUsers],
  )

  const assignableUsers = useMemo(
    () =>
      mergeTaskUserLists(
        associatesData.settingsListUsers as Array<{ _id: string; name: string }>,
        normalizeAssociatesUsers(associatesData.users),
      ),
    [associatesData.settingsListUsers, associatesData.users],
  )

  const assignedToOptions = useMemo(() => {
    const branchScopedUsers = filterAssignableUsersForLead(
      branchAssignableUsers,
      leadData as Record<string, unknown>,
      userBranchMap,
      userData,
    )

    const optionMap = new Map<string, LeadDetailDropdownOption>()

    branchScopedUsers.forEach((user) => {
      if (user.id && user.name) {
        optionMap.set(user.id, {
          value: user.id,
          label: user.name,
          color: ASSIGNED_TO_COLOR,
        })
      }
    })

    const assignedId = leadData.assigned_to?.trim()
    const assignedName = leadData.assigned?.trim()
    if (assignedId && assignedName && !optionMap.has(assignedId)) {
      optionMap.set(assignedId, {
        value: assignedId,
        label: assignedName,
        color: ASSIGNED_TO_COLOR,
      })
    }

    return Array.from(optionMap.values())
  }, [
    branchAssignableUsers,
    leadData,
    leadData.assigned_to,
    leadData.assigned,
    userBranchMap,
    userData,
  ])

  const leadStatusOptions = useMemo(
    () =>
      (leadSettings.leadStatuses as LeadStatusSettingRecord[])
        .map((status) => {
          const id = String(status._id ?? status.id ?? "").trim()
          const name = String(status.name ?? "").trim()
          if (!id || !name) return null
          return {
            value: id,
            label: name,
            color: String(status.color || "#003399"),
          }
        })
        .filter((option): option is LeadDetailDropdownOption => option !== null),
    [leadSettings.leadStatuses],
  )

  const leadStageOptions = useMemo(
    () =>
      getStageOptionsForLeadDetail(
        leadData.lead_status,
        leadData.lead_status_name,
        leadSettings.leadStatuses as LeadStatusSettingRecord[],
        leadData.lead_status_meta as LeadStatusSettingRecord | null,
      ),
    [
      leadData.lead_status,
      leadData.lead_status_name,
      leadData.lead_status_meta,
      leadSettings.leadStatuses,
    ],
  )

  const leadStageValue = leadData.stage?.trim() || ""

  const selectedCustomerType = useMemo(
    () =>
      (leadSettings.customerTypes as CustomerTypeSettingRecord[]).find((item) => {
        const itemId = String(item._id ?? "").trim()
        const typeId = leadData.customer_type?.trim() || ""
        if (typeId && itemId && itemId === typeId) return true
        const typeName = leadData.customer_type_name?.trim().toLowerCase() || ""
        const itemName = item.name?.trim().toLowerCase() || ""
        return Boolean(typeName && itemName && itemName === typeName)
      }) ?? null,
    [leadSettings.customerTypes, leadData.customer_type, leadData.customer_type_name],
  )

  const purposeFieldType = useMemo(
    () => getCustomerTypeFieldType(selectedCustomerType),
    [selectedCustomerType],
  )

  const purposeOptions = useMemo(
    () =>
      getPurposeOptionsForLeadDetail(
        leadData.customer_type,
        leadData.customer_type_name,
        leadSettings.customerTypes as CustomerTypeSettingRecord[],
      ),
    [leadData.customer_type, leadData.customer_type_name, leadSettings.customerTypes],
  )

  const purposeValue = leadData.purpose_name?.trim() || leadData.purpose?.trim() || ""

  const sourceOptions = useMemo(
    () => mapLeadSettingDropdownOptions(leadSettings.sources),
    [leadSettings.sources],
  )

  const paymentOptions = useMemo(
    () => mapLeadSettingDropdownOptions(leadSettings.paymentTerms),
    [leadSettings.paymentTerms],
  )

  const resolvedSourceValue = useMemo(
    () =>
      resolveLeadSettingDropdownValue(
        leadData.source,
        leadData.source_name,
        leadSettings.sources,
      ),
    [leadData.source, leadData.source_name, leadSettings.sources],
  )

  const resolvedPaymentValue = useMemo(
    () =>
      resolveLeadSettingDropdownValue(
        leadData.payment,
        leadData.payment_name,
        leadSettings.paymentTerms,
      ),
    [leadData.payment, leadData.payment_name, leadSettings.paymentTerms],
  )

  const leadCreatorName = useMemo(() => {
    const createBy = leadData.createBy?.trim()
    if (!createBy) return "—"
    const matchedUser = assignableUsers.find(
      (user) => user._id === createBy || user.name === createBy,
    )
    return matchedUser?.name || createBy
  }, [leadData.createBy, assignableUsers])

  const companyDisplayName = leadData.company_name || leadData.project_name || ""

  const recentActivities = useMemo(() => {
    const activities = buildUnifiedActivityList(activityData, {
      documentUploads: preservedDocumentUploads,
      deleteTimeline: preservedDeleteTimeline,
    })

    return activities.map((activity) => {
      const matchedUser = assignableUsers.find((user) => user._id === activity.createBy)

      return matchedUser?.name ? { ...activity, createBy: matchedUser.name } : activity
    })
  }, [activityData, assignableUsers, preservedDocumentUploads, preservedDeleteTimeline])

  const nextOpenTask = useMemo(
    () => taskList.find((task) => task.status !== "Completed"),
    [taskList],
  )

  const displayedActivities = useMemo(
    () => recentActivities.slice(0, activityDisplayLimit),
    [recentActivities, activityDisplayLimit],
  )

  useEffect(() => {
    if (!leadId) return

    activeLeadIdRef.current = leadId
    const generation = ++loadGenerationRef.current
    recentlyDeletedDocumentIdsRef.current.clear()

    const snapshot = queryClient.getQueryData<LeadDetailSnapshot>(
      leadDetailSnapshotQueryKey(leadId),
    )

    // Hydrate from cache instantly so the page paints without a spinner.
    if (snapshot?.leadData && (snapshot.leadData as { _id?: string })._id) {
      setLeadData((prev) => ({ ...prev, ...(snapshot.leadData as Record<string, any>) }))
      setAssociatesData((prev) => ({
        ...prev,
        ...(snapshot.associatesData as Record<string, any>),
      }))
      setTaskList(snapshot.taskList as any[])
      setContactsList(snapshot.contactsList as any[])
      setCustomFields(snapshot.customFields as any[])
      setActivityData(snapshot.activityData)
      setPreservedDocumentUploads(snapshot.preservedDocumentUploads ?? [])
      setPreservedDeleteTimeline(snapshot.preservedDeleteTimeline ?? [])
      if (snapshot.suggestedProjects) {
        setSuggestedProjects(snapshot.suggestedProjects)
      }
      setLoading(false)
    } else {
      setPreservedDocumentUploads([])
      setPreservedDeleteTimeline([])
      setLoading(true)
    }

    setError(null)

    const snapshotAge = snapshot?.fetchedAt ? Date.now() - snapshot.fetchedAt : Number.POSITIVE_INFINITY
    const snapshotIsFresh =
      Boolean(snapshot?.leadData && (snapshot.leadData as { _id?: string })._id) &&
      snapshotAge < LEAD_DETAIL_STALE_MS

    // Returning to a lead within the stale window: keep cached UI and only
    // warm shared settings/users (usually already in react-query cache).
    if (snapshotIsFresh) {
      void loadSharedLeadCaches().catch((err) => {
        console.error("Error warming shared lead caches:", err)
      })
      return
    }

    // Prefer React Query dedupe over abort-on-unmount. Strict Mode remounts
    // join the same in-flight fetchQuery instead of starting a second set of
    // lead_detail / activity / associates requests.
    const abortController = new AbortController()
    detailAbortRef.current = abortController

    void (async () => {
      const hasCachedLead = Boolean(
        snapshot?.leadData && (snapshot.leadData as { _id?: string })._id,
      )

      try {
        await loadLeadDetailBundle(leadId, {
          generation,
          signal: abortController.signal,
          silent: hasCachedLead,
        })
      } catch (err) {
        if (generation !== loadGenerationRef.current) return
        if (err instanceof DOMException && err.name === "AbortError") return
        if (!hasCachedLead) {
          const message =
            err instanceof Error ? err.message : "Failed to fetch lead details"
          setError(message)
          toast({
            title: "Error",
            description: message,
            variant: "destructive",
          })
        }
      } finally {
        if (generation === loadGenerationRef.current) {
          setLoading(false)
          setIsLoadingSuggestedProjects(false)
        }
      }
    })()

    return () => {
      const departingLeadId = leadId
      // Defer cancel so Strict Mode remount (same leadId) can join in-flight
      // queries. Cancel only when navigating to a different lead.
      queueMicrotask(() => {
        if (activeLeadIdRef.current === departingLeadId) return
        abortController.abort()
        void queryClient.cancelQueries({ queryKey: leadDetailQueryKey(departingLeadId) })
        void queryClient.cancelQueries({ queryKey: leadActivityQueryKey(departingLeadId) })
        void queryClient.cancelQueries({ queryKey: leadAssociatesQueryKey(departingLeadId) })
        void queryClient.cancelQueries({
          queryKey: leadMatchedProjectsQueryKey(departingLeadId),
        })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per lead id
  }, [leadId])

  // Persist the loaded lead to the in-memory cache so navigating back to it
  // renders instantly without a loading screen.
  useEffect(() => {
    if (loading) return
    if (!leadId || !leadData._id) return
    queryClient.setQueryData<LeadDetailSnapshot>(
      leadDetailSnapshotQueryKey(leadId),
      (prev) => ({
      leadData,
      associatesData,
      taskList,
      contactsList,
      customFields,
      activityData,
      preservedDocumentUploads,
      preservedDeleteTimeline,
      suggestedProjects,
      fetchedAt: prev?.fetchedAt ?? Date.now(),
    }),
    )
  }, [
    loading,
    leadId,
    leadData,
    associatesData,
    taskList,
    contactsList,
    customFields,
    activityData,
    preservedDocumentUploads,
    preservedDeleteTimeline,
    suggestedProjects,
    queryClient,
  ])

  const applyLeadSettingsData = (data: Awaited<ReturnType<typeof fetchLeadSettingsList>>) => {
    const nqrArray =
      data?.not_qualified_reasons ||
      data?.not_qualified_reason ||
      (Array.isArray(data?.settings)
        ? data.settings.filter((s: { type?: string }) => s.type === "not_qualified_reason")
        : [])
    const mappedNqr = Array.isArray(nqrArray)
      ? nqrArray.map((item: { _id?: string | { $oid?: string }; name?: string; color?: string }) => ({
          id: resolveLeadSettingId(item),
          name: item?.name,
          color: item?.color || "#000000",
        }))
      : []

    const leadStatuses = mapLeadSettingItems(
      (data.lead_status || []) as Array<Record<string, unknown>>,
    ).sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))

    setLeadSettings({
      sources: mapLeadSettingItems(
        ((data.source || data.lead_source || []) as Array<Record<string, unknown>>),
      ),
      paymentTerms: mapLeadSettingItems(
        ((data.payment_terms || data.payment_term || []) as Array<Record<string, unknown>>),
      ),
      customerTypes: mapLeadSettingItems(
        (data.customer_type || []) as Array<Record<string, unknown>>,
      ),
      customerRequirements: mapLeadSettingItems(
        (data.customer_requirement || []) as Array<Record<string, unknown>>,
      ),
      leadStatuses,
      industries: mapLeadSettingItems(
        (data.industry || []) as Array<Record<string, unknown>>,
      ),
      applications: mapLeadSettingItems(
        (data.application || []) as Array<Record<string, unknown>>,
      ),
      notQualifiedReasons: mappedNqr,
    })
  }

  const loadSharedLeadCaches = async () => {
    const headers = getAuthHeaders()
    const token = headers.Authorization.replace(/^Bearer\s+/i, "")
    const orgId = getOrgIdFromAuth(userData)

    const [settingsResult, usersResult] = await Promise.allSettled([
      queryClient.fetchQuery({
        queryKey: LEAD_SETTINGS_QUERY_KEY,
        queryFn: () => fetchLeadSettingsList(token),
      }),
      queryClient.fetchQuery({
        queryKey: assignableUsersQueryKey(orgId),
        queryFn: () => fetchCachedAssignableUsers(token, orgId, userData),
      }),
    ])

    if (settingsResult.status === "fulfilled") {
      applyLeadSettingsData(settingsResult.value)
    } else {
      console.error("Error fetching lead settings:", settingsResult.reason)
    }

    if (usersResult.status === "fulfilled") {
      const users = usersResult.value
      setBranchAssignableUsers(users)
      setAssociatesData((prev) => ({
        ...prev,
        settingsListUsers: users.map((user) => ({ _id: user.id, name: user.name })),
      }))
    } else {
      console.error("Error fetching users list:", usersResult.reason)
    }
  }

  const fetchLeadActivityData = async (options?: {
    showErrorToast?: boolean
    silent?: boolean
    signal?: AbortSignal
    /** Force a network refresh (e.g. after note/email mutations). */
    force?: boolean
  }) => {
    if (!leadId) return

    if (!options?.silent) {
      setActivityLoading(true)
    }

    try {
      const activityResult = await queryClient.fetchQuery({
        queryKey: leadActivityQueryKey(leadId),
        staleTime: options?.force ? 0 : LEAD_DETAIL_STALE_MS,
        queryFn: ({ signal }) =>
          fetchLeadActivityRaw(leadId, mergeAbortSignals(signal, options?.signal)),
      })

      const nextData = normalizeActivityData(activityResult)
      reconcileDeletedDocumentIds(nextData.document, recentlyDeletedDocumentIdsRef.current)
      const processedTimeline = processTimelineForDisplay(nextData.timeline)
      const processedData = {
        ...nextData,
        document: applyDeletedDocumentFilter(
          nextData.document,
          recentlyDeletedDocumentIdsRef.current,
        ),
        timeline: processedTimeline,
      }

      if (options?.silent) {
        setActivityData((prev) => {
          const now = Date.now()
          const pendingTimeline = prev.timeline.filter((item) =>
            isOptimisticActivityId(item._id),
          )
          const pendingNotes = prev.notes.filter((item) =>
            isOptimisticActivityId(item._id),
          )

          const unresolvedTimeline = pendingTimeline.filter((item) => {
            const itemRecord = item as Record<string, unknown>
            const age = now - getOptimisticActivityTimestamp(itemRecord)
            if (age > OPTIMISTIC_ACTIVITY_TTL_MS) return false

            const optimisticTime = getOptimisticActivityTimestamp(itemRecord)
            const hasRecentServerMatch = processedData.timeline.some((serverItem) => {
              const serverTime = new Date(
                getActivitySortTimestamp(serverItem as Record<string, unknown>),
              ).getTime()
              if (Number.isNaN(serverTime)) return false
              return (
                Math.abs(serverTime - optimisticTime) < 30_000 &&
                serverItem.category_name === item.category_name
              )
            })
            return !hasRecentServerMatch
          })
          const unresolvedNotes = pendingNotes.filter(
            (item) =>
              !processedData.notes.some(
                (serverItem) => serverItem.note.trim() === item.note.trim(),
              ),
          )

          return {
            ...processedData,
            timeline: [...unresolvedTimeline, ...processedData.timeline],
            notes: [...unresolvedNotes, ...processedData.notes],
          }
        })
      } else {
        setActivityData(processedData)
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return
      console.error("Error fetching activity data:", err)
      if (options?.showErrorToast !== false) {
        toast({
          title: "Error",
          description:
            err instanceof Error ? err.message : "Failed to fetch activity data",
          variant: "destructive",
        })
      }
    } finally {
      if (!options?.silent) {
        setActivityLoading(false)
      }
    }
  }

  const prependOptimisticTimelineActivity = (item: {
    category_name: string
    action: string
    text_info: string
  }) => {
    const timestamps = createOptimisticActivityFields()
    const optimisticItem: LeadActivityTimelineItem = {
      _id: `optimistic-timeline-${Date.now()}`,
      category_name: item.category_name,
      action: item.action,
      text_info: item.text_info,
      create_date: timestamps.create_date,
      create_time: timestamps.create_time,
      create_date_timestamp: timestamps.create_date_timestamp,
      create_date_utc: timestamps.create_date_utc,
      createBy: "",
      create_by: currentUserId ?? "",
    }

    setActivityData((prev) => ({
      ...prev,
      timeline: [optimisticItem, ...prev.timeline],
    }))
  }

  const prependOptimisticNote = (noteText: string) => {
    const timestamps = createOptimisticActivityFields()
    const optimisticNote: LeadActivityNote = {
      _id: `optimistic-note-${Date.now()}`,
      note: noteText,
      create_date: timestamps.create_date,
      create_time: timestamps.create_time,
      create_date_timestamp: timestamps.create_date_timestamp,
      create_date_utc: timestamps.create_date_utc,
      createBy: "",
      create_by: currentUserId ?? "",
    }

    setActivityData((prev) => ({
      ...prev,
      notes: [optimisticNote, ...prev.notes],
    }))
  }

  const recordTimelineAndRefreshActivity = (timelineData: {
    category_name: string
    action: string
    associate_to: string
    associate_id: string
    text_info?: string
    from_data?: string
    to_data?: string
  }) => {
    prependOptimisticTimelineActivity({
      category_name: timelineData.category_name,
      action: timelineData.action,
      text_info: timelineData.text_info ?? "Activity",
    })

    void (async () => {
      try {
        await addTimelineActivity(timelineData)
        await fetchLeadActivityData({ showErrorToast: false, silent: true, force: true })
      } catch (error) {
        console.error("Error recording timeline activity:", error)
      }
    })()
  }

  const recordFieldUpdateActivity = (
    fieldLabel: string,
    fromValue: string,
    toValue: string,
    categoryName = "update",
  ) => {
    const fromText = fromValue.trim() || "empty"
    const toText = toValue.trim() || "empty"

    recordTimelineAndRefreshActivity({
      category_name: categoryName,
      action: "update",
      associate_to: "lead",
      associate_id: params.id as string,
      text_info: formatFieldUpdateTimelineText(fieldLabel, fromText, toText),
      from_data: fromText,
      to_data: toText,
    })
  }

  const fetchLeadDetailData = async (options?: {
    signal?: AbortSignal
    force?: boolean
  }) => {
    const leadResult = await queryClient.fetchQuery({
      queryKey: leadDetailQueryKey(String(leadId)),
      staleTime: options?.force ? 0 : LEAD_DETAIL_STALE_MS,
      queryFn: ({ signal }) =>
        fetchLeadDetailRaw(String(leadId), mergeAbortSignals(signal, options?.signal)),
    })

    const normalizedLead = normalizeLeadDetail(leadResult as LeadDetailApiRecord)
    const apiSuggestedProjects = normalizedLead.suggested_projects
    const storedSuggestedProjects = getStoredLeadSuggestedProjects(String(leadId ?? ""))
    const nextSuggestedProjects =
      apiSuggestedProjects.length > 0 ? apiSuggestedProjects : storedSuggestedProjects

    setLeadData((prev) => ({
      ...prev,
      ...normalizedLead,
      suggested_projects: nextSuggestedProjects,
    }))

    return {
      ...normalizedLead,
      suggested_projects: nextSuggestedProjects,
    }
  }

  const fetchLeadAssociatesData = async (options?: {
    signal?: AbortSignal
    force?: boolean
  }) => {
    const associatesResult = await queryClient.fetchQuery({
      queryKey: leadAssociatesQueryKey(String(leadId)),
      staleTime: options?.force ? 0 : LEAD_DETAIL_STALE_MS,
      queryFn: ({ signal }) =>
        fetchLeadAssociatesRaw(String(leadId), mergeAbortSignals(signal, options?.signal)),
    })

    const customFieldsFromAssociates = Array.isArray(associatesResult?.custom_fields)
      ? associatesResult.custom_fields
      : []
    setAssociatesData((prev) => ({
      contacts: (associatesResult.contact as unknown[]) || [],
      tasks: (associatesResult.task as unknown[]) || [],
      users: (associatesResult.user as unknown[]) || [],
      teams: (associatesResult.teams as unknown[]) || [],
      custom_fields: customFieldsFromAssociates,
      settingsListUsers: prev.settingsListUsers || [],
    }))
    setTaskList((associatesResult.task as any[]) || [])
    setContactsList((associatesResult.contact as any[]) || [])
    setCustomFields(customFieldsFromAssociates)
  }

  const fetchLeadCustomFieldsData = async (options?: { signal?: AbortSignal }) => {
    // GET /customfield_values/:id is not implemented on the API. Values come
    // from lead_associates.custom_fields instead (see fetchLeadAssociatesData).
    if (options?.signal?.aborted) return
  }

  const fetchMatchedProjectsForLead = async (
    id: string,
    criteria: {
      location?: string
      budget?: string
      customerRequirementName?: string
    },
  ) => {
    setIsLoadingSuggestedProjects(true)
    try {
      const projects = await fetchLeadMatchedProjects(id, criteria, undefined, {
        getProjects: async () => {
          const cached = await queryClient.fetchQuery({
            queryKey: PROJECT_LIST_QUERY_KEY,
            queryFn: () => fetchProjectList({ length: 500 }),
          })
          return cached.projects
        },
      })
      setSuggestedProjects(projects)
      return projects
    } catch {
      setSuggestedProjects([])
      return []
    } finally {
      setIsLoadingSuggestedProjects(false)
    }
  }

  const loadLeadDetailBundle = async (
    id: string,
    options: { generation: number; signal: AbortSignal; silent?: boolean },
  ) => {
    const { generation, signal, silent } = options
    if (!silent) {
      setLoading(true)
      setIsLoadingSuggestedProjects(true)
    }

    const getCachedProjects = async () => {
      const cached = await queryClient.fetchQuery({
        queryKey: PROJECT_LIST_QUERY_KEY,
        queryFn: () => fetchProjectList({ length: 500 }),
      })
      return cached.projects
    }

    // Warm the project list in parallel with lead-scoped APIs, but score matches
    // only once detail fields are available (avoids an empty-criteria match pass).
    const projectsWarmPromise = getCachedProjects()

    // Shared caches (deduped across list/detail/filter via react-query) +
    // lead-scoped APIs all fire in parallel — no waterfalls.
    // React Query also dedupes Strict Mode remounts onto the same in-flight keys.
    const detailPromise = fetchLeadDetailData({ signal })
    const sharedCachesPromise = loadSharedLeadCaches()
    const secondaryPromise = Promise.allSettled([
      fetchLeadActivityData({ showErrorToast: false, silent: Boolean(silent), signal }),
      fetchLeadAssociatesData({ signal }),
    ])

    const [detailResult] = await Promise.allSettled([
      detailPromise,
      sharedCachesPromise,
      secondaryPromise,
      projectsWarmPromise,
    ])

    if (signal.aborted || generation !== loadGenerationRef.current) return

    if (detailResult.status === "rejected") {
      throw detailResult.reason
    }

    const normalized = detailResult.value

    const criteria = {
      location: normalized.location,
      budget: normalized.budget,
      customerRequirementName: normalized.customer_requirement_name,
    }

    let matched: MatchedProject[] = []
    try {
      matched = await queryClient.fetchQuery({
        queryKey: leadMatchedProjectsQueryKey(id),
        staleTime: LEAD_DETAIL_STALE_MS,
        queryFn: async () => {
          const projects = await getCachedProjects()
          return matchProjectsForLead(projects, criteria)
        },
      })
    } catch {
      matched = await fetchMatchedProjectsForLead(id, criteria)
    }

    if (signal.aborted || generation !== loadGenerationRef.current) return

    setSuggestedProjects(matched)
    setIsLoadingSuggestedProjects(false)

    queryClient.setQueryData<LeadDetailSnapshot>(leadDetailSnapshotQueryKey(id), (prev) => ({
      leadData: {
        ...(prev?.leadData ?? {}),
        ...normalized,
      },
      associatesData: prev?.associatesData ?? associatesData,
      taskList: prev?.taskList ?? taskList,
      contactsList: prev?.contactsList ?? contactsList,
      customFields: prev?.customFields ?? customFields,
      activityData: prev?.activityData ?? activityData,
      preservedDocumentUploads: prev?.preservedDocumentUploads ?? [],
      preservedDeleteTimeline: prev?.preservedDeleteTimeline ?? [],
      suggestedProjects: matched,
      fetchedAt: Date.now(),
    }))
  }

  const fetchLeadDetails = async () => {
    if (!leadId) return
    queryClient.removeQueries({ queryKey: leadMatchedProjectsQueryKey(leadId) })
    queryClient.removeQueries({ queryKey: leadDetailQueryKey(leadId) })
    queryClient.removeQueries({ queryKey: leadActivityQueryKey(leadId) })
    queryClient.removeQueries({ queryKey: leadAssociatesQueryKey(leadId) })
    const generation = ++loadGenerationRef.current
    detailAbortRef.current?.abort()
    const abortController = new AbortController()
    detailAbortRef.current = abortController

    try {
      await loadLeadDetailBundle(leadId, {
        generation,
        signal: abortController.signal,
        silent: false,
      })
    } catch (err: unknown) {
      if (abortController.signal.aborted) return
      if (err instanceof DOMException && err.name === "AbortError") return
      const message = err instanceof Error ? err.message : "Failed to fetch lead details"
      setError(message)
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoading(false)
        setIsLoadingSuggestedProjects(false)
      }
    }
  }

  // Find the Not Qualified status from leadStatuses
  const notQualifiedStatus = useMemo(() => {
    return leadSettings.leadStatuses.find((status: any) => Number(status.not_qualified) === 1)
  }, [leadSettings.leadStatuses])

  // Check if current status is Not Qualified
  const isNotQualified = useMemo(() => {
    if (notQualifiedStatus && leadData.lead_status) {
      return leadData.lead_status === notQualifiedStatus._id
    }
    return false
  }, [notQualifiedStatus, leadData.lead_status])

  // Handle Not Qualified action
  const handleNotQualified = async () => {
    if (!selectedNotQualifiedReason) {
      toast({
        title: "Reason Required",
        description: "Please select a Not Qualified reason.",
        variant: "destructive",
      })
      return
    }

    if (!notQualifiedNotes.trim()) {
      toast({
        title: "Notes Required",
        description: "Please enter notes before marking as Not Qualified.",
        variant: "destructive",
      })
      return
    }

    try {
      const storedData = localStorage.getItem('map_user')
      if (!storedData) {
        throw new Error('User not authenticated')
      }
      const userData = JSON.parse(storedData)

      // Get the selected reason name
      const selectedReason = leadSettings.notQualifiedReasons.find((reason: any) => reason.id === selectedNotQualifiedReason)
      const reasonName = selectedReason?.name || selectedNotQualifiedReason

      // First, add a note with the not qualified reason and notes
      const noteText = `Not Qualified Reason: ${reasonName}\nNotes: ${notQualifiedNotes}`
      const noteResponse = await fetch(`${URLS.ADD_NOTES}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          note: noteText,
          associate_id: params.id,
          associate_to: "lead",
        })
      })

      const noteResult = await noteResponse.json()
      if (noteResult.code !== 200) {
        console.warn('Failed to add note:', noteResult.msg)
      }

      // Update the lead status to Not Qualified and save the reason, notes, and date
      if (notQualifiedStatus) {
        // Get current date/time in ISO format
        const notQualifiedDate = new Date().toISOString()
        
        const response = await fetch(`${URLS.LEAD_UPDATE}/${params.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${userData.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            lead_status: notQualifiedStatus._id,
            not_qualified_reason: reasonName,
            not_qualified_note: notQualifiedNotes,
            not_qualified_date: notQualifiedDate
          })
        })

        const result = await response.json()
        if (result.code === 200) {
          // Update local state
          setLeadData((prev) => ({
            ...prev,
            lead_status: notQualifiedStatus._id,
            lead_status_name: notQualifiedStatus.name || prev.lead_status_name,
            lead_status_color: notQualifiedStatus.color || prev.lead_status_color,
            not_qualified_reason: reasonName,
            not_qualified_note: notQualifiedNotes,
            not_qualified_date: new Date().toISOString()
          }))

          // Add timeline activity
          recordTimelineAndRefreshActivity({
            category_name: 'lead',
            action: 'update',
            text_info: `Status changed to ${notQualifiedStatus.name}`,
            associate_id: params.id as string,
            associate_to: 'lead'
          })

          setShowNotQualifiedDialog(false)
          setNotQualifiedNotes("")
          setSelectedNotQualifiedReason("")
          setPendingStatusUpdate(null) // Clear pending status update
          
          toast({
            title: "Lead Marked as Not Qualified",
            description: "The lead has been marked as Not Qualified and note has been saved.",
            variant: "default",
          })

          // Refresh data to reflect changes
          fetchLeadDetails()
        } else {
          throw new Error(result.msg || 'Failed to update lead status')
        }
      } else {
        throw new Error('Not Qualified status not found')
      }
    } catch (err: any) {
      console.error('Error marking lead as Not Qualified:', err)
      toast({
        title: "Error",
        description: err.message || "Failed to mark lead as Not Qualified",
        variant: "destructive",
      })
      setShowNotQualifiedDialog(false)
      // If there was a pending status update, revert it on error
      if (pendingStatusUpdate) {
        const previousStatus = leadSettings.leadStatuses.find((status: any) => status._id === pendingStatusUpdate.previousStatusId)
        setLeadData((prev) => ({
          ...prev,
          lead_status: pendingStatusUpdate.previousStatusId,
          lead_status_name: previousStatus?.name || prev.lead_status_name,
          lead_status_color: previousStatus?.color || prev.lead_status_color
        }))
        setPendingStatusUpdate(null)
      }
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (!canAddLeadDocument) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to upload documents.",
        variant: "destructive",
      })
      return
    }

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await handleDocumentUpload(files[0])
    }
  }

  const getDocumentUrl = (documentPath: string) => {
    if (!documentPath) return ''
    if (documentPath.startsWith('http://') || documentPath.startsWith('https://')) {
      return documentPath
    }
    if (documentPath.startsWith('/')) {
      return `${URLS.DOCUMENT_BASE_URL}${documentPath}`
    }
    return `${URLS.DOCUMENT_BASE_URL}/${documentPath}`
  }

  // Function to handle document uploads
  const handleDocumentDownload = async (documentUrl: string, fileName: string) => {
    if (!canDownloadLeadDocument) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to download documents.",
        variant: "destructive",
      })
      return
    }

    try {
      const { Authorization } = getAuthHeaders()
      const response = await fetch(getDocumentUrl(documentUrl), {
        headers: { Authorization },
      })
      if (!response.ok) {
        throw new Error("Failed to download file")
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading file:', error)
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      })
    }
  }
  
  const handleDocumentOpenNewTab = (documentUrl: string) => {
    if (!canDownloadLeadDocument) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to open documents.",
        variant: "destructive",
      })
      return
    }
    window.open(getDocumentUrl(documentUrl), '_blank')
  }

  const handleDocumentUpload = async (file: File) => {
    if (!canAddLeadDocument) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to upload documents.",
        variant: "destructive",
      })
      return
    }

    try {
      const storedData = localStorage.getItem('map_user')
      if (!storedData) {
        throw new Error('User not authenticated')
      }
      const userData = JSON.parse(storedData)

      const formData = new FormData()
      formData.append('document', file)
      formData.append('associate_id', leadData._id)
      formData.append('associate_to', 'lead')

      const response = await fetch(URLS.DOCUMENT_ADD, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userData.access_token}`
        },
        body: formData
      })

      const result = await response.json()
      if (result.code === 200) {
        // Add timeline activity for document upload
        recordTimelineAndRefreshActivity({
          category_name: 'document',
          action: 'upload',
          text_info: `Uploaded document: ${file.name}`,
          associate_id: leadData._id,
          associate_to: 'lead'
        })

        toast({
          title: "Success",
          description: "Document uploaded successfully",
        })
      } else {
        throw new Error(result.msg || 'Failed to upload document')
      }
    } catch (err: any) {
      setError(err.message)
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      })
    }
  }

  const handleDocumentDelete = async (documentId: string) => {
    if (!canDeleteLeadDocument) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to delete documents.",
        variant: "destructive",
      })
      return
    }

    try {
      const storedData = localStorage.getItem('map_user')
      if (!storedData) {
        throw new Error('User not authenticated')
      }
      const userData = JSON.parse(storedData)
  
      const response = await fetch(`${URLS.BULK_DELETE}?associate_id=${documentId}&associate_to=companyattachment`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userData.access_token}`
        }
      })
  
      const result = await response.json()
      if (result.code === 200) {
        const deletedDoc = activityData.document.find(
          (doc) => getDocumentId(doc) === documentId,
        )
        const fileName =
          deletedDoc?.user_file_name || documentToDelete?.name || ""

        if (deletedDoc) {
          setPreservedDocumentUploads((prev) => {
            if (prev.some((doc) => getDocumentId(doc) === documentId)) {
              return prev
            }
            return [...prev, deletedDoc]
          })
        }

        const deleteTimestamps = createOptimisticActivityFields()
        const preservedDeleteEntry: LeadActivityTimelineItem = {
          _id: `preserved-delete-${documentId}`,
          category_name: "delete",
          action: "delete",
          text_info: fileName
            ? `Deleted document: ${fileName}`
            : "Deleted a document",
          create_date: deleteTimestamps.create_date,
          create_time: deleteTimestamps.create_time,
          create_date_timestamp: deleteTimestamps.create_date_timestamp,
          create_date_utc: deleteTimestamps.create_date_utc,
          createBy: "",
          create_by: currentUserId ?? "",
        }

        setPreservedDeleteTimeline((prev) => {
          if (prev.some((item) => String(item._id) === preservedDeleteEntry._id)) {
            return prev
          }
          return [preservedDeleteEntry, ...prev]
        })

        recentlyDeletedDocumentIdsRef.current.add(documentId)
        setActivityData((prev) => ({
          ...prev,
          document: prev.document.filter((doc) => getDocumentId(doc) !== documentId),
        }))

        // Add timeline activity for document deletion
        recordTimelineAndRefreshActivity({
          category_name: 'delete',
          action: 'delete',
          text_info: fileName
            ? `Deleted document: ${fileName}`
            : 'Deleted a document',
          associate_id: leadData._id,
          associate_to: 'lead'
        })

        toast({
          title: "Success",
          description: "Document deleted successfully",
        })
      } else {
        throw new Error(result.msg || 'Failed to delete document')
      }
    } catch (err: any) {
      setError(err.message)
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      })
    }
  }

  const handleConfirmDocumentDelete = () => {
    if (!documentToDelete) return
    const { id } = documentToDelete
    setDocumentToDelete(null)
    void handleDocumentDelete(id)
  }

  // Add function to handle editing a contact
  const handleEditContact = (index: number) => {
    setSelectedContactForEdit(contactsList[index])
    setEditContactDrawerOpen(true)
  }

  // Handle contact update from EditContactDrawer
  const handleUpdateContact = async (updatedContact: any) => {
    fetchLeadDetails()
    setEditContactDrawerOpen(false)
    setSelectedContactForEdit(null)
  }

  // Handle contact deletion
  const handleDeleteContact = async (contactId: string, contactName: string) => {
    try {
      const storedData = localStorage.getItem('map_user');
      if (!storedData) {
        toast({
          title: "Error",
          description: "User data not found",
          variant: "destructive",
        });
        return;
      }

      const userData = JSON.parse(storedData);
      const response = await fetch(`${URLS.BULK_DELETE}?associate_id=${contactId}&associate_to=contact`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userData.access_token}`,
        },
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Contact "${contactName}" deleted successfully`,
          variant: "default",
        });
        fetchLeadDetails();
      } else {
        const result = await response.json();
        throw new Error(result.msg || 'Failed to delete contact');
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete contact",
        variant: "destructive",
      });
    }
  }

  // Generate predefined emails based on lead data
  const getPredefinedEmails = () => {
    const emails: string[] = []
    
    // Add lead's main email if available
    if (leadData.email && leadData.email.trim() !== '') {
      emails.push(leadData.email)
    }
    
    // Add lead's alternate email if available
    if (leadData.alternate_email && leadData.alternate_email.trim() !== '') {
      emails.push(leadData.alternate_email)
    }
    
    // Add emails from contacts list
    if (contactsList && contactsList.length > 0) {
      contactsList.forEach((contact: any) => {
        if (contact.email && contact.email.trim() !== '' && !emails.includes(contact.email)) {
          emails.push(contact.email)
        }
      })
    }
    
    // Return only stored emails (no test/placeholder emails)
    return [...new Set(emails)]
  }

  // Add handler for opening email
  const handleEmailClick = (contact?: {_id: string; contact_name: string; email: string; associate_to?: string}) => {
    if (contact) {
      // If a contact is provided, use contact's details
      setSelectedContact({
        ...contact,
        associate_to: contact.associate_to || 'lead'
      })
    } else {
      // If no contact provided, use lead's email
      setSelectedContact({
        _id: leadData._id,
        contact_name: leadData.name,
        email: leadData.email,
        associate_to: 'lead'
      })
    }
    setIsEmailSheetOpen(true)
  }

  // Handler for successful email send
  const handleEmailSent = async () => {
    try {
      // Refetch activity data to get the latest emails
      await fetchLeadActivityData({ silent: true, force: true })
      
      // Close the email sheet
      setIsEmailSheetOpen(false)
      
      // Show success toast
      toast({
        title: "Success",
        description: "Email sent successfully",
      })
    } catch (err: any) {
      console.error('Error refreshing email data:', err)
    }
  }

  useEffect(() => {
    if (!isEmailSheetOpen) {
      setSelectedContact(null)
    }
  }, [isEmailSheetOpen])

  const handleViewEmail = (email: LeadActivityEmail) => {
    setSelectedEmail({
      id: email._id ?? "",
      subject: email.subject,
      to: email.to,
      from: email.fromEmail ?? email.from ?? "",
      body: email.content ?? "",
      sentDate: new Date(`${email.create_date} ${email.create_time}`),
      sentBy: email.createBy,
      thread_id: email.thread_id,
      create_date: email.create_date,
      create_time: email.create_time,
      createBy: email.createBy,
      fromEmail: email.fromEmail,
      content: email.content,
      content_full: typeof email.content_full === "string" ? email.content_full : undefined,
      cc: email.cc,
      attachment: email.attachment,
    })
    setIsEmailPreviewOpen(true)
  }
  
  const handleNewNote = (note?: { content?: string }, meta?: { isEdit?: boolean }) => {
    if (!meta?.isEdit && note?.content?.trim()) {
      prependOptimisticNote(note.content.trim())
    }
    void fetchLeadActivityData({ showErrorToast: false, silent: true, force: true })
    setNoteDrawerOpen(false)
    setNoteToEdit(null)
  }

  const handleOpenAddNote = () => {
    setNoteToEdit(null)
    setNoteDrawerOpen(true)
  }

  const handleEditNote = (note: LeadActivityNote) => {
    setNoteToEdit(note)
    setNoteDrawerOpen(true)
  }

  const handleNoteDrawerOpenChange = (open: boolean) => {
    setNoteDrawerOpen(open)
    if (!open) {
      setNoteToEdit(null)
    }
  }

  // Handle click outside of company_name edit popup
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        companyEditRef.current &&
        !companyEditRef.current.contains(event.target) &&
        companyNameRef.current &&
        !companyNameRef.current.contains(event.target)
      ) {
        setIsCompanyEditOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [companyEditRef, companyNameRef])

  // Open company_name edit popup
  const handleCompanyEditClick = () => {
    setEditedCompanyName(leadData.company_name)
    setIsCompanyEditOpen(true)
  }

  // Save edited company_name name
  const handleSaveCompanyName = () => {
    if (editedCompanyName.trim()) {
      handleFieldUpdate("company_name", editedCompanyName)
      setIsCompanyEditOpen(false)
    }
  }

   // Effect to set the current due date when opening the completion drawer
   useEffect(() => {
    if (taskCompletionDrawerOpen && selectedTaskId) {
      const task = associatesData.tasks.find(task => task._id === selectedTaskId)
      if (task?.due_date) {
        setCurrentDueDate(task.due_date)
        setNextFollowUpDate(new Date(task.due_date))
      }
    }
  }, [taskCompletionDrawerOpen, selectedTaskId, associatesData.tasks])

   // Function to update lead followup date
   const updateLeadFollowupDate = async (leadId: string, followupId: string, newDate: Date | undefined) => {
    try {
      const token = JSON.parse(localStorage.getItem('map_user') || '{}').access_token;
      if (!token) throw new Error("Token not found");

      const response = await fetch(`${URLS.CRM_TASKS}/${followupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lead_id: leadId,
          date: newDate ? format(newDate, 'yyyy-MM-dd') : null
        })
      });

      const data = await response.json();
      
      if (data.code === 200) {

        // Add to timeline
        recordTimelineAndRefreshActivity({
          category_name: 'task',
          action: 'update',
          text_info: 'Task Updated',
          associate_id: leadId,
          associate_to: 'lead'
        });

        setLeadData((prev) => ({
          ...prev,
          nextFollowup: newDate ? format(newDate, "dd MMM") : null,
          next_followup_dates: newDate
            ? [{ id: followupId, date: format(newDate, "yyyy-MM-dd") }]
            : [],
        }))

        void fetchLeadAssociatesData({ force: true })

        toast({
          title: data.msg || (newDate ? "Followup Date Updated" : "Followup Date Removed"),
          variant: "default",
        })
      } else {
        throw new Error(data.msg || "Failed to update followup date")
      }
    } catch (error) {
      console.error('Error updating followup date:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update followup date",
        variant: "destructive",
      })
    }
  }

  // Function to complete task with details
  const completeTaskWithDetails = async () => {
    try {
      const storedData = localStorage.getItem('map_user')
      if (!storedData) {
        throw new Error('User not authenticated')
      }
      const userData = JSON.parse(storedData)

      const taskData = {
        associate_id: leadData._id,
        associate_to: 'lead',
        note: completionNote,
        in_time: inTime,
        out_time: outTime
      }

      const response = await fetch(`${URLS.TASKS_COMPLETED}/${selectedTaskId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${userData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      })

      const result = await response.json()
      if (result.code === 200) {
        toast({
          title: "Success",
          description: "Task completed successfully",
        })

        // Add to timeline
        recordTimelineAndRefreshActivity({
          category_name: 'task',
          action: 'update',
          text_info: 'Task Completed',
          associate_id: leadData._id,
          associate_to: 'lead'
        });

        setTaskCompletionDrawerOpen(false)
        await fetchLeadDetails()
      } else {
        throw new Error(result.msg || 'Failed to complete task')
      }
    } catch (error) {
      console.error('Error completing task:', error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Add functions for handling custom field values
  const handleSingleValueSave = async (fieldId: string, value: string) => {
    if (!canEditLead) {
      denyLeadEdit()
      return
    }

    try {
      const storedData = localStorage.getItem('map_user')
      if (!storedData) {
        throw new Error('User not authenticated')
      }
      const userData = JSON.parse(storedData)

      const customField = customFields.find((field) => field._id === fieldId)
      const fieldLabel = customField?.field_name || customField?.name || "Custom Field"

      const data = {
        associate_id: params.id,
        module: "company",
        custom_field_id: fieldId,
        single_value: value
      }
      console.log(data)
      const response = await fetch(URLS.CUSTOMFIELD_VALUES, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()
      if (result.code === 200) {

        recordTimelineAndRefreshActivity({
          category_name: 'update',
          action: 'update',
          text_info: `Updated ${fieldLabel}`,
          associate_id: leadData._id,
          associate_to: 'lead'
        });

        toast({
          title: "Success",
          description: "Custom field updated successfully",
        })
        await fetchLeadCustomFieldsData()
      } else {
        throw new Error(result.msg || 'Failed to update custom field')
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to update custom field",
        variant: "destructive",
      })
    }
  }

  const handleMultipleValueSave = async (fieldId: string, values: string[]) => {
    if (!canEditLead) {
      denyLeadEdit()
      return
    }

    try {
      const storedData = localStorage.getItem('map_user')
      if (!storedData) {
        throw new Error('User not authenticated')
      }
      const userData = JSON.parse(storedData)

      const customField = customFields.find((field) => field._id === fieldId)
      const fieldLabel = customField?.field_name || customField?.name || "Custom Field"

      const data = {
        associate_id: params.id,
        module: "company",
        custom_field_id: fieldId,
        multiple_value: Array.isArray(values) ? values : [values].filter(Boolean)
      }

      const response = await fetch(URLS.CUSTOMFIELD_VALUES, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()
      if (result.code === 200) {

        recordTimelineAndRefreshActivity({
          category_name: 'update',
          action: 'update',
          text_info: `Updated ${fieldLabel}`,
          associate_id: leadData._id,
          associate_to: 'lead'
        });
        
        toast({
          title: "Success",
          description: "Custom field updated successfully",
        })
        await fetchLeadCustomFieldsData()
      } else {
        throw new Error(result.msg || 'Failed to update custom field')
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to update custom field",
        variant: "destructive",
      })
    }
  }


  const denyLeadEdit = () => {
    toast({
      title: "Permission denied",
      description: "You don't have permission to edit leads.",
      variant: "destructive",
    })
  }

  const handleFieldUpdate = async (field: string, value: string) => {
    if (!canEditLead) {
      denyLeadEdit()
      return
    }
    try {
      const storedData = localStorage.getItem('map_user')
      if (!storedData) {
        throw new Error('User not authenticated')
      }
      const userData = JSON.parse(storedData)

      const previousValue = String(
        field === "purpose"
          ? purposeValue
          : leadData[field as keyof typeof leadData] ?? "",
      )

      // Update the field in the backend
      const response = await fetch(`${URLS.LEAD_UPDATE}/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${userData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          [field]: value
        })
      })

      const result = await response.json()
      if (result.code === 200) {
        setLeadData((prev) => ({
          ...prev,
          ...(field === "purpose"
            ? { purpose: value, purpose_name: value }
            : { [field]: value }),
        }))

        const fieldLabel = LEAD_FIELD_TIMELINE_LABELS[field] || field
        recordFieldUpdateActivity(fieldLabel, previousValue, value)

        toast({
          title: "Success",
          description: "Lead updated successfully",
          variant: "default",
        })
      } else {
        throw new Error(result.msg || 'Failed to update field')
      }
    } catch (err: any) {
      setError(err.message)
      toast({
        title: "Error",
        description: "Failed to update lead",
        variant: "destructive",
      })
    }
  }

  const handleStageUpdate = async (newStageValue: string) => {
    if (!canEditLead) {
      denyLeadEdit()
      return
    }
    try {
      const storedData = localStorage.getItem("map_user")
      if (!storedData) {
        throw new Error("User not authenticated")
      }
      const userData = JSON.parse(storedData)

      const matchedStage = leadStageOptions.find((option) => option.value === newStageValue)
      const stageLabel = matchedStage?.label || newStageValue
      const previousStage = leadStageValue || "None"

      const payload: Record<string, string> = {
        stage: newStageValue,
      }
      if (leadData.lead_status) {
        payload.lead_status = leadData.lead_status
      }

      const response = await fetch(`${URLS.LEAD_UPDATE}/${params.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${userData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (result.code === 200) {
        setLeadData((prev) => ({
          ...prev,
          stage: stageLabel,
          stages: stageLabel,
        }))

        recordFieldUpdateActivity("Stage", previousStage, stageLabel, "stage")

        toast({
          title: "Success",
          description: "Lead stage updated successfully",
          variant: "default",
        })
      } else {
        throw new Error(result.msg || "Failed to update stage")
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update stage"
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    }
  }

  const handlePurposeUpdate = async (newPurposeValue: string) => {
    if (!canEditLead) {
      denyLeadEdit()
      return
    }
    try {
      const storedData = localStorage.getItem("map_user")
      if (!storedData) {
        throw new Error("User not authenticated")
      }
      const userData = JSON.parse(storedData)

      const matchedPurpose = purposeOptions.find((option) => option.value === newPurposeValue)
      const purposeLabel = matchedPurpose?.label || newPurposeValue
      const previousPurpose = purposeValue || "None"

      const response = await fetch(`${URLS.LEAD_UPDATE}/${params.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${userData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          purpose: newPurposeValue,
        }),
      })

      const result = await response.json()
      if (result.code === 200) {
        setLeadData((prev) => ({
          ...prev,
          purpose: purposeLabel,
          purpose_name: purposeLabel,
        }))

        recordFieldUpdateActivity("Purpose", previousPurpose, purposeLabel, "stage")

        toast({
          title: "Success",
          description: "Lead updated successfully",
          variant: "default",
        })
      } else {
        throw new Error(result.msg || "Failed to update purpose")
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update purpose"
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    }
  }

  const handleDropdownFieldUpdate = async (field: string, value: string) => {
    if (!canEditLead) {
      denyLeadEdit()
      return
    }

    // Check if this is a status change to Not Qualified
    if (field === 'lead_status' && notQualifiedStatus && value === notQualifiedStatus._id) {
      // Store the previous status to revert if user cancels
      setPendingStatusUpdate({
        previousStatusId: leadData.lead_status,
        newStatusId: value
      })
      // Open the Not Qualified dialog instead of directly updating
      setShowNotQualifiedDialog(true)
      return
    }

    try {
      const storedData = localStorage.getItem('map_user')
      if (!storedData) {
        throw new Error('User not authenticated')
      }
      const userData = JSON.parse(storedData)

      const fieldLabel = LEAD_FIELD_TIMELINE_LABELS[field] || field
      const currentValueId =
        field === "lead_status"
          ? leadData.lead_status
          : field === "assigned_to"
            ? leadData.assigned_to
            : field === "customer_type"
              ? leadData.customer_type
              : field === "source"
                ? resolvedSourceValue
                : field === "payment"
                  ? resolvedPaymentValue
                : field === "industry"
                  ? leadData.lead_industry
                  : field === "application"
                    ? leadData.application
                    : field === "customer_requirement"
                      ? leadData.customer_requirement
                      : field === "purpose"
                        ? purposeValue
                    : String(leadData[field as keyof typeof leadData] ?? "")
      const fromText = getDropdownFieldDisplayValue(
        field,
        currentValueId,
        leadData as Record<string, unknown>,
        leadSettings,
        assignableUsers,
      )
      const toText = getDropdownFieldDisplayValue(
        field,
        value,
        leadData as Record<string, unknown>,
        leadSettings,
        assignableUsers,
      )

      // Update the field in the backend
      const response = await fetch(`${URLS.LEAD_UPDATE}/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${userData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          [field]: value
        })
      })

      const result = await response.json()
      if (result.code === 200) {
        // Update the state based on the field type
        if (field === 'lead_status') {
          const selectedStatus = leadSettings.leadStatuses.find(status => status._id === value)
          const nextStageOptions = getStageOptionsForLeadDetail(
            value,
            selectedStatus?.name || leadData.lead_status_name,
            leadSettings.leadStatuses as LeadStatusSettingRecord[],
            selectedStatus as LeadStatusSettingRecord | null,
          )
          const stageStillValid = nextStageOptions.some(
            (option) =>
              option.value === leadStageValue ||
              option.label.toLowerCase() === leadStageValue.toLowerCase(),
          )
          setLeadData((prev) => ({
            ...prev,
            lead_status: value,
            lead_status_name: selectedStatus?.name || prev.lead_status_name,
            lead_status_color: selectedStatus?.color || prev.lead_status_color,
            lead_status_meta: (selectedStatus as Record<string, unknown> | undefined) ?? null,
            stage: stageStillValid ? prev.stage : "",
          }))
        } else if (field === 'assigned_to') {
          const selectedUser = assignableUsers.find((user) => user._id === value)
          setLeadData((prev) => ({
            ...prev,
            assigned_to: value,
            assigned: selectedUser?.name || prev.assigned
          }))
        } else if (field === 'customer_type') {
          const selectedType = leadSettings.customerTypes.find(type => type._id === value)
          const nextPurposeOptions = getPurposeOptionsForLeadDetail(
            value,
            selectedType?.name || leadData.customer_type_name,
            leadSettings.customerTypes as CustomerTypeSettingRecord[],
          )
          const nextFieldType = getCustomerTypeFieldType(
            selectedType as CustomerTypeSettingRecord | undefined,
          )
          const clearPurpose = shouldClearPurposeForCustomerType(
            nextPurposeOptions,
            nextFieldType,
            leadData.purpose,
            leadData.purpose_name,
          )
          setLeadData((prev) => ({
            ...prev,
            customer_type: value,
            customer_type_name: selectedType?.name || prev.customer_type_name,
            ...(clearPurpose ? { purpose: "", purpose_name: "" } : {}),
          }))
        } else if (field === 'source') {
          const selectedSource = leadSettings.sources.find(source => source._id === value)
          setLeadData((prev) => ({
            ...prev,
            source: value,
            source_name: selectedSource?.name || prev.source_name
          }))
        } else if (field === 'payment') {
          const selectedPayment = leadSettings.paymentTerms.find((term) => term._id === value)
          setLeadData((prev) => ({
            ...prev,
            payment: value,
            payment_name: selectedPayment?.name || prev.payment_name
          }))
        } else if (field === 'industry') {
          const selectedIndustry = leadSettings.industries.find(industry => industry._id === value)
          setLeadData((prev) => ({
            ...prev,
            lead_industry: value,
            lead_industry_name: selectedIndustry?.name || prev.lead_industry_name
          }))
        } else if (field === 'application') {
          const selectedApplication = leadSettings.applications.find(application => application._id === value)
          setLeadData((prev) => ({
            ...prev,
            lead_application: value,
            lead_application_name: selectedApplication?.name || prev.lead_application_name
          }))
        } else if (field === 'customer_requirement') {
          const selectedIds = value.split(",").map((part) => part.trim()).filter(Boolean)
          const selectedNames = selectedIds
            .map((id) => leadSettings.customerRequirements.find((item) => item._id === id)?.name)
            .filter(Boolean)
            .join(", ")
          setLeadData((prev) => ({
            ...prev,
            customer_requirement: value,
            customer_requirement_name: selectedNames || prev.customer_requirement_name
          }))
        } else {
          setLeadData((prev) => ({
            ...prev,
            [field]: value,
          }))
        }

        recordFieldUpdateActivity(fieldLabel, fromText, toText, "stage")

        toast({
          title: "Success",
          description: "Lead updated successfully",
          variant: "default",
        })
      } else {
        throw new Error(result.msg || 'Failed to update field')
      }
    } catch (err: any) {
      setError(err.message)
      toast({
        title: "Error",
        description: "Failed to update lead",
        variant: "destructive",
      })
    }
  }

  // Toggle task completion
  const toggleTaskCompletion = (taskId) => {
    // If the task is already Completed, just toggle it back to incomplete
    const task = taskList.find((t) => t._id === taskId)
    if (task?.Completed) {
      setTaskList(taskList.map((task) => (task._id === taskId ? { ...task, Completed: false } : task)))
      return
    }

    // Otherwise, open the drawer to add notes and set follow-up
    setSelectedTaskId(taskId)
    setCompletionNote("")
    setNextFollowUpDate(undefined)
    setInTime("")
    setOutTime("")
    setSelectedTaskType(task?.new_task_type || null)
    setTaskCompletionDrawerOpen(true)
  }

  // Function to get document icon based on type
  const getDocumentIcon = (type: any) => {
    switch (type) {
      case "pdf":
        return <FilePdf className="h-4 w-4 text-red-500" />
      case "spreadsheet":
        return <FileSpreadsheet className="h-4 w-4 text-green-600" />
      case "image":
        return <ImageIcon className="h-4 w-4 text-primary" />
      case "archive":
        return <FileIcon className="h-4 w-4 text-amber-500" />
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  // Function to get activity icon based on type
  const getActivityIcon = (type: any) => {
    switch (type) {
      case "create":
        return <Plus className="h-4 w-4 text-emerald-600" />
      case "update":
        return <Pencil className="h-4 w-4 text-sky-600" />
      case "delete":
        return <Trash2 className="h-4 w-4 text-rose-600" />
      case "email":
        return <Mail className="h-4 w-4 text-primary" />
      case "document":
        return <FileText className="h-4 w-4 text-cyan-600" />
      case "note":
        return <FileEdit className="h-4 w-4 text-violet-600" />
      case "task":
        return <CheckSquare className="h-4 w-4 text-yellow-600" />
      case "stage":
        return <ChevronRight className="h-4 w-4 text-orange-600" />
      case "lead":
        return <Activity className="h-4 w-4 text-purple-600" />
      case "call":
        return <Phone className="h-4 w-4 text-indigo-600" />
      default:
        return <Activity className="h-4 w-4 text-zinc-500" />
    }
  }
  

  // Function to get activity background color based on type
  const getActivityBgColor = (type: any) => {
    switch (type) {
      case "create":
        return "bg-emerald-100"
      case "update":
        return "bg-sky-100"
      case "delete":
        return "bg-rose-100"
      case "email":
        return "bg-primary/10"
      case "document":
        return "bg-cyan-100"
      case "note":
        return "bg-violet-100"
      case "task":
        return "bg-yellow-100"
      case "stage":
        return "bg-orange-100"
      case "lead":
        return "bg-purple-100"
      case "call":
        return "bg-indigo-100"
      default:
        return "bg-zinc-100"
    }
  }
  

  // Add a function to handle saving notes
  const handleSaveNote = (note: any) => {
    // Here you would typically save the note to your backend or state
    console.log("Note saved:", note)

    // Add the note to the lead's notes array
    const updatedNotes = [note, ...leadData.notes]
    setLeadData((prev) => ({
      ...prev,
      notes: updatedNotes,
    }))

    // Close the drawer
    setNoteDrawerOpen(false)

    // Show a success message or update UI as needed
  }

  // Add a function to handle adding tasks (after the handleSaveNote function)
  const handleAddTask = async (taskData: TaskFormValues) => {
    // Format the date before sending
    const formattedTask = {
      ...taskData,
      date: format(new Date(taskData.date), 'yyyy-MM-dd'),
      time: taskData.time // Ensure time is in HH:mm format
    }
    
    // Refresh the task list
    await fetchLeadDetails()
  }

    // Function to handle edit task
    const handleEditTask = (task) => {
      setSelectedTask(task)
      setShowEditDrawer(true)
    }
  
    // Function to handle task update
    const handleTaskUpdate = (updatedTask: any) => {
      // Refresh the task list or update the local state
      fetchLeadDetails()
    }

  // Handle saving a new contact
  const handleSaveContact = async (contactData: any) => {
    // Create a new contact object with all fields from the API response
    const newContact = {
      _id: contactData._id,
      contact_name: contactData.contact_name || contactData.name,
      designation: contactData.designation || "",
      phone: contactData.phone || "",
      email: contactData.email || "",
      alt_phone: contactData.alt_phone || contactData.alternatePhone || "",
      alt_email: contactData.alt_email || contactData.alternateEmail || "",
      department: contactData.department || "",
      dob: contactData.dob || "",
    }

    // Add the new contact to the contacts list immediately for instant UI update
    setContactsList([...contactsList, newContact])

    // Refresh lead details to ensure everything is in sync with the backend
    await fetchLeadDetails()

    // Show success message (in a real app)
    console.log("Contact added:", newContact)
  }

  // Add a function to handle saving the designation
  const handleSaveDesignation = () => {
    setLeadData((prev) => ({
      ...prev,
      position: editedDesignation,
    }))
    setIsEditingDesignation(false)
  }

    // Function to get task icon based on type
  const getTaskIcon = (type) => {
    switch (type) {
      case "Email":
        return <Mail className="h-4 w-4 text-primary" />
      case "Call":
        return <Phone className="h-4 w-4 text-green-500" />
      case "WhatsApp":
        return <WhatsAppIcon className="h-4 w-4" />
      case "Meeting":
        return <Users className="h-4 w-4 text-purple-500" />
      case "Visit":
        return <MapPin className="h-4 w-4 text-orange-500" />
      default:
        return <CheckSquare className="h-4 w-4 text-muted-foreground" />
    }
  }

  // Add state for custom field editing
  const [editingCustomField, setEditingCustomField] = useState<{
    fieldId: string;
    fieldType: string;
    value: any;
    isMultiSelect?: boolean;
  } | null>(null)

  // Add state for custom field edit values
  const [customFieldEditValue, setCustomFieldEditValue] = useState<any>(null)

  // Add state for editing other fields
  const [editingField, setEditingField] = useState<string | null>(null)
  const [fieldEditValue, setFieldEditValue] = useState<string>("")

  // Helper functions for editing other fields
  const startEditField = (fieldName: string, currentValue: string) => {
    setEditingField(fieldName)
    setFieldEditValue(currentValue)
  }

  const saveFieldEdit = async () => {
    if (editingField && fieldEditValue !== undefined) {
      if (editingField === 'customer_type' || editingField === 'source' || editingField === 'payment' || editingField === 'industry' || editingField === 'application' || editingField === 'purpose') {
        await handleDropdownFieldUpdate(editingField, fieldEditValue)
      } else {
        await handleFieldUpdate(editingField, fieldEditValue)
      }
      setEditingField(null)
      setFieldEditValue("")
    }
  }

  const cancelFieldEdit = () => {
    setEditingField(null)
    setFieldEditValue("")
  }

  if (isPermissionsLoading) {
    return (
      <div className={cn("flex flex-col items-center justify-center min-h-screen gap-3", leadDetailPageBackgroundClassName)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className={leadDetailBodyMutedClassName}>Loading...</p>
      </div>
    )
  }

  if (!canViewLeads) {
    return (
      <div className={cn("flex flex-1 items-center justify-center p-4", leadDetailPageBackgroundClassName)}>
        <Card className="w-full max-w-md border-none shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Shield className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Access restricted</p>
              <p className="text-sm text-muted-foreground">
                You don&apos;t have permission to view leads. Ask an admin to enable the Lead permission for your role.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={cn("flex flex-col items-center justify-center min-h-screen gap-3", leadDetailPageBackgroundClassName)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className={leadDetailBodyMutedClassName}>Loading lead details...</p>
      </div>
    )
  }

  if (error && !leadData._id) {
    return (
      <div className={cn("flex flex-col items-center justify-center min-h-screen gap-4 px-4", leadDetailPageBackgroundClassName)}>
        <p className="text-sm text-destructive text-center">{error}</p>
        <Button
          variant="outline"
          onClick={() => {
            setLoading(true)
            setError(null)
            fetchLeadDetails()
          }}
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-1 flex-col overflow-hidden",
        leadDetailPageBackgroundClassName,
      )}
    >
      <div className={cn(leadDetailHeaderClassName, "shrink-0 px-3 py-4 sm:px-4 lg:px-8 lg:py-5 w-full")}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4 w-full">
              <Avatar className="h-14 w-14 sm:h-16 sm:w-16 lg:h-[72px] lg:w-[72px] bg-primary/10 text-primary text-xl sm:text-2xl font-bold rounded-full shrink-0">
                <div className="flex items-center justify-center h-full w-full">
                  {(leadData.name || "L").charAt(0).toUpperCase()}
                </div>
              </Avatar>

              <div className="flex flex-1 min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {leadData.lead_no ? (
                      <Badge className="bg-primary hover:bg-primary text-primary-foreground border-0 rounded-md px-2 py-0.5 text-xs font-semibold">
                        {leadData.lead_no}
                      </Badge>
                    ) : null}
                    <DateAgeingBadge
                      ageingValue={leadData.date_aging}
                      date={leadData.create_date}
                      variant="days"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 mb-2">
                    <EditableTitle
                      value={leadData.name}
                      onSave={(value) => handleFieldUpdate("name", value)}
                      canEdit={canEditLead}
                      className={leadDetailPageTitleClassName}
                    />
                    <div className="flex items-center gap-1.5">
                      {[
                        {
                          icon: Phone,
                          label: "Call",
                          iconClassName: "text-green-500",
                          onClick: () =>
                            leadData.phone &&
                            (window.location.href = `tel:${String(leadData.phone).replace(/\D/g, "")}`),
                          disabled: !leadData.phone,
                        },
                        {
                          icon: WhatsAppIcon,
                          label: "WhatsApp",
                          iconClassName: "text-emerald-600",
                          onClick: () => {
                            if (leadData.phone) {
                              window.open(
                                `https://wa.me/${String(leadData.phone).replace(/\D/g, "")}`,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                          },
                          disabled: !leadData.phone,
                        },
                        {
                          icon: Mail,
                          label: "Email",
                          iconClassName: "text-blue-500",
                          onClick: () => handleEmailClick(),
                          disabled: false,
                        },
                        {
                          icon: CheckSquare,
                          label: "Task",
                          iconClassName: "text-amber-500",
                          onClick: () => setIsTaskSheetOpen(true),
                          disabled: false,
                        },
                        {
                          icon: UserPlus,
                          label: "Add Contact",
                          iconClassName: "text-indigo-500",
                          onClick: () => setContactSheetOpen(true),
                          disabled: !canEditLead,
                        },
                      ].map((action) => (
                        <TooltipProvider key={action.label}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                disabled={action.disabled}
                                className={leadDetailActionButtonClassName}
                                onClick={action.onClick}
                              >
                                <action.icon className={cn("h-3.5 w-3.5", action.iconClassName)} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{action.label}</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </div>
                  <div className="relative mb-1 max-w-full">
                    <p className={leadDetailMetaTextClassName}>
                      Company{" "}
                      <button
                        ref={companyNameRef}
                        type="button"
                        onClick={handleCompanyEditClick}
                        className="font-medium text-primary hover:underline"
                      >
                        {companyDisplayName || "—"}
                      </button>
                    </p>
                    {isCompanyEditOpen ? (
                      <div
                        ref={companyEditRef}
                        className={cn(leadDetailPopoverClassName, "absolute left-0 top-full z-20 mt-2 w-[min(100vw-2rem,16rem)] sm:w-64")}
                      >
                        <Label htmlFor="company-name-edit" className={formModalLabelClassName}>
                          Company Name
                        </Label>
                        <Input
                          id="company-name-edit"
                          value={editedCompanyName}
                          onChange={(e) => setEditedCompanyName(e.target.value)}
                          className={cn(formInputClassName, "mt-1.5")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveCompanyName()
                            if (e.key === "Escape") setIsCompanyEditOpen(false)
                          }}
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-sm"
                            onClick={() => setIsCompanyEditOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button size="sm" className="h-8 text-sm" onClick={handleSaveCompanyName}>
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <p className={leadDetailMetaTextClassName}>
                    Created By{" "}
                    <span className="font-medium text-primary">{leadCreatorName}</span>{" "}
                    On{" "}
                    <span className="font-medium text-primary">
                      {formatLeadHeaderDateTime(leadData.create_date, leadData.create_time)}
                    </span>
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-4 shrink-0 lg:pt-1">
                  <div className="flex items-center gap-2">
                    <User className="hidden sm:block h-4 w-4 shrink-0 text-slate-400" />
                    <span className={cn(leadDetailMetaLabelClassName, "shrink-0 sm:whitespace-nowrap")}>Assigned To:</span>
                    <LeadDetailFieldDropdown
                      currentValue={leadData.assigned_to}
                      fallbackLabel={leadData.assigned}
                      placeholder="Select user"
                      options={assignedToOptions}
                      onChange={(value) => handleDropdownFieldUpdate("assigned_to", value)}
                      fallbackColor={ASSIGNED_TO_COLOR}
                      align="end"
                      variant="solid"
                      readOnly={!canEditLead}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(leadDetailMetaLabelClassName, "shrink-0 sm:whitespace-nowrap")}>Status:</span>
                    <LeadDetailFieldDropdown
                      currentValue={leadData.lead_status}
                      fallbackLabel={leadData.lead_status_name}
                      placeholder="Select status"
                      options={leadStatusOptions}
                      onChange={(value) => handleDropdownFieldUpdate("lead_status", value)}
                      fallbackColor={leadData.lead_status_color || "#003399"}
                      align="end"
                      variant="soft"
                      readOnly={!canEditLead}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(leadDetailMetaLabelClassName, "shrink-0 sm:whitespace-nowrap")}>Stage:</span>
                    <LeadDetailFieldDropdown
                      currentValue={leadStageValue}
                      fallbackLabel={leadStageValue}
                      placeholder="Select stage"
                      options={leadStageOptions}
                      onChange={handleStageUpdate}
                      fallbackColor={
                        getLeadDetailDropdownOption(leadStageOptions, leadStageValue)?.color ||
                        "#64748b"
                      }
                      align="end"
                      variant="soft"
                      readOnly={!canEditLead}
                    />
                  </div>
                </div>
              </div>
            </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto xl:overflow-hidden">
        <div
          className={cn(
            "flex flex-col gap-4 p-3 sm:gap-5 sm:p-4 lg:p-6 xl:min-h-0 xl:flex-1 xl:flex-row xl:overflow-hidden",
            leadDetailContentAreaClassName,
          )}
        >
          <aside
            ref={contactInfoRef}
            className="order-2 w-full space-y-4 xl:order-1 xl:w-[300px] xl:shrink-0 xl:overflow-y-auto custom-scrollbar"
          >
              <Card className={leadDetailCardClassName}>
                <CardContent className="p-5">
                  <h3 className={cn(leadDetailSectionTitleClassName, "mb-1")}>Customer Info</h3>
                  <div>
                    <EditableField variant="detail" icon={Building} field="current_staying" value={leadData.current_staying} label="Current Staying" onSave={handleFieldUpdate} canEdit={canEditLead} />
                    <EditableField
                      variant="detail"
                      icon={Users}
                      field="customer_type"
                      value={leadData.customer_type}
                      label="Customer Type"
                      onSave={handleDropdownFieldUpdate}
                      options={leadSettings.customerTypes.map((t) => ({ label: t.name, value: t._id }))}
                      canEdit={canEditLead}
                    />
                    <EditableField
                      variant="detail"
                      icon={FileText}
                      field="customer_requirement"
                      value={leadData.customer_requirement}
                      label="Interested In"
                      onSave={handleDropdownFieldUpdate}
                      isMultiSelect
                      options={leadSettings.customerRequirements.map((item) => ({
                        label: item.name,
                        value: item._id,
                      }))}
                      canEdit={canEditLead}
                    />
                    <EditableField
                      variant="detail"
                      icon={MessageSquare}
                      field="description"
                      value={leadData.description}
                      label="Description"
                      isTextarea={true}
                      onSave={handleFieldUpdate}
                      canEdit={canEditLead}
                    />
                    <EditableField variant="detail" icon={MapPin} field="location" value={leadData.location} label="Preferred Location" onSave={handleFieldUpdate} canEdit={canEditLead} />
                    <EditableField
                      variant="detail"
                      icon={Phone}
                      field="phone"
                      value={leadData.phone}
                      label="Mobile Number"
                      type="phone"
                      onSave={handleFieldUpdate}
                      canEdit={canEditLead}
                      actions={
                        leadData.phone ? (
                          <div className="flex items-center gap-1.5">
                            <a href={`tel:${String(leadData.phone).replace(/\D/g, "")}`} className="text-primary hover:text-primary/80">
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                            <a
                              href={`https://wa.me/${String(leadData.phone).replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:text-emerald-700"
                            >
                              <WhatsAppIcon className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        ) : null
                      }
                    />
                    <EditableField variant="detail" icon={Phone} field="alternate_phone" value={leadData.alternate_phone} label="Alt Mobile No" type="phone" onSave={handleFieldUpdate} canEdit={canEditLead} />
                    <EditableField
                      variant="detail"
                      icon={Tag}
                      field="source"
                      value={resolvedSourceValue}
                      label="Source"
                      onSave={handleDropdownFieldUpdate}
                      options={sourceOptions}
                      canEdit={canEditLead}
                    />
                    <EditableField variant="detail" icon={Mail} field="email" value={leadData.email} label="Email" onSave={handleFieldUpdate} canEdit={canEditLead} />
                  </div>
                </CardContent>
              </Card>

              <Card className={leadDetailCardClassName}>
                <CardContent className="p-0">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-5 py-4 text-left"
                    onClick={() => setShowMoreDetails((prev) => !prev)}
                  >
                    <h3 className={leadDetailSectionTitleClassName}>More info & Qualify 
                    </h3>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-slate-500 transition-transform",
                        showMoreDetails && "rotate-180",
                      )}
                    />
                  </button>
                  {showMoreDetails ? (
                    <div className="border-t border-border px-5 pb-5 pt-4">
                      <div>
                        <p className={cn("mb-1", leadDetailSubsectionLabelClassName)}>
                          More Info
                        </p>
                        <EditableField variant="detail" icon={Tag} field="budget" value={leadData.budget} label="Budget" onSave={handleFieldUpdate} canEdit={canEditLead} />
                        <EditableField variant="detail" icon={Clock} field="timeline" value={leadData.timeline} label="Timeline" onSave={handleFieldUpdate} canEdit={canEditLead} />
                        <EditableField
                          variant="detail"
                          icon={Briefcase}
                          field="payment"
                          value={resolvedPaymentValue}
                          label="Payment"
                          onSave={handleDropdownFieldUpdate}
                          options={paymentOptions}
                          canEdit={canEditLead}
                        />
                        <EditableField variant="detail" icon={Calendar} field="dob" value={leadData.dob} label="DOB" type="dob" onSave={handleFieldUpdate} canEdit={canEditLead} />
                        <EditableField variant="detail" icon={FileText} field="sod" value={leadData.sod} label="SOD" onSave={handleFieldUpdate} canEdit={canEditLead} />
                      </div>
                      <div className="mt-4 border-t border-border pt-4">
                        <p className={cn("mb-1", leadDetailSubsectionLabelClassName)}>
                          Qualify
                        </p>
                        <EditableField variant="detail" icon={UserPlus} field="referred_by" value={leadData.referred_by} label="Referred By" onSave={handleFieldUpdate} canEdit={canEditLead} />
                        <EditableField variant="detail" icon={Phone} field="referred_mobile_no" value={leadData.referred_mobile_no} label="Referred Mobile No" type="phone" onSave={handleFieldUpdate} canEdit={canEditLead} />
                        <EditableField
                          variant="detail"
                          icon={Target}
                          field="purpose"
                          value={purposeValue}
                          label="Purpose"
                          onSave={
                            purposeFieldType.includes("dropdown") && purposeOptions.length > 0
                              ? (_field, value) => handlePurposeUpdate(value)
                              : handleFieldUpdate
                          }
                          options={
                            purposeFieldType.includes("dropdown") && purposeOptions.length > 0
                              ? purposeOptions.map((item) => ({
                                  label: item.label,
                                  value: item.value,
                                }))
                              : undefined
                          }
                          canEdit={canEditLead}
                        />
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className={leadDetailCardClassName}>
                <CardContent className="p-5">
                  <h3 className={cn(leadDetailSectionTitleClassName, "mb-1")}>Address</h3>
                  <div>
                    <EditableField variant="detail" icon={MapPin} field="address1" value={leadData.address1} label="Address Line 1" onSave={handleFieldUpdate} canEdit={canEditLead} />
                    <EditableField variant="detail" icon={MapPin} field="address2" value={leadData.address2} label="Address Line 2" onSave={handleFieldUpdate} canEdit={canEditLead} />
                    <EditableField variant="detail" icon={Globe} field="country" value={leadData.country} label="Country" onSave={handleFieldUpdate} canEdit={canEditLead} />
                    <EditableField variant="detail" icon={MapPin} field="state" value={leadData.state} label="State" onSave={handleFieldUpdate} canEdit={canEditLead} />
                    <EditableField variant="detail" icon={Building} field="city" value={leadData.city} label="City" onSave={handleFieldUpdate} canEdit={canEditLead} />
                    <EditableField variant="detail" icon={Hash} field="pincode" value={leadData.pincode} label="Pincode" type="pincode" onSave={handleFieldUpdate} canEdit={canEditLead} />
                  </div>
                </CardContent>
              </Card>


          </aside>

            <div className="order-1 min-w-0 w-full xl:order-2 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col xl:overflow-hidden">
              <Card className={cn(leadDetailCardClassName, "flex min-h-[min(480px,calc(100vh-16rem))] flex-col overflow-hidden xl:min-h-0 xl:flex-1")}>
              <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
                <div className={cn(leadDetailTabBarClassName, "shrink-0 px-2")}>
                  <div className="overflow-x-auto px-4 [-webkit-overflow-scrolling:touch]">
                    <TabsList className="flex h-auto w-max min-w-full justify-start gap-0.5 border-b-0 bg-transparent p-0 sm:gap-1">
                      <TabsTrigger
                        value="overview"
                        className="shrink-0 rounded-none border-b-2 border-transparent px-3 py-3 text-xs font-medium text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none sm:px-4 sm:py-3.5 sm:text-sm"
                      >
                        Activity
                      </TabsTrigger>
                      <TabsTrigger
                        value="notes"
                        className="shrink-0 rounded-none border-b-2 border-transparent px-3 py-3 text-xs font-medium text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none sm:px-4 sm:py-3.5 sm:text-sm"
                      >
                        Notes ({activityData.notes.length})
                      </TabsTrigger>
                      <TabsTrigger
                        value="tasks"
                        className="shrink-0 rounded-none border-b-2 border-transparent px-3 py-3 text-xs font-medium text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none sm:px-4 sm:py-3.5 sm:text-sm"
                      >
                        Tasks ({taskList.length})
                      </TabsTrigger>
                      <TabsTrigger
                        value="emails"
                        className="shrink-0 rounded-none border-b-2 border-transparent px-3 py-3 text-xs font-medium text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none sm:px-4 sm:py-3.5 sm:text-sm"
                      >
                        Emails ({activityData.email.length})
                      </TabsTrigger>
                      <TabsTrigger
                        value="documents"
                        className="shrink-0 rounded-none border-b-2 border-transparent px-3 py-3 text-xs font-medium text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none sm:px-4 sm:py-3.5 sm:text-sm"
                        disabled={!canViewLeadDocuments}
                      >
                        Documents ({activityData.document.length})
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-3 sm:p-5 lg:p-6">
                  <TabsContent value="overview" className="m-0">

                                        {/* Not Qualified Details Section */}
                                        {isNotQualified && leadData.not_qualified_reason && (
                      <div className="mb-6 rounded-lg border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-5 dark:border-red-900/50 dark:from-red-950/40 dark:to-rose-950/40">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/60">
                            <ThumbsDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </div>
                          <h3 className={cn(leadDetailSectionTitleClassName, "text-red-900 dark:text-red-300")}>Lead Not Qualified Details</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Left Column */}
                          <div className="space-y-4">
                            <div>
                              <p className="mb-1 text-xs font-medium text-red-700 dark:text-red-400">Not Qualified Reason</p>
                              <p className={leadDetailFieldValueClassName}>{leadData.not_qualified_reason}</p>
                            </div>

                            {leadData.not_qualified_note && (
                              <div>
                                <p className="mb-1 text-xs font-medium text-red-700 dark:text-red-400">Notes</p>
                                <p className={cn(leadDetailBodyClassName, "whitespace-pre-wrap")}>{leadData.not_qualified_note}</p>
                              </div>
                            )}
                          </div>

                          {/* Right Column */}
                          <div className="space-y-4">
                            {leadData.not_qualified_date && (
                              <div>
                                <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Not Qualified Date</p>
                                <p className={leadDetailFieldValueClassName}>
                                  {(() => {
                                    try {
                                      // Handle DD/MM/YYYY format
                                      if (leadData.not_qualified_date.includes('/')) {
                                        const [day, month, year] = leadData.not_qualified_date.split('/')
                                        const date = new Date(`${year}-${month}-${day}`)
                                        if (isNaN(date.getTime())) {
                                          return leadData.not_qualified_date
                                        }
                                        return format(date, "MMM dd, yyyy")
                                      } else {
                                        const date = new Date(leadData.not_qualified_date)
                                        if (isNaN(date.getTime())) {
                                          return leadData.not_qualified_date
                                        }
                                        return format(date, "MMM dd, yyyy")
                                      }
                                    } catch {
                                      return leadData.not_qualified_date
                                    }
                                  })()}
                                </p>
                              </div>
                            )}
                            {leadData.not_qualified_time && (
                              <div>
                                <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Not Qualified Time</p>
                                <p className={leadDetailFieldValueClassName}>{leadData.not_qualified_time}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    


                    <div className="relative">
                      <h2 className={cn(leadDetailSectionTitleClassName, "mb-4")}>Activity Timeline</h2>
                      {activityLoading && recentActivities.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : recentActivities.length === 0 ? (
                        <p className={cn(leadDetailBodyMutedClassName, "py-4")}>No activity recorded yet.</p>
                      ) : (
                        <>
                          <div className={cn("absolute left-3 top-8 bottom-0 w-0.5", leadDetailTimelineLineClassName)} />
                          <div className="space-y-4">
                            {displayedActivities.map((activity, index) => (
                              <div key={activity._id ?? index} className="relative flex items-start">
                                <div
                                  className={`h-7 w-7 rounded-full flex items-center justify-center z-10 mr-3 shrink-0 ${getActivityBgColor(
                                    activity.category_name,
                                  )}`}
                                >
                                  {getActivityIcon(activity.category_name)}
                                </div>
                                <div className={leadDetailActivityCardClassName}>
                                  <p className={cn(leadDetailFieldValueClassName, "mb-1 capitalize")}>
                                    {String(activity.category_name || "activity").replace(/_/g, " ")}
                                  </p>
                                  <p className={cn(leadDetailBodyClassName, "break-words leading-relaxed")}>{activity.text_info}</p>
                                  <div className="flex flex-col gap-1 mt-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                                    {activity.createBy ? (
                                      <div className={cn("flex items-center", leadDetailCaptionClassName)}>
                                        <User className="h-3 w-3 mr-1" />
                                        <span>{activity.createBy}</span>
                                      </div>
                                    ) : (
                                      <span />
                                    )}
                                    <span className={cn(leadDetailCaptionClassName, "shrink-0 sm:whitespace-nowrap")}>
                                      {activity.create_date} • {activity.create_time}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {recentActivities.length > activityDisplayLimit ? (
                            <div className="flex justify-center mt-6">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-border text-foreground/90"
                                onClick={() => setActivityDisplayLimit((prev) => prev + 5)}
                              >
                                Load More Activities
                              </Button>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="tasks" className="m-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                      <h2 className={leadDetailSectionTitleClassName}>Tasks</h2>
                      <Button size="sm" className="h-8" onClick={() => setIsTaskSheetOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Task
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {taskList.map((task) => (
                        <Card key={task._id} className={`${task.status === "Completed" ? "opacity-70" : ""}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="mt-1">
                                <div
                                  className={`h-5 w-5 rounded-full border flex items-center justify-center ${task.status === "Completed" ? "bg-green-500 border-green-500" : "border-border hover:border-muted-foreground cursor-pointer"}`}
                                  onClick={() => task.status !== "Completed" && toggleTaskCompletion(task._id)}
                                >
                                  {task.status === "Completed" && <Check className="h-3 w-3 text-white" />}
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <div className="flex-shrink-0">{getTaskIcon(task.new_task_type)}</div>
                                    <h3
                                      className={cn(
                                        leadDetailFieldValueClassName,
                                        "break-words",
                                        task.status === "Completed" && "line-through text-slate-500",
                                      )}
                                    >
                                      {task.description}
                                    </h3>
                                  </div>
                                  {task.status === "Open" && (
                                   <Button
                                      variant="outline"
                                      size="sm" className="h-8 w-full shrink-0 sm:w-auto"
                                      onClick={() => handleEditTask(task)}
                                    >
                                      Edit
                                    </Button>
                                    )}
                                </div>
                                {task.status === "Completed" && (
                                  <div className={cn("mt-2", leadDetailCaptionClassName)}>
                                    {task.lead_notes && <p className="italic">{task.lead_notes}</p>}
                                    {task.new_task_type === "Visit" && (
                                      <p className={cn("mt-1", leadDetailCaptionClassName)}>
                                        {task.in_time && `In: ${task.in_time}`}
                                        {task.in_time && task.out_time && " • "}
                                        {task.out_time && `Out: ${task.out_time}`}
                                      </p>
                                    )}
                                  </div>
                                )}
                                <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 mt-2", leadDetailCaptionClassName)}>
                                  <span className="inline-flex items-center">
                                    <CalendarIcon className="h-3 w-3 mr-1" />
                                    Due: {task.date}
                                  </span>
                                  <span className="hidden sm:inline">•</span>
                                  <span className="inline-flex items-center">
                                    <User className="h-3 w-3 mr-1" />
                                    {task.assigned}
                                  </span>
                                  <span className="hidden sm:inline">•</span>
                                  <span>{task.new_task_type}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="m-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                      <h2 className={leadDetailSectionTitleClassName}>Notes</h2>
                      <Button size="sm" className="h-8" onClick={handleOpenAddNote}>
                        <FileEdit className="h-4 w-4 mr-2" />
                        Add Note
                      </Button>
                    </div>
                    <div className="space-y-6">
                      {activityLoading && activityData.notes.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : activityData.notes.length === 0 ? (
                        <p className={cn(leadDetailBodyMutedClassName, "py-4")}>No notes yet.</p>
                      ) : (
                        activityData.notes.map((note, index) => (
                          <Card key={note._id ?? index}>
                            <CardContent className="p-4">
                              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start mb-2">
                                <div className={cn("flex items-center gap-2", leadDetailFieldValueClassName, "text-primary")}>
                                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary">
                                    <User className="h-3.5 w-3.5" />
                                  </span>
                                  {note.createBy}
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                  <p className={leadDetailCaptionClassName}>
                                    {note.create_date} {note.create_time && `• ${note.create_time}`}
                                  </p>
                                  <Button
                                    size="sm"
                                    className="h-8 w-full sm:w-auto"
                                    onClick={() => handleEditNote(note)}
                                  >
                                    <FileEdit className="h-4 w-4 mr-2" />
                                    Edit
                                  </Button>
                                </div>
                              </div>
                              <p className={cn(leadDetailBodyClassName, "whitespace-pre-wrap")}>{note.note}</p>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="emails" className="m-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                      <h2 className={leadDetailSectionTitleClassName}>Emails</h2>
                      <Button size="sm" className="h-8" onClick={() => handleEmailClick()}>
                        <Send className="h-4 w-4 mr-1" />
                        Compose Email
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {activityLoading && activityData.email.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : activityData.email.length === 0 ? (
                        <p className={cn(leadDetailBodyMutedClassName, "py-4")}>No emails yet.</p>
                      ) : (
                        activityData.email.map((email, index) => (
                          <Card key={email._id ?? index} className={email.read ? "" : "border-l-4 border-l-blue-500"}>
                            {!email.read && (
                              <div className="absolute top-2 right-2">
                                <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                                  Unread
                                </Badge>
                              </div>
                            )}
                            <CardContent className="p-4">
                              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-start">
                                <h3 className={cn(leadDetailFieldValueClassName, "break-words pr-2")}>{email.subject}</h3>
                                <span className={cn(leadDetailCaptionClassName, "shrink-0")}>
                                  {email.create_date} • {email.create_time}
                                </span>
                              </div>
                              <div className={cn("flex flex-wrap items-center gap-x-1 gap-y-0.5 mt-1", leadDetailCaptionClassName)}>
                                <span className="font-medium">To:</span>
                                <span className="ml-1">{email.to}</span>
                                {email.cc && (
                                  <>
                                    <span className="mx-1">•</span>
                                    <span className="font-medium">CC:</span>
                                    <span className="ml-1">{email.cc}</span>
                                  </>
                                )}
                              </div>
                              <div className="flex flex-col gap-2 mt-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className={cn("flex items-center", leadDetailCaptionClassName)}>
                                  <User className="h-3 w-3 mr-1" />
                                  <span>Sent by {email.createBy}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button variant="ghost" size="sm" className="h-8 px-2 text-sm"
                                  onClick={() => handleViewEmail(email)}>
                                    <FileText className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="m-0">
                    {!canViewLeadDocuments ? (
                      <p className={cn(leadDetailBodyMutedClassName, "py-4")}>
                        You don&apos;t have permission to view documents.
                      </p>
                    ) : (
                      <>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className={leadDetailSectionTitleClassName}>Documents</h2>
                      {canAddLeadDocument ? (
                      <Button
                        size="sm"
                        className="h-8 gap-2"
                        onClick={() => {
                          const input = document.createElement('input')
                          input.type = 'file'
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0]
                            if (file) {
                              handleDocumentUpload(file)
                            }
                          }
                          input.click()
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Upload Document
                      </Button>
                      ) : null}
                    </div>

                    {canAddLeadDocument ? (
                    <Card className="mb-6">
                      <CardContent className="p-6">
                      <div
                        className={`border-2 border-dashed rounded-lg p-4 ${
                          isDragging ? 'border-primary bg-primary/10' : 'border-border'
                        }`}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      >
                        <div className="text-center">
                          <p className={leadDetailBodyClassName}>
                            Drag and drop files here or
                            <Button
                              variant="link"
                              className="px-1"
                              onClick={() => {
                                const input = document.createElement('input')
                                input.type = 'file'
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0]
                                  if (file) {
                                    handleDocumentUpload(file)
                                  }
                                }
                                input.click()
                              }}
                            >
                              browse
                            </Button>
                          </p>
                        </div>
                      </div>
                      </CardContent>
                    </Card>
                    ) : null}

                    <h3 className={cn(leadDetailSectionTitleClassName, "mb-4")}>Shared Documents</h3>
                    <div className="space-y-3">
                      {activityLoading && activityData.document.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : activityData.document.length === 0 ? (
                        <p className={cn(leadDetailBodyMutedClassName, "py-4")}>No documents uploaded yet.</p>
                      ) : (
                        activityData.document.map((doc) => (
                          <Card key={doc._id ?? doc.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start">
                                <div className="mr-3 mt-1">{getDocumentIcon(doc.type)}</div>
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <h4 className={leadDetailFieldValueClassName}>{doc.user_file_name}</h4>
                                    <span className={leadDetailCaptionClassName}>{doc.size}</span>
                                  </div>
                                  <div className={cn("flex items-center mt-1", leadDetailCaptionClassName)}>
                                    <User className="h-3 w-3 mr-1" />
                                    <span>Uploaded by {doc.createBy}</span>
                                    <span className="mx-1">•</span>
                                    <Calendar className="h-3 w-3 mr-1" />
                                    <span>{doc.create_date}</span>
                                    {doc.shared && (
                                      <>
                                        <span className="mx-1">•</span>
                                        <Badge
                                          variant="outline"
                                          className="text-xs h-5 px-1.5 border-green-200 text-green-700"
                                        >
                                          Shared
                                        </Badge>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-1 ml-2">
                                  {canDeleteLeadDocument ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() =>
                                      setDocumentToDelete({
                                        id: getDocumentId(doc),
                                        name: doc.user_file_name,
                                      })
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                  ) : null}
                                  {canDownloadLeadDocument ? (
                                  <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={!doc.document}
                                    title="Download document"
                                    onClick={() =>
                                      void handleDocumentDownload(doc.document, doc.user_file_name)
                                    }
                                  >
                                    <Download className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={!doc.document}
                                    title="Open in new tab"
                                    onClick={() => handleDocumentOpenNewTab(doc.document)}
                                  >
                                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                  </>
                                  ) : null}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                      </>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
              </Card>
            </div>

            <aside className="order-3 w-full space-y-4 xl:w-[280px] xl:shrink-0 xl:overflow-y-auto custom-scrollbar">
              <SuggestedProjectsCard
                leadId={leadId ?? ""}
                selectedProjectIds={leadData.suggested_projects ?? []}
                onSelectedProjectIdsChange={(projectIds) =>
                  setLeadData((prev) => ({ ...prev, suggested_projects: projectIds }))
                }
                canEdit={canEditLead}
              />

              <Card className={leadDetailCardClassName}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={leadDetailSectionTitleClassName}>Additional Contacts</h3>
                    {canEditLead ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-sm font-semibold text-primary"
                      onClick={() => setContactSheetOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add
                    </Button>
                    ) : null}
                  </div>

                  {contactsList.length === 0 ? (
                    <p className={cn(leadDetailBodyMutedClassName, "pt-2")}>No additional contacts yet.</p>
                  ) : (
                    <div>
                      {contactsList.map((contact: any, index: number) => {
                        const altPhone = contact.alt_phone || contact.alternate_phone

                        return (
                          <div
                            key={contact._id || index}
                            className={cn(index > 0 && "mt-4 border-t border-border pt-4")}
                          >
                            <div className="group">
                              <ContactDetailRow
                                icon={User}
                                label="Contact Name"
                                value={contact.contact_name}
                                trailing={
                                  canEditLead ? (
                                  <div className="flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-slate-400 hover:text-slate-700"
                                      onClick={() => handleEditContact(index)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-red-500 hover:text-red-600"
                                      onClick={() =>
                                        handleDeleteContact(contact._id, contact.contact_name)
                                      }
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                  ) : undefined
                                }
                              />
                            </div>
                            {contact.designation ? (
                              <ContactDetailRow
                                icon={Briefcase}
                                label="Designation"
                                value={contact.designation}
                              />
                            ) : null}
                            {contact.department ? (
                              <ContactDetailRow icon={Building} label="Department" value={contact.department} />
                            ) : null}
                            {contact.dob ? (
                              <ContactDetailRow
                                icon={Calendar}
                                label="Date of Birth"
                                value={formatContactDateOfBirth(contact.dob)}
                              />
                            ) : null}
                            <ContactDetailRow
                              icon={Phone}
                              label="Mobile Number"
                              value={contact.phone}
                              actions={
                                contact.phone ? (
                                  <div className="flex items-center gap-1.5">
                                    <a
                                      href={`tel:${contact.phone.replace(/\D/g, "")}`}
                                      className="text-primary hover:text-primary/80"
                                    >
                                      <Phone className="h-3.5 w-3.5" />
                                    </a>
                                    <a
                                      href={`https://wa.me/${contact.phone.replace(/\D/g, "")}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-emerald-600 hover:text-emerald-700"
                                    >
                                      <WhatsAppIcon className="h-3.5 w-3.5" />
                                    </a>
                                  </div>
                                ) : null
                              }
                            />
                            {altPhone ? (
                              <ContactDetailRow
                                icon={Phone}
                                label="Alt Mobile No"
                                value={altPhone}
                                actions={
                                  <div className="flex items-center gap-1.5">
                                    <a
                                      href={`tel:${altPhone.replace(/\D/g, "")}`}
                                      className="text-primary hover:text-primary/80"
                                    >
                                      <Phone className="h-3.5 w-3.5" />
                                    </a>
                                    <a
                                      href={`https://wa.me/${altPhone.replace(/\D/g, "")}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-emerald-600 hover:text-emerald-700"
                                    >
                                      <WhatsAppIcon className="h-3.5 w-3.5" />
                                    </a>
                                  </div>
                                }
                              />
                            ) : null}
                            <ContactDetailRow
                              icon={Mail}
                              label="Email"
                              value={contact.email}
                              actions={
                                contact.email ? (
                                  <button
                                    type="button"
                                    className="text-primary hover:text-primary/80"
                                    onClick={() =>
                                      handleEmailClick({
                                        _id: contact._id,
                                        contact_name: contact.contact_name,
                                        email: contact.email,
                                        associate_to: "lead",
                                      })
                                    }
                                  >
                                    <Mail className="h-3.5 w-3.5" />
                                  </button>
                                ) : null
                              }
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className={leadDetailCardClassName}>
                <CardContent className="p-5">
                  <h3 className={cn(leadDetailSectionTitleClassName, "mb-4")}>Matching Projects</h3>
                  <div className="space-y-2">
                    {isLoadingSuggestedProjects ? (
                      <div className={cn(leadDetailDashedEmptyClassName, "flex items-center justify-center gap-2")}>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading projects...
                      </div>
                    ) : suggestedProjects.length === 0 ? (
                      <p className={cn(leadDetailBodyMutedClassName, leadDetailDashedEmptyClassName)}>
                        No matching projects found.
                      </p>
                    ) : (
                      suggestedProjects.map((project) => (
                        <div
                          key={project._id}
                          className={leadDetailListItemClassName}
                        >
                          <div className={leadDetailIconBoxSmClassName}>
                            <Building className="h-4 w-4" />
                          </div>
                          <span className="text-base font-semibold uppercase tracking-wide text-foreground">
                            {project.name}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

            </aside>
          </div>
      </div>

      {/* Not Qualified Dialog */}
      <Dialog open={showNotQualifiedDialog} onOpenChange={(open) => {
        setShowNotQualifiedDialog(open)
        if (!open) {
          setNotQualifiedNotes("")
          setSelectedNotQualifiedReason("")
          // If dialog was opened from status dropdown and user cancels, revert the status
          if (pendingStatusUpdate) {
            const previousStatus = leadSettings.leadStatuses.find((status: any) => status._id === pendingStatusUpdate.previousStatusId)
            setLeadData((prev) => ({
              ...prev,
              lead_status: pendingStatusUpdate.previousStatusId,
              lead_status_name: previousStatus?.name || prev.lead_status_name,
              lead_status_color: previousStatus?.color || prev.lead_status_color
            }))
            setPendingStatusUpdate(null)
          }
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Lead as Not Qualified</DialogTitle>
            <DialogDescription>Please provide a reason for marking this lead as Not Qualified.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="not-qualified-reason" className={formModalLabelClassName}>
                Not Qualified Reason *
              </Label>
              <Select
                value={selectedNotQualifiedReason}
                onValueChange={setSelectedNotQualifiedReason}
              >
                <SelectTrigger id="not-qualified-reason" size="form" className={formSelectTriggerClassName}>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {leadSettings.notQualifiedReasons.map((reason: any) => (
                    <SelectItem key={reason.id} value={reason.id}>
                      {reason.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="not-qualified-notes" className={formModalLabelClassName}>
                Notes *
              </Label>
              <Textarea
                id="not-qualified-notes"
                placeholder="Enter additional notes for marking as Not Qualified..."
                value={notQualifiedNotes}
                onChange={(e) => setNotQualifiedNotes(e.target.value)}
                className={cn(formTextareaClassName, "min-h-[120px]")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNotQualifiedDialog(false)
              setNotQualifiedNotes("")
              setSelectedNotQualifiedReason("")
              // If dialog was opened from status dropdown and user cancels, revert the status
              if (pendingStatusUpdate) {
                const previousStatus = leadSettings.leadStatuses.find((status: any) => status._id === pendingStatusUpdate.previousStatusId)
                setLeadData((prev) => ({
                  ...prev,
                  lead_status: pendingStatusUpdate.previousStatusId,
                  lead_status_name: previousStatus?.name || prev.lead_status_name,
                  lead_status_color: previousStatus?.color || prev.lead_status_color
                }))
                setPendingStatusUpdate(null)
              }
            }}>
              Cancel
            </Button>
            <Button className="bg-destructive text-white hover:bg-destructive/90" onClick={handleNotQualified}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

            {/* Task Completion Drawer */}
            <Sheet open={taskCompletionDrawerOpen} onOpenChange={setTaskCompletionDrawerOpen}>
        <SheetContent side="right" className={sheetFormContentClassName}>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <SheetHeader className={formModalHeaderClassName}>
              <SheetTitle className="text-lg font-semibold tracking-tight">Complete Task</SheetTitle>
              <SheetDescription>Add notes before completing this task</SheetDescription>
            </SheetHeader>

            <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
              {selectedTaskType === "Visit" && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className={formModalFieldGroupClassName}>
                      <Label htmlFor="in-time" className={formModalLabelClassName}>
                        In Time <span className="text-destructive">*</span>
                      </Label>
                      <Select value={inTime} onValueChange={setInTime}>
                        <SelectTrigger id="in-time" size="form" className={formSelectTriggerClassName}>
                          <SelectValue placeholder="Select in time" />
                        </SelectTrigger>
                        <FormSelectContent>
                          {VISIT_TIME_OPTIONS.map((option) => (
                            <FormSelectItem key={`in-${option.value}`} value={option.value}>
                              {option.label}
                            </FormSelectItem>
                          ))}
                        </FormSelectContent>
                      </Select>
                    </div>

                    <div className={formModalFieldGroupClassName}>
                      <Label htmlFor="out-time" className={formModalLabelClassName}>
                        Out Time <span className="text-destructive">*</span>
                      </Label>
                      <Select value={outTime} onValueChange={setOutTime}>
                        <SelectTrigger id="out-time" size="form" className={formSelectTriggerClassName}>
                          <SelectValue placeholder="Select out time" />
                        </SelectTrigger>
                        <FormSelectContent>
                          {VISIT_TIME_OPTIONS.map((option) => (
                            <FormSelectItem key={`out-${option.value}`} value={option.value}>
                              {option.label}
                            </FormSelectItem>
                          ))}
                        </FormSelectContent>
                      </Select>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              <div className={formModalFieldGroupClassName}>
                <Label htmlFor="completion-notes" className={formModalLabelClassName}>
                  Completion Notes
                </Label>
                <Textarea
                  id="completion-notes"
                  placeholder="Add notes about this task completion"
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  className={cn(formTextareaClassName, "min-h-[140px]")}
                />
              </div>
            </div>
          </div>

          <div className={formModalFooterClassName}>
            <SheetClose asChild>
              <Button variant="outline" className={formModalFooterButtonClassName}>
                Cancel
              </Button>
            </SheetClose>
            <Button
              type="button"
              onClick={completeTaskWithDetails}
              className={formModalFooterButtonClassName}
              disabled={selectedTaskType === "Visit" && (!inTime || !outTime)}
            >
              Complete Task
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AddNoteDrawer
        open={noteDrawerOpen}
        onOpenChange={handleNoteDrawerOpenChange}
        onSave={handleNewNote}
        entityName={leadData.name}
        associateId={leadData._id}
        associateTo="lead"
        editNote={noteToEdit?._id ? { _id: noteToEdit._id, note: noteToEdit.note } : null}
      />

      <AddTaskSheet 
        open={isTaskSheetOpen}
        onOpenChange={setIsTaskSheetOpen}
        onAddTask={handleAddTask}
        associateTo="lead"
        associateId={leadData._id}
        entityName={leadData?.name || leadData?.company_name}
      />

      <EditTaskSheet
        open={showEditDrawer}
        onOpenChange={setShowEditDrawer}
        onEditTask={handleTaskUpdate}
        taskId={selectedTask?._id}
        associateTo="lead"
        associateId={leadData._id}
      />

       <AddContactDrawer 
       open={contactSheetOpen} 
       onOpenChange={setContactSheetOpen} 
       onSave={handleSaveContact} 
       leadId={leadData._id}
       associateTo="lead"
       associateId={leadData._id}
       />

      <EditContactDrawer
        open={editContactDrawerOpen}
        onOpenChange={setEditContactDrawerOpen}
        onSave={handleUpdateContact}
        contact={selectedContactForEdit}
        leadId={leadData._id}
        associateTo="lead"
        associateId={leadData._id}
      />

      <SendEmail
        initialContact={selectedContact}
        predefinedEmails={getPredefinedEmails()}
        isOpen={isEmailSheetOpen}
        onOpenChange={setIsEmailSheetOpen}
        onEmailSent={handleEmailSent}
      />

      <EmailPreviewSheet
        open={isEmailPreviewOpen}
        onOpenChange={setIsEmailPreviewOpen}
        email={selectedEmail}
      />

      <DeleteItemAlert
        open={Boolean(documentToDelete)}
        onOpenChange={(open) => {
          if (!open) setDocumentToDelete(null)
        }}
        onDelete={handleConfirmDocumentDelete}
        itemName={documentToDelete?.name ?? ""}
        itemType="document"
      />

    </div>
  )
}
