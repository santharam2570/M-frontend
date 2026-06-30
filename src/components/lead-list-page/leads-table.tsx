"use client"

import { useMemo, useState, useRef, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { TableBody, TableCell, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Check, ChevronDown, Clock, CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { FileText, Mail, MoreVertical, Trash2 } from "lucide-react"
import { LeadActionDrawer } from "./lead-action-drawer"
import { format, parse, startOfDay } from "date-fns"
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { ShowNotesDrawer } from "@/components/all-notes/show-notes-drawer"
import { URLS } from "@/config/urls"
import { getApiErrorMessage, parseJsonResponse } from "@/lib/api"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { VisibilityState } from "@tanstack/react-table"
import { useQueryClient } from "@tanstack/react-query"
import SendEmail from "@/components/compose-email/send-email"
import { AddTaskSheetList } from "@/components/all-lists-followup-tasks/add-task-sheet-list"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useTimeline } from "@/hooks/use-timeline"
import React from "react"
import { EditTaskSheetList } from "@/components/all-lists-followup-tasks/edit-task-sheet-list"
import { DateAgeingBadge } from "@/components/ui/date-ageing-badge"
import { parseDateString } from "@/lib/date-ageing"
import {
  formatFollowupDateDisplay,
  hasFollowupDate,
  normalizeNextFollowupDates,
  parseFollowupDate,
  type FollowupDateEntry,
} from "@/lib/followup-date"
import { enrichLeadsWithOpenTasks, invalidateOpenTasksFollowupCache } from "@/lib/leads/enrich-leads-followup"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import { Card, CardContent } from "@/components/ui/card"
import { type ColumnPref, MAX_VISIBLE_COLUMNS, normalizeColumnKey, resolveColumnHeader } from "./columns-dropdown"


// Update the Lead interface to include leadNo
interface Lead {
  next_followup_dates: FollowupDateEntry[]
  status: string
  _id: string
  lead_no: string
  company_name: string
  project_name?: string
  name: string
  lead_status_name: string
  lead_status_color?: string
  source_name: string
  customer_requirement: string
  location?: string
  assigned_to: string
  create_date: string
  date_aging: number | string // Can be number or string like "1 Day", "179 Days"
  nextFollowup: string | null
  phone: string
  email: string
  isHot?: boolean
  isActive?: boolean
  isAging?: boolean
  needsFollowupToday?: boolean
  isOverdue?: boolean
  createdThisMonth?: boolean
  convertedThisMonth?: boolean
  description?: string
  latest_notes?: string | null
  new_task_type?: Array<{ new_task_type: string }>
  lead_status?: string
  stage?: string
  stages?: string | Array<string | { name?: string }>
  [key: string]: any
}

interface CustomFilter {
  name: string
  filters: {
    lead_status: string
    customer_type: string
    source: string
    assigned_to: string
    create_date: string
    create_by: string
  }
}

interface FilterState {
  lead_status: string
  customer_type: string
  source: string
  assigned_to: string
  create_date: string
  create_by: string
}

interface LeadsTableProps {
  searchQuery: string
  visibleColumns: ColumnPref[]
  activeFilter: string | null
  customFilters?: CustomFilter[]
  activeCustomFilters: FilterState
  activeMetricFilter: string | null
  isCompactView?: boolean
  refreshKey?: number
  prependLeadRequest?: { lead: Record<string, unknown>; id: number } | null
  onPrependLeadHandled?: () => void
  onTotalCountChange?: (count: number) => void
  onFilteredCountChange?: (count: number) => void
  onMetricsRefresh?: () => void
  // data: Lead[];
}

const PAGE_SIZE = 10

// Cached first page for the default (no search / no filter / default sort) view.
// Lets the table render instantly when navigating back instead of re-fetching
// and flashing the full "Loading..." state.
type CachedDefaultLeads = {
  leads: Lead[]
  totalCount: number
  searchCount: number
  hasMore: boolean
  fetchedAt: number
}
const LEADS_DEFAULT_CACHE_KEY = ["leads", "default-view"] as const
// How long the cached default view is considered fresh. Within this window,
// navigating back to the lead list reuses the cached rows without re-fetching.
const LEADS_DEFAULT_CACHE_TTL = 5 * 60 * 1000

const WRAP_COLUMNS = new Set([
  "name",
  "company_name",
  "project_name",
  "description",
  "latest_notes",
  "address1",
  "address2",
  "email",
  "location",
])

const ACTIONS_COLUMN_WIDTH = 96

const SETTING_DROPDOWN_COLUMNS = new Set([
  "lead_status_name",
  "customer_type_name",
  "customer_requirement_name",
  "assigned_to",
  "stage",
])

const CENTER_ALIGNED_COLUMNS = new Set([
  ...SETTING_DROPDOWN_COLUMNS,
  "date_aging",
  "actions",
])

const DEFAULT_COLUMN_MIN_WIDTH = 110

const getColumnMinWidthPx = (key: string, headerLabel?: string) => {
  const normalizedKey = normalizeColumnKey(key)
  if (COLUMN_MIN_WIDTHS[normalizedKey]) {
    return Number.parseInt(COLUMN_MIN_WIDTHS[normalizedKey], 10)
  }
  if (SETTING_DROPDOWN_COLUMNS.has(normalizedKey)) return 130

  const labelLength = headerLabel?.trim().length ?? 0
  if (labelLength > 18) return 168
  if (labelLength > 14) return 148
  if (labelLength > 10) return 128

  return DEFAULT_COLUMN_MIN_WIDTH
}

const getColumnWrap = (key: string) => WRAP_COLUMNS.has(normalizeColumnKey(key))

const isColumnMatch = (column: string, ...targets: string[]) => {
  const normalized = normalizeColumnKey(column)
  return targets.some((target) => normalizeColumnKey(target) === normalized)
}

const CUSTOMER_REQUIREMENT_DISPLAY_LIMIT = 8

const COLUMN_MIN_WIDTHS: Record<string, string> = {
  lead_no: "96px",
  name: "140px",
  phone: "148px",
  email: "160px",
  company_name: "140px",
  customer_type_name: "140px",
  customer_requirement_name: "140px",
  lead_status_name: "128px",
  stage: "128px",
  target_date: "120px",
  url: "120px",
  create_date: "120px",
  source_name: "120px",
  assigned_to: "128px",
}

const NO_TRUNCATE_COLUMNS = new Set(["lead_no", "phone"])

type LeadDropdownOption = {
  value: string
  label: string
  color: string
}

type LeadSettingItem = {
  _id?: string
  id?: string
  name?: string
  color?: string
  info?: unknown
  options?: unknown
  stages?: unknown
}

type LeadSettingInfoOption = {
  name?: string
  color?: string
}

const ASSIGNED_TO_COLOR = "#003399"

function resolveLeadSettingId(item: {
  _id?: string | { $oid?: string }
  id?: string | number
}): string {
  if (item._id && typeof item._id === "object" && "$oid" in item._id) {
    return String(item._id.$oid ?? "")
  }
  return String(item._id ?? item.id ?? "")
}

function parseSettingInfo(info: unknown): Record<string, unknown> {
  if (!info) return {}
  if (typeof info === "object") return info as Record<string, unknown>
  if (typeof info !== "string" || !info.trim()) return {}

  try {
    const parsed = JSON.parse(info)
    return typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function mapLeadSettingsToDropdownOptions(items: LeadSettingItem[]): LeadDropdownOption[] {
  return items
    .filter((item) => item.name?.trim())
    .map((item) => ({
      value: resolveLeadSettingId(item),
      label: item.name!.trim(),
      color: item.color || "#64748b",
    }))
    .filter((item) => item.value)
}

function isActiveUserStatus(status: unknown): boolean {
  if (status === undefined || status === null || status === "") return true
  const normalized = String(status).trim().toLowerCase()
  return normalized === "active" || normalized === "1" || normalized === "true"
}

function resolveUserId(user: {
  _id?: string | { $oid?: string }
  id?: string | number
  user_id?: string | { $oid?: string }
}): string {
  const directId = resolveLeadSettingId(user)
  if (directId) return directId

  if (user.user_id) {
    return resolveLeadSettingId({ _id: user.user_id })
  }

  return ""
}

function extractUsersFromApiResponse(data: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(data)) {
    return data as Array<Record<string, unknown>>
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>
    if (Array.isArray(record.users)) {
      return record.users as Array<Record<string, unknown>>
    }
    if (Array.isArray(record.items)) {
      return record.items as Array<Record<string, unknown>>
    }
  }

  return []
}

function mapUsersToDropdownOptions(users: Array<Record<string, unknown>>): LeadDropdownOption[] {
  return users
    .filter((user) => isActiveUserStatus(user.status))
    .map((user) => ({
      value: resolveUserId(
        user as {
          _id?: string | { $oid?: string }
          id?: string | number
          user_id?: string | { $oid?: string }
        },
      ),
      label: String(user.name ?? user.user_name ?? user.full_name ?? "Unknown User").trim(),
      color: ASSIGNED_TO_COLOR,
    }))
    .filter((user) => user.value && user.label)
}

async function fetchAssignableUserOptions(token: string): Promise<LeadDropdownOption[]> {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }

  for (const endpoint of [URLS.USERS_LIST, URLS.ACTIVE_USERS_LIST]) {
    try {
      const response = await fetch(endpoint, { method: "GET", headers })
      if (!response.ok) continue

      const result = await parseJsonResponse<{ code?: number; data?: unknown } | unknown[]>(response)
      const users = Array.isArray(result)
        ? extractUsersFromApiResponse(result)
        : extractUsersFromApiResponse((result as { data?: unknown }).data)
      const options = mapUsersToDropdownOptions(users)

      if (options.length > 0) {
        return options
      }
    } catch (error) {
      console.error(`Error fetching assignable users from ${endpoint}:`, error)
    }
  }

  return []
}

function mergeAssignedToOptions(
  current: LeadDropdownOption[],
  leads: Lead[],
): LeadDropdownOption[] {
  const merged = new Map(current.map((option) => [option.value, option]))

  leads.forEach((lead) => {
    const leadRecord = lead as Lead & Record<string, unknown>
    const value = getAssignedToIdFromLead(leadRecord)
    const label = getAssignedToNameFromLead(leadRecord)

    if (value && label && !merged.has(value)) {
      merged.set(value, {
        value,
        label,
        color: ASSIGNED_TO_COLOR,
      })
    }
  })

  return Array.from(merged.values()).sort((a, b) => a.label.localeCompare(b.label))
}

function getStageOptionsForLead(
  lead: Lead,
  leadStatusSettings: LeadSettingItem[]
): LeadDropdownOption[] {
  const statusId = lead.lead_status ? String(lead.lead_status) : ""
  const statusName = lead.lead_status_name?.trim().toLowerCase() || ""

  const matchingStatus = leadStatusSettings.find((item) => {
    const itemId = resolveLeadSettingId(item)
    if (statusId && itemId && itemId === statusId) return true
    return Boolean(statusName && item.name?.trim().toLowerCase() === statusName)
  })

  if (!matchingStatus) return []

  const info = parseSettingInfo(matchingStatus.info)
  const rawOptions =
    matchingStatus.options ??
    info.options ??
    matchingStatus.stages ??
    info.stages

  if (!Array.isArray(rawOptions)) return []

  return rawOptions
    .map((option) => {
      if (typeof option === "string") {
        const name = option.trim()
        if (!name) return null
        return { value: name, label: name, color: "#64748b" }
      }
      if (typeof option === "object" && option !== null && "name" in option) {
        const name = String((option as LeadSettingInfoOption).name ?? "").trim()
        if (!name) return null
        return {
          value: name,
          label: name,
          color: (option as LeadSettingInfoOption).color || "#64748b",
        }
      }
      return null
    })
    .filter((option): option is LeadDropdownOption => option !== null)
}

function getLeadDropdownOption(
  options: LeadDropdownOption[],
  value?: string | null
): LeadDropdownOption | undefined {
  if (!value) return undefined

  const normalized = value.trim().toLowerCase()
  return options.find(
    (option) =>
      option.value.toLowerCase() === normalized || option.label.toLowerCase() === normalized
  )
}

function getLeadDropdownColor(
  options: LeadDropdownOption[],
  value?: string | null,
  fallback?: string
) {
  return getLeadDropdownOption(options, value)?.color || fallback || "#64748b"
}

function getLeadStageValue(lead: Lead): string {
  const stageValue = lead.stage ?? lead.stages
  if (typeof stageValue === "string") return stageValue.trim()
  if (Array.isArray(stageValue)) {
    return stageValue
      .map((item) => (typeof item === "object" && item !== null ? (item as { name?: string }).name : item))
      .filter(Boolean)
      .join(", ")
  }
  return ""
}

type LeadListFilter = {
  field?: string
  selected_values?: string[]
  custom_start?: string
  custom_end?: string
}

function getCreateDateRangeFromFilters(filters: LeadListFilter[]): { start?: Date; end?: Date } | null {
  const dateFilter = filters.find((filter) => filter.field === "create_date")
  if (!dateFilter) return null

  if (
    dateFilter.selected_values?.[0] === "custom" &&
    (dateFilter.custom_start || dateFilter.custom_end)
  ) {
    const start = dateFilter.custom_start ? parseFilterDateValue(dateFilter.custom_start) : null
    const end = dateFilter.custom_end ? parseFilterDateValue(dateFilter.custom_end) : null
    if (!start && !end) return null
    return {
      start: start ?? end ?? undefined,
      end: end ?? start ?? undefined,
    }
  }

  const legacyValue = dateFilter.selected_values?.[0]
  if (!legacyValue) return null

  const legacyDate = parseFilterDateValue(legacyValue)
  if (!legacyDate) return null
  return { start: legacyDate, end: legacyDate }
}

function getStageFilterValue(filters: LeadListFilter[]): string | null {
  const stageFilter = filters.find(
    (filter) =>
      (filter.field === "stage" || filter.field === "stages") &&
      Array.isArray(filter.selected_values) &&
      filter.selected_values[0],
  )

  const value = stageFilter?.selected_values?.[0]
  return value ? value.trim().toLowerCase() : null
}

function parseFilterDateValue(value: string): Date | null {
  try {
    const isoDate = parse(value, "yyyy-MM-dd", new Date())
    if (!Number.isNaN(isoDate.getTime())) return isoDate
  } catch {
    // fall through
  }

  return parseDateString(value)
}

function leadMatchesCreateDateRangeFilter(
  lead: Lead,
  range: { start?: Date; end?: Date },
): boolean {
  const leadDate = parseDateString(lead.create_date)
  if (!leadDate) return false

  const leadDay = startOfDay(leadDate)
  if (range.start && leadDay < startOfDay(range.start)) return false
  if (range.end && leadDay > startOfDay(range.end)) return false
  return true
}

function applyClientSideFilters(leads: Lead[], filters: LeadListFilter[]): Lead[] {
  let result = leads

  const stageValue = getStageFilterValue(filters)
  if (stageValue) {
    result = result.filter(
      (lead) => getLeadStageValue(lead).trim().toLowerCase() === stageValue,
    )
  }

  const dateRange = getCreateDateRangeFromFilters(filters)
  if (dateRange) {
    result = result.filter((lead) => leadMatchesCreateDateRangeFilter(lead, dateRange))
  }

  return result
}

function hasClientSideFilters(filters: LeadListFilter[]): boolean {
  return Boolean(getStageFilterValue(filters) || getCreateDateRangeFromFilters(filters))
}

function getSettingItemId(item: unknown): string {
  if (typeof item === "string" || typeof item === "number") {
    return String(item).trim()
  }
  if (typeof item === "object" && item !== null && ("_id" in item || "id" in item)) {
    return resolveLeadSettingId(item as { _id?: string | { $oid?: string }; id?: string | number })
  }
  return ""
}

function getSettingItemName(item: unknown): string {
  if (typeof item === "string") return item.trim()
  if (typeof item === "object" && item !== null && "name" in item) {
    return String((item as { name?: string }).name ?? "").trim()
  }
  return ""
}

function getNamesFromApiField(value: unknown): string {
  if (value == null || value === "") return ""
  if (typeof value === "string") return value.trim()
  if (Array.isArray(value)) {
    return value
      .map((item) => getSettingItemName(item) || getSettingItemId(item))
      .filter(Boolean)
      .join(", ")
  }
  if (typeof value === "object") {
    return getSettingItemName(value) || getSettingItemId(value)
  }
  return ""
}

function getIdsFromApiField(value: unknown): string {
  if (value == null || value === "") return ""
  if (typeof value === "string") return value.trim()
  if (Array.isArray(value)) {
    return value
      .map((item) => getSettingItemId(item) || getSettingItemName(item))
      .filter(Boolean)
      .join(", ")
  }
  if (typeof value === "object") {
    return getSettingItemId(value) || getSettingItemName(value)
  }
  return ""
}

function getCustomerRequirementTokens(lead: Lead): string[] {
  const tokens: string[] = []

  const addTokens = (value: unknown) => {
    if (value == null || value === "") return

    if (typeof value === "string") {
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((part) => tokens.push(part))
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        const name = getSettingItemName(item)
        const id = getSettingItemId(item)
        if (name) tokens.push(name)
        else if (id) tokens.push(id)
      })
      return
    }

    if (typeof value === "object") {
      const name = getSettingItemName(value)
      const id = getSettingItemId(value)
      if (name) tokens.push(name)
      else if (id) tokens.push(id)
    }
  }

  addTokens(lead.customer_requirement_name)
  if (tokens.length === 0) {
    addTokens(lead.customer_requirement)
  }

  return tokens
}

