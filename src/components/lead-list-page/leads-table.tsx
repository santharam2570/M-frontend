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
import { format, isPast, isToday, isWithinInterval, parse, startOfDay, endOfWeek, startOfWeek } from "date-fns"
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
import {
  enrichLeadsWithFollowupMap,
  enrichLeadsWithOpenTasks,
  fetchOverdueFollowupMap,
  fetchThisWeekFollowupMap,
  fetchTodayFollowupMap,
  invalidateOpenTasksFollowupCache,
} from "@/lib/leads/enrich-leads-followup"
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
import { useLeadPermissions } from "@/hooks/useLeadPermissions"
import { Card, CardContent } from "@/components/ui/card"
import {
  getOrgIdFromAuth,
  getUserBranchId,
  type StoredAuthUser,
} from "@/lib/auth"
import {
  buildLeadViewScopeFilters,
  filterLeadsByViewScope,
  getCurrentUserIdentity,
  getTeamUserIdsForBranch,
  requiresLeadViewScopeFilter,
  type LeadUserIdentity,
  type LeadViewScope,
  type LeadViewScopeFilterOptions,
} from "@/lib/leads/lead-permissions"
import {
  buildUserBranchMap,
  filterAssignableUsersForLead,
  mapAssignableUsersToDropdownOptions,
  type AssignableUser,
} from "@/lib/users/assignable-users"
import {
  LEAD_SETTINGS_QUERY_KEY,
  assignableUsersQueryKey,
  fetchCachedAssignableUsers,
  fetchLeadSettingsList,
} from "@/lib/leads/lead-shared-queries"
import {
  type ColumnPref,
  DEFAULT_VISIBLE_KEYS,
  MAX_VISIBLE_COLUMNS,
  normalizeColumnKey,
  resolveColumnHeader,
} from "./columns-dropdown"


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
  lead_status?: string
  stage?: string
  customer_type?: string
  purpose?: string
  source?: string
  assigned_to?: string
  branch_id?: string
  start_date?: string
  end_date?: string
  create_date?: string
  create_by?: string
  [key: string]: string | undefined
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
const TABLE_HEADER_HEIGHT_PX = 56
const TABLE_ROW_HEIGHT_PX = 56
const TABLE_COMPACT_HEADER_HEIGHT_PX = 40
const TABLE_COMPACT_ROW_HEIGHT_PX = 40

function getTableScrollMaxHeight(isCompactView: boolean): number {
  const headerHeight = isCompactView ? TABLE_COMPACT_HEADER_HEIGHT_PX : TABLE_HEADER_HEIGHT_PX
  const rowHeight = isCompactView ? TABLE_COMPACT_ROW_HEIGHT_PX : TABLE_ROW_HEIGHT_PX
  return headerHeight + rowHeight * PAGE_SIZE
}

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
// How long the cached default view is considered fresh. Within this window,
// navigating back to the lead list reuses the cached rows without re-fetching.
const LEADS_DEFAULT_CACHE_TTL = 5 * 60 * 1000

function buildLeadsDefaultCacheKey(
  viewScope: LeadViewScope,
  userId?: string,
  branchId?: string,
) {
  return ["leads", "default-view", viewScope, userId ?? "anonymous", branchId ?? "no-branch"] as const
}

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

async function fetchLeadAssignableUsers(token: string, orgId?: number): Promise<AssignableUser[]> {
  return fetchCachedAssignableUsers(token, orgId)
}

function mergeAssignableUsersFromLeads(
  current: AssignableUser[],
  leads: Lead[],
): AssignableUser[] {
  const merged = new Map(current.map((user) => [user.id, user]))
  let changed = false

  leads.forEach((lead) => {
    const leadRecord = lead as Lead & Record<string, unknown>
    const id = getAssignedToIdFromLead(leadRecord)
    const name = getAssignedToNameFromLead(leadRecord)

    if (!name) return

    if (id && !merged.has(id)) {
      merged.set(id, { id, name })
      changed = true
      return
    }

    // Legacy rows may only have the assignee display name without an ObjectId.
    const legacyMatch = Array.from(merged.values()).find(
      (user) => user.name.trim().toLowerCase() === name.trim().toLowerCase(),
    )
    if (!legacyMatch && !id) {
      merged.set(name, { id: name, name })
      changed = true
    }
  })

  // Keep the same reference when nothing new was discovered so consumers
  // (fetchLeads deps / view-scope context) do not thrash and refetch.
  if (!changed) return current

  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name))
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

function normalizeDropdownLookupValue(value: unknown): string {
  if (value == null || value === "") return ""
  if (typeof value === "string") return value.trim()
  if (typeof value === "number" || typeof value === "boolean") return String(value).trim()
  return getSettingItemId(value) || getSettingItemName(value)
}

function getLeadSettingDropdownValue(
  lead: Lead,
  idField: "lead_status" | "customer_type" | "customer_requirement",
  nameField: "lead_status_name" | "customer_type_name" | "customer_requirement_name"
): string {
  const raw = lead as Lead & Record<string, unknown>
  return (
    getSettingIdFromApiField(raw, idField, nameField) ||
    normalizeDropdownLookupValue(raw[nameField]) ||
    normalizeDropdownLookupValue(raw[idField])
  )
}

