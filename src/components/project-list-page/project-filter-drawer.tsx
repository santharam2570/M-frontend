"use client"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ProjectFilterState } from "@/lib/projects/types"
import { formSelectTriggerClassName } from "@/lib/form-field-styles"

interface ProjectFilterDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: ProjectFilterState
  onFiltersChange: (filters: ProjectFilterState) => void
  locationOptions: string[]
}

export function ProjectFilterDrawer({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  locationOptions,
}: ProjectFilterDrawerProps) {
  const updateFilter = (key: keyof ProjectFilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange({
      status: "",
      location: "",
      property_type: "",
      rera_status: "",
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filter Projects</SheetTitle>
          <SheetDescription>Narrow inventory by status, location, and compliance.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label>Project Status</Label>
            <Select value={filters.status || "all"} onValueChange={(v) => updateFilter("status", v === "all" ? "" : v)}>
              <SelectTrigger className={formSelectTriggerClassName}>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="sold_out">Sold Out</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Locality</Label>
            <Select value={filters.location || "all"} onValueChange={(v) => updateFilter("location", v === "all" ? "" : v)}>
              <SelectTrigger className={formSelectTriggerClassName}>
                <SelectValue placeholder="All localities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All localities</SelectItem>
                {locationOptions.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Property Type</Label>
            <Select
              value={filters.property_type || "all"}
              onValueChange={(v) => updateFilter("property_type", v === "all" ? "" : v)}
            >
              <SelectTrigger className={formSelectTriggerClassName}>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="plot">Plot</SelectItem>
                <SelectItem value="villa">Villa</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="agri_land">Agri Land</SelectItem>
                <SelectItem value="industrial_land">Industrial Land</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>RERA Status</Label>
            <Select
              value={filters.rera_status || "all"}
              onValueChange={(v) => updateFilter("rera_status", v === "all" ? "" : v)}
            >
              <SelectTrigger className={formSelectTriggerClassName}>
                <SelectValue placeholder="All RERA statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All RERA statuses</SelectItem>
                <SelectItem value="approved">RERA Approved</SelectItem>
                <SelectItem value="pending">RERA Pending</SelectItem>
                <SelectItem value="not_applicable">Not Applicable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={clearFilters}>
              Clear
            </Button>
            <Button className="flex-1" onClick={() => onOpenChange(false)}>
              Apply
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