function getSettingIdFromApiField(
  raw: Lead & Record<string, unknown>,
  idField: "lead_status" | "customer_type" | "customer_requirement",
  nameField: "lead_status_name" | "customer_type_name" | "customer_requirement_name"
): string {
  const directValue = raw[idField]
  if (typeof directValue === "string" && directValue.trim()) {
    return directValue.trim()
  }

  const namedField = raw[nameField]
  if (Array.isArray(namedField) && namedField.length > 0) {
    const first = namedField[0]
    if (typeof first === "object" && first !== null && "_id" in first) {
      return String((first as { _id?: string })._id ?? "")
    }
  }

  if (typeof namedField === "object" && namedField !== null && "_id" in namedField) {
    return String((namedField as { _id?: string })._id ?? "")
  }

  return ""
}

function getSettingColorFromApiField(
  raw: Lead & Record<string, unknown>,
  nameField: "lead_status_name" | "customer_type_name" | "customer_requirement_name",
  fallback?: string
): string {
  const namedField = raw[nameField]
  if (Array.isArray(namedField) && namedField.length > 0) {
    const first = namedField[0]
    if (typeof first === "object" && first !== null && "color" in first) {
      return String((first as { color?: string }).color ?? fallback ?? "")
    }
  }

  if (typeof namedField === "object" && namedField !== null && "color" in namedField) {
    return String((namedField as { color?: string }).color ?? fallback ?? "")
  }

  return fallback ?? ""
}

function getAssignedToIdFromLead(raw: Lead & Record<string, unknown>): string {
  if (typeof raw.assigned_to === "string" && raw.assigned_to.trim()) {
    return raw.assigned_to.trim()
  }

  if (typeof raw.assigned_to === "object" && raw.assigned_to !== null && "_id" in raw.assigned_to) {
    return resolveLeadSettingId(raw.assigned_to as { _id?: string | { $oid?: string }; id?: string | number })
  }

  const assigned = raw.assigned
  if (typeof assigned === "object" && assigned !== null && "_id" in assigned) {
    return resolveLeadSettingId(assigned as { _id?: string | { $oid?: string }; id?: string | number })
  }

  return ""
}

function getAssignedToNameFromLead(raw: Lead & Record<string, unknown>): string {
  if (typeof raw.assigned_to_name === "string" && raw.assigned_to_name.trim()) {
    return raw.assigned_to_name.trim()
  }

  if (typeof raw.assigned_to === "object" && raw.assigned_to !== null && "name" in raw.assigned_to) {
    return String((raw.assigned_to as { name?: string }).name ?? "")
  }

  if (typeof raw.assigned === "object" && raw.assigned !== null && "name" in raw.assigned) {
    return String((raw.assigned as { name?: string }).name ?? "")
  }

  if (typeof raw.assigned === "string" && raw.assigned.trim()) {
    return raw.assigned.trim()
  }

  return ""
}

function getLeadAssignedToValue(lead: Lead): string {
  const raw = lead as Lead & Record<string, unknown>
  return getAssignedToIdFromLead(raw) || getAssignedToNameFromLead(raw)
}

