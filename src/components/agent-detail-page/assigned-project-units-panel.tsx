"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronRight, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatUnitArea,
  getStatusBadgeStyle,
  getStatusLabel,
} from "@/components/project-detail-page/units/unit-utils"
import {
  leadDetailDashedEmptyClassName,
  leadDetailTableHeaderRowClassName,
  leadDetailTableRowClassName,
  leadDetailTableWrapClassName,
} from "@/lib/form-field-styles"
import {
  fetchResolvedProjectUnits,
  fetchUnitStatusOptionsApi,
  type ProjectSettingOption,
} from "@/lib/projects/project-api"
import { UNIT_STATUS_OPTIONS_QUERY_KEY } from "@/lib/projects/project-shared-queries"
import {
  formatIndianCurrency,
  PROPERTY_TYPE_LABELS,
  type Project,
  type ProjectUnit,
} from "@/lib/projects/types"
import { cn } from "@/lib/utils"

interface AssignedProjectUnitsPanelProps {
  projects: Project[]
}

function UnitStatusBadge({
  status,
  statusOptions,
}: {
  status: ProjectUnit["status"]
  statusOptions: ProjectSettingOption[]
}) {
  const label = getStatusLabel(status, statusOptions)
  const badgeStyle = getStatusBadgeStyle(status, statusOptions)

  return (
    <Badge
      variant="outline"
      className="border-0 text-xs font-medium"
      style={badgeStyle}
    >
      {label}
    </Badge>
  )
}

function ProjectUnitsTable({
  units,
  statusOptions,
}: {
  units: ProjectUnit[]
  statusOptions: ProjectSettingOption[]
}) {
  const sortedUnits = useMemo(
    () => [...units].sort((a, b) => a.unit_no.localeCompare(b.unit_no)),
    [units],
  )

  if (sortedUnits.length === 0) {
    return (
      <div className={cn(leadDetailDashedEmptyClassName, "py-6 text-sm")}>
        No units found for this project.
      </div>
    )
  }

  return (
    <div className={cn(leadDetailTableWrapClassName, "responsive-table-wrap overflow-hidden")}>
      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow className={leadDetailTableHeaderRowClassName}>
            <TableHead>Unit No</TableHead>
            <TableHead>Block</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Area</TableHead>
            <TableHead>Price / sq.ft</TableHead>
            <TableHead>Total Price</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedUnits.map((unit) => (
            <TableRow key={unit._id} className={leadDetailTableRowClassName}>
              <TableCell className="font-medium">{unit.unit_no || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{unit.block || "—"}</TableCell>
              <TableCell>{PROPERTY_TYPE_LABELS[unit.property_type] ?? unit.property_type}</TableCell>
              <TableCell>{formatUnitArea(unit)}</TableCell>
              <TableCell className="tabular-nums">
                ₹{unit.price_per_sqft.toLocaleString("en-IN")}
              </TableCell>
              <TableCell className="tabular-nums font-medium">
                {formatIndianCurrency(unit.total_price)}
              </TableCell>
              <TableCell>
                <UnitStatusBadge status={unit.status} statusOptions={statusOptions} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ProjectUnitsCollapsible({
  project,
  statusOptions,
}: {
  project: Project
  statusOptions: ProjectSettingOption[]
}) {
  const [open, setOpen] = useState(false)

  const { data: units = [], isLoading } = useQuery({
    queryKey: ["project-units", project._id],
    enabled: open,
    queryFn: () =>
      fetchResolvedProjectUnits(project._id, {
        embeddedUnits: project.units,
      }),
  })

  const unitCountLabel = open
    ? isLoading
      ? "Loading units..."
      : `${units.length} ${units.length === 1 ? "unit" : "units"}`
    : "Expand to view units"

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/project-units">
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
          <p className="text-xs text-muted-foreground">{unitCountLabel}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-in-out group-data-[state=open]/project-units:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out data-[state=closed]:grid-rows-[0fr] data-[state=open]:grid-rows-[1fr]">
        <div className="min-h-0 overflow-hidden border-x border-b border-border px-3 py-3">
          {isLoading ? (
            <div
              className={cn(
                leadDetailDashedEmptyClassName,
                "flex items-center justify-center gap-2 py-6 text-sm",
              )}
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading unit details...
            </div>
          ) : (
            <ProjectUnitsTable units={units} statusOptions={statusOptions} />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function AssignedProjectUnitsPanel({ projects }: AssignedProjectUnitsPanelProps) {
  const { data: statusOptions = [] } = useQuery({
    queryKey: UNIT_STATUS_OPTIONS_QUERY_KEY,
    queryFn: () => fetchUnitStatusOptionsApi(),
  })

  if (projects.length === 0) {
    return <div className={leadDetailDashedEmptyClassName}>No projects assigned yet.</div>
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => (
        <ProjectUnitsCollapsible
          key={project._id}
          project={project}
          statusOptions={statusOptions}
        />
      ))}
    </div>
  )
}
