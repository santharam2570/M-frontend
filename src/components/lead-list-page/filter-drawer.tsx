"use client"

import { useState, useEffect, useMemo } from "react"
import { format, parse } from "date-fns"
import {
  CalendarIcon,
  Check,
  ChevronsUpDown,
  Filter,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Select,
  FormSelectContent,
  FormSelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Calendar } from "@/components/ui/calendar"
import { URLS } from "@/config/urls"
import { parseDateString } from "@/lib/date-ageing"
import { cn } from "@/lib/utils"
import { formSelectTriggerClassName } from "@/lib/form-field-styles"

interface FilterState {
  [key: string]: string
}

interface FilterDefinition {
  key: string
  name: string
  type: "dropdown" | "date"
  dependsOn?: string
  dependsOnLabel?: string
}

interface Option {
  _id: string
  value: string
  label: string
  color?: string
}

interface LeadSettingItem {
  _id?: string
  id?: string
  name?: string
  color?: string
  info?: unknown
  options?: unknown
  stages?: unknown
  field_type?: string
  fieldType?: string
}

interface FilterDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplyFilters: (filters: any) => void
  initialFilters: FilterState
}

const FILTER_DEFINITIONS: FilterDefinition[] = [
  { key: "lead_status", name: "Status", type: "dropdown" },
  {
    key: "stage",
    name: "Stage",
    type: "dropdown",
    dependsOn: "lead_status",
    dependsOnLabel: "status",
  },
  { key: "customer_type", name: "Customer Type", type: "dropdown" },
  {
    key: "purpose",
    name: "Purpose",
    type: "dropdown",
    dependsOn: "customer_type",
    dependsOnLabel: "customer type",
  },
  { key: "start_date", name: "Start Date", type: "date" },
  { key: "end_date", name: "End Date", type: "date" },
]

const VALID_FILTER_KEYS = FILTER_DEFINITIONS.map((def) => def.key)
const footerButtonClass = "h-10 min-w-[88px] rounded-md px-4 py-2"

// Backend lead_list filters use `stages` (DB field), UI uses `stage`.
const FILTER_UI_TO_API_FIELD: Record<string, string> = {
  stage: "stages",
}
const FILTER_API_TO_UI_FIELD: Record<string, string> = {
  stages: "stage",
}