function LeadFieldDropdown({
  currentValue,
  placeholder,
  options,
  onChange,
  triggerClassName,
  fallbackColor,
}: {
  currentValue?: string | null
  placeholder: string
  options: LeadDropdownOption[]
  onChange: (value: string) => void
  triggerClassName?: string
  fallbackColor?: string
}) {
  const selectedOption = getLeadDropdownOption(options, currentValue)
  const displayLabel = selectedOption?.label || currentValue || placeholder
  const displayColor = getLeadDropdownColor(options, currentValue, fallbackColor)
  const hasValue = Boolean(selectedOption || currentValue?.trim())

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn("w-auto", triggerClassName)}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium",
            hasValue
              ? "text-white hover:opacity-90"
              : "border border-dashed border-muted-foreground/40 bg-muted/30 text-muted-foreground"
          )}
          style={hasValue ? { backgroundColor: displayColor } : undefined}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[10rem] max-w-[16rem] max-h-[280px] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {options.length === 0 ? (
          <DropdownMenuItem disabled className="text-muted-foreground">
            No options available
          </DropdownMenuItem>
        ) : (
          options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              className="flex items-center gap-2"
              onClick={() => onChange(option.value)}
            >
              <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: option.color }} />
              <span className="break-words">{option.label}</span>
              {(selectedOption?.value === option.value || currentValue === option.label) && (
                <Check className="ml-auto h-4 w-4 shrink-0" />
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function LeadStatusDropdown({
  lead,
  statusOptions,
  onStatusChange,
  triggerClassName,
}: {
  lead: Lead
  statusOptions: LeadDropdownOption[]
  onStatusChange: (leadId: string, status: string) => void
  triggerClassName?: string
}) {
  return (
    <LeadFieldDropdown
      currentValue={lead.lead_status || lead.lead_status_name}
      placeholder="Select status"
      options={statusOptions}
      onChange={(value) => onStatusChange(lead._id, value)}
      triggerClassName={triggerClassName}
      fallbackColor={lead.lead_status_color}
    />
  )
}

function LeadCustomerTypeDropdown({
  lead,
  customerTypeOptions,
  onCustomerTypeChange,
  triggerClassName,
}: {
  lead: Lead
  customerTypeOptions: LeadDropdownOption[]
  onCustomerTypeChange: (leadId: string, customerType: string) => void
  triggerClassName?: string
}) {
  return (
    <LeadFieldDropdown
      currentValue={lead.customer_type || lead.customer_type_name}
      placeholder="Select customer type"
      options={customerTypeOptions}
      onChange={(value) => onCustomerTypeChange(lead._id, value)}
      triggerClassName={triggerClassName}
      fallbackColor={lead.customer_type_color}
    />
  )
}

function LeadAssignedToDropdown({
  lead,
  assignedToOptions,
  onAssignedToChange,
  triggerClassName,
}: {
  lead: Lead
  assignedToOptions: LeadDropdownOption[]
  onAssignedToChange: (leadId: string, assignedTo: string) => void
  triggerClassName?: string
}) {
  return (
    <LeadFieldDropdown
      currentValue={getLeadAssignedToValue(lead)}
      placeholder="Select user"
      options={assignedToOptions}
      onChange={(value) => onAssignedToChange(lead._id, value)}
      triggerClassName={triggerClassName}
      fallbackColor={ASSIGNED_TO_COLOR}
    />
  )
}

function getCustomerRequirementDisplayValue(
  lead: Lead,
  options: LeadDropdownOption[]
): string {
  const tokens = getCustomerRequirementTokens(lead)
  if (tokens.length === 0) return ""

  return tokens
    .map((token) => getLeadDropdownOption(options, token)?.label || token)
    .join(", ")
}

function LeadStageDropdown({
  lead,
  leadStatusSettings,
  onStageChange,
  triggerClassName,
}: {
  lead: Lead
  leadStatusSettings: LeadSettingItem[]
  onStageChange: (leadId: string, stage: string) => void
  triggerClassName?: string
}) {
  const stageOptions = useMemo(
    () => getStageOptionsForLead(lead, leadStatusSettings),
    [lead, leadStatusSettings]
  )

  return (
    <LeadFieldDropdown
      currentValue={getLeadStageValue(lead)}
      placeholder="Select stage"
      options={stageOptions}
      onChange={(value) => onStageChange(lead._id, value)}
      triggerClassName={triggerClassName}
    />
  )
}

function formatCellDisplayText(value: unknown, empty = ""): string {
  if (value == null || value === "") return empty
  if (typeof value === "string") return value.trim() || empty
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (typeof value === "object") {
    const named =
      !Array.isArray(value) && "name" in value
        ? (value as { name?: unknown }).name
        : undefined
    return named != null ? String(named).trim() || empty : empty
  }
  return String(value).trim() || empty
}

function CustomerRequirementValue({ value }: { value: unknown }) {
  const full = formatCellDisplayText(value)

  if (!full) {
    return <span className="text-muted-foreground">-</span>
  }

  const isTruncated = full.length > CUSTOMER_REQUIREMENT_DISPLAY_LIMIT
  const display = isTruncated ? `${full.slice(0, CUSTOMER_REQUIREMENT_DISPLAY_LIMIT)}...` : full

  if (!isTruncated) {
    return <span className="block truncate">{display}</span>
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="block truncate cursor-default">{display}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs break-words">
          {full}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const getColumnTextAlign = (column: string) =>
  CENTER_ALIGNED_COLUMNS.has(normalizeColumnKey(column)) ? "text-center" : "text-left"

const getColumnCellClass = (column: string, isCompactView: boolean, wrap?: boolean) =>
  cn(
    "px-4 align-middle text-sm",
    getColumnTextAlign(column),
    !NO_TRUNCATE_COLUMNS.has(column) && "max-w-0",
    wrap ? "whitespace-normal" : "whitespace-nowrap",
    isCompactView ? "py-2" : "py-3"
  )

const getColumnHeadClass = (column: string, isCompactView: boolean) =>
  cn(
    "sticky top-0 z-10 bg-primary px-4 align-middle font-bold text-primary-foreground",
    getColumnTextAlign(column),
    isCompactView ? "min-h-10 py-3 text-xs" : "min-h-12 py-4 text-sm"
  )

function LeadsTableCell({
  column,
  isCompactView,
  wrap,
  className,
  children,
  ...props
}: React.ComponentProps<typeof TableCell> & {
  column: string
  isCompactView: boolean
  wrap?: boolean
}) {
  const isCenter = getColumnTextAlign(column) === "text-center"

  return (
    <TableCell
      className={cn(getColumnCellClass(column, isCompactView, wrap), className)}
      {...props}
    >
      <div
        className={cn(
          "flex min-h-[1.75rem] w-full min-w-0 items-center",
          isCenter ? "justify-center" : "justify-start"
        )}
      >
        {children}
      </div>
    </TableCell>
  )
}

const renderTruncatedText = (value: unknown, options?: { lines?: 1 | 2 }) => {
  const text = formatCellDisplayText(value, "-")
  if (text === "-") {
    return <span className="text-muted-foreground">-</span>
  }

  if (options?.lines === 2) {
    return (
      <span className="block line-clamp-2 break-words leading-snug" title={text}>
        {text}
      </span>
    )
  }

  return (
    <span className="min-w-0 truncate" title={text}>
      {text}
    </span>
  )
}

const getLatestNotesDisplayValue = (lead: Lead): string => {
  const raw = lead as Lead & { latest_note?: string; note?: string }
  const candidates = [lead.latest_notes, raw.latest_note, raw.note]

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim()
    }
    if (candidate && typeof candidate === "object" && "note" in candidate) {
      const note = String((candidate as { note?: string }).note ?? "").trim()
      if (note) return note
    }
  }

  return ""
}

const normalizeLead = (lead: Lead): Lead => {
  const raw = lead as Lead & {
    customer_type?: string
    customer_type_name?: string | Array<string | { name?: string }>
    customer_requirement?: string | Array<string | { name?: string }>
    customer_requirement_name?: string | Array<string | { name?: string }>
  }

  const normalizeNamedField = (
    value?: string | Array<string | { name?: string }> | null
  ) => {
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === "object" ? item?.name : item))
        .filter(Boolean)
        .join(", ")
    }
    return typeof value === "string" ? value : ""
  }

  const leadStatusName = normalizeNamedField(raw.lead_status_name) || raw.status || ""
  const customerTypeName =
    normalizeNamedField(raw.customer_type_name) ||
    (typeof raw.customer_type === "string" ? raw.customer_type : "")
  const customerRequirementName =
    getNamesFromApiField(raw.customer_requirement_name) ||
    getNamesFromApiField(raw.customer_requirement)
  const customerRequirementIds =
    getIdsFromApiField(raw.customer_requirement) ||
    getIdsFromApiField(raw.customer_requirement_name)

  const stageValue =
    (typeof raw.stage === "string" ? raw.stage.trim() : "") ||
    getLeadStageValue(raw) ||
    (typeof raw.stages === "string" ? raw.stages.trim() : "")

  const normalizedRaw = raw as Lead & Record<string, unknown>

  const locationValue =
    (typeof raw.location === "string" ? raw.location.trim() : "") ||
    (typeof normalizedRaw.prepared_location === "string"
      ? normalizedRaw.prepared_location.trim()
      : "") ||
    (typeof normalizedRaw.preferred_location === "string"
      ? normalizedRaw.preferred_location.trim()
      : "")

  return {
    ...raw,
    location: locationValue || raw.location,
    latest_notes: getLatestNotesDisplayValue(raw) || raw.latest_notes || null,
    customer_requirement: customerRequirementIds,
    customer_requirement_name: customerRequirementName || customerRequirementIds,
    customer_requirement_color:
      getSettingColorFromApiField(
        normalizedRaw,
        "customer_requirement_name",
        raw.customer_requirement_color
      ) || raw.customer_requirement_color,
    customer_type:
      getSettingIdFromApiField(normalizedRaw, "customer_type", "customer_type_name") ||
      raw.customer_type,
    customer_type_name:
      customerTypeName ||
      (typeof raw.customer_type === "string" ? raw.customer_type : ""),
    customer_type_color:
      getSettingColorFromApiField(normalizedRaw, "customer_type_name", raw.customer_type_color) ||
      raw.customer_type_color,
    lead_status:
      getSettingIdFromApiField(normalizedRaw, "lead_status", "lead_status_name") || raw.lead_status,
    lead_status_name: leadStatusName,
    lead_status_color:
      getSettingColorFromApiField(normalizedRaw, "lead_status_name", raw.lead_status_color) ||
      raw.lead_status_color,
    assigned_to: getAssignedToIdFromLead(normalizedRaw),
    assigned_to_name: getAssignedToNameFromLead(normalizedRaw),
    stage: stageValue,
    stages: stageValue,
    next_followup_dates: normalizeNextFollowupDates(normalizedRaw),
  }
}

// Helper function to deduplicate leads by _id
const deduplicateLeads = (leads: Lead[]): Lead[] => {
  const seen = new Set<string>()
  return leads.filter(lead => {
    if (seen.has(lead._id)) {
      return false
    }
    seen.add(lead._id)
    return true
  })
}

function getLeadFieldValue(lead: Lead, key: string): unknown {
  const column = normalizeColumnKey(key)

  switch (column) {
    case "assigned_to":
      return getAssignedToNameFromLead(lead as Lead & Record<string, unknown>) || getLeadAssignedToValue(lead)
    case "customer_type_name":
      return lead.customer_type_name ?? lead.customer_type
    case "customer_requirement_name":
      return lead.customer_requirement_name ?? lead.customer_requirement
    case "stage":
      return lead.stage ?? lead.stages
    case "source_name":
      return lead.source_name ?? lead.source
    case "latest_notes":
      return getLatestNotesDisplayValue(lead)
    case "next_followup":
      return hasFollowupDate(lead.next_followup_dates?.[0])
        ? formatFollowupDateDisplay(lead.next_followup_dates![0].date)
        : ""
    default:
      return lead[column] ?? lead[key]
  }
}

