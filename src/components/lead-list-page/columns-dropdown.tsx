"use client"

import { useState, useRef, useEffect } from "react"
import { LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useIsMobile } from "@/hooks/use-mobile"
import { useToast } from "@/hooks/use-toast"
import URLS from "@/config/urls"
import { parseJsonResponse } from "@/lib/api"

export type ColumnPref = {
  key: string
  name: string
  visible: boolean
  order: number
}

const COLUMN_ALIAS_TO_CANONICAL: Record<string, string> = {
  customer_type: "customer_type_name",
  customer_requirement: "customer_requirement_name",
  stages: "stage",
  stage_name: "stage",
  lead_stage: "stage",
  source: "source_name",
  status: "lead_status_name",
  lead_status: "lead_status_name",
}

export function normalizeColumnKey(key: string): string {
  const normalized = typeof key === "string" ? key.trim() : ""
  if (!normalized) return ""
  return COLUMN_ALIAS_TO_CANONICAL[normalized] ?? normalized
}

function mergeColumnKeys(apiKeys: string[], saved: ColumnPref[]): string[] {
  const combined = [
    ...FALLBACK_COLUMN_KEYS,
    ...apiKeys,
    ...saved.map((col) => col.key),
  ]

  const seen = new Set<string>()
  const merged: string[] = []

  for (const key of combined) {
    const canonical = normalizeColumnKey(key)
    if (!canonical || !isValidColumnKey(canonical) || seen.has(canonical)) continue
    seen.add(canonical)
    merged.push(canonical)
  }

  return merged
}

export const LEAD_COLUMN_LABELS: Record<string, string> = {
  lead_no: "Lead No",
  name: "Name",
  company_name: "Company",
  phone: "Phone",
  email: "Email",
  lead_status_name: "Status",
  customer_type_name: "Customer Type",
  customer_requirement_name: "Interested In",
  current_staying: "Staying",
  source_name: "Source",
  assigned_to: "Assigned To",
  description: "Description",
  project_name: "Project",
  location: "Prepared Location",
  designation: "Designation",
  url: "Website",
  address1: "Address",
  address2: "Address 2",
  s_address1: "Shipping Address",
  s_address2: "Shipping Address 2",
  city: "City",
  state: "State",
  stage: "Stage",
  stages: "Stage",
  country: "Country",
  pincode: "Pincode",
  create_date: "Created Date",
  date_aging: "Aging",
  target_date: "Target Date",
  lead_type: "Lead Type",
  latest_notes: "Latest Notes",
  next_followup: "Next Followup",
}

export const DEFAULT_VISIBLE_KEYS = [
  "lead_no",
  "name",
  "company_name",
  "phone",
  "email",
  "lead_status_name",
  "assigned_to",
  "create_date",
  "next_followup",
]

export const MAX_VISIBLE_COLUMNS = 10

function enforceVisibleColumnLimit(columns: ColumnPref[]): ColumnPref[] {
  const visibleColumns = columns
    .filter((col) => col.visible)
    .sort((a, b) => a.order - b.order)

  if (visibleColumns.length <= MAX_VISIBLE_COLUMNS) return columns

  const allowedKeys = new Set(
    visibleColumns.slice(0, MAX_VISIBLE_COLUMNS).map((col) => normalizeColumnKey(col.key))
  )

  return columns.map((col) =>
    col.visible && !allowedKeys.has(normalizeColumnKey(col.key)) ? { ...col, visible: false } : col
  )
}

const FALLBACK_COLUMN_KEYS = [
  "lead_no",
  "name",
  "company_name",
  "phone",
  "email",
  "customer_type_name",
  "customer_requirement_name",
  "current_staying",
  "project_name",
  "lead_status_name",
  "source_name",
  "assigned_to",
  "stage",
  "designation",
  "location",
  "description",
  "url",
  "address1",
  "address2",
  "s_address1",
  "s_address2",
  "city",
  "state",
  "country",
  "pincode",
  "create_date",
  "date_aging",
  "target_date",
  "lead_type",
  "next_followup",
  "latest_notes",
]