function stripEmptyFilters(filterState: FilterState): FilterState {
  return Object.fromEntries(
    Object.entries(filterState).filter(([, value]) => typeof value === "string" && value.trim() !== ""),
  )
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

function mapSettingItemsToOptions(items: LeadSettingItem[]): Option[] {
  return items
    .filter((item) => item.name?.trim())
    .map((item) => {
      const id = resolveLeadSettingId(item)
      return {
        _id: id,
        value: id,
        label: item.name!.trim(),
        color: item.color,
      }
    })
    .filter((item) => item.value)
}

function mapRawOptionsToOptions(rawOptions: unknown): Option[] {
  if (!Array.isArray(rawOptions)) return []

  return rawOptions
    .map((option) => {
      if (typeof option === "string") {
        const name = option.trim()
        if (!name) return null
        return { _id: name, value: name, label: name }
      }
      if (typeof option === "object" && option !== null && "name" in option) {
        const record = option as {
          _id?: string | number
          id?: string | number
          name?: string
          color?: string
        }
        const name = String(record.name ?? "").trim()
        if (!name) return null
        const id = String(record._id ?? record.id ?? name)
        return {
          _id: id,
          value: name,
          label: name,
          color: record.color,
        }
      }
      return null
    })
    .filter((option): option is Option => option !== null)
}

function getStageOptionsFromStatusItem(item: LeadSettingItem): Option[] {
  const info = parseSettingInfo(item.info)
  const rawOptions = item.options ?? info.options ?? item.stages ?? info.stages
  return mapRawOptionsToOptions(rawOptions)
}

function getPurposeOptionsFromCustomerTypeItem(item: LeadSettingItem): Option[] {
  const info = parseSettingInfo(item.info)
  const fieldType = String(item.field_type || item.fieldType || info.field_type || "text")
  if (!fieldType.toLowerCase().includes("dropdown")) return []

  const rawOptions = item.options ?? info.options
  return mapRawOptionsToOptions(rawOptions)
}

function findOptionMatch(options: Option[], value?: string): Option | undefined {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase()
  return options.find(
    (option) =>
      option.value.trim().toLowerCase() === normalized ||
      option.label.trim().toLowerCase() === normalized ||
      option._id.trim().toLowerCase() === normalized,
  )
}

function findStatusSetting(
  settings: LeadSettingItem[],
  statusValue?: string,
): LeadSettingItem | undefined {
  if (!statusValue) return undefined
  const normalized = statusValue.trim().toLowerCase()

  return settings.find((status) => {
    const statusId = resolveLeadSettingId(status)
    if (statusId && statusId.toLowerCase() === normalized) return true
    const statusName = status.name?.trim().toLowerCase() || ""
    return Boolean(statusName && statusName === normalized)
  })
}

function findCustomerTypeSetting(
  settings: LeadSettingItem[],
  customerTypeValue?: string,
): LeadSettingItem | undefined {
  if (!customerTypeValue) return undefined
  const normalized = customerTypeValue.trim().toLowerCase()

  return settings.find((customerType) => {
    const typeId = resolveLeadSettingId(customerType)
    if (typeId && typeId.toLowerCase() === normalized) return true
    const typeName = customerType.name?.trim().toLowerCase() || ""
    return Boolean(typeName && typeName === normalized)
  })
}

function normalizeFilterState(
  filterState: FilterState,
  leadStatusSettings: LeadSettingItem[],
  customerTypeSettings: LeadSettingItem[],
  filterOptions: Record<string, Option[]>,
): FilterState {
  const normalized = stripEmptyFilters(filterState)

  if (normalized.lead_status) {
    const statusMatch = findOptionMatch(filterOptions.lead_status || [], normalized.lead_status)
    if (statusMatch) {
      normalized.lead_status = statusMatch.value
    } else {
      const statusSetting = findStatusSetting(leadStatusSettings, normalized.lead_status)
      if (statusSetting) {
        normalized.lead_status = resolveLeadSettingId(statusSetting)
      }
    }
  }

  if (normalized.customer_type) {
    const typeMatch = findOptionMatch(filterOptions.customer_type || [], normalized.customer_type)
    if (typeMatch) {
      normalized.customer_type = typeMatch.value
    } else {
      const typeSetting = findCustomerTypeSetting(customerTypeSettings, normalized.customer_type)
      if (typeSetting) {
        normalized.customer_type = resolveLeadSettingId(typeSetting)
      }
    }
  }

  if (normalized.stage && normalized.lead_status) {
    const statusSetting = findStatusSetting(leadStatusSettings, normalized.lead_status)
    if (statusSetting) {
      const options = getStageOptionsFromStatusItem(statusSetting)
      const stageMatch = findOptionMatch(options, normalized.stage)
      if (stageMatch) {
        normalized.stage = stageMatch.value
      }
    }
  }

  if (normalized.purpose && normalized.customer_type) {
    const typeSetting = findCustomerTypeSetting(customerTypeSettings, normalized.customer_type)
    if (typeSetting) {
      const options = getPurposeOptionsFromCustomerTypeItem(typeSetting)
      const purposeMatch = findOptionMatch(options, normalized.purpose)
      if (purposeMatch) {
        normalized.purpose = purposeMatch.value
      }
    }
  }

  for (const dateKey of ["start_date", "end_date"] as const) {
    if (normalized[dateKey]) {
      const normalizedDate = normalizeStoredDateValue(normalized[dateKey])
      if (normalizedDate) {
        normalized[dateKey] = normalizedDate
      }
    }
  }

  if (normalized.start_date && normalized.end_date) {
    const start = parseDateValue(normalized.start_date)
    const end = parseDateValue(normalized.end_date)
    if (start && end && start > end) {
      normalized.start_date = format(end, "yyyy-MM-dd")
      normalized.end_date = format(start, "yyyy-MM-dd")
    }
  }

  return normalized
}

function mapUiFieldToApiField(uiField: string): string {
  return FILTER_UI_TO_API_FIELD[uiField] || uiField
}

function mapApiFieldToUiField(apiField: string): string {
  return FILTER_API_TO_UI_FIELD[apiField] || apiField
}

function parseDateValue(value?: string) {
  if (!value) return undefined
  try {
    return parse(value, "yyyy-MM-dd", new Date())
  } catch {
    return parseDateString(value) ?? undefined
  }
}

function formatDateForApiFilter(value: string): string {
  const date = parseDateValue(value)
  if (!date) return value
  // Backend custom date range expects YYYY-MM-DD.
  return format(date, "yyyy-MM-dd")
}

function normalizeStoredDateValue(value?: string): string | undefined {
  if (!value) return undefined
  const date = parseDateValue(value) ?? parseDateString(value)
  return date ? format(date, "yyyy-MM-dd") : value
}

function formatDateDisplay(value?: string) {
  const date = parseDateValue(value)
  return date ? format(date, "dd MMM yyyy") : ""
}

function FilterFieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  )
}

