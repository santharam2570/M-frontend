"use client"

import { useEffect, useMemo, useState } from "react"
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
import { Skeleton } from "@/components/ui/skeleton"
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
import { useProjectPermissions } from "@/hooks/useProjectPermissions"
import { useUserData } from "@/hooks/useUserData"
import { formSelectTriggerClassName } from "@/lib/form-field-styles"
import {
  fetchProjectFilterOptionsApi,
  type ProjectSettingOption,
} from "@/lib/projects/project-api"
import {
  EMPTY_PROJECT_FILTERS,
  type ProjectFilterState,
} from "@/lib/projects/types"
import { cn } from "@/lib/utils"

interface ProjectFilterDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: ProjectFilterState
  onFiltersChange: (filters: ProjectFilterState) => void
}

type FilterKey = keyof ProjectFilterState

interface FilterDefinition {
  key: FilterKey
  name: string
  type: "select" | "combobox"
  orgWideOnly?: boolean
}

const FILTER_DEFINITIONS: FilterDefinition[] = [
  { key: "branch_id", name: "Branch", type: "select", orgWideOnly: true },
  { key: "status", name: "Project Status", type: "select" },
  { key: "location", name: "Locality", type: "combobox" },
  { key: "property_type", name: "Property Type", type: "select" },
  { key: "rera_status", name: "RERA Status", type: "select" },
]

const footerButtonClass = "h-10 min-w-[88px] rounded-md px-4 py-2"