export function formatColumnLabel(key: string): string {
  const normalized = typeof key === "string" ? key.trim() : ""
  if (!normalized) return ""
  if (LEAD_COLUMN_LABELS[normalized]) return LEAD_COLUMN_LABELS[normalized]
  if (normalized.includes(" ")) return normalized

  return normalized
    .replace(/_/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function isLikelyColumnKey(value: string): boolean {
  const key = value.trim()
  if (!key) return false
  return Boolean(LEAD_COLUMN_LABELS[key] || /^[a-z][a-z0-9_]*$/i.test(key))
}

function isValidColumnKey(key: string): boolean {
  const normalized = normalizeColumnKey(key)
  if (!normalized) return false
  if (LEAD_COLUMN_LABELS[normalized]) return true
  return /^[a-z][a-z0-9_]*$/i.test(normalized) && normalized.length <= 64
}

function extractKeyFromRawItem(item: Record<string, unknown>): string {
  const candidates = [item.key, item.column, item.field, item.column_key]
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      const key = normalizeColumnKey(candidate)
      if (isValidColumnKey(key)) return key
    }
  }

  if (typeof item.name === "string" && item.name.trim() && isLikelyColumnKey(item.name)) {
    const hasSeparateLabel =
      (typeof item.label === "string" && item.label.trim()) ||
      (typeof item.title === "string" && item.title.trim())
    if (!hasSeparateLabel) {
      const key = normalizeColumnKey(item.name)
      if (isValidColumnKey(key)) return key
    }
  }

  return ""
}

function extractLabelFromRawItem(item: Record<string, unknown>, key: string): string {
  if (LEAD_COLUMN_LABELS[key]) return LEAD_COLUMN_LABELS[key]

  const labelCandidates = [item.label, item.title, item.display_name, item.column_name]
  for (const candidate of labelCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim()
    }
  }

  if (typeof item.name === "string" && item.name.trim()) {
    const nameValue = item.name.trim()
    if (normalizeColumnKey(nameValue) !== key) {
      return nameValue
    }
  }

  return formatColumnLabel(key)
}

function normalizeApiColumnKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []

  const seen = new Set<string>()
  const keys: string[] = []

  for (const item of raw) {
    let key = ""
    if (typeof item === "string") {
      key = normalizeColumnKey(item)
    } else if (item && typeof item === "object") {
      key = extractKeyFromRawItem(item as Record<string, unknown>)
    }

    if (!key || !isValidColumnKey(key) || seen.has(key)) continue
    seen.add(key)
    keys.push(key)
  }

  return keys
}

function extractSavedColumnsFromResponse(detail: unknown): unknown[] {
  if (!detail) return []

  if (Array.isArray(detail)) {
    if (detail.length === 0) return []
    const first = detail[0]
    if (first && typeof first === "object" && "lead_column" in first) {
      const leadColumn = (first as { lead_column: unknown }).lead_column
      return Array.isArray(leadColumn) ? leadColumn : []
    }
    return detail
  }

  if (typeof detail === "object" && detail !== null && "lead_column" in detail) {
    const leadColumn = (detail as { lead_column: unknown }).lead_column
    return Array.isArray(leadColumn) ? leadColumn : []
  }

  return []
}

export function resolveColumnHeader(col: Pick<ColumnPref, "key" | "name">): string {
  const canonicalKey = normalizeColumnKey(col.key)
  if (!canonicalKey) return ""

  // Prefer known labels — saved names may contain lead field values (e.g. description text).
  if (LEAD_COLUMN_LABELS[canonicalKey]) {
    return LEAD_COLUMN_LABELS[canonicalKey]
  }

  const savedName = typeof col.name === "string" ? col.name.trim() : ""
  if (savedName && normalizeColumnKey(savedName) !== canonicalKey) {
    return savedName
  }

  return formatColumnLabel(canonicalKey)
}

function normalizeSavedColumns(raw: unknown[]): ColumnPref[] {
  const normalized = raw
    .map((item, index) => {
      if (typeof item === "string") {
        const key = normalizeColumnKey(item)
        if (!isValidColumnKey(key)) return null
        return {
          key,
          name: resolveColumnHeader({ key, name: "" }),
          visible: true,
          order: index + 1,
        }
      }

      if (!item || typeof item !== "object") return null

      const rawItem = item as Record<string, unknown>
      const key = extractKeyFromRawItem(rawItem)
      if (!key) return null

      return {
        key,
        name: extractLabelFromRawItem(rawItem, key),
        visible: rawItem.visible !== false,
        order: typeof rawItem.order === "number" ? rawItem.order : index + 1,
      }
    })
    .filter((col): col is ColumnPref => Boolean(col))

  const deduped = new Map<string, ColumnPref>()
  for (const col of normalized) {
    const existing = deduped.get(col.key)
    if (!existing || col.order < existing.order) {
      deduped.set(col.key, col)
    }
  }

  return Array.from(deduped.values()).sort((a, b) => a.order - b.order)
}