// Update the LeadsTable component to include hover state and action buttons
export function LeadsTable({
  searchQuery,
  visibleColumns,
  activeFilter,
  customFilters = [],
  activeCustomFilters,
  activeMetricFilter,
  isCompactView = false,
  refreshKey = 0,
  prependLeadRequest = null,
  onPrependLeadHandled,
  onTotalCountChange,
  onFilteredCountChange,
  onMetricsRefresh,
}: LeadsTableProps) {
  const queryClient = useQueryClient()
  const cachedDefaultLeads = queryClient.getQueryData<CachedDefaultLeads>(
    LEADS_DEFAULT_CACHE_KEY,
  )

  const [leadsData, setLeadsData] = useState<Lead[]>(
    cachedDefaultLeads?.leads ?? [],
  )
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [isLoading, setIsLoading] = useState(!cachedDefaultLeads)
  const [isLoadingMore, setIsLoadingMore] = useState(false) // Separate state for pagination loading
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(cachedDefaultLeads?.totalCount ?? 0)
  const [searchCount, setSearchCount] = useState(cachedDefaultLeads?.searchCount ?? 0)
  const [hasMore, setHasMore] = useState(cachedDefaultLeads?.hasMore ?? true)
  const observerTarget = useRef<HTMLDivElement>(null)
  const isLoadingMoreRef = useRef(false) // Ref to track loading state to prevent duplicate calls
  const leadsDataRef = useRef<Lead[]>(leadsData) // Tracks current rows for spinner decisions
  const { toast } = useToast()
  const [actionDrawerOpen, setActionDrawerOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [selectedAction, setSelectedAction] = useState<"note" | "email" | "viewNotes" | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const [notesDrawerOpen, setNotesDrawerOpen] = useState(false)
  const [isEmailSheetOpen, setIsEmailSheetOpen] = useState(false)
  const [isTaskSheetOpen, setIsTaskSheetOpen] = useState(false)
  const [showEditDrawer, setShowEditDrawer] = React.useState(false)
  const [sortColumn, setSortColumn] = useState<string | null>("create_date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const [taskCompletionDrawerOpen, setTaskCompletionDrawerOpen] = useState(false)
  const [selectedTaskType, setSelectedTaskType] = useState("Visit")
  const [inTime, setInTime] = useState<string>("") 
  const [outTime, setOutTime] = useState<string>("") 
  const [completionNote, setCompletionNote] = useState("") 
  const [nextFollowUpDate, setNextFollowUpDate] = useState<Date | undefined>(undefined)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null)
  const [isDeletingLead, setIsDeletingLead] = useState(false)
  const [leadStatusOptions, setLeadStatusOptions] = useState<LeadDropdownOption[]>([])
  const [customerTypeOptions, setCustomerTypeOptions] = useState<LeadDropdownOption[]>([])
  const [customerRequirementOptions, setCustomerRequirementOptions] = useState<LeadDropdownOption[]>([])
  const [assignedToOptions, setAssignedToOptions] = useState<LeadDropdownOption[]>([])
  const [leadStatusSettings, setLeadStatusSettings] = useState<LeadSettingItem[]>([])
  // Function to handle field updates
  const { addTimelineActivity } = useTimeline()
  const isMobile = useIsMobile()

  const displayColumns = useMemo(
    () =>
      [...visibleColumns]
        .map((col) => ({
          ...col,
          key: normalizeColumnKey(col.key),
          name: resolveColumnHeader(col),
        }))
        .sort((a, b) => a.order - b.order)
        .slice(0, MAX_VISIBLE_COLUMNS),
    [visibleColumns]
  )

  const tableMinWidth = useMemo(() => {
    const dataColumnsWidth = displayColumns.reduce(
      (sum, col) => sum + getColumnMinWidthPx(col.key, col.name),
      0
    )
    return dataColumnsWidth + ACTIONS_COLUMN_WIDTH
  }, [displayColumns])

  // Make loadMoreData a useCallback to avoid unnecessary re-renders
  const loadMoreData = useCallback(async () => {
    // Prevent loading more when searching (search results are loaded all at once)
    const isSearching = searchQuery && searchQuery.trim() !== '';
    if (!hasMore || isLoading || isLoadingMore || isLoadingMoreRef.current || isSearching) return

    try {
      isLoadingMoreRef.current = true
      setIsLoadingMore(true)
      const nextPage = currentPage + 1
      
      // Get current filters from localStorage
      let currentFilters = [];
      const savedFilters = localStorage.getItem('current_filters');
      if (savedFilters) {
        try {
          currentFilters = JSON.parse(savedFilters);
        } catch (e) {
          console.error('Error parsing saved lead filters:', e);
        }
      }

      // Get current metrics filters from localStorage
      let currentMetricsFilters = [];
      const savedMetricsFilters = localStorage.getItem('current_lead_metrics_filters');
      if (savedMetricsFilters) {
        try {
          currentMetricsFilters = JSON.parse(savedMetricsFilters);
        } catch (e) {
          console.error('Error parsing saved lead metrics filters:', e);
        }
      }

      // Combine both filter types
      const combinedFilters = [...currentFilters, ...currentMetricsFilters];
      const clientSideFilterActive = hasClientSideFilters(combinedFilters)

      const token = JSON.parse(localStorage.getItem('map_user') || '{}').access_token;
      if (!token) throw new Error("Token not found");
      if (!URLS.LEAD_LIST) throw new Error("LEAD_LIST URL is not configured");

      const response = await fetch(`${URLS.LEAD_LIST}?page=${nextPage}&length=${PAGE_SIZE}&search=${searchQuery}&sort=${sortColumn || ''}&order=${sortDirection}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          draw: 1,
          search: { value: searchQuery, regex: false },
          filter: combinedFilters
        })
      });
      
      if (!response.ok) {
        throw new Error(`Lead list request failed: ${response.status}`);
      }

      const result = await parseJsonResponse<{ code?: number; data?: unknown[]; search_count?: number; total_count?: number }>(response);
      
      if (result.code === 200) {
        const newLeads = applyClientSideFilters(
          ((result.data || []) as Lead[]).map(normalizeLead),
          combinedFilters,
        )
        const deduplicatedNewLeads = deduplicateLeads(newLeads)
        const enrichedNewLeads = await enrichLeadsWithOpenTasks(deduplicatedNewLeads, token)
        const filteredTotal = clientSideFilterActive
          ? enrichedNewLeads.length
          : (result.search_count ?? result.total_count ?? 0)

        // If no new leads were returned, we've reached the end
        if (enrichedNewLeads.length === 0) {
          setHasMore(false)
          return
        }

        // Append new data to existing data, ensuring no duplicates
        setLeadsData(prev => {
          const combined = [...prev, ...enrichedNewLeads]
          const deduplicated = deduplicateLeads(combined)
          const totalLoaded = deduplicated.length
          
          // Set hasMore based on whether we've loaded all available data
          // If filteredTotal is 0 or we've loaded at least that many, we're done
          // Also stop if we got fewer items than requested (likely last page)
          const shouldHaveMore = filteredTotal > 0 && totalLoaded < filteredTotal && enrichedNewLeads.length >= PAGE_SIZE
          setHasMore(shouldHaveMore)
          return deduplicated
        })
        setCurrentPage(nextPage)
        setSearchCount(result.search_count ?? filteredTotal)
        setTotalCount(result.total_count ?? filteredTotal)
        onTotalCountChange?.(result.total_count ?? filteredTotal);
        onFilteredCountChange?.(result.search_count ?? filteredTotal);
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error("Error loading more leads:", error)
      toast({
        title: "Error",
        description: "Failed to load more leads",
        variant: "destructive",
      })
      setHasMore(false)
    } finally {
      isLoadingMoreRef.current = false
      setIsLoadingMore(false)
    }
  }, [currentPage, hasMore, isLoading, isLoadingMore, searchQuery, sortColumn, sortDirection, onTotalCountChange, toast, leadsData.length])

  // Handle column visibility changes
  const handleColumnVisibility = (updater: any) => {
    setColumnVisibility((prev) => {
      const newVisibility = typeof updater === 'function' ? updater(prev) : updater;
      return newVisibility;
    });
  };

  // Load initial data and handle filter changes
  const fetchLeads = useCallback(async (options?: { force?: boolean }) => {
    try {
      // Skip the network request entirely when we are showing the default
      // view and the cached data is still fresh. This prevents redundant
      // refetches every time the user navigates back to the lead list.
      const isSearchingNow = !!(searchQuery && searchQuery.trim() !== "")
      const savedFiltersRaw = localStorage.getItem("current_filters")
      const savedMetricsRaw = localStorage.getItem("current_lead_metrics_filters")
      const hasAnyFilter =
        (!!savedFiltersRaw && savedFiltersRaw !== "[]") ||
        (!!savedMetricsRaw && savedMetricsRaw !== "[]")
      const isDefaultView =
        !isSearchingNow &&
        !hasAnyFilter &&
        sortColumn === "create_date" &&
        sortDirection === "desc"

      if (!options?.force && isDefaultView) {
        const cached = queryClient.getQueryData<CachedDefaultLeads>(
          LEADS_DEFAULT_CACHE_KEY,
        )
        if (cached && Date.now() - cached.fetchedAt < LEADS_DEFAULT_CACHE_TTL) {
          setLeadsData(cached.leads)
          setSearchCount(cached.searchCount)
          setTotalCount(cached.totalCount)
          setHasMore(cached.hasMore)
          setCurrentPage(1)
          setIsLoading(false)
          onTotalCountChange?.(cached.totalCount)
          onFilteredCountChange?.(cached.searchCount)
          return
        }
      }

      // Only show the full-screen spinner when there are no rows to display
      // yet. On a return visit the cached rows are already shown, so we refresh
      // silently in the background instead of flashing "Loading...".
      setIsLoading(leadsDataRef.current.length === 0)
      setCurrentPage(1) // Reset to first page
      setHasMore(true) // Reset hasMore flag

      const token = JSON.parse(localStorage.getItem('map_user') || '{}').access_token;
      if (!token) throw new Error("Token not found");
      if (!URLS.LEAD_LIST) throw new Error("LEAD_LIST URL is not configured");
      
      // Get current filters from localStorage
      let currentFilters = [];
      const savedFilters = localStorage.getItem('current_filters');
      if (savedFilters) {
        try {
          currentFilters = JSON.parse(savedFilters);
        } catch (e) {
          console.error('Error parsing saved lead filters:', e);
        }
      }

      // Get current metrics filters from localStorage
      let currentMetricsFilters = [];
      const savedMetricsFilters = localStorage.getItem('current_lead_metrics_filters');
      if (savedMetricsFilters) {
        try {
          currentMetricsFilters = JSON.parse(savedMetricsFilters);
        } catch (e) {
          console.error('Error parsing saved lead metrics filters:', e);
        }
      }

      // Combine both filter types
      const combinedFilters = [...currentFilters, ...currentMetricsFilters];
      const clientSideFilterActive = hasClientSideFilters(combinedFilters)

      // When searching or client-side filtering, fetch all results in one request (like filters do) to prevent multiple sequential requests
      // Otherwise, use pagination for better performance
      const isSearching = searchQuery && searchQuery.trim() !== '';
      const fetchLength = isSearching || clientSideFilterActive ? 100 : PAGE_SIZE;

      const response = await fetch(`${URLS.LEAD_LIST}?page=1&length=${fetchLength}&search=${searchQuery}&sort=${sortColumn || ''}&order=${sortDirection}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          draw: 1,
          search: { value: searchQuery, regex: false },
          filter: combinedFilters
        })
      });
      
      if (!response.ok) {
        throw new Error(`Lead list request failed: ${response.status}`);
      }

      const result = await parseJsonResponse<{ code?: number; data?: unknown[]; search_count?: number; total_count?: number }>(response);
      if (result.code === 200) {
        const fetchedLeads = applyClientSideFilters(
          ((result.data || []) as Lead[]).map(normalizeLead),
          combinedFilters,
        )
        const deduplicatedLeads = deduplicateLeads(fetchedLeads)
        const enrichedLeads = await enrichLeadsWithOpenTasks(deduplicatedLeads, token)
        const filteredTotal = clientSideFilterActive
          ? enrichedLeads.length
          : (result.search_count ?? result.total_count ?? enrichedLeads.length)

        const nextSearchCount = clientSideFilterActive ? enrichedLeads.length : (result.search_count ?? filteredTotal)
        const nextTotalCount = result.total_count ?? filteredTotal
        const nextHasMore = isSearching || clientSideFilterActive
          ? false
          : enrichedLeads.length < filteredTotal

        setLeadsData(enrichedLeads);
        setSearchCount(nextSearchCount)
        setTotalCount(nextTotalCount)

        // When searching or client-side filtering, disable infinite scroll to prevent multiple sequential requests
        // When not searching, enable pagination if there's more data
        setHasMore(nextHasMore);

        // Persist the default first page so navigating back renders instantly.
        const isDefaultDataView =
          !isSearching &&
          combinedFilters.length === 0 &&
          sortColumn === "create_date" &&
          sortDirection === "desc"
        if (isDefaultDataView) {
          queryClient.setQueryData<CachedDefaultLeads>(LEADS_DEFAULT_CACHE_KEY, {
            leads: enrichedLeads,
            totalCount: nextTotalCount,
            searchCount: nextSearchCount,
            hasMore: nextHasMore,
            fetchedAt: Date.now(),
          })
        }

        onTotalCountChange?.(result.total_count ?? filteredTotal);
        onFilteredCountChange?.(clientSideFilterActive ? enrichedLeads.length : (result.search_count ?? filteredTotal));
        onMetricsRefresh?.();
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setLeadsData([]);
      setHasMore(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load leads",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, activeCustomFilters, sortColumn, sortDirection, activeMetricFilter, onTotalCountChange, onFilteredCountChange, onMetricsRefresh, toast, queryClient]);

  // Load initial data and handle filter changes. A change in `refreshKey`
  // (e.g. after adding a lead) forces a fresh fetch that bypasses the cache.
  const lastRefreshKeyRef = useRef(refreshKey)
  useEffect(() => {
    const forced = refreshKey !== lastRefreshKeyRef.current
    lastRefreshKeyRef.current = refreshKey
    void fetchLeads({ force: forced });
  }, [fetchLeads, refreshKey]);

  // Prepend a newly created lead without refetching the full list.
  useEffect(() => {
    if (!prependLeadRequest?.lead) return

    const normalized = normalizeLead(prependLeadRequest.lead as Lead)
    if (!normalized._id) {
      onPrependLeadHandled?.()
      return
    }

    setLeadsData((prev) => {
      if (prev.some((lead) => lead._id === normalized._id)) return prev
      return [normalized, ...prev]
    })
    setTotalCount((count) => {
      const next = count + 1
      onTotalCountChange?.(next)
      return next
    })
    setSearchCount((count) => {
      const next = count + 1
      onFilteredCountChange?.(next)
      return next
    })

    const cached = queryClient.getQueryData<CachedDefaultLeads>(LEADS_DEFAULT_CACHE_KEY)
    if (cached) {
      queryClient.setQueryData<CachedDefaultLeads>(LEADS_DEFAULT_CACHE_KEY, {
        ...cached,
        leads: [normalized, ...cached.leads.filter((lead) => lead._id !== normalized._id)],
        totalCount: cached.totalCount + 1,
        searchCount: cached.searchCount + 1,
        fetchedAt: Date.now(),
      })
    }

    onPrependLeadHandled?.()
  }, [prependLeadRequest, onPrependLeadHandled, onTotalCountChange, onFilteredCountChange, queryClient])

  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        const token = JSON.parse(localStorage.getItem("map_user") || "{}").access_token
        if (!token) return

        const [settingsResponse, usersResponse] = await Promise.all([
          fetch(URLS.LEAD_SETTINGS_LIST, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetchAssignableUserOptions(token),
        ])

        const settingsResult = await parseJsonResponse<{
          code?: number
          data?: {
            lead_status?: LeadSettingItem[]
            customer_type?: LeadSettingItem[]
            customer_requirement?: LeadSettingItem[]
          }
        }>(settingsResponse)

        if (settingsResult.code === 200) {
          const leadStatuses = [...(settingsResult.data?.lead_status || [])].sort(
            (a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0),
          )
          const customerTypes = settingsResult.data?.customer_type || []
          const customerRequirements = settingsResult.data?.customer_requirement || []

          setLeadStatusSettings(leadStatuses)
          setLeadStatusOptions(mapLeadSettingsToDropdownOptions(leadStatuses))
          setCustomerTypeOptions(mapLeadSettingsToDropdownOptions(customerTypes))
          setCustomerRequirementOptions(mapLeadSettingsToDropdownOptions(customerRequirements))
        }

        if (usersResponse.length > 0) {
          setAssignedToOptions(usersResponse)
        }
      } catch (error) {
        console.error("Error fetching lead dropdown options:", error)
      }
    }

    fetchDropdownOptions()
  }, [])

  useEffect(() => {
    leadsDataRef.current = leadsData
    setAssignedToOptions((current) => mergeAssignedToOptions(current, leadsData))
  }, [leadsData])

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    // Don't set up observer if there's no more data, still loading, or no target element
    if (!observerTarget.current || !hasMore || isLoading || isLoadingMore || isLoadingMoreRef.current) {
      return
    }

    let observer: IntersectionObserver | null = null

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      // Only trigger if:
      // 1. Element is intersecting
      // 2. We have more data to load
      // 3. We're not currently loading (check both state and ref)
      // 4. We're not in initial loading state
      if (
        entries[0].isIntersecting &&
        hasMore &&
        !isLoading &&
        !isLoadingMore &&
        !isLoadingMoreRef.current
      ) {
        loadMoreData()
      }
    }

    observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.1,
      rootMargin: '100px', // Start loading slightly before reaching the bottom
    })

    observer.observe(observerTarget.current)

    return () => {
      if (observer && observerTarget.current) {
        observer.unobserve(observerTarget.current)
        observer.disconnect()
      }
    }
  }, [hasMore, isLoading, isLoadingMore, loadMoreData])

  useEffect(() => {
    if (selectedLead && selectedLead.new_task_type && selectedLead.new_task_type.length > 0) {
      const taskType = selectedLead.new_task_type[0].new_task_type;
      setSelectedTaskType(taskType);
      if (taskType === 'Visit') {
        // Show in/out time fields
      } else {
        // Hide in/out time fields
      }
    }
  }, [selectedLead]);

  const handleTaskAdded = useCallback(() => {
    invalidateOpenTasksFollowupCache()
    fetchLeads()
  }, [fetchLeads])

  // Trigger a local refetch after task mutations (add/edit/complete) without page reload
  const handleTaskMutation = useCallback(() => {
    invalidateOpenTasksFollowupCache()
    fetchLeads()
  }, [fetchLeads])

  // Function to update lead status
  const handleStatusUpdate = async (leadId: string, newStatusValue: string) => {
    const storedData = localStorage.getItem('map_user')
    if (!storedData) return
    
    const userData = JSON.parse(storedData)
    const token = userData.access_token
    const newStatus = leadStatusOptions.find((option) => option.value === newStatusValue)

    if (!newStatus) return

    try {
      const lead = leadsData.find(l => l._id === leadId)
      if (!lead) return

      const response = await fetch(`${URLS.LEAD_UPDATE}/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lead_status: newStatusValue,
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await parseJsonResponse(response)
      if (result.code === 200) {
        setLeadsData(prevLeads => 
          prevLeads.map(lead => 
            lead._id === leadId
              ? {
                  ...lead,
                  lead_status: newStatus.value,
                  lead_status_name: newStatus.label,
                  lead_status_color: newStatus.color,
                }
              : lead
          )
        )

        const fromText = lead.lead_status_name || "None"

        await addTimelineActivity({
          category_name: 'stage',
          action: 'update',
          associate_to: 'lead',
          associate_id: leadId,
          from_data: lead.lead_status,
          to_data: newStatusValue,
          text_info: `Updated status from "${fromText}" to "${newStatus.label}"`
        })

        toast({
          title: "Success",
          description: "Lead status updated successfully",
          variant: "default",
        })
      }
    } catch (error) {
      console.error('Error updating lead status:', error)
      toast({
        title: "Error",
        description: "Failed to update lead status",
        variant: "destructive",
      })
    }
  }

  const handleCustomerTypeUpdate = async (leadId: string, newCustomerTypeValue: string) => {
    const storedData = localStorage.getItem("map_user")
    if (!storedData) return

    const userData = JSON.parse(storedData)
    const token = userData.access_token
    const newCustomerType = customerTypeOptions.find((option) => option.value === newCustomerTypeValue)

    if (!newCustomerType) return

    try {
      const lead = leadsData.find((item) => item._id === leadId)
      if (!lead) return

      const response = await fetch(`${URLS.LEAD_UPDATE}/${leadId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customer_type: newCustomerTypeValue,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await parseJsonResponse<{ code?: number; msg?: string }>(response)
      if (result.code === 200) {
        setLeadsData((prevLeads) =>
          prevLeads.map((item) =>
            item._id === leadId
              ? {
                  ...item,
                  customer_type: newCustomerType.value,
                  customer_type_name: newCustomerType.label,
                  customer_type_color: newCustomerType.color,
                }
              : item
          )
        )

        const fromText = String(lead.customer_type_name || lead.customer_type || "None")

        await addTimelineActivity({
          category_name: "update",
          action: "update",
          associate_to: "lead",
          associate_id: leadId,
          from_data: lead.customer_type,
          to_data: newCustomerTypeValue,
          text_info: `Updated customer type from "${fromText}" to "${newCustomerType.label}"`,
        })

        toast({
          title: "Success",
          description: "Customer type updated successfully",
          variant: "default",
        })
      } else {
        throw new Error(result.msg || "Failed to update customer type")
      }
    } catch (error) {
      console.error("Error updating customer type:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update customer type",
        variant: "destructive",
      })
    }
  }

  const handleAssignedToUpdate = async (leadId: string, newAssignedToValue: string) => {
    const storedData = localStorage.getItem("map_user")
    if (!storedData) return

    const userData = JSON.parse(storedData)
    const token = userData.access_token
    const newAssignee = assignedToOptions.find((option) => option.value === newAssignedToValue)

    if (!newAssignee) return

    try {
      const lead = leadsData.find((item) => item._id === leadId)
      if (!lead) return

      const response = await fetch(`${URLS.LEAD_UPDATE}/${leadId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assigned_to: newAssignedToValue,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await parseJsonResponse<{ code?: number; msg?: string }>(response)
      if (result.code === 200) {
        setLeadsData((prevLeads) =>
          prevLeads.map((item) =>
            item._id === leadId
              ? {
                  ...item,
                  assigned_to: newAssignee.value,
                  assigned_to_name: newAssignee.label,
                }
              : item
          )
        )

        const fromText = String(
          lead.assigned_to_name || getLeadAssignedToValue(lead) || "None",
        )

        await addTimelineActivity({
          category_name: "update",
          action: "update",
          associate_to: "lead",
          associate_id: leadId,
          from_data: lead.assigned_to,
          to_data: newAssignedToValue,
          text_info: `Updated assigned to from "${fromText}" to "${newAssignee.label}"`,
        })

        toast({
          title: "Success",
          description: "Assigned user updated successfully",
          variant: "default",
        })
      } else {
        throw new Error(result.msg || "Failed to update assigned user")
      }
    } catch (error) {
      console.error("Error updating assigned user:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update assigned user",
        variant: "destructive",
      })
    }
  }

  const handleStageUpdate = async (leadId: string, newStageValue: string) => {
    const storedData = localStorage.getItem('map_user')
    if (!storedData) return

    const userData = JSON.parse(storedData)
    const token = userData.access_token

    try {
      const lead = leadsData.find((item) => item._id === leadId)
      if (!lead) return

      const matchedStage = getStageOptionsForLead(lead, leadStatusSettings).find(
        (option) => option.value === newStageValue
      )
      const stageLabel = matchedStage?.label || newStageValue

      const payload: Record<string, string> = {
        stage: newStageValue,
      }

      if (lead.lead_status) {
        payload.lead_status = String(lead.lead_status)
      }

      const response = await fetch(`${URLS.LEAD_UPDATE}/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      })

      const result = await parseJsonResponse<{ code?: number; msg?: string }>(response)

      if (!response.ok || result.code !== 200) {
        throw new Error(result.msg || `Lead stage update failed: ${response.status}`)
      }

      setLeadsData((prevLeads) =>
        prevLeads.map((item) =>
          item._id === leadId
            ? {
                ...item,
                stage: stageLabel,
                stages: stageLabel,
              }
            : item
        )
      )

      const fromText = getLeadStageValue(lead) || "None"

      await addTimelineActivity({
        category_name: 'stage',
        action: 'update',
        associate_to: 'lead',
        associate_id: leadId,
        from_data: getLeadStageValue(lead),
        to_data: newStageValue,
        text_info: `Updated stage from "${fromText}" to "${stageLabel}"`
      })

      toast({
        title: "Success",
        description: "Lead stage updated successfully",
        variant: "default",
      })
    } catch (error) {
      console.error('Error updating lead stage:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update lead stage",
        variant: "destructive",
      })
    }
  }

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Function to handle action button clicks
  const handleActionClick = (lead: Lead, action: "note" | "email" | "viewNotes") => {
    setSelectedLead(lead);
    setSelectedLeadId(lead._id); // Store the lead ID
    setSelectedAction(action);
  
    if (action === "viewNotes") {
      setNotesDrawerOpen(true);
    } else if (action === "email") {
      setIsEmailSheetOpen(true);
    } else {
      setActionDrawerOpen(true);
    }
  }

  // Function to open delete confirmation dialog
  const handleDeleteClick = (lead: Lead) => {
    setLeadToDelete(lead);
    setDeleteDialogOpen(true);
  }

  // Function to handle lead deletion
  const handleDeleteLead = async () => {
    if (!leadToDelete || isDeletingLead) return;

    setIsDeletingLead(true);

    try {
      const token = JSON.parse(localStorage.getItem('map_user') || '{}').access_token;
      if (!token) throw new Error("Token not found");

      const response = await fetch(
        `${URLS.BULK_DELETE_LEADS}?associate_id=${leadToDelete._id}&associate_to=lead`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await parseJsonResponse(response);

      if (data.code === 200) {
        addTimelineActivity({
          category_name: 'delete',
          action: 'delete',
          text_info: `Lead Deleted: ${leadToDelete.name}`,
          associate_id: leadToDelete._id,
          associate_to: 'lead',
        });

        toast({
          title: "Success",
          description: data.msg || "Lead deleted successfully",
          variant: "default",
        });

        setLeadsData(prevLeads => prevLeads.filter(l => l._id !== leadToDelete._id));
        setTotalCount(prev => {
          const newTotal = prev - 1;
          onTotalCountChange?.(newTotal);
          return newTotal;
        });
        setSearchCount(prev => {
          const newCount = prev - 1;
          onFilteredCountChange?.(newCount);
          return newCount;
        });

        setDeleteDialogOpen(false);
        setLeadToDelete(null);
      } else {
        throw new Error(data.msg || "Failed to delete lead");
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete lead",
        variant: "destructive",
      });
    } finally {
      setIsDeletingLead(false);
    }
  }

 // Function to handle opening task sheet
 const handleOpenTaskSheet = (lead: Lead) => {
    setSelectedLead(lead)
    setIsTaskSheetOpen(true)
  }


  const completeTaskWithDetails = async () => {
    try {
      const token = JSON.parse(localStorage.getItem('map_user') || '{}').access_token;
      if (!token) throw new Error("Token not found");

      const taskData = {
        note: completionNote,
        associate_id: selectedLead?._id,
        associate_to: 'lead',
        in_time: inTime,
        out_time: outTime
      };

      const response = await fetch(`${URLS.TASKS_COMPLETED}/${selectedLead?.next_followup_dates?.[0]?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(taskData)
      });

      const data = await parseJsonResponse(response);
      
      if (data.code === 200) {

        // Add to timeline
        addTimelineActivity({
          category_name: 'task',
          action: 'update',
          text_info: 'Task Completed',
          associate_id: selectedLead?._id || '',
          associate_to: 'lead'
        });

        toast({
          title: "Success",
          description: "Task completed successfully",
          variant: "default",
        });
        setTaskCompletionDrawerOpen(false);
        // Refetch leads locally instead of reloading the page
        fetchLeads();
      } else {
        throw new Error(data.msg || "Failed to complete task");
      }
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete task",
        variant: "destructive",
      });
    }
  };

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

      const data = await parseJsonResponse(response);
      
      if (data.code === 200) {

        // Add to timeline
        addTimelineActivity({
          category_name: 'task',
          action: 'update',
          text_info: 'Task Updated',
          associate_id: leadId,
          associate_to: 'lead'
        });

        setLeadsData((prevLeads) =>
          prevLeads.map((lead) => {
            if (lead._id === leadId) {
              const formattedDate = newDate ? format(newDate, "dd MMM") : null
              return { ...lead, nextFollowup: formattedDate }
            }
            return lead
          }),
        )

        toast({
          title: data.msg || (newDate ? "Followup Date Updated" : "Followup Date Removed"),
          variant: "default",
        })
        // Refetch leads locally instead of reloading the page
        fetchLeads();
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

  // toast({
  //     title: newDate ? "Followup Date Updated" : "Followup Date Removed",
  //     description: newDate
  //       ? `Followup date set to ${format(newDate, "dd MMMM yyyy")}`
  //       : "Followup date has been removed",
  //     variant: "default",
  //   })
  // }

  // // Frontend sorting fallback function
  // const sortLeadsData = (data: Lead[], column: string, direction: "asc" | "desc") => {
  //   return [...data].sort((a, b) => {
  //     let aValue: any = a[column as keyof Lead];
  //     let bValue: any = b[column as keyof Lead];

  //     // Handle null/undefined values
  //     if (aValue == null && bValue == null) return 0;
  //     if (aValue == null) return direction === "asc" ? -1 : 1;
  //     if (bValue == null) return direction === "asc" ? 1 : -1;

  //     // Handle date sorting
  //     if (column === "create_date" || column === "next_followup") {
  //       aValue = new Date(aValue).getTime();
  //       bValue = new Date(bValue).getTime();
  //     }
      
  //     // Handle numeric sorting
  //     if (column === "date_aging") {
  //       aValue = typeof aValue === 'string' ? parseInt(aValue) : aValue;
  //       bValue = typeof bValue === 'string' ? parseInt(bValue) : bValue;
  //     }

  //     // Handle string sorting
  //     if (typeof aValue === 'string' && typeof bValue === 'string') {
  //       aValue = aValue.toLowerCase();
  //       bValue = bValue.toLowerCase();
  //     }

  //     if (aValue < bValue) return direction === "asc" ? -1 : 1;
  //     if (aValue > bValue) return direction === "asc" ? 1 : -1;
  //     return 0;
  //   });
  // }

  // Get visible leads based on the current range (no frontend filtering needed since backend handles it)
  const visibleLeads = useMemo(() => {
    return leadsData
  }, [leadsData])

  // Update the getStatusBadgeClass function to handle "Lost" instead of "Not Qualified"
  // const getStatusBadgeClass = (status: string) => {
  //   switch (status.toLowerCase()) {
  //     case "new":
  //       return "bg-blue-100 text-blue-800 hover:bg-blue-200"
  //     case "contacted":
  //       return "bg-purple-100 text-purple-800 hover:bg-purple-200"
  //     case "qualified":
  //       return "bg-green-100 text-green-800 hover:bg-green-200"
  //     case "proposal":
  //       return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
  //     case "negotiation":
  //       return "bg-orange-100 text-orange-800 hover:bg-orange-200"
  //     case "closed won":
  //       return "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
  //     case "closed lost":
  //       return "bg-red-100 text-red-800 hover:bg-red-200"
  //     case "lost":
  //       return "bg-red-100 text-red-800 hover:bg-red-200"
  //     default:
  //       return "bg-gray-100 text-gray-800 hover:bg-gray-200"
  //   }
  // }


  // Render SendEmail component when email action is triggered
  const renderSendEmail = () => {
    if (isEmailSheetOpen && selectedLead) {
      return (
        <SendEmail
          initialContact={{
            _id: selectedLead._id,
            contact_name: selectedLead.name,
            email: selectedLead.email,
            associate_to: 'lead'
          }}
          isOpen={isEmailSheetOpen}
          onOpenChange={setIsEmailSheetOpen}
        />
      )
    }
    return null
  }

  // Mobile card view renderer
  const renderMobileCard = (lead: Lead) => (
    <Card key={lead._id} className="mb-3 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <Link
              href={`/lead/detail/${lead._id}`}
              className="text-primary font-semibold hover:underline hover:text-primary/80 text-base block break-words whitespace-normal"
            >
              {lead.name}
            </Link>
            {lead.lead_no && (
              <p className="text-xs text-muted-foreground mt-1">Lead No: {lead.lead_no}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                title="Actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  handleActionClick(lead, "note")
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Add Note
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  handleActionClick(lead, "email")
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteClick(lead)
                }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          {displayColumns
            .filter((col) => col.key !== "name" && col.key !== "lead_no")
            .map((col) => {
              const column = col.key
              const columnLabel = col.name
              
              // Status column
              if (isColumnMatch(column, "lead_status_name")) {
                return (
                  <div key={column} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{columnLabel}:</span>
                    <LeadStatusDropdown
                      lead={lead}
                      statusOptions={leadStatusOptions}
                      onStatusChange={handleStatusUpdate}
                    />
                  </div>
                )
              }

              if (isColumnMatch(column, "customer_type_name", "customer_type")) {
                return (
                  <div key={column} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{columnLabel}:</span>
                    <LeadCustomerTypeDropdown
                      lead={lead}
                      customerTypeOptions={customerTypeOptions}
                      onCustomerTypeChange={handleCustomerTypeUpdate}
                    />
                  </div>
                )
              }

              if (isColumnMatch(column, "assigned_to")) {
                return (
                  <div key={column} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{columnLabel}:</span>
                    <LeadAssignedToDropdown
                      lead={lead}
                      assignedToOptions={assignedToOptions}
                      onAssignedToChange={handleAssignedToUpdate}
                    />
                  </div>
                )
              }

              // Stages column
              if (isColumnMatch(column, "stage", "stages")) {
                return (
                  <div key={column} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{columnLabel}:</span>
                    <LeadStageDropdown
                      lead={lead}
                      leadStatusSettings={leadStatusSettings}
                      onStageChange={handleStageUpdate}
                    />
                  </div>
                )
              }

              // Phone column
              if (isColumnMatch(column, "phone")) {
                const phoneNumber = String(lead[column] ?? "").trim()

                return (
                  <div key={column} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{columnLabel}:</span>
                    {phoneNumber ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <a
                          href={`tel:${phoneNumber}`}
                          className="text-primary hover:underline hover:text-primary/80 text-sm whitespace-nowrap"
                          title={phoneNumber}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {phoneNumber}
                        </a>
                        <a
                          href={`https://wa.me/${phoneNumber.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-md p-1 hover:bg-muted"
                          title="WhatsApp"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <WhatsAppIcon className="h-4 w-4" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </div>
                )
              }

              // Email column
              if (isColumnMatch(column, "email")) {
                return (
                  <div key={column} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{columnLabel}:</span>
                    {lead[column] ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActionClick(lead, "email");
                        }}
                        className="text-primary hover:underline text-sm text-left break-words whitespace-normal"
                      >
                        {lead[column]}
                      </button>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </div>
                )
              }

              // Date ageing column
              if (isColumnMatch(column, "date_aging")) {
                return (
                  <div key={column} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{columnLabel}:</span>
                    <DateAgeingBadge ageingValue={lead.date_aging} date={lead.create_date} />
                  </div>
                )
              }

              // Next followup column
              if (isColumnMatch(column, "next_followup")) {
                const followup = lead.next_followup_dates?.[0]
                const parsedFollowup = hasFollowupDate(followup)
                  ? parseFollowupDate(followup!.date)
                  : null
                const isExpired = parsedFollowup
                  ? parsedFollowup < startOfDay(new Date())
                  : false

                return (
                  <div key={column} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{columnLabel}:</span>
                    <div className="flex items-center gap-1.5">
                      {hasFollowupDate(followup) ? (
                        <>
                          <Clock className={`h-3.5 w-3.5 ${isExpired ? "text-destructive" : "text-primary"}`} />
                          <span
                            className="text-sm font-medium cursor-pointer"
                            onClick={() => {
                              setSelectedLead(lead)
                              setShowEditDrawer(true)
                            }}
                          >
                            {formatFollowupDateDisplay(followup.date)}
                          </span>
                        </>
                      ) : (
                        <div
                          className="flex items-center gap-1.5 text-muted-foreground text-sm cursor-pointer"
                          onClick={() => handleOpenTaskSheet(lead)}
                        >
                          <CalendarIcon className="h-3.5 w-3.5" />
                          <span>Set date</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }


              // Latest notes column
              if (isColumnMatch(column, "latest_notes")) {
                const latestNotes = getLatestNotesDisplayValue(lead)
                return (
                  <div key={column} className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground w-20 flex-shrink-0 pt-0.5">{columnLabel}:</span>
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      {latestNotes ? (
                        <span className="text-sm line-clamp-2 break-words leading-snug" title={latestNotes}>
                          {latestNotes}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleActionClick(lead, "viewNotes")
                        }}
                        className="text-primary hover:underline hover:text-primary/80 text-sm w-fit"
                      >
                        {latestNotes ? "View all" : "View Notes"}
                      </button>
                    </div>
                  </div>
                )
              }

              if (isColumnMatch(column, "customer_requirement_name", "customer_requirement")) {
                return (
                  <div key={column} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{columnLabel}:</span>
                    <CustomerRequirementValue
                      value={getCustomerRequirementDisplayValue(lead, customerRequirementOptions)}
                    />
                  </div>
                )
              }

              if (isColumnMatch(column, "project_name")) {
                const projectName = lead.project_name || lead.company_name
                return (
                  <div key={column} className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground w-20 flex-shrink-0 pt-0.5">{columnLabel}:</span>
                    <span className="text-sm flex-1 min-w-0 break-words whitespace-normal">
                      {renderTruncatedText(projectName, { lines: 2 })}
                    </span>
                  </div>
                )
              }

              // Default rendering for other columns
              const cellValue = getLeadFieldValue(lead, column)
              const wrapColumns = ["company_name", "project_name", "location", "description", "address1", "address2", "s_address1", "s_address2"];
              return (
                <div key={column} className={cn("flex gap-2", wrapColumns.includes(column) ? "items-start" : "items-center")}>
                  <span className={cn("text-xs text-muted-foreground w-20 flex-shrink-0", wrapColumns.includes(column) ? "pt-1" : "")}>{columnLabel}:</span>
                  <span className={cn("text-sm flex-1 min-w-0", wrapColumns.includes(column) ? "break-words whitespace-normal" : "")}>
                    {cellValue || "-"}
                  </span>
                </div>
              )
            })}
        </div>
      </CardContent>
    </Card>
  )

  // Simple loading spinner component
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  )


  return (
    <div className="relative flex h-full min-h-0 w-full flex-col" ref={tableRef}>
      {renderSendEmail()}
      {selectedLead && (
        <>
          <AddTaskSheetList
            module="lead"
            open={isTaskSheetOpen}
            onOpenChange={setIsTaskSheetOpen}
            onAddTask={() => {
              handleTaskAdded()
            }}
            associateId={selectedLead._id}
            entityName={selectedLead.name}
            nextFollowup={selectedLead.next_followup_dates?.[0] ?? null}
          />
          <EditTaskSheetList
            module="lead"
            open={showEditDrawer}
            onOpenChange={setShowEditDrawer}
            onEditTask={() => {
              // Refresh data after task edit without page reload
              handleTaskMutation()
            }}
            onCompleteTask={() => {
              // Refresh data after task completion without page reload
              handleTaskMutation()
            }}
            taskId={selectedLead?.next_followup_dates?.[0]?.id}
            associateId={selectedLead?._id}
            entityName={selectedLead?.name}
          />
        </>
      )}
      {/* Mobile Card View */}
      {isMobile ? (
        <div className="space-y-0">
          {isLoading && leadsData.length === 0 ? (
            <div className="py-10 text-center">
              <LoadingSpinner />
            </div>
          ) : leadsData.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No leads found for the selected filters.
            </div>
          ) : (
            <>
              {leadsData.map((lead: Lead) => renderMobileCard(lead))}
              {isLoadingMore && hasMore && (
                <div className="py-8 text-center">
                  <LoadingSpinner />
                </div>
              )}
              {hasMore && <div ref={observerTarget} className="h-4" />}
            </>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
        <table
          className="w-full caption-bottom border-collapse text-sm table-auto"
          style={{ minWidth: `${tableMinWidth}px` }}
        >
          <colgroup>
            {displayColumns.map((col) => {
              const minWidth = getColumnMinWidthPx(col.key, col.name)
              return <col key={col.key} style={{ minWidth: `${minWidth}px`, width: `${minWidth}px` }} />
            })}
            <col style={{ minWidth: `${ACTIONS_COLUMN_WIDTH}px`, width: `${ACTIONS_COLUMN_WIDTH}px` }} />
          </colgroup>
          <thead className="border-0 [&_tr]:border-0 [&_th]:border-0">
            <tr className="border-0">
              {displayColumns.map((col) => (
                <th key={col.key} className={getColumnHeadClass(col.key, isCompactView)}>
                  {col.name}
                </th>
              ))}
              <th className={getColumnHeadClass("actions", isCompactView)}>Actions</th>
            </tr>
          </thead>
        <TableBody className="[&_tr:first-child]:border-t-0">
          {isLoading && leadsData.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={displayColumns.length + 1}
                className="p-0"
              >
                <LoadingSpinner />
              </TableCell>
            </TableRow>
          ) : leadsData.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={displayColumns.length + 1}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                No leads found for the selected filters.
              </TableCell>
            </TableRow>
          ) : (
            <>
              {leadsData.map((lead: Lead) => (
                <TableRow
                  key={lead._id}
                  className="hover:bg-muted/50 relative"
                  style={isCompactView ? { height: "40px" } : {}}
                >
                  {displayColumns.map((col) => {
                    const column = col.key
                    const wrap = getColumnWrap(column)
                      if (isColumnMatch(column, "name")) {
                        return (
                          <LeadsTableCell key={column} column={column} isCompactView={isCompactView} wrap={wrap}>
                            <Link
                              href={`/lead/detail/${lead._id}`}
                              className="text-primary font-medium hover:underline hover:text-primary/80 cursor-pointer line-clamp-2 min-w-0 break-words leading-snug"
                              title={lead.name}
                            >
                              {lead.name}
                            </Link>
                          </LeadsTableCell>
                        )
                      }

                      if (isColumnMatch(column, "lead_no")) {
                        return (
                          <LeadsTableCell
                            key={column}
                            column={column}
                            isCompactView={isCompactView}
                            className="min-w-[88px]"
                          >
                            <span className="whitespace-nowrap">{lead.lead_no || "-"}</span>
                          </LeadsTableCell>
                        )
                      }

                      if (isColumnMatch(column, "lead_status_name")) {
                        return (
                          <LeadsTableCell key={column} column={column} isCompactView={isCompactView}>
                            <LeadStatusDropdown
                              lead={lead}
                              statusOptions={leadStatusOptions}
                              onStatusChange={handleStatusUpdate}
                            />
                          </LeadsTableCell>
                        );
                      }

                      if (isColumnMatch(column, "stage", "stages")) {
                        return (
                          <LeadsTableCell key={column} column={column} isCompactView={isCompactView}>
                            <LeadStageDropdown
                              lead={lead}
                              leadStatusSettings={leadStatusSettings}
                              onStageChange={handleStageUpdate}
                            />
                          </LeadsTableCell>
                        );
                      }

                      if (isColumnMatch(column, "customer_type_name", "customer_type")) {
                        return (
                          <LeadsTableCell key={column} column={column} isCompactView={isCompactView}>
                            <LeadCustomerTypeDropdown
                              lead={lead}
                              customerTypeOptions={customerTypeOptions}
                              onCustomerTypeChange={handleCustomerTypeUpdate}
                            />
                          </LeadsTableCell>
                        );
                      }

                      if (isColumnMatch(column, "assigned_to")) {
                        return (
                          <LeadsTableCell key={column} column={column} isCompactView={isCompactView}>
                            <LeadAssignedToDropdown
                              lead={lead}
                              assignedToOptions={assignedToOptions}
                              onAssignedToChange={handleAssignedToUpdate}
                            />
                          </LeadsTableCell>
                        );
                      }

                    if (isColumnMatch(column, "phone")) {
                      const phoneNumber = String(lead[column] ?? "").trim()

                      return (
                        <LeadsTableCell
                          key={column}
                          column={column}
                          isCompactView={isCompactView}
                          className="min-w-[140px]"
                        >
                          {phoneNumber ? (
                            <div className="flex items-center gap-1.5">
                              <a
                                href={`tel:${phoneNumber}`}
                                className="text-primary hover:underline hover:text-primary/80 whitespace-nowrap"
                                title={phoneNumber}
                                onClick={(e) => {
                                  e.stopPropagation()
                                }}
                              >
                                {phoneNumber}
                              </a>
                              <a
                                href={`https://wa.me/${phoneNumber.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 rounded-md p-1 hover:bg-muted"
                                title="WhatsApp"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <WhatsAppIcon className="h-4 w-4" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </LeadsTableCell>
                      );
                    }

                    if (isColumnMatch(column, "email")) {
                      return (
                        <LeadsTableCell key={column} column={column} isCompactView={isCompactView} wrap={wrap}>
                          {lead[column] ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleActionClick(lead, "email");
                              }}
                              className="min-w-0 truncate text-left text-primary hover:underline"
                              title={lead[column]}
                            >
                              {lead[column]}
                            </button>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </LeadsTableCell>
                      );
                    }

                    if (isColumnMatch(column, "customer_requirement_name", "customer_requirement")) {
                      return (
                        <LeadsTableCell key={column} column={column} isCompactView={isCompactView}>
                          <CustomerRequirementValue
                            value={getCustomerRequirementDisplayValue(lead, customerRequirementOptions)}
                          />
                        </LeadsTableCell>
                      );
                    }

                    if (isColumnMatch(column, "project_name")) {
                      const projectName = lead.project_name || lead.company_name
                      return (
                        <LeadsTableCell key={column} column={column} isCompactView={isCompactView} wrap={wrap}>
                          {renderTruncatedText(projectName, { lines: 2 })}
                        </LeadsTableCell>
                      );
                    }

                    if (isColumnMatch(column, "create_date")) {
                      return (
                        <LeadsTableCell key={column} column={column} isCompactView={isCompactView}>
                          {lead.create_date || "-"}
                        </LeadsTableCell>
                      );
                    }

                    if (isColumnMatch(column, "date_aging")) {
                      return (
                        <LeadsTableCell key={column} column={column} isCompactView={isCompactView}>
                          <DateAgeingBadge ageingValue={lead.date_aging} date={lead.create_date} />
                        </LeadsTableCell>
                      );
                    }

                    if (isColumnMatch(column, "next_followup")) {
                      const followup = lead.next_followup_dates?.[0]
                      const parsedFollowup = hasFollowupDate(followup)
                        ? parseFollowupDate(followup!.date)
                        : null
                      const isExpired = parsedFollowup
                        ? parsedFollowup < startOfDay(new Date())
                        : false

                      return (
                        <LeadsTableCell key={column} column={column} isCompactView={isCompactView}>
                          <Popover>
                            <PopoverTrigger asChild>
                              <div className="flex items-center gap-1.5 cursor-pointer hover:bg-muted/50 p-1 rounded-md">
                                {hasFollowupDate(followup) ? (
                                  <>
                                    <Clock className={`h-3.5 w-3.5 ${isExpired ? "text-destructive" : "text-primary"}`} />
                                    <span
                                      className="font-medium"
                                      onClick={() => {
                                        setSelectedLead(lead)
                                        setShowEditDrawer(true)
                                      }}
                                    >
                                      {formatFollowupDateDisplay(followup.date)}
                                    </span>
                                  </>
                                ) : (
                                  <div
                                    className="flex items-center gap-1.5 text-muted-foreground text-sm cursor-pointer"
                                    onClick={() => handleOpenTaskSheet(lead)}
                                  >
                                    <CalendarIcon className="h-3.5 w-3.5" />
                                    <span>Set date</span>
                                  </div>
                                )}
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              {/* <Calendar
                                mode="single"
                                selected={Array.isArray(lead.next_followup_dates) && lead.next_followup_dates.length > 0
                                  ? parse(lead.next_followup_dates[0].date, 'dd/MM/yyyy', new Date())
                                  : undefined}
                                onSelect={(date) => updateLeadFollowupDate(lead._id, lead.next_followup_dates?.[0]?.id || lead._id, date)}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              /> */}
                                {/* Task Completion Drawer */}
                                <Sheet open={taskCompletionDrawerOpen} onOpenChange={setTaskCompletionDrawerOpen}>
                                  <SheetContent className="sm:max-w-md">
                                    <SheetHeader>
                                      <SheetTitle>Complete Task</SheetTitle>
                                      <SheetDescription>Add notes before completing this task</SheetDescription>
                                    </SheetHeader>

                                    <div className="grid gap-4 py-4 pb-20">
                                      {/* Show In Time and Out Time fields in a single row only for Visit type tasks */}
                                      {selectedTaskType === "Visit" && (
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="grid gap-2">
                                            <Label htmlFor="in-time">In Time</Label>
                                            <Select value={inTime} onValueChange={setInTime}>
                                              <SelectTrigger id="in-time">
                                                <SelectValue placeholder="Select in time" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {Array.from({ length: 24 * 4 }).map((_, index) => {
                                                  const hour = Math.floor(index / 4)
                                                  const minute = (index % 4) * 15
                                                  const formattedHour = hour.toString().padStart(2, "0")
                                                  const formattedMinute = minute.toString().padStart(2, "0")
                                                  const timeValue = `${formattedHour}:${formattedMinute}`
                                                  const displayTime = `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:${formattedMinute} ${hour >= 12 ? "PM" : "AM"}`

                                                  return (
                                                    <SelectItem key={`in-${index}`} value={timeValue}>
                                                      {displayTime}
                                                    </SelectItem>
                                                  )
                                                })}
                                              </SelectContent>
                                            </Select>
                                          </div>

                                          <div className="grid gap-2">
                                            <Label htmlFor="out-time">Out Time</Label>
                                            <Select value={outTime} onValueChange={setOutTime}>
                                              <SelectTrigger id="out-time">
                                                <SelectValue placeholder="Select out time" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {Array.from({ length: 24 * 4 }).map((_, index) => {
                                                  const hour = Math.floor(index / 4)
                                                  const minute = (index % 4) * 15
                                                  const formattedHour = hour.toString().padStart(2, "0")
                                                  const formattedMinute = minute.toString().padStart(2, "0")
                                                  const timeValue = `${formattedHour}:${formattedMinute}`
                                                  const displayTime = `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:${formattedMinute} ${hour >= 12 ? "PM" : "AM"}`

                                                  return (
                                                    <SelectItem key={`out-${index}`} value={timeValue}>
                                                      {displayTime}
                                                    </SelectItem>
                                                  )
                                                })}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                      )}

                                      <div className="grid gap-2">
                                        <Label htmlFor="completion-notes">Completion Notes</Label>
                                        <Textarea
                                          id="completion-notes"
                                          placeholder="Add notes about this task completion"
                                          value={completionNote}
                                          onChange={(e) => setCompletionNote(e.target.value)}
                                          className="min-h-[120px]"
                                        />
                                      </div>

                                      {/* <div className="grid gap-2">
                                        <Label htmlFor="next-followup">Next Follow-up Date (Optional)</Label>
                                        <Input 
                                          type="date"
                                          value={nextFollowUpDate ? format(nextFollowUpDate, 'yyyy-MM-dd') : ''}
                                          onChange={(e) => {
                                            const date = new Date(e.target.value);
                                            setNextFollowUpDate(date);
                                            updateLeadFollowupDate(lead._id, lead.next_followup_dates?.[0]?.id || '', date);
                                          }}
                                        />
                                      </div> */}
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t">
                                      <div className="flex justify-end gap-2">
                                        <SheetClose asChild>
                                          <Button variant="outline">Cancel</Button>
                                        </SheetClose>
                                        <Button
                                          type="submit"
                                          onClick={completeTaskWithDetails}
                                          disabled={selectedTaskType === "Visit" && (!inTime || !outTime)}
                                        >
                                          Complete Task
                                        </Button>
                                      </div>
                                    </div>
                                  </SheetContent>
                                </Sheet>
                            </PopoverContent>
                          </Popover>
                        </LeadsTableCell>
                      );
                    }

                    if (isColumnMatch(column, "description")) {
                      return (
                        <LeadsTableCell
                          key={column}
                          column={column}
                          isCompactView={isCompactView}
                          wrap={wrap}
                        >
                          {renderTruncatedText(lead.description, { lines: 2 })}
                        </LeadsTableCell>
                      );
                    }

                    if (isColumnMatch(column, "latest_notes")) {
                      const latestNotes = getLatestNotesDisplayValue(lead)
                      return (
                        <LeadsTableCell key={column} column={column} isCompactView={isCompactView} wrap>
                          <div className="flex flex-col gap-1 min-w-0 w-full">
                            {latestNotes ? (
                              renderTruncatedText(latestNotes, { lines: 2 })
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleActionClick(lead, "viewNotes")
                              }}
                              className="text-primary hover:underline hover:text-primary/80 w-fit"
                            >
                              {latestNotes ? "View all" : "View Notes"}
                            </button>
                          </div>
                        </LeadsTableCell>
                      );
                    }

                    if (isColumnMatch(column, "url")) {
                      const urlValue = String(lead.url ?? "").trim()
                      return (
                        <LeadsTableCell key={column} column={column} isCompactView={isCompactView} wrap={wrap}>
                          {urlValue ? (
                            <a
                              href={urlValue.startsWith("http") ? urlValue : `https://${urlValue}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline truncate block"
                              title={urlValue}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {urlValue}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </LeadsTableCell>
                      )
                    }

                    // Default rendering for other columns
                    const cellValue = getLeadFieldValue(lead, column)
                    return (
                      <LeadsTableCell
                        key={column}
                        column={column}
                        isCompactView={isCompactView}
                        wrap={wrap}
                      >
                        {renderTruncatedText(cellValue)}
                      </LeadsTableCell>
                    );
                  })}

                  {/* Add a dedicated cell for actions */}
                  <LeadsTableCell column="actions" isCompactView={isCompactView}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleActionClick(lead, "note")
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Add Note
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleActionClick(lead, "email")
                            }}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClick(lead)
                            }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                  </LeadsTableCell>
                </TableRow>
              ))}

              {/* Loading indicator at the bottom for infinite scrolling */}
              {isLoadingMore && hasMore && (
                <TableRow>
                  <TableCell
                    colSpan={displayColumns.length + 1}
                    className="p-0"
                  >
                    <LoadingSpinner />
                  </TableCell>
                </TableRow>
              )}

              {/* Intersection observer target - only render when there's more data */}
              {hasMore && (
                <tr>
                  <td colSpan={displayColumns.length + 1}>
                    <div ref={observerTarget} className="h-4" />
                  </td>
                </tr>
              )}
            </>
          )}
        </TableBody>
      </table>
        </div>
      )}

      {/* Add the action drawer */}
      <LeadActionDrawer
        open={actionDrawerOpen}
        onOpenChange={setActionDrawerOpen}
        actionType={selectedAction}
        onNoteSaved={fetchLeads}
        lead={selectedLead ? {
          _id: selectedLead._id,
          name: selectedLead.name,
          companyName: selectedLead.company_name || '',
          email: selectedLead.email
        } : null}
      />

      {/* Add the notes drawer */}
      <ShowNotesDrawer 
        open={notesDrawerOpen} 
        onOpenChange={setNotesDrawerOpen} 
        entityName={selectedLead?.name}
        associateId={selectedLead?._id || ""}
        associateTo="lead"
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the lead "{leadToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeletingLead}
              onClick={() => {
              setDeleteDialogOpen(false);
              setLeadToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLead}
              disabled={isDeletingLead}
              className="bg-destructive text-white hover:bg-destructive/90 focus:ring-destructive"
            >
              {isDeletingLead ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