function getDisplayLabel(
  key: FilterKey,
  value: string,
  options: {
    statusOptions: ProjectSettingOption[]
    reraOptions: ProjectSettingOption[]
    propertyTypeOptions: ProjectSettingOption[]
    branchOptions: Array<{ value: string; label: string }>
  },
): string {
  if (!value) return ""

  switch (key) {
    case "branch_id":
      return options.branchOptions.find((item) => item.value === value)?.label || value
    case "status":
      return options.statusOptions.find((item) => item.value === value)?.label || value
    case "property_type":
      return options.propertyTypeOptions.find((item) => item.value === value)?.label || value
    case "rera_status":
      return options.reraOptions.find((item) => item.value === value)?.label || value
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

function FilterFieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

export function ProjectFilterDrawer({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: ProjectFilterDrawerProps) {
  const { userData, canAccessAllBranches } = useProjectPermissions()
  const { orgId } = useUserData()
  const [draft, setDraft] = useState<ProjectFilterState>(filters)
  const [isLoading, setIsLoading] = useState(false)
  const [statusOptions, setStatusOptions] = useState<ProjectSettingOption[]>([])
  const [reraOptions, setReraOptions] = useState<ProjectSettingOption[]>([])
  const [propertyTypeOptions, setPropertyTypeOptions] = useState<ProjectSettingOption[]>([])
  const [locationOptions, setLocationOptions] = useState<string[]>([])
  const [branchOptions, setBranchOptions] = useState<Array<{ value: string; label: string }>>([])

  const filterDefinitions = useMemo(
    () => FILTER_DEFINITIONS.filter((def) => !def.orgWideOnly || canAccessAllBranches),
    [canAccessAllBranches],
  )

  const labelOptions = useMemo(
    () => ({ statusOptions, reraOptions, propertyTypeOptions, branchOptions }),
    [statusOptions, reraOptions, propertyTypeOptions, branchOptions],
  )

  const fetchFilterOptions = async () => {
    try {
      setIsLoading(true)
      const token = userData?.access_token as string | undefined
      if (!token) return

      const options = await fetchProjectFilterOptionsApi({
        token,
        orgId: orgId || undefined,
      })

      setStatusOptions(options.statusOptions)
      setReraOptions(options.reraOptions)
      setPropertyTypeOptions(options.propertyTypeOptions)
      setLocationOptions(options.locationOptions)
      setBranchOptions(options.branchOptions)
    } catch (error) {
      console.error("Error fetching project filter options:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchFilterOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount / auth ready
  }, [userData?.access_token, orgId, canAccessAllBranches])

  useEffect(() => {
    if (open) {
      setDraft(filters)
    }
  }, [open, filters])

  const activeFilterCount = filterDefinitions.filter(
    (def) => draft[def.key].trim() !== "",
  ).length

  const updateDraft = (key: FilterKey, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleReset = () => {
    setDraft(EMPTY_PROJECT_FILTERS)
    onFiltersChange(EMPTY_PROJECT_FILTERS)
  }

  const handleApply = () => {
    const next: ProjectFilterState = { ...EMPTY_PROJECT_FILTERS, ...draft }
    if (!canAccessAllBranches) {
      next.branch_id = ""
    }
    onFiltersChange(next)
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

    if (filterDef.key === "branch_id") {
      return (
        <Select
          value={currentValue || "all"}
          onValueChange={(value) => updateDraft("branch_id", value === "all" ? "" : value)}
        >
          <SelectTrigger size="form" className={formSelectTriggerClassName}>
            <SelectValue placeholder="All branches" />
          </SelectTrigger>
          <FormSelectContent>
            <FormSelectItem value="all">All branches</FormSelectItem>
            {branchOptions.map((option) => (
              <FormSelectItem key={option.value} value={option.value}>
                {option.label}
              </FormSelectItem>
            ))}
          </FormSelectContent>
        </Select>
      )
    }

    const optionList =
      filterDef.key === "status"
        ? statusOptions
        : filterDef.key === "property_type"
          ? propertyTypeOptions
          : filterDef.key === "rera_status"
            ? reraOptions
            : []

    const allLabel =
      filterDef.key === "status"
        ? "All statuses"
        : filterDef.key === "property_type"
          ? "All types"
          : "All RERA statuses"

    const selectedOption = optionList.find((option) => option.value === currentValue)
    const showColor =
      filterDef.key === "status" || filterDef.key === "rera_status"

    return (
      <Select
        value={currentValue || "all"}
        onValueChange={(value) => updateDraft(filterDef.key, value === "all" ? "" : value)}
      >
        <SelectTrigger size="form" className={formSelectTriggerClassName}>
          <SelectValue placeholder={allLabel}>
            {currentValue && showColor ? (
              <span className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: selectedOption?.color || "#64748b" }}
                />
                {getDisplayLabel(filterDef.key, currentValue, labelOptions)}
              </span>
            ) : null}
          </SelectValue>
        </SelectTrigger>
        <FormSelectContent>
          <FormSelectItem value="all">{allLabel}</FormSelectItem>
          {optionList.map((option) => (
            <FormSelectItem key={option.value} value={option.value}>
              {showColor ? (
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
    )
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
              Narrow inventory by
              {canAccessAllBranches ? " branch," : ""} status, location, and compliance.
            </SheetDescription>
            <Separator className="mt-4" />
          </SheetHeader>

          {isLoading ? (
            <div className="space-y-5">
              {canAccessAllBranches ? <FilterFieldSkeleton /> : null}
              <FilterFieldSkeleton />
              <FilterFieldSkeleton />
              <FilterFieldSkeleton />
              <FilterFieldSkeleton />
            </div>
          ) : (
            <>
              {activeFilterCount > 0 ? (
                <div className="mb-5 flex flex-wrap gap-2">
                  {filterDefinitions.map((filterDef) => {
                    const value = draft[filterDef.key]
                    if (!value) return null

                    return (
                      <Badge
                        key={filterDef.key}
                        variant="outline"
                        className="gap-1 rounded-full py-1 pr-1 pl-2.5 text-xs font-normal"
                      >
                        <span className="max-w-[180px] truncate">
                          {filterDef.name}: {getDisplayLabel(filterDef.key, value, labelOptions)}
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
                {filterDefinitions.map((filterDef) => (
                  <div key={filterDef.key} className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">{filterDef.name}</Label>
                    {renderSelectField(filterDef)}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-row-reverse gap-3 border-t bg-background p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
          <Button className={footerButtonClass} onClick={handleApply} disabled={isLoading}>
            Apply Filters
          </Button>
          <Button
            variant="outline"
            className={footerButtonClass}
            onClick={handleReset}
            disabled={isLoading}
          >
            Reset
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