function buildSavedColumnMap(saved: ColumnPref[]): Map<string, ColumnPref> {
  const savedMap = new Map<string, ColumnPref>()

  saved.forEach((col) => {
    const key = normalizeColumnKey(col.key)
    const existing = savedMap.get(key)
    if (!existing) {
      savedMap.set(key, { ...col, key })
      return
    }

    savedMap.set(key, {
      ...existing,
      ...col,
      key,
      name: resolveColumnHeader({ key, name: col.name || existing.name }),
      visible: col.visible,
      order: Math.min(existing.order, col.order),
    })
  })

  return savedMap
}

export function buildAllColumnsForModal(allKeys: string[], saved: ColumnPref[]): ColumnPref[] {
  const keys = mergeColumnKeys(allKeys, saved)
  if (keys.length === 0) return []

  const savedMap = buildSavedColumnMap(saved)
  const maxSavedOrder = saved.reduce((max, col) => Math.max(max, col.order ?? 0), 0)
  let nextOrder = maxSavedOrder

  const columns = keys.map((key) => {
    const existing = savedMap.get(key)
    if (existing) {
      return {
        ...existing,
        key,
        name: resolveColumnHeader({ key, name: existing.name }),
      }
    }

    nextOrder += 1
    return {
      key,
      name: resolveColumnHeader({ key, name: "" }),
      visible: DEFAULT_VISIBLE_KEYS.includes(key),
      order: nextOrder,
    }
  })

  return enforceVisibleColumnLimit(columns.sort((a, b) => a.order - b.order))
}

export function buildVisibleColumns(allKeys: string[], saved: ColumnPref[]): ColumnPref[] {
  return buildAllColumnsForModal(allKeys, saved).filter((col) => col.visible)
}

