"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  FormSelectContent,
  FormSelectItem,
  Select,
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
  formModalFooterButtonClassName,
  formModalFooterClassName,
  formSelectTriggerClassName,
} from "@/lib/form-field-styles"
import type { ProjectSettingOption } from "@/lib/projects/project-api"

export interface BookingFilterState {
  project_id: string
  status: string
}

export const EMPTY_BOOKING_FILTERS: BookingFilterState = {
  project_id: "",
  status: "",
}

interface ProjectOption {
  _id: string
  name: string
}

interface BookingFilterDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: BookingFilterState
  projectOptions: ProjectOption[]
  statusOptions: ProjectSettingOption[]
  onApply: (filters: BookingFilterState) => void
  onClear: () => void
}

function BookingFilterForm({
  filters,
  projectOptions,
  statusOptions,
  onApply,
  onClear,
  onClose,
}: {
  filters: BookingFilterState
  projectOptions: ProjectOption[]
  statusOptions: ProjectSettingOption[]
  onApply: (filters: BookingFilterState) => void
  onClear: () => void
  onClose: () => void
}) {
  const [localFilters, setLocalFilters] = React.useState<BookingFilterState>(filters)

  const updateFilter = (key: keyof BookingFilterState, value: string) => {
    setLocalFilters((current) => ({
      ...current,
      [key]: value === "all" ? "" : value,
    }))
  }

  return (
    <>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6">
        <div className="space-y-2">
          <Label>Project</Label>
          <Select
            value={localFilters.project_id || "all"}
            onValueChange={(value) => updateFilter("project_id", value)}
          >
            <SelectTrigger className={formSelectTriggerClassName}>
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <FormSelectContent>
              <FormSelectItem value="all">All projects</FormSelectItem>
              {projectOptions.map((project) => (
                <FormSelectItem key={project._id} value={project._id}>
                  {project.name || "Untitled project"}
                </FormSelectItem>
              ))}
            </FormSelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Booking Status</Label>
          <Select
            value={localFilters.status || "all"}
            onValueChange={(value) => updateFilter("status", value)}
          >
            <SelectTrigger className={formSelectTriggerClassName}>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <FormSelectContent>
              <FormSelectItem value="all">All statuses</FormSelectItem>
              {statusOptions.map((option) => (
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

export function BookingFilterDrawer({
  open,
  onOpenChange,
  filters,
  projectOptions,
  statusOptions,
  onApply,
  onClear,
}: BookingFilterDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={sheetFormContentClassName}>
        <SheetHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6 pr-12 text-left">
          <SheetTitle className="text-lg font-semibold">Filter Bookings</SheetTitle>
          <SheetDescription>
            Refine the booking list by project or booking status.
          </SheetDescription>
        </SheetHeader>

        {open ? (
          <BookingFilterForm
            key={JSON.stringify(filters)}
            filters={filters}
            projectOptions={projectOptions}
            statusOptions={statusOptions}
            onApply={onApply}
            onClear={onClear}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
