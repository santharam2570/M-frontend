"use client"

import { useEffect, useState } from "react"
import { Check, ChevronsUpDown, Filter, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  FormSelectContent,
  FormSelectItem,
  Select,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ProjectFilterState, ProjectStatus, PropertyType, ReraStatus } from "@/lib/projects/types"
import {
  PROJECT_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  RERA_STATUS_LABELS,
} from "@/lib/projects/types"
import { formSelectTriggerClassName } from "@/lib/form-field-styles"
import { cn } from "@/lib/utils"

interface ProjectFilterDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: ProjectFilterState
  onFiltersChange: (filters: ProjectFilterState) => void
  locationOptions: string[]
}

type FilterKey = keyof ProjectFilterState

interface FilterDefinition {
  key: FilterKey
  name: string
  type: "select" | "combobox"
}

const EMPTY_FILTERS: ProjectFilterState = {
  status: "",
  location: "",
  property_type: "",
  rera_status: "",
}

const FILTER_DEFINITIONS: FilterDefinition[] = [
  { key: "status", name: "Project Status", type: "select" },
  { key: "location", name: "Locality", type: "combobox" },
  { key: "property_type", name: "Property Type", type: "select" },
  { key: "rera_status", name: "RERA Status", type: "select" },
]

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: "#10b981",
  upcoming: "#3b82f6",
  sold_out: "#64748b",
  on_hold: "#f59e0b",
}

const RERA_COLORS: Record<ReraStatus, string> = {
  approved: "#10b981",
  pending: "#f59e0b",
  not_applicable: "#94a3b8",
}

const footerButtonClass = "h-10 min-w-[88px] rounded-md px-4 py-2"

function getDisplayLabel(key: FilterKey, value: string): string {
  if (!value) return ""

  switch (key) {
    case "status":
      return PROJECT_STATUS_LABELS[value as ProjectStatus] || value
    case "property_type":
      return PROPERTY_TYPE_LABELS[value as PropertyType] || value
    case "rera_status":
      return RERA_STATUS_LABELS[value as ReraStatus] || value
    default:
      return value
  }
}

function LocalityCombobox({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(formSelectTriggerClassName, "w-full")}
        >
          {value ? (
            <span className="truncate">{value}</span>
          ) : (
            <span className="text-muted-foreground">All localities</span>
          )}
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search localities..." className="h-9" />
          <CommandList>
            <CommandEmpty>No localities found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all-localities"
                onSelect={() => {
                  onChange("")
                  setOpen(false)
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                All localities
              </CommandItem>
              {options.map((location) => (
                <CommandItem
                  key={location}
                  value={location}
                  onSelect={() => {
                    onChange(location)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === location ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{location}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function ProjectFilterDrawer({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  locationOptions,
}: ProjectFilterDrawerProps) {
  const [draft, setDraft] = useState<ProjectFilterState>(filters)

  useEffect(() => {
    if (open) {
      setDraft(filters)
    }
  }, [open, filters])

  const activeFilterCount = Object.values(draft).filter((value) => value.trim() !== "").length

  const updateDraft = (key: FilterKey, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleReset = () => {
    setDraft(EMPTY_FILTERS)
    onFiltersChange(EMPTY_FILTERS)
  }

  const handleApply = () => {
    onFiltersChange(draft)
    onOpenChange(false)
  }

  const renderSelectField = (filterDef: FilterDefinition) => {
    const currentValue = draft[filterDef.key]

    if (filterDef.key === "location") {
      return (
        <LocalityCombobox
          value={currentValue}
          onChange={(value) => updateDraft("location", value)}
          options={locationOptions}
        />
      )
    }

    if (filterDef.key === "status") {
      return (
        <Select
          value={currentValue || "all"}
          onValueChange={(value) => updateDraft("status", value === "all" ? "" : value)}
        >
          <SelectTrigger size="form" className={formSelectTriggerClassName}>
            <SelectValue placeholder="All statuses">
              {currentValue ? (
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[currentValue as ProjectStatus] }}
                  />
                  {getDisplayLabel("status", currentValue)}
                </span>
              ) : null}
            </SelectValue>
          </SelectTrigger>
          <FormSelectContent>
            <FormSelectItem value="all">All statuses</FormSelectItem>
            {(Object.entries(PROJECT_STATUS_LABELS) as [ProjectStatus, string][]).map(
              ([value, label]) => (
                <FormSelectItem key={value} value={value}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[value] }}
                    />
                    {label}
                  </span>
                </FormSelectItem>
              ),
            )}
          </FormSelectContent>
        </Select>
      )
    }

    if (filterDef.key === "property_type") {
      return (
        <Select
          value={currentValue || "all"}
          onValueChange={(value) => updateDraft("property_type", value === "all" ? "" : value)}
        >
          <SelectTrigger size="form" className={formSelectTriggerClassName}>
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <FormSelectContent>
            <FormSelectItem value="all">All types</FormSelectItem>
            {(Object.entries(PROPERTY_TYPE_LABELS) as [PropertyType, string][]).map(
              ([value, label]) => (
                <FormSelectItem key={value} value={value}>
                  {label}
                </FormSelectItem>
              ),
            )}
          </FormSelectContent>
        </Select>
      )
    }

    if (filterDef.key === "rera_status") {
      return (
        <Select
          value={currentValue || "all"}
          onValueChange={(value) => updateDraft("rera_status", value === "all" ? "" : value)}
        >
          <SelectTrigger size="form" className={formSelectTriggerClassName}>
            <SelectValue placeholder="All RERA statuses">
              {currentValue ? (
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: RERA_COLORS[currentValue as ReraStatus] }}
                  />
                  {getDisplayLabel("rera_status", currentValue)}
                </span>
              ) : null}
            </SelectValue>
          </SelectTrigger>
          <FormSelectContent>
            <FormSelectItem value="all">All RERA statuses</FormSelectItem>
            {(Object.entries(RERA_STATUS_LABELS) as [ReraStatus, string][]).map(
              ([value, label]) => (
                <FormSelectItem key={value} value={value}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: RERA_COLORS[value] }}
                    />
                    {label}
                  </span>
                </FormSelectItem>
              ),
            )}
          </FormSelectContent>
        </Select>
      )
    }

    return null
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex h-full flex-col gap-0 p-0 data-[side=right]:sm:max-w-md">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
          <SheetHeader className="p-0 pb-5">
            <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
              <Filter className="h-5 w-5 text-primary" />
              Filter Projects
              {activeFilterCount > 0 ? (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              ) : null}
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              Narrow inventory by status, location, and compliance.
            </SheetDescription>
            <Separator className="mt-4" />
          </SheetHeader>

          {activeFilterCount > 0 ? (
            <div className="mb-5 flex flex-wrap gap-2">
              {FILTER_DEFINITIONS.map((filterDef) => {
                const value = draft[filterDef.key]
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
                      onClick={() => updateDraft(filterDef.key, "")}
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
            {FILTER_DEFINITIONS.map((filterDef) => (
              <div key={filterDef.key} className="space-y-2">
                <Label className="text-sm font-medium text-foreground">{filterDef.name}</Label>
                {renderSelectField(filterDef)}
              </div>
            ))}
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
