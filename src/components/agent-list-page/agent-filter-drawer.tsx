"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  FormSelectContent,
  FormSelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  sheetFormContentClassName,
} from "@/components/ui/sheet"
import {
  AGENT_TYPE_LABELS,
  type AgentFilterState,
} from "@/lib/agents/types"
import {
  formModalFooterButtonClassName,
  formModalFooterClassName,
  formSelectTriggerClassName,
} from "@/lib/form-field-styles"

interface BranchOption {
  value: string
  label: string
}

interface AgentFilterDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: AgentFilterState
  branchOptions: BranchOption[]
  onApply: (filters: AgentFilterState) => void
  onClear: () => void
}

function AgentFilterForm({
  filters,
  branchOptions,
  onApply,
  onClear,
  onClose,
}: {
  filters: AgentFilterState
  branchOptions: BranchOption[]
  onApply: (filters: AgentFilterState) => void
  onClear: () => void
  onClose: () => void
}) {
  const [localFilters, setLocalFilters] = React.useState<AgentFilterState>(filters)

  const updateFilter = (key: keyof AgentFilterState, value: string) => {
    setLocalFilters((current) => ({ ...current, [key]: value === "all" ? "" : value }))
  }

  return (
    <>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={localFilters.status || "all"}
            onValueChange={(value) => updateFilter("status", value)}
          >
            <SelectTrigger className={formSelectTriggerClassName}>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <FormSelectContent>
              <FormSelectItem value="all">All statuses</FormSelectItem>
              <FormSelectItem value="active">Active</FormSelectItem>
              <FormSelectItem value="inactive">Inactive</FormSelectItem>
            </FormSelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Agent Type</Label>
          <Select
            value={localFilters.agent_type || "all"}
            onValueChange={(value) => updateFilter("agent_type", value)}
          >
            <SelectTrigger className={formSelectTriggerClassName}>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <FormSelectContent>
              <FormSelectItem value="all">All types</FormSelectItem>
              {Object.entries(AGENT_TYPE_LABELS).map(([value, label]) => (
                <FormSelectItem key={value} value={value}>
                  {label}
                </FormSelectItem>
              ))}
            </FormSelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Branch</Label>
          <Select
            value={localFilters.branch_id || "all"}
            onValueChange={(value) => updateFilter("branch_id", value)}
          >
            <SelectTrigger className={formSelectTriggerClassName}>
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
        </div>
      </div>

      <div className={formModalFooterClassName}>
        <Button
          className={formModalFooterButtonClassName}
          onClick={() => {
            onApply(localFilters)
            onClose()
          }}
        >
          Apply Filters
        </Button>
        <Button
          variant="outline"
          className={formModalFooterButtonClassName}
          onClick={() => {
            onClear()
            onClose()
          }}
        >
          Clear All
        </Button>
      </div>
    </>
  )
}

export function AgentFilterDrawer({
  open,
  onOpenChange,
  filters,
  branchOptions,
  onApply,
  onClear,
}: AgentFilterDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={sheetFormContentClassName}>
        <SheetHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6 pr-12 text-left">
          <SheetTitle className="text-lg font-semibold">Filter Agents</SheetTitle>
          <SheetDescription>Refine the agent list by status, type, or branch.</SheetDescription>
        </SheetHeader>

        {open ? (
          <AgentFilterForm
            key={JSON.stringify(filters)}
            filters={filters}
            branchOptions={branchOptions}
            onApply={onApply}
            onClear={onClear}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