function FilterCombobox({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  disabledMessage,
  showColorDot,
  searchable = true,
  displayLabel,
}: {
  value?: string
  onChange: (value: string) => void
  options: Option[]
  placeholder: string
  disabled?: boolean
  disabledMessage?: string
  showColorDot?: boolean
  searchable?: boolean
  displayLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = findOptionMatch(options, value)
  const resolvedLabel = selected?.label || displayLabel || value

  if (disabled) {
    return (
      <div className="space-y-1.5">
        <Button
          variant="outline"
          disabled
          className={cn(formSelectTriggerClassName, "w-full cursor-not-allowed opacity-60")}
        >
          <span className="text-muted-foreground">{placeholder}</span>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-40" />
        </Button>
        {disabledMessage ? (
          <p className="text-xs text-muted-foreground">{disabledMessage}</p>
        ) : null}
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(formSelectTriggerClassName, "w-full")}
        >
          {resolvedLabel ? (
            <span className="flex min-w-0 items-center gap-2 truncate">
              {showColorDot && selected?.color ? (
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: selected.color }}
                />
              ) : null}
              <span className="truncate">{resolvedLabel}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          {searchable ? <CommandInput placeholder="Search..." className="h-9" /> : null}
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={() => {
                  onChange("")
                  setOpen(false)
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                All
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option._id}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex min-w-0 items-center gap-2">
                    {showColorDot && option.color ? (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                    ) : null}
                    <span className="truncate">{option.label}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function FilterDrawer({ open, onOpenChange, onApplyFilters, initialFilters }: FilterDrawerProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [filterOptions, setFilterOptions] = useState<Record<string, Option[]>>({})
  const [leadStatusSettings, setLeadStatusSettings] = useState<LeadSettingItem[]>([])
  const [customerTypeSettings, setCustomerTypeSettings] = useState<LeadSettingItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchFilterOptions = async () => {
    try {
      setIsLoading(true)
      const storedData = localStorage.getItem("map_user")
      if (!storedData) return

      const userData = JSON.parse(storedData)
      const token = userData.access_token
      if (!token) return

      const response = await fetch(URLS.LEAD_SETTINGS_LIST, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result?.code === 200 && result.data) {
        const leadStatuses = [...(result.data.lead_status || [])].sort(
          (a: LeadSettingItem, b: LeadSettingItem) =>
            (Number((a as { sort_order?: number }).sort_order) || 0) -
            (Number((b as { sort_order?: number }).sort_order) || 0),
        )
        const customerTypes = result.data.customer_type || []

        setLeadStatusSettings(leadStatuses)
        setCustomerTypeSettings(customerTypes)
        setFilterOptions({
          lead_status: mapSettingItemsToOptions(leadStatuses),
          customer_type: mapSettingItemsToOptions(customerTypes),
        })
      }
    } catch (error) {
      console.error("Error fetching filter options:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFilterOptions()
  }, [])

  const stageOptions = useMemo(() => {
    const matchingStatus = findStatusSetting(leadStatusSettings, filters.lead_status)
    if (!matchingStatus) return []
    return getStageOptionsFromStatusItem(matchingStatus)
  }, [filters.lead_status, leadStatusSettings])

  const purposeOptions = useMemo(() => {
    const matchingType = findCustomerTypeSetting(customerTypeSettings, filters.customer_type)
    if (!matchingType) return []
    return getPurposeOptionsFromCustomerTypeItem(matchingType)
  }, [filters.customer_type, customerTypeSettings])

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => Boolean(value?.trim()) && VALID_FILTER_KEYS.includes(key),
  ).length

  const getDisplayLabel = (filterKey: string, value: string) => {
    if (filterKey === "start_date" || filterKey === "end_date") return formatDateDisplay(value)

    const options =
      filterKey === "stage"
        ? stageOptions
        : filterKey === "purpose"
          ? purposeOptions
          : filterOptions[filterKey] || []

    return findOptionMatch(options, value)?.label || value
  }

  const resolveApiFilterValue = (field: string, value: string): string => {
    if (field === "lead_status") {
      return findOptionMatch(filterOptions.lead_status || [], value)?.value || value
    }
    if (field === "customer_type") {
      return findOptionMatch(filterOptions.customer_type || [], value)?.value || value
    }
    if (field === "stage") {
      return findOptionMatch(stageOptions, value)?.value || value
    }
    if (field === "purpose") {
      return findOptionMatch(purposeOptions, value)?.value || value
    }
    if (field === "start_date" || field === "end_date") {
      return formatDateForApiFilter(value)
    }
    return value
  }

  const buildCreateDateRangeFilter = (startDate?: string, endDate?: string) => {
    const resolvedStart = startDate?.trim() || endDate?.trim()
    const resolvedEnd = endDate?.trim() || startDate?.trim()
    if (!resolvedStart || !resolvedEnd) return null

    return {
      field: "create_date",
      indictor: "is",
      field_orgin: "default",
      selected_values: ["custom"],
      custom_start: formatDateForApiFilter(resolvedStart),
      custom_end: formatDateForApiFilter(resolvedEnd),
    }
  }

  useEffect(() => {
    if (!open) return

    const savedFilters = localStorage.getItem("current_filters")
    if (savedFilters) {
      try {
        const parsedFilters = JSON.parse(savedFilters)
        const filterState: FilterState = {}

        parsedFilters.forEach((filter: any) => {
          if (!filter.field) return

          if (
            filter.field === "create_date" &&
            filter.selected_values?.[0] === "custom" &&
            (filter.custom_start || filter.custom_end)
          ) {
            if (filter.custom_start) {
              filterState.start_date = normalizeStoredDateValue(filter.custom_start) || filter.custom_start
            }
            if (filter.custom_end) {
              filterState.end_date = normalizeStoredDateValue(filter.custom_end) || filter.custom_end
            }
            return
          }

          if (filter.field === "create_date" && filter.selected_values?.[0]) {
            const legacyDate =
              normalizeStoredDateValue(filter.selected_values[0]) || filter.selected_values[0]
            filterState.start_date = legacyDate
            filterState.end_date = legacyDate
            return
          }

          if (filter.selected_values && filter.selected_values.length > 0) {
            const uiField = mapApiFieldToUiField(filter.field)
            filterState[uiField] = filter.selected_values[0]
          }
        })

        setFilters(filterState)
        return
      } catch (e) {
        console.error("Error parsing saved filters:", e)
      }
    }

    setFilters(stripEmptyFilters(initialFilters))
  }, [open, initialFilters])

  useEffect(() => {
    if (!open || isLoading) return

    setFilters((prev) => {
      const normalized = normalizeFilterState(
        prev,
        leadStatusSettings,
        customerTypeSettings,
        filterOptions,
      )
      return JSON.stringify(normalized) === JSON.stringify(prev) ? prev : normalized
    })
  }, [open, isLoading, leadStatusSettings, customerTypeSettings, filterOptions])

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev }

      if (!value || value === "ALL") {
        delete newFilters[key]
        if (key === "lead_status") delete newFilters.stage
        if (key === "customer_type") delete newFilters.purpose
      } else {
        newFilters[key] = value
        if (key === "lead_status") delete newFilters.stage
        if (key === "customer_type") delete newFilters.purpose
      }

      return newFilters
    })
  }

  const handleReset = () => {
    setFilters({})
    localStorage.removeItem("current_filters")
    onApplyFilters([])
  }

  const handleApply = () => {
    const dateRangeFilter = buildCreateDateRangeFilter(filters.start_date, filters.end_date)
    const newFilters = Object.entries(filters)
      .filter(
        ([key, value]) =>
          key !== "start_date" &&
          key !== "end_date" &&
          value.trim() !== "" &&
          VALID_FILTER_KEYS.includes(key),
      )
      .map(([field, value]) => ({
        field: mapUiFieldToApiField(field),
        indictor: "is",
        field_orgin: "default",
        selected_values: [resolveApiFilterValue(field, value)],
      }))

    if (dateRangeFilter) {
      newFilters.push(dateRangeFilter)
    }

    if (newFilters.length === 0) {
      localStorage.removeItem("current_lead_metrics_filters")
      localStorage.removeItem("current_filters")
      onApplyFilters([] as any)
      onOpenChange(false)
      return
    }

    localStorage.removeItem("current_lead_metrics_filters")
    localStorage.setItem("current_filters", JSON.stringify(newFilters))
    onApplyFilters(newFilters)
    onOpenChange(false)
  }

  const getOptionsForFilter = (filterKey: string): Option[] => {
    if (filterKey === "stage") return stageOptions
    if (filterKey === "purpose") return purposeOptions
    return filterOptions[filterKey] || []
  }

  const renderFilterField = (filterDef: FilterDefinition) => {
    const options = getOptionsForFilter(filterDef.key)
    const currentValue = filters[filterDef.key]
    const isDependentDisabled = Boolean(filterDef.dependsOn && !filters[filterDef.dependsOn])
    const disabledMessage = isDependentDisabled
      ? `Select a ${filterDef.dependsOnLabel} first`
      : undefined

    if (filterDef.type === "date") {
      const selectedDate = parseDateValue(currentValue)
      const pairedDateKey = filterDef.key === "start_date" ? "end_date" : "start_date"
      const pairedDate = parseDateValue(filters[pairedDateKey])

      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">{filterDef.name}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  formSelectTriggerClassName,
                  "w-full justify-start text-left font-normal",
                  !currentValue && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                {currentValue ? formatDateDisplay(currentValue) : `Pick ${filterDef.name.toLowerCase()}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                disabled={(date) => {
                  if (filterDef.key === "end_date" && pairedDate) {
                    return date < pairedDate
                  }
                  if (filterDef.key === "start_date" && pairedDate) {
                    return date > pairedDate
                  }
                  return false
                }}
                onSelect={(date) => {
                  handleFilterChange(filterDef.key, date ? format(date, "yyyy-MM-dd") : "")
                }}
              />
            </PopoverContent>
          </Popover>
          {currentValue ? (
            <button
              type="button"
              onClick={() => handleFilterChange(filterDef.key, "")}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear date
            </button>
          ) : null}
        </div>
      )
    }

    if (filterDef.key === "stage" || filterDef.key === "purpose") {
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">{filterDef.name}</Label>
          <FilterCombobox
            value={currentValue}
            onChange={(value) => handleFilterChange(filterDef.key, value)}
            options={options}
            placeholder={`Select ${filterDef.name.toLowerCase()}`}
            disabled={isDependentDisabled}
            disabledMessage={disabledMessage}
            displayLabel={currentValue ? getDisplayLabel(filterDef.key, currentValue) : undefined}
          />
          {!isDependentDisabled && options.length === 0 ? (
            <p className="text-xs text-muted-foreground">No options available</p>
          ) : null}
        </div>
      )
    }

    const selectedOption = findOptionMatch(options, currentValue)

    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">{filterDef.name}</Label>
        <Select
          value={selectedOption?.value || (currentValue && currentValue !== "ALL" ? currentValue : "ALL")}
          onValueChange={(value) => handleFilterChange(filterDef.key, value)}
        >
          <SelectTrigger size="form" className={formSelectTriggerClassName}>
            <SelectValue placeholder={`Select ${filterDef.name.toLowerCase()}`}>
              {selectedOption ? (
                filterDef.key === "lead_status" ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: selectedOption.color || "#64748b" }}
                    />
                    {selectedOption.label}
                  </span>
                ) : (
                  selectedOption.label
                )
              ) : currentValue ? (
                getDisplayLabel(filterDef.key, currentValue)
              ) : null}
            </SelectValue>
          </SelectTrigger>
          <FormSelectContent>
            <FormSelectItem value="ALL">All</FormSelectItem>
            {options.map((option) => (
              <FormSelectItem key={option._id} value={option.value}>
                {filterDef.key === "lead_status" ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: option.color || "#64748b" }}
                    />
                    {option.label}
                  </span>
                ) : (
                  option.label
                )}
              </FormSelectItem>
            ))}
          </FormSelectContent>
        </Select>
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex h-full flex-col gap-0 p-0 data-[side=right]:sm:max-w-md">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
          <SheetHeader className="p-0 pb-5">
            <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
              <Filter className="h-5 w-5 text-primary" />
              Filters
              {activeFilterCount > 0 ? (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              ) : null}
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              Narrow down your leads by status, stage, customer type, purpose, or created date range.
            </SheetDescription>
            <Separator className="mt-4" />
          </SheetHeader>

          {activeFilterCount > 0 ? (
            <div className="mb-5 flex flex-wrap gap-2">
              {FILTER_DEFINITIONS.map((filterDef) => {
                const value = filters[filterDef.key]
                if (!value) return null

                return (
                  <Badge
                    key={filterDef.key}
                    variant="outline"
                    className="gap-1 rounded-full py-1 pr-1 pl-2.5 text-xs font-normal"
                  >
                    <span className="max-w-[180px] truncate">
                      {filterDef.name}: {getDisplayLabel(filterDef.key, value)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleFilterChange(filterDef.key, "")}
                      className="rounded-full p-0.5 transition-colors hover:bg-muted"
                      aria-label={`Remove ${filterDef.name} filter`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )
              })}
            </div>
          ) : null}

          <div className="space-y-5">
            {isLoading ? (
              <>
                <FilterFieldSkeleton />
                <FilterFieldSkeleton />
                <FilterFieldSkeleton />
                <FilterFieldSkeleton />
                <FilterFieldSkeleton />
              </>
            ) : (
              FILTER_DEFINITIONS.map((filterDef) => (
                <div key={filterDef.key}>{renderFilterField(filterDef)}</div>
              ))
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-row-reverse gap-3 border-t bg-background p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
          <Button className={footerButtonClass} onClick={handleApply}>
            Apply Filters
          </Button>
          <Button variant="outline" className={footerButtonClass} onClick={handleReset}>
            Reset
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
