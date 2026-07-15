"use client"

import { format } from "date-fns"
import { CalendarIcon, Filter, RotateCcw, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  FormSelectContent,
  FormSelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formSelectTriggerClassName } from "@/lib/form-field-styles"
import { cn } from "@/lib/utils"
import type { ReportsFilters, ReportsUser } from "@/lib/reports/types"
import { DEFAULT_REPORTS_FILTERS } from "@/lib/reports/types"

interface ReportsProjectOption {
  _id: string
  name: string
  branch_id?: string
}

interface ReportsFiltersBarProps {
  filters: ReportsFilters
  onChange: (filters: ReportsFilters) => void
  branches: Array<{ id: string; name: string }>
  projects: ReportsProjectOption[]
  users: ReportsUser[]
  isLoading?: boolean
  showBranchFilter?: boolean
}

function matchesSelectedBranch(entityBranchId: string | undefined, branchId: string): boolean {
  if (branchId === "all") return true
  // Keep items without a branch so org-wide options remain selectable
  if (!entityBranchId) return true
  return entityBranchId === branchId
}

function formatFilterDate(value?: string): string {
  if (!value) return "Pick date"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "Pick date"
  return format(parsed, "dd MMM yyyy")
}

function FilterDateField({
  label,
  value,
  onChange,
}: {
  label: string
  value?: string
  onChange: (value: string | undefined) => void
}) {
  const selected = value ? new Date(value) : undefined

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              formSelectTriggerClassName,
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatFilterDate(value)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : undefined)}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function ReportsFiltersBar({
  filters,
  onChange,
  branches,
  projects,
  users,
  isLoading = false,
  showBranchFilter = true,
}: ReportsFiltersBarProps) {
  const scopedProjects = projects.filter((project) =>
    matchesSelectedBranch(project.branch_id, filters.branchId),
  )
  const scopedUsers = users.filter((user) =>
    matchesSelectedBranch(user.branch_id, filters.branchId),
  )

  const admins = scopedUsers.filter((user) => user.isActive && user.role_tier === "admin")
  const managers = scopedUsers.filter(
    (user) => user.isActive && user.role_tier === "branch_manager",
  )
  const branchUsers = scopedUsers.filter(
    (user) => user.isActive && user.role_tier === "branch_user",
  )

  const activeFilterCount = [
    filters.branchId !== "all",
    filters.projectId !== "all",
    filters.userId !== "all",
    filters.managerId !== "all",
    filters.adminId !== "all",
    Boolean(filters.startDate),
    Boolean(filters.endDate),
  ].filter(Boolean).length

  const update = (patch: Partial<ReportsFilters>) => {
    const next = { ...filters, ...patch }

    // Drop dependent selections that are no longer in the scoped branch list
    if (patch.branchId != null && patch.branchId !== filters.branchId) {
      const nextProjects = projects.filter((project) =>
        matchesSelectedBranch(project.branch_id, next.branchId),
      )
      const nextUsers = users.filter((user) =>
        matchesSelectedBranch(user.branch_id, next.branchId),
      )

      if (
        next.projectId !== "all" &&
        !nextProjects.some((project) => project._id === next.projectId)
      ) {
        next.projectId = "all"
      }
      if (next.adminId !== "all" && !nextUsers.some((user) => user.id === next.adminId)) {
        next.adminId = "all"
      }
      if (next.managerId !== "all" && !nextUsers.some((user) => user.id === next.managerId)) {
        next.managerId = "all"
      }
      if (next.userId !== "all" && !nextUsers.some((user) => user.id === next.userId)) {
        next.userId = "all"
      }
    }

    onChange(next)
  }

  return (
    <section className="mb-6 rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Filters</h2>
          {activeFilterCount > 0 ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {activeFilterCount} active
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isLoading || activeFilterCount === 0}
          onClick={() => onChange(DEFAULT_REPORTS_FILTERS)}
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Reset
        </Button>
      </div>

      <div
        className={cn(
          "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
          showBranchFilter ? "2xl:grid-cols-7" : "2xl:grid-cols-6",
        )}
      >
        {showBranchFilter ? (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Branch</Label>
            <Select
              value={filters.branchId}
              onValueChange={(value) => update({ branchId: value })}
              disabled={isLoading}
            >
              <SelectTrigger className={formSelectTriggerClassName}>
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <FormSelectContent>
                <FormSelectItem value="all">All branches</FormSelectItem>
                {branches.map((branch) => (
                  <FormSelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </FormSelectItem>
                ))}
              </FormSelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Project</Label>
          <Select
            value={filters.projectId}
            onValueChange={(value) => update({ projectId: value })}
            disabled={isLoading}
          >
            <SelectTrigger className={formSelectTriggerClassName}>
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <FormSelectContent>
              <FormSelectItem value="all">All projects</FormSelectItem>
              {scopedProjects.map((project) => (
                <FormSelectItem key={project._id} value={project._id}>
                  {project.name}
                </FormSelectItem>
              ))}
            </FormSelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Admin</Label>
          <Select
            value={filters.adminId}
            onValueChange={(value) => update({ adminId: value })}
            disabled={isLoading}
          >
            <SelectTrigger className={formSelectTriggerClassName}>
              <SelectValue placeholder="All admins" />
            </SelectTrigger>
            <FormSelectContent>
              <FormSelectItem value="all">All admins</FormSelectItem>
              {admins.map((admin) => (
                <FormSelectItem key={admin.id} value={admin.id}>
                  {admin.name}
                </FormSelectItem>
              ))}
            </FormSelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Manager</Label>
          <Select
            value={filters.managerId}
            onValueChange={(value) => update({ managerId: value })}
            disabled={isLoading}
          >
            <SelectTrigger className={formSelectTriggerClassName}>
              <SelectValue placeholder="All managers" />
            </SelectTrigger>
            <FormSelectContent>
              <FormSelectItem value="all">All managers</FormSelectItem>
              {managers.map((manager) => (
                <FormSelectItem key={manager.id} value={manager.id}>
                  {manager.name}
                </FormSelectItem>
              ))}
            </FormSelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">User</Label>
          <Select
            value={filters.userId}
            onValueChange={(value) => update({ userId: value })}
            disabled={isLoading}
          >
            <SelectTrigger className={formSelectTriggerClassName}>
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <FormSelectContent>
              <FormSelectItem value="all">All users</FormSelectItem>
              {branchUsers.map((user) => (
                <FormSelectItem key={user.id} value={user.id}>
                  {user.name}
                </FormSelectItem>
              ))}
            </FormSelectContent>
          </Select>
        </div>

        <FilterDateField
          label="Start date"
          value={filters.startDate}
          onChange={(startDate) => update({ startDate })}
        />

        <FilterDateField
          label="End date"
          value={filters.endDate}
          onChange={(endDate) => update({ endDate })}
        />
      </div>

      {activeFilterCount > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.branchId !== "all" ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 gap-1 rounded-full px-2.5 text-xs"
              onClick={() => update({ branchId: "all" })}
            >
              Branch: {branches.find((b) => b.id === filters.branchId)?.name ?? filters.branchId}
              <X className="h-3 w-3" />
            </Button>
          ) : null}
          {filters.projectId !== "all" ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 gap-1 rounded-full px-2.5 text-xs"
              onClick={() => update({ projectId: "all" })}
            >
              Project:{" "}
              {scopedProjects.find((p) => p._id === filters.projectId)?.name ??
                projects.find((p) => p._id === filters.projectId)?.name ??
                "Selected"}
              <X className="h-3 w-3" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