export async function saveLeadColumns(token: string, columns: ColumnPref[]) {
  const normalizedColumns = [...columns]
    .map((col) => ({
      ...col,
      key: normalizeColumnKey(col.key),
      name: resolveColumnHeader(col),
    }))
    .sort((a, b) => a.order - b.order)

  const payload = {
    lead_column: normalizedColumns.map((col, index) => ({
      key: col.key,
      name: col.name,
      visible: col.visible,
      order: index + 1,
    })),
  }

  const response = await fetch(URLS.COLUMN_CUSTOMIZE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const json = await parseJsonResponse<{ code?: number; msg?: string }>(response)
  if (json?.code !== 200) {
    throw new Error(json?.msg || "Failed to save column configuration")
  }

  return json
}

export async function fetchLeadColumnConfig(token: string) {
  const response = await fetch(URLS.LEAD_COLUMN_LIST, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const json = await parseJsonResponse<{
    code?: number
    msg?: string
    column_keys?: unknown
    selected_Coloumn_detail?: unknown
  }>(response)

  if (json?.code !== 200) {
    throw new Error(json?.msg || "Failed to load column configuration")
  }

  const allKeys = normalizeApiColumnKeys(json.column_keys)
  const savedRaw = extractSavedColumnsFromResponse(json.selected_Coloumn_detail)
  const saved = normalizeSavedColumns(savedRaw)

  return {
    allKeys,
    visibleColumns: buildVisibleColumns(allKeys, saved),
    modalColumns: buildAllColumnsForModal(allKeys, saved),
  }
}

function buildFallbackConfig() {
  const modalColumns = buildAllColumnsForModal(FALLBACK_COLUMN_KEYS, [])
  return {
    allKeys: FALLBACK_COLUMN_KEYS,
    visibleColumns: buildVisibleColumns(FALLBACK_COLUMN_KEYS, []),
    modalColumns,
  }
}

export { buildFallbackConfig }

interface ColumnsDropdownProps {
  visibleColumns: ColumnPref[]
  allColumns: ColumnPref[]
  onVisibleColumnsChange: (columns: ColumnPref[]) => void
  onAllColumnsChange: (columns: ColumnPref[]) => void
  isLoading?: boolean
}

export function ColumnsDropdown({
  visibleColumns,
  allColumns,
  onVisibleColumnsChange,
  onAllColumnsChange,
  isLoading = false,
}: ColumnsDropdownProps) {
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleColumnToggle = async (columnKey: string) => {
    const normalizedKey = normalizeColumnKey(columnKey)
    const target = allColumns.find((col) => normalizeColumnKey(col.key) === normalizedKey)
    if (!target) return

    const willBeVisible = !target.visible

    if (willBeVisible) {
      const currentVisibleCount = allColumns.filter((col) => col.visible).length
      if (currentVisibleCount >= MAX_VISIBLE_COLUMNS) {
        toast({
          title: "Maximum columns reached",
          description: `You can show up to ${MAX_VISIBLE_COLUMNS} columns at a time. Hide another column first.`,
          variant: "destructive",
        })
        return
      }
    }

    let nextModalColumns = allColumns.map((col) =>
      normalizeColumnKey(col.key) === normalizedKey ? { ...col, visible: !col.visible } : col
    )

    if (willBeVisible) {
      const visibleMaxOrder = Math.max(
        0,
        ...nextModalColumns
          .filter((col) => col.visible && normalizeColumnKey(col.key) !== normalizedKey)
          .map((col) => col.order)
      )

      nextModalColumns = nextModalColumns.map((col) =>
        normalizeColumnKey(col.key) === normalizedKey ? { ...col, order: visibleMaxOrder + 1 } : col
      )
    }

    nextModalColumns = enforceVisibleColumnLimit(
      [...nextModalColumns]
        .sort((a, b) => a.order - b.order)
        .map((col, index) => ({ ...col, order: index + 1 }))
    )

    const visibleCount = nextModalColumns.filter((col) => col.visible).length
    if (visibleCount === 0) {
      toast({
        title: "At least one column required",
        description: "Keep at least one column visible in the table.",
        variant: "destructive",
      })
      return
    }

    try {
      const storedData = localStorage.getItem("map_user")
      if (!storedData) return

      const userData = JSON.parse(storedData)
      const token = userData.access_token
      if (!token) return

      await saveLeadColumns(token, nextModalColumns)

      onAllColumnsChange(nextModalColumns)
      onVisibleColumnsChange(
        nextModalColumns.filter((col) => col.visible).sort((a, b) => a.order - b.order)
      )
    } catch (error) {
      console.error("Error updating column visibility:", error)
      toast({
        title: "Error",
        description: "Failed to update column visibility",
        variant: "destructive",
      })
    }
  }

  const isColumnVisible = (columnKey: string) => {
    const normalizedKey = normalizeColumnKey(columnKey)
    const fromModal = allColumns.find((col) => normalizeColumnKey(col.key) === normalizedKey)
    if (fromModal) return fromModal.visible
    return visibleColumns.some((col) => normalizeColumnKey(col.key) === normalizedKey)
  }

  const orderedColumns = [...allColumns]
    .map((col) => ({
      ...col,
      key: normalizeColumnKey(col.key),
      name: resolveColumnHeader(col),
    }))
    .sort((a, b) => a.order - b.order)
  const visibleOrderedColumns = orderedColumns.filter((col) => col.visible)
  const hiddenOrderedColumns = orderedColumns.filter((col) => !col.visible)

  const renderColumnItem = (column: ColumnPref, orderIndex?: number) => {
    const label = column.name || resolveColumnHeader(column)

    return (
      <div
        key={column.key}
        role="button"
        tabIndex={0}
        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm"
        onClick={() => handleColumnToggle(column.key)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleColumnToggle(column.key)
          }
        }}
      >
        <Checkbox checked={isColumnVisible(column.key)} className="pointer-events-none" />
        <span className="flex-1 min-w-0 text-sm text-popover-foreground">
          {orderIndex != null ? (
            <span className="tabular-nums text-muted-foreground mr-1.5">{orderIndex}.</span>
          ) : null}
          <span className="break-words">{label}</span>
        </span>
      </div>
    )
  }

  return (
    <div className="relative inline-flex" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-2 text-xs gap-1"
        onClick={() => setIsOpen(!isOpen)}
      >
        <LayoutGrid className="h-3 w-3" />
        {!isMobile && "Columns"}
      </Button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-64 rounded-md border bg-popover p-1 shadow-md animate-in fade-in-80">
          <div className="px-2 py-1.5 text-sm font-semibold">
            Toggle Columns
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              ({visibleOrderedColumns.length}/{MAX_VISIBLE_COLUMNS} visible)
            </span>
          </div>
          <div className="h-px bg-border mx-1 my-1" />
          <div className="max-h-[300px] overflow-y-auto py-1">
            {isLoading ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading columns...</div>
            ) : orderedColumns.length > 0 ? (
              <>
                {visibleOrderedColumns.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                      Visible ({visibleOrderedColumns.length})
                    </div>
                    {visibleOrderedColumns.map((column, index) =>
                      renderColumnItem(column, index + 1)
                    )}
                  </>
                )}
                {hiddenOrderedColumns.length > 0 && (
                  <>
                    {visibleOrderedColumns.length > 0 && (
                      <div className="h-px bg-border mx-1 my-1" />
                    )}
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                      Hidden ({hiddenOrderedColumns.length})
                    </div>
                    {hiddenOrderedColumns.map((column) => renderColumnItem(column))}
                  </>
                )}
              </>
            ) : (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">No columns available</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