function getLeadDropdownOption(
  options: LeadDropdownOption[],
  value?: unknown
): LeadDropdownOption | undefined {
  const normalized = normalizeDropdownLookupValue(value).toLowerCase()
  if (!normalized) return undefined

  return options.find(
    (option) =>
      option.value.toLowerCase() === normalized || option.label.toLowerCase() === normalized
  )
}

function getLeadDropdownColor(
  options: LeadDropdownOption[],
  value?: unknown,
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

const FOLLOWUP_TODAY_FIELDS = new Set(["followup_today", "today_followup"])
const FOLLOWUP_THIS_WEEK_FIELDS = new Set(["followup_this_week", "followups_this_week"])

function isFollowupTodayFilterActive(filters: LeadListFilter[]): boolean {
  return filters.some((filter) => FOLLOWUP_TODAY_FIELDS.has(filter.field ?? ""))
}

function isFollowupThisWeekFilterActive(filters: LeadListFilter[]): boolean {
  return filters.some((filter) => FOLLOWUP_THIS_WEEK_FIELDS.has(filter.field ?? ""))
}

function isOverdueFollowupFilterActive(filters: LeadListFilter[]): boolean {
  return filters.some((filter) => filter.field === "overdue_followup")
}

function getPrimaryFollowupDate(lead: Lead): Date | null {
  const followup = lead.next_followup_dates?.[0]
  if (!hasFollowupDate(followup)) return null
  return parseFollowupDate(followup!.date)
}

function leadHasFollowupToday(lead: Lead): boolean {
  const followupDate = getPrimaryFollowupDate(lead)
  return followupDate ? isToday(followupDate) : false
}

function leadHasFollowupThisWeek(lead: Lead): boolean {
  const followupDate = getPrimaryFollowupDate(lead)
  if (!followupDate) return false

  const now = new Date()
  return isWithinInterval(followupDate, {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  })
}

function leadHasOverdueFollowup(lead: Lead): boolean {
  const followupDate = getPrimaryFollowupDate(lead)
  return followupDate ? isPast(followupDate) && !isToday(followupDate) : false
}

function applyClientSideFilters(
  leads: Lead[],
  filters: LeadListFilter[],
  viewScope: LeadViewScope = "all",
  scopeOptions: LeadViewScopeFilterOptions = { identity: {} },
  skipViewScopeFilter = false,
): Lead[] {
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

  if (skipViewScopeFilter) return result

  return filterLeadsByViewScope(result, viewScope, scopeOptions)
}

function buildViewScopeApiFilters(
  viewScope: LeadViewScope,
  scopeOptions: LeadViewScopeFilterOptions,
  assignableUsers: AssignableUser[],
): LeadListFilter[] {
  const teamUserIds =
    viewScope === "team"
      ? getTeamUserIdsForBranch(scopeOptions.branchId, assignableUsers)
      : undefined

  return buildLeadViewScopeFilters(viewScope, {
    userId: scopeOptions.identity.id,
    branchId: scopeOptions.branchId,
    teamUserIds,
  })
}

function mergeLeadListFilters(
  userFilters: LeadListFilter[],
  scopeFilters: LeadListFilter[],
): LeadListFilter[] {
  if (scopeFilters.length === 0) return userFilters
  return [...scopeFilters, ...userFilters]
}

function usesLeadListLocalCount(
  filters: LeadListFilter[],
  viewScope: LeadViewScope,
  isSearching: boolean,
): boolean {
  return (
    Boolean(isSearching) ||
    hasClientSideFilters(filters) ||
    hasPostEnrichmentFollowupFilter(filters) ||
    requiresLeadViewScopeFilter(viewScope)
  )
}

function resolveLeadListCounts(options: {
  viewScope: LeadViewScope
  usesLocalCount: boolean
  enrichedLeadsLength: number
  searchCount?: number
  totalCount?: number
}): { searchCount: number; totalCount: number; filteredTotal: number } {
  const { viewScope, usesLocalCount, enrichedLeadsLength, searchCount, totalCount } = options

  if (usesLocalCount || requiresLeadViewScopeFilter(viewScope)) {
    return {
      searchCount: enrichedLeadsLength,
      totalCount: enrichedLeadsLength,
      filteredTotal: enrichedLeadsLength,
    }
  }

  const resolvedSearchCount = searchCount ?? totalCount ?? enrichedLeadsLength
  // Prefer the filtered search_count from lead_list over org-wide total_count.
  const resolvedTotalCount = resolvedSearchCount

  return {
    searchCount: resolvedSearchCount,
    totalCount: resolvedTotalCount,
    filteredTotal: resolvedSearchCount,
  }
}

function applyPostEnrichmentFilters(leads: Lead[], filters: LeadListFilter[]): Lead[] {
  let result = leads

  if (isFollowupTodayFilterActive(filters)) {
    result = result.filter(leadHasFollowupToday)
  }

  if (isFollowupThisWeekFilterActive(filters)) {
    result = result.filter(leadHasFollowupThisWeek)
  }

  if (isOverdueFollowupFilterActive(filters)) {
    result = result.filter(leadHasOverdueFollowup)
  }

  return result
}

function hasClientSideFilters(filters: LeadListFilter[]): boolean {
  return Boolean(getStageFilterValue(filters) || getCreateDateRangeFromFilters(filters))
}

function hasPostEnrichmentFollowupFilter(filters: LeadListFilter[]): boolean {
  return (
    isFollowupTodayFilterActive(filters) ||
    isFollowupThisWeekFilterActive(filters) ||
    isOverdueFollowupFilterActive(filters)
  )
}

function getLeadListFetchLength(
  filters: LeadListFilter[],
  isSearching: boolean,
  viewScope: LeadViewScope = "all",
): number {
  if (
    !isSearching &&
    !hasClientSideFilters(filters) &&
    !hasPostEnrichmentFollowupFilter(filters) &&
    !requiresLeadViewScopeFilter(viewScope)
  ) {
    return PAGE_SIZE
  }
  return 100
}

function shouldDisablePagination(
  filters: LeadListFilter[],
  isSearching: boolean,
  viewScope: LeadViewScope = "all",
): boolean {
  return usesLeadListLocalCount(filters, viewScope, isSearching)
}

function listShowsFollowupColumn(visibleColumns: ColumnPref[]): boolean {
  return visibleColumns.some((column) => normalizeColumnKey(column.key) === "next_followup")
}

async function enrichLeadsForListView(
  leads: Lead[],
  token: string,
  filters: LeadListFilter[],
  visibleColumns: ColumnPref[],
  signal?: AbortSignal,
): Promise<Lead[]> {
  if (leads.length === 0) return leads

  const followupMetricFilterActive = hasPostEnrichmentFollowupFilter(filters)
  const showFollowupColumn = listShowsFollowupColumn(visibleColumns)

  if (followupMetricFilterActive) {
    const followupMap = isFollowupTodayFilterActive(filters)
      ? await fetchTodayFollowupMap(token, signal)
      : isFollowupThisWeekFilterActive(filters)
        ? await fetchThisWeekFollowupMap(token, signal)
        : await fetchOverdueFollowupMap(token, signal)

    const enriched = enrichLeadsWithFollowupMap(leads, followupMap)
    return applyPostEnrichmentFilters(enriched, filters)
  }

  if (!showFollowupColumn) return leads

  return enrichLeadsWithOpenTasks(leads, token, { skipAssociatesFallback: true })
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
  if (typeof directValue === "object" && directValue !== null) {
    const id = getSettingItemId(directValue)
    if (id) return id
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
  const assignedLookup = raw.assigned
  if (Array.isArray(assignedLookup) && assignedLookup.length > 0) {
    const id = resolveLeadSettingId(
      assignedLookup[0] as { _id?: string | { $oid?: string }; id?: string | number },
    )
    if (id) return id
  }

  if (typeof raw.assigned_to === "object" && raw.assigned_to !== null) {
    const id = resolveLeadSettingId(
      raw.assigned_to as { _id?: string | { $oid?: string }; id?: string | number },
    )
    if (id) return id
  }

  if (typeof raw.assigned === "object" && raw.assigned !== null && !Array.isArray(raw.assigned)) {
    const id = resolveLeadSettingId(
      raw.assigned as { _id?: string | { $oid?: string }; id?: string | number },
    )
    if (id) return id
  }

  if (typeof raw.assigned_to === "string" && raw.assigned_to.trim()) {
    const value = raw.assigned_to.trim()
    if (/^[a-f0-9]{24}$/i.test(value)) return value
  }

  return ""
}

function getCompanyNameFromLead(raw: Lead & Record<string, unknown>): string {
  const fromCompanyName =
    getNamesFromApiField(raw.company_name) ||
    (typeof raw.company_name === "string" ? raw.company_name.trim() : "")
  if (fromCompanyName) return fromCompanyName

  const fromProjectName =
    getNamesFromApiField(raw.project_name) ||
    (typeof raw.project_name === "string" ? raw.project_name.trim() : "")
  if (fromProjectName) return fromProjectName

  const companyRef = raw.company
  if (companyRef != null && companyRef !== "") {
    const fromCompanyRef =
      getNamesFromApiField(companyRef) ||
      (typeof companyRef === "string" ? companyRef.trim() : "")
    if (fromCompanyRef) return fromCompanyRef
  }

  const leadType = String(raw.lead_type ?? "").trim().toLowerCase()
  if (leadType === "company") return ""

  const nameValue =
    getNamesFromApiField(raw.name) || (typeof raw.name === "string" ? raw.name.trim() : "")
  return nameValue
}

function getAssignedToNameFromLead(raw: Lead & Record<string, unknown>): string {
  if (typeof raw.assigned_to_name === "string" && raw.assigned_to_name.trim()) {
    return raw.assigned_to_name.trim()
  }

  const assignedLookup = raw.assigned
  if (Array.isArray(assignedLookup) && assignedLookup.length > 0) {
    const first = assignedLookup[0]
    if (typeof first === "object" && first !== null && "name" in first) {
      return String((first as { name?: string }).name ?? "").trim()
    }
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

  // Legacy API responses stored the display name in assigned_to.
  if (typeof raw.assigned_to === "string" && raw.assigned_to.trim()) {
    const value = raw.assigned_to.trim()
    if (!/^[a-f0-9]{24}$/i.test(value)) return value
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
  displayLabelOverride,
  readOnly = false,
}: {
  currentValue?: unknown
  placeholder: string
  options: LeadDropdownOption[]
  onChange: (value: string) => void
  triggerClassName?: string
  fallbackColor?: string
  displayLabelOverride?: string
  readOnly?: boolean
}) {
  const lookupValue = normalizeDropdownLookupValue(currentValue)
  const selectedOption = getLeadDropdownOption(options, currentValue)
  const displayLabel =
    displayLabelOverride?.trim() ||
    selectedOption?.label ||
    lookupValue ||
    placeholder
  const displayColor = getLeadDropdownColor(options, currentValue, fallbackColor)
  const hasValue = Boolean(displayLabelOverride?.trim() || selectedOption || lookupValue)

  const badge = (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium",
        hasValue
          ? "text-white"
          : "border border-dashed border-muted-foreground/40 bg-muted/30 text-muted-foreground",
        !readOnly && hasValue && "hover:opacity-90",
      )}
      style={hasValue ? { backgroundColor: displayColor } : undefined}
    >
      <span className="truncate">{displayLabel}</span>
      {!readOnly ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : null}
    </div>
  )

  if (readOnly) {
    return badge
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn("w-auto", triggerClassName)}
        onClick={(e) => e.stopPropagation()}
      >
        {badge}
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
              {(selectedOption?.value === option.value ||
                lookupValue === option.value ||
                lookupValue === option.label) && (
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
  readOnly = false,
}: {
  lead: Lead
  statusOptions: LeadDropdownOption[]
  onStatusChange: (leadId: string, status: string) => void
  triggerClassName?: string
  readOnly?: boolean
}) {
  const displayLabelOverride =
    getNamesFromApiField(lead.lead_status_name) ||
    (typeof lead.lead_status_name === "string" ? lead.lead_status_name : "")

  return (
    <LeadFieldDropdown
      currentValue={getLeadSettingDropdownValue(lead, "lead_status", "lead_status_name")}
      placeholder="Select status"
      options={statusOptions}
      onChange={(value) => onStatusChange(lead._id, value)}
      triggerClassName={triggerClassName}
      fallbackColor={lead.lead_status_color}
      displayLabelOverride={displayLabelOverride}
      readOnly={readOnly}
    />
  )
}

function LeadCustomerTypeDropdown({
  lead,
  customerTypeOptions,
  onCustomerTypeChange,
  triggerClassName,
  readOnly = false,
}: {
  lead: Lead
  customerTypeOptions: LeadDropdownOption[]
  onCustomerTypeChange: (leadId: string, customerType: string) => void
  triggerClassName?: string
  readOnly?: boolean
}) {
  const displayLabelOverride =
    getNamesFromApiField(lead.customer_type_name) ||
    (typeof lead.customer_type_name === "string" ? lead.customer_type_name : "")

  return (
    <LeadFieldDropdown
      currentValue={getLeadSettingDropdownValue(lead, "customer_type", "customer_type_name")}
      placeholder="Select customer type"
      options={customerTypeOptions}
      onChange={(value) => onCustomerTypeChange(lead._id, value)}
      triggerClassName={triggerClassName}
      fallbackColor={lead.customer_type_color}
      displayLabelOverride={displayLabelOverride}
      readOnly={readOnly}
    />
  )
}

function LeadAssignedToDropdown({
  lead,
  assignableUsers,
  userBranchMap,
  authUser,
  onAssignedToChange,
  triggerClassName,
  readOnly = false,
}: {
  lead: Lead
  assignableUsers: AssignableUser[]
  userBranchMap: Map<string, string>
  authUser: StoredAuthUser | null
  onAssignedToChange: (leadId: string, assignedTo: string) => void
  triggerClassName?: string
  readOnly?: boolean
}) {
  const displayLabelOverride = getAssignedToNameFromLead(lead as Lead & Record<string, unknown>)
  const assignedToOptions = useMemo(
    () =>
      mapAssignableUsersToDropdownOptions(
        filterAssignableUsersForLead(
          assignableUsers,
          lead as Lead & Record<string, unknown>,
          userBranchMap,
          authUser,
        ),
        ASSIGNED_TO_COLOR,
      ),
    [assignableUsers, authUser, lead, userBranchMap],
  )

  return (
    <LeadFieldDropdown
      currentValue={getLeadAssignedToValue(lead)}
      placeholder="Select user"
      options={assignedToOptions}
      onChange={(value) => onAssignedToChange(lead._id, value)}
      triggerClassName={triggerClassName}
      fallbackColor={ASSIGNED_TO_COLOR}
      displayLabelOverride={displayLabelOverride}
      readOnly={readOnly}
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
  readOnly = false,
}: {
  lead: Lead
  leadStatusSettings: LeadSettingItem[]
  onStageChange: (leadId: string, stage: string) => void
  triggerClassName?: string
  readOnly?: boolean
}) {
  const stageOptions = useMemo(
    () => getStageOptionsForLead(lead, leadStatusSettings),
    [lead, leadStatusSettings]
  )
  const displayLabelOverride = getLeadStageValue(lead)

  return (
    <LeadFieldDropdown
      currentValue={getLeadStageValue(lead)}
      placeholder="Select stage"
      options={stageOptions}
      onChange={(value) => onStageChange(lead._id, value)}
      triggerClassName={triggerClassName}
      displayLabelOverride={displayLabelOverride}
      readOnly={readOnly}
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

const getColumnCellClass = (column: string, isCompactView: boolean, wrap?: boolean) => {
  const normalizedColumn = normalizeColumnKey(column)
  return cn(
    "px-4 align-middle text-sm",
    getColumnTextAlign(column),
    !NO_TRUNCATE_COLUMNS.has(normalizedColumn) && "max-w-0",
    wrap ? "whitespace-normal" : "whitespace-nowrap",
    isCompactView ? "py-2" : "py-3"
  )
}

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
    company_name: getCompanyNameFromLead(normalizedRaw),
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
      getIdsFromApiField(raw.customer_type),
    customer_type_name:
      customerTypeName ||
      (typeof raw.customer_type === "string" ? raw.customer_type : ""),
    customer_type_color:
      getSettingColorFromApiField(normalizedRaw, "customer_type_name", raw.customer_type_color) ||
      raw.customer_type_color,
    lead_status:
      getSettingIdFromApiField(normalizedRaw, "lead_status", "lead_status_name") ||
      getIdsFromApiField(raw.lead_status),
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

function buildDisplayColumns(visibleColumns: ColumnPref[]): ColumnPref[] {
  const source =
    visibleColumns.length > 0
      ? visibleColumns
      : DEFAULT_VISIBLE_KEYS.map((key, index) => ({
          key,
          name: resolveColumnHeader({ key, name: "" }),
          visible: true,
          order: index + 1,
        }))

  const seen = new Set<string>()

  return [...source]
    .map((col) => ({
      ...col,
      key: normalizeColumnKey(col.key),
      name: resolveColumnHeader(col),
    }))
    .filter((col) => {
      if (!col.key || seen.has(col.key)) return false
      seen.add(col.key)
      return true
    })
    .sort((a, b) => a.order - b.order)
    .slice(0, MAX_VISIBLE_COLUMNS)
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
    case "company_name":
      return getCompanyNameFromLead(lead as Lead & Record<string, unknown>)
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
  const { userData, viewScope, branchId, canEditLead, canDeleteLead, isLoading: isAuthPermissionsLoading } =
    useLeadPermissions()
  const currentUserIdentity = useMemo(
    () => getCurrentUserIdentity(userData),
    [userData],
  )
  const currentUserId = currentUserIdentity.id
  const currentUserBranchId = branchId ?? getUserBranchId(userData)
  const accessToken = userData?.access_token
  const leadsDefaultCacheKey = useMemo(
    () => buildLeadsDefaultCacheKey(viewScope, currentUserId, currentUserBranchId),
    [viewScope, currentUserId, currentUserBranchId],
  )
  const cachedDefaultLeads = queryClient.getQueryData<CachedDefaultLeads>(
    leadsDefaultCacheKey,
  )

  const [leadsData, setLeadsData] = useState<Lead[]>(
    cachedDefaultLeads?.leads ?? [],
  )
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [isLoading, setIsLoading] = useState(!cachedDefaultLeads)
  const [isRefetching, setIsRefetching] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false) // Separate state for pagination loading
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(cachedDefaultLeads?.totalCount ?? 0)
  const [searchCount, setSearchCount] = useState(cachedDefaultLeads?.searchCount ?? 0)
  const [hasMore, setHasMore] = useState(cachedDefaultLeads?.hasMore ?? true)

  useEffect(() => {
    onTotalCountChange?.(totalCount)
  }, [totalCount, onTotalCountChange])

  useEffect(() => {
    onFilteredCountChange?.(searchCount)
  }, [searchCount, onFilteredCountChange])
  const observerTarget = useRef<HTMLDivElement>(null)
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const isLoadingMoreRef = useRef(false) // Ref to track loading state to prevent duplicate calls
  const leadsDataRef = useRef<Lead[]>(leadsData) // Tracks current rows for spinner decisions
  const fetchAbortRef = useRef<AbortController | null>(null)
  const currentPageRef = useRef(1)
  // Prevent auth failures from re-triggering an endless fetch/toast loop.
  const authFailureRef = useRef(false)
  const authErrorToastedRef = useRef(false)
  const filterSignature = useMemo(
    () => JSON.stringify(activeCustomFilters),
    [activeCustomFilters],
  )
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
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([])
  const userBranchMap = useMemo(
    () => buildUserBranchMap(assignableUsers),
    [assignableUsers],
  )
  const viewScopeFilterContext = useMemo<LeadViewScopeFilterOptions>(
    () => ({
      identity: currentUserIdentity,
      branchId: currentUserBranchId,
      userBranchMap,
    }),
    [currentUserIdentity, currentUserBranchId, userBranchMap],
  )
  // Refs so list fetches / infinite scroll do not recreate callbacks (and
  // re-trigger fetchLeads) every time assignees are merged from loaded rows.
  const assignableUsersRef = useRef(assignableUsers)
  const viewScopeFilterContextRef = useRef(viewScopeFilterContext)
  const viewScopeRef = useRef(viewScope)
  const visibleColumnsRef = useRef(visibleColumns)
  const hasMoreRef = useRef(hasMore)
  const loadMoreDataRef = useRef<() => void>(() => {})
  assignableUsersRef.current = assignableUsers
  viewScopeFilterContextRef.current = viewScopeFilterContext
  viewScopeRef.current = viewScope
  visibleColumnsRef.current = visibleColumns
  hasMoreRef.current = hasMore
  currentPageRef.current = currentPage
  const [leadStatusSettings, setLeadStatusSettings] = useState<LeadSettingItem[]>([])
  // Function to handle field updates
  const { addTimelineActivity } = useTimeline()
  const isMobile = useIsMobile()

  const displayColumns = useMemo(
    () => buildDisplayColumns(visibleColumns),
    [visibleColumns]
  )
  const tableScrollMaxHeight = useMemo(
    () => getTableScrollMaxHeight(isCompactView),
    [isCompactView],
  )

  // After a full reload the persisted query cache can hydrate slightly after the
  // first render. Re-read cached rows so the table is not stuck empty.
  useEffect(() => {
    if (leadsData.length > 0) return

    const cached = queryClient.getQueryData<CachedDefaultLeads>(leadsDefaultCacheKey)
    if (!cached?.leads?.length) return

    setLeadsData(cached.leads)
    setSearchCount(cached.searchCount)
    setTotalCount(cached.totalCount)
    setHasMore(cached.hasMore)
    currentPageRef.current = 1
    setCurrentPage(1)
    setIsLoading(false)
  }, [leadsData.length, queryClient, visibleColumns.length, leadsDefaultCacheKey])

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
    if (!hasMoreRef.current || isLoading || isLoadingMoreRef.current || isSearching) return

    try {
      isLoadingMoreRef.current = true
      setIsLoadingMore(true)
      const nextPage = currentPageRef.current + 1
      
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

      // Combine user-selected filters with access-scope filters.
      const scopeOptions = viewScopeFilterContextRef.current
      const currentViewScope = viewScopeRef.current
      const scopeFilters = buildViewScopeApiFilters(
        currentViewScope,
        scopeOptions,
        assignableUsersRef.current,
      )
      const combinedFilters = mergeLeadListFilters(
        [...currentFilters, ...currentMetricsFilters],
        scopeFilters,
      )
      const clientSideFilterActive = usesLeadListLocalCount(
        combinedFilters,
        currentViewScope,
        Boolean(searchQuery && searchQuery.trim() !== ""),
      )
      const postEnrichmentFilterActive = hasPostEnrichmentFollowupFilter(combinedFilters)

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
          currentViewScope,
          scopeOptions,
        )
        const deduplicatedNewLeads = deduplicateLeads(newLeads)
        const enrichedNewLeads = await enrichLeadsForListView(
          deduplicatedNewLeads,
          token,
          combinedFilters,
          visibleColumnsRef.current,
        )
        const filteredTotal = clientSideFilterActive || postEnrichmentFilterActive
          ? enrichedNewLeads.length
          : resolveLeadListCounts({
              viewScope: currentViewScope,
              usesLocalCount: false,
              enrichedLeadsLength: enrichedNewLeads.length,
              searchCount: result.search_count,
              totalCount: result.total_count,
            }).filteredTotal

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
        currentPageRef.current = nextPage
        setCurrentPage(nextPage)
        setSearchCount(result.search_count ?? filteredTotal)
        setTotalCount(result.total_count ?? filteredTotal)
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
  }, [isLoading, searchQuery, sortColumn, sortDirection, toast])

  loadMoreDataRef.current = loadMoreData

  // Handle column visibility changes
  const handleColumnVisibility = (updater: any) => {
    setColumnVisibility((prev) => {
      const newVisibility = typeof updater === 'function' ? updater(prev) : updater;
      return newVisibility;
    });
  };

  // Load initial data and handle filter changes
  const fetchLeads = useCallback(async (options?: { force?: boolean }) => {
    if (authFailureRef.current && !options?.force) {
      setIsLoading(false)
      setIsRefetching(false)
      return
    }

    fetchAbortRef.current?.abort()
    const abortController = new AbortController()
    fetchAbortRef.current = abortController

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
          leadsDefaultCacheKey,
        )
        if (
          cached &&
          cached.leads.length > 0 &&
          Date.now() - cached.fetchedAt < LEADS_DEFAULT_CACHE_TTL
        ) {
          setLeadsData(cached.leads)
          setSearchCount(cached.searchCount)
          setTotalCount(cached.totalCount)
          setHasMore(cached.hasMore)
          currentPageRef.current = 1
          setCurrentPage(1)
          setIsLoading(false)
          setIsRefetching(false)
          return
        }
      }

      const hasExistingRows = leadsDataRef.current.length > 0
      if (hasExistingRows) {
        setIsRefetching(true)
      } else {
        setIsLoading(true)
      }
      currentPageRef.current = 1
      setCurrentPage(1) // Reset to first page
      setHasMore(true) // Reset hasMore flag

      const token =
        accessToken ||
        JSON.parse(localStorage.getItem("map_user") || "{}").access_token
      if (!token) {
        // Only sticky-fail after auth has finished loading; otherwise wait for login state.
        if (!isAuthPermissionsLoading) {
          authFailureRef.current = true
          throw new Error("Token not found")
        }
        setIsLoading(false)
        setIsRefetching(false)
        return
      }
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

      // Combine user-selected filters with access-scope filters.
      const scopeOptions = viewScopeFilterContextRef.current
      const currentViewScope = viewScopeRef.current
      const scopeFilters = buildViewScopeApiFilters(
        currentViewScope,
        scopeOptions,
        assignableUsersRef.current,
      )
      const combinedFilters = mergeLeadListFilters(
        [...currentFilters, ...currentMetricsFilters],
        scopeFilters,
      )
      const clientSideFilterActive = usesLeadListLocalCount(
        combinedFilters,
        currentViewScope,
        Boolean(searchQuery && searchQuery.trim() !== ""),
      )
      const postEnrichmentFilterActive = hasPostEnrichmentFollowupFilter(combinedFilters)

      const isSearching = searchQuery && searchQuery.trim() !== '';
      const fetchLength = getLeadListFetchLength(
        combinedFilters,
        Boolean(isSearching),
        currentViewScope,
      );

      const response = await fetch(`${URLS.LEAD_LIST}?page=1&length=${fetchLength}&search=${searchQuery}&sort=${sortColumn || ''}&order=${sortDirection}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        signal: abortController.signal,
        body: JSON.stringify({
          draw: 1,
          search: { value: searchQuery, regex: false },
          filter: combinedFilters
        })
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          authFailureRef.current = true
        }
        throw new Error(`Lead list request failed: ${response.status}`);
      }

      authFailureRef.current = false
      authErrorToastedRef.current = false

      const result = await parseJsonResponse<{ code?: number; data?: unknown[]; search_count?: number; total_count?: number }>(response);
      if (abortController.signal.aborted || fetchAbortRef.current !== abortController) return

      if (result.code === 200) {
        const fetchedLeads = applyClientSideFilters(
          ((result.data || []) as Lead[]).map(normalizeLead),
          combinedFilters,
          currentViewScope,
          scopeOptions,
        )
        const deduplicatedLeads = deduplicateLeads(fetchedLeads)
        const enrichedLeads = await enrichLeadsForListView(
          deduplicatedLeads,
          token,
          combinedFilters,
          visibleColumnsRef.current,
          abortController.signal,
        )
        if (abortController.signal.aborted || fetchAbortRef.current !== abortController) return

        const usesLocalCount = clientSideFilterActive || postEnrichmentFilterActive
        const { searchCount: nextSearchCount, totalCount: nextTotalCount, filteredTotal } =
          resolveLeadListCounts({
            viewScope: currentViewScope,
            usesLocalCount,
            enrichedLeadsLength: enrichedLeads.length,
            searchCount: result.search_count,
            totalCount: result.total_count,
          })
        const nextHasMore = shouldDisablePagination(
          combinedFilters,
          Boolean(isSearching),
          currentViewScope,
        )
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
          currentFilters.length === 0 &&
          currentMetricsFilters.length === 0 &&
          sortColumn === "create_date" &&
          sortDirection === "desc"
        if (isDefaultDataView) {
          queryClient.setQueryData<CachedDefaultLeads>(leadsDefaultCacheKey, {
            leads: enrichedLeads,
            totalCount: nextTotalCount,
            searchCount: nextSearchCount,
            hasMore: nextHasMore,
            fetchedAt: Date.now(),
          })
        }

      } else {
        setHasMore(false)
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
      console.error('Error fetching data:', error);
      if (leadsDataRef.current.length === 0) {
        setLeadsData([]);
      }
      setHasMore(false);
      const shouldToast =
        !authFailureRef.current || !authErrorToastedRef.current
      if (shouldToast) {
        if (authFailureRef.current) {
          authErrorToastedRef.current = true
        }
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load leads",
          variant: "destructive",
        });
      }
    } finally {
      if (fetchAbortRef.current === abortController) {
        setIsLoading(false)
        setIsRefetching(false)
      }
    }
  }, [searchQuery, filterSignature, sortColumn, sortDirection, activeMetricFilter, toast, queryClient, leadsDefaultCacheKey, accessToken, isAuthPermissionsLoading]);

  // Load initial data and handle filter changes. A change in `refreshKey`
  // (e.g. after adding a lead) forces a fresh fetch that bypasses the cache.
  const lastRefreshKeyRef = useRef(refreshKey)
  const lastAccessTokenRef = useRef(accessToken)
  const lastViewScopeRef = useRef(viewScope)
  useEffect(() => {
    if (isAuthPermissionsLoading) return

    const forced = refreshKey !== lastRefreshKeyRef.current
    const tokenBecameAvailable =
      Boolean(accessToken) && accessToken !== lastAccessTokenRef.current
    const viewScopeChanged = viewScope !== lastViewScopeRef.current
    lastRefreshKeyRef.current = refreshKey
    lastAccessTokenRef.current = accessToken
    lastViewScopeRef.current = viewScope

    if (forced || tokenBecameAvailable) {
      authFailureRef.current = false
      authErrorToastedRef.current = false
    }
    // Skip no-op re-runs when only unstable callback identity changed.
    void fetchLeads({ force: forced || tokenBecameAvailable || viewScopeChanged });
  }, [fetchLeads, refreshKey, isAuthPermissionsLoading, accessToken, viewScope]);

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
    setTotalCount((count) => count + 1)
    setSearchCount((count) => count + 1)

    const cached = queryClient.getQueryData<CachedDefaultLeads>(leadsDefaultCacheKey)
    if (cached) {
      queryClient.setQueryData<CachedDefaultLeads>(leadsDefaultCacheKey, {
        ...cached,
        leads: [normalized, ...cached.leads.filter((lead) => lead._id !== normalized._id)],
        totalCount: cached.totalCount + 1,
        searchCount: cached.searchCount + 1,
        fetchedAt: Date.now(),
      })
    }

    onPrependLeadHandled?.()
  }, [prependLeadRequest, onPrependLeadHandled, queryClient, leadsDefaultCacheKey])

  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        const token = JSON.parse(localStorage.getItem("map_user") || "{}").access_token
        if (!token) return

        const orgId = getOrgIdFromAuth(userData)
        const [settingsData, usersResponse] = await Promise.all([
          queryClient.fetchQuery({
            queryKey: LEAD_SETTINGS_QUERY_KEY,
            queryFn: () => fetchLeadSettingsList(token),
          }),
          queryClient.fetchQuery({
            queryKey: assignableUsersQueryKey(orgId),
            queryFn: () => fetchLeadAssignableUsers(token, orgId),
          }),
        ])

        const leadStatuses = [...(settingsData?.lead_status || [])].sort(
          (a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0),
        ) as LeadSettingItem[]
        const customerTypes = (settingsData?.customer_type || []) as LeadSettingItem[]
        const customerRequirements = (settingsData?.customer_requirement ||
          []) as LeadSettingItem[]

        setLeadStatusSettings(leadStatuses)
        setLeadStatusOptions(mapLeadSettingsToDropdownOptions(leadStatuses))
        setCustomerTypeOptions(mapLeadSettingsToDropdownOptions(customerTypes))
        setCustomerRequirementOptions(mapLeadSettingsToDropdownOptions(customerRequirements))

        if (usersResponse.length > 0) {
          setAssignableUsers(usersResponse)
        } else if (leadsData.length > 0) {
          setAssignableUsers((current) => mergeAssignableUsersFromLeads(current, leadsData))
        }
      } catch (error) {
        console.error("Error fetching lead dropdown options:", error)
      }
    }

    void fetchDropdownOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- warm once when auth is ready
  }, [userData?.access_token, queryClient])

  useEffect(() => {
    leadsDataRef.current = leadsData
    setAssignableUsers((current) => mergeAssignableUsersFromLeads(current, leadsData))
  }, [leadsData])

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    const scrollRoot = tableScrollRef.current
    // Don't set up observer if there's no more data, still loading, or no target element
    if (!observerTarget.current || !scrollRoot || !hasMore || isLoading) {
      return
    }

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      if (
        entries[0].isIntersecting &&
        hasMoreRef.current &&
        !isLoadingMoreRef.current
      ) {
        void loadMoreDataRef.current()
      }
    }

    const observer = new IntersectionObserver(handleIntersection, {
      root: scrollRoot,
      threshold: 0.1,
      rootMargin: "0px",
    })

    const target = observerTarget.current
    observer.observe(target)

    return () => {
      observer.unobserve(target)
      observer.disconnect()
    }
  }, [hasMore, isLoading, leadsData.length, isMobile])

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

  const denyLeadEdit = useCallback(() => {
    toast({
      title: "Permission denied",
      description: "You don't have permission to edit leads.",
      variant: "destructive",
    })
  }, [toast])

  // Function to update lead status
  const handleStatusUpdate = async (leadId: string, newStatusValue: string) => {
    if (!canEditLead) {
      denyLeadEdit()
      return
    }
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
    if (!canEditLead) {
      denyLeadEdit()
      return
    }
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
    if (!canEditLead) {
      denyLeadEdit()
      return
    }
    if (!userData?.access_token) return

    const token = userData.access_token
    const lead = leadsData.find((item) => item._id === leadId)
    if (!lead) return

    const branchScopedUsers = filterAssignableUsersForLead(
      assignableUsers,
      lead as Lead & Record<string, unknown>,
      userBranchMap,
      userData,
    )
    const newAssignee = branchScopedUsers.find((user) => user.id === newAssignedToValue)

    if (!newAssignee) return

    try {
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
                  assigned_to: newAssignee.id,
                  assigned_to_name: newAssignee.name,
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
          text_info: `Updated assigned to from "${fromText}" to "${newAssignee.name}"`,
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
    if (!canEditLead) {
      denyLeadEdit()
      return
    }
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
    if (!canDeleteLead) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to delete leads.",
        variant: "destructive",
      })
      return
    }

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
        setTotalCount(prev => prev - 1);
        setSearchCount(prev => prev - 1);

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
    <Card key={lead._id} className="w-full shadow-sm transition-shadow hover:shadow-md">
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
              {canDeleteLead && (
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
              )}
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
                      readOnly={!canEditLead}
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
                      readOnly={!canEditLead}
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
                      assignableUsers={assignableUsers}
                      userBranchMap={userBranchMap}
                      authUser={userData}
                      onAssignedToChange={handleAssignedToUpdate}
                      readOnly={!canEditLead}
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
                      readOnly={!canEditLead}
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
      {isRefetching && leadsData.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center bg-background/40 pt-16 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 rounded-full border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Updating results...
          </div>
        </div>
      )}
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
        <div
          ref={tableScrollRef}
          className="overflow-auto"
          style={{ maxHeight: tableScrollMaxHeight }}
        >
          <div className="space-y-3">
          {isLoading && leadsData.length === 0 ? (
            <div className="py-10 text-center">
              <LoadingSpinner />
            </div>
          ) : leadsData.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-muted-foreground">
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
        </div>
      ) : (
        <div
          ref={tableScrollRef}
          className="overflow-auto"
          style={{ maxHeight: tableScrollMaxHeight }}
        >
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
                              readOnly={!canEditLead}
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
                              readOnly={!canEditLead}
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
                              readOnly={!canEditLead}
                            />
                          </LeadsTableCell>
                        );
                      }

                      if (isColumnMatch(column, "assigned_to")) {
                        return (
                          <LeadsTableCell key={column} column={column} isCompactView={isCompactView}>
                            <LeadAssignedToDropdown
                              lead={lead}
                              assignableUsers={assignableUsers}
                              userBranchMap={userBranchMap}
                              authUser={userData}
                              onAssignedToChange={handleAssignedToUpdate}
                              readOnly={!canEditLead}
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
                          {canDeleteLead && (
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
                          )}
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
