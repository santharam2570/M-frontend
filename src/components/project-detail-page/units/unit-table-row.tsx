"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { Check, Loader2, Pencil, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  FormSelectContent,
  FormSelectItem,
  Select,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TableCell, TableRow } from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ProjectSettingOption } from "@/lib/projects/project-api"
import {
  canEditUnitField,
  canPerformUnitAction,
  type UnitFieldKey,
  type UnitPermissions,
} from "@/lib/projects/unit-permissions"
import type { ProjectUnit } from "@/lib/projects/types"
import { formatIndianCurrency, PROPERTY_TYPE_LABELS } from "@/lib/projects/types"
import { cn } from "@/lib/utils"
import {
  CENTS_PROPERTY_TYPES,
  formatUnitArea,
  getStatusBadgeStyle,
  getStatusLabel,
  isBookingStatus,
  type UnitDraft,
  type UnitDraftErrors,
} from "./unit-utils"

const propertyTypeOptions = Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const rowInputClassName =
  "h-8 border-slate-200 bg-white px-2 text-sm shadow-none focus-visible:ring-1"
const rowSelectTriggerClassName =
  "h-8 w-full border-slate-200 bg-white px-2 text-sm shadow-none focus-visible:ring-1"

interface UnitTableRowProps {
  projectId?: string
  unit: ProjectUnit
  statusOptions: ProjectSettingOption[]
  permissions: UnitPermissions
  isEditing: boolean
  isSaving: boolean
  draft: UnitDraft | null
  draftErrors: UnitDraftErrors
  onStartEdit: (unit: ProjectUnit) => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onDraftChange: (patch: Partial<UnitDraft>) => void
}

function UnitStatusBadge({
  status,
  statusOptions,
  projectId,
  unitId,
}: {
  status: ProjectUnit["status"]
  statusOptions: ProjectSettingOption[]
  projectId?: string
  unitId?: string
}) {
  const label = getStatusLabel(status, statusOptions)
  const badgeStyle = getStatusBadgeStyle(status, statusOptions)

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "border-0 text-xs font-medium",
        isBookingStatus(status, statusOptions) && projectId && "cursor-pointer",
      )}
      style={badgeStyle}
    >
      {label}
    </Badge>
  )

  if (isBookingStatus(status, statusOptions) && projectId && unitId) {
    return (
      <Link
        href={`/bookings?projectId=${projectId}&unitId=${unitId}&unitStatus=booking`}
        className="inline-flex"
      >
        {badge}
      </Link>
    )
  }

  return badge
}

function ReadOnlyCell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn("px-1 py-0.5", className)}>{children}</div>
}

function EditableCell({
  field,
  permissions,
  isEditing,
  draft,
  draftErrors,
  statusOptions,
  onDraftChange,
  unit,
  projectId,
}: {
  field: UnitFieldKey
  permissions: UnitPermissions
  isEditing: boolean
  draft: UnitDraft | null
  draftErrors: UnitDraftErrors
  statusOptions: ProjectSettingOption[]
  onDraftChange: (patch: Partial<UnitDraft>) => void
  unit: ProjectUnit
  projectId?: string
}) {
  const canEdit = canEditUnitField(permissions, field)

  if (!isEditing || !draft) {
    switch (field) {
      case "unit_no":
        if (projectId) {
          return (
            <Link
              href={`/bookings?projectId=${projectId}&unitId=${unit._id}&unitStatus=booking`}
              className="px-1 py-0.5 font-medium text-primary hover:underline"
            >
              {unit.unit_no}
            </Link>
          )
        }
        return <ReadOnlyCell className="font-medium">{unit.unit_no}</ReadOnlyCell>
      case "block":
        return (
          <ReadOnlyCell className="text-muted-foreground">
            {unit.block || "—"}
          </ReadOnlyCell>
        )
      case "property_type":
        return <ReadOnlyCell>{PROPERTY_TYPE_LABELS[unit.property_type]}</ReadOnlyCell>
      case "area":
        return <ReadOnlyCell>{formatUnitArea(unit)}</ReadOnlyCell>
      case "price_per_sqft":
        return (
          <ReadOnlyCell className="tabular-nums">
            ₹{unit.price_per_sqft.toLocaleString("en-IN")}
          </ReadOnlyCell>
        )
      case "total_price":
        return (
          <ReadOnlyCell className="tabular-nums font-medium">
            {formatIndianCurrency(unit.total_price)}
          </ReadOnlyCell>
        )
      case "status":
        return (
          <ReadOnlyCell>
            <UnitStatusBadge
              status={unit.status}
              statusOptions={statusOptions}
              projectId={projectId}
              unitId={unit._id}
            />
          </ReadOnlyCell>
        )
      default:
        return null
    }
  }

  if (!canEdit) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-not-allowed rounded px-1 py-0.5 opacity-70">
              <EditableCell
                field={field}
                permissions={permissions}
                isEditing={false}
                draft={null}
                draftErrors={{}}
                statusOptions={statusOptions}
                onDraftChange={onDraftChange}
                unit={unit}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>You don&apos;t have permission to edit this field.</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const error = draftErrors[field]

  switch (field) {
    case "unit_no":
      return (
        <div className="space-y-1">
          <Input
            value={draft.unit_no}
            onChange={(event) => onDraftChange({ unit_no: event.target.value })}
            className={cn(rowInputClassName, error && "border-destructive")}
          />
          {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
        </div>
      )
    case "block":
      return (
        <Input
          value={draft.block}
          onChange={(event) => onDraftChange({ block: event.target.value })}
          placeholder="Block"
          className={rowInputClassName}
        />
      )
    case "property_type":
      return (
        <Select
          value={draft.property_type}
          onValueChange={(value) =>
            onDraftChange({ property_type: value as UnitDraft["property_type"] })
          }
        >
          <SelectTrigger className={cn(rowSelectTriggerClassName, error && "border-destructive")}>
            <SelectValue />
          </SelectTrigger>
          <FormSelectContent>
            {propertyTypeOptions.map((option) => (
              <FormSelectItem key={option.value} value={option.value}>
                {option.label}
              </FormSelectItem>
            ))}
          </FormSelectContent>
        </Select>
      )
    case "area":
      return (
        <div className="space-y-1">
          <Input
            type="number"
            min="0"
            value={draft.area}
            onChange={(event) => onDraftChange({ area: event.target.value })}
            placeholder={
              CENTS_PROPERTY_TYPES.has(draft.property_type) ? "Cents" : "Sq.ft"
            }
            className={cn(rowInputClassName, error && "border-destructive")}
          />
          {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
        </div>
      )
    case "price_per_sqft":
      return (
        <div className="space-y-1">
          <Input
            type="number"
            min="0"
            value={draft.price_per_sqft}
            onChange={(event) => onDraftChange({ price_per_sqft: event.target.value })}
            className={cn(rowInputClassName, error && "border-destructive")}
          />
          {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
        </div>
      )
    case "total_price":
      return (
        <div className="space-y-1">
          <Input
            type="number"
            min="0"
            value={draft.total_price}
            onChange={(event) => onDraftChange({ total_price: event.target.value })}
            className={cn(rowInputClassName, error && "border-destructive")}
          />
          {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
        </div>
      )
    case "status":
      return (
        <Select value={draft.status} onValueChange={(value) => onDraftChange({ status: value })}>
          <SelectTrigger className={cn(rowSelectTriggerClassName, error && "border-destructive")}>
            <SelectValue />
          </SelectTrigger>
          <FormSelectContent>
            {statusOptions.map((option) => (
              <FormSelectItem key={option.value} value={option.value}>
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: option.color }}
                  />
                  {option.label}
                </span>
              </FormSelectItem>
            ))}
          </FormSelectContent>
        </Select>
      )
    default:
      return null
  }
}

export function UnitTableRow({
  projectId,
  unit,
  statusOptions,
  permissions,
  isEditing,
  isSaving,
  draft,
  draftErrors,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDraftChange,
}: UnitTableRowProps) {
  const canEditRow = canPerformUnitAction(permissions, "edit")

  return (
    <TableRow
      className={cn(
        "group transition-colors",
        isEditing && "bg-primary/5 hover:bg-primary/5",
      )}
    >
      <TableCell>
        <EditableCell
          field="unit_no"
          permissions={permissions}
          isEditing={isEditing}
          draft={draft}
          draftErrors={draftErrors}
          statusOptions={statusOptions}
          onDraftChange={onDraftChange}
          unit={unit}
          projectId={projectId}
        />
      </TableCell>
      <TableCell>
        <EditableCell
          field="block"
          permissions={permissions}
          isEditing={isEditing}
          draft={draft}
          draftErrors={draftErrors}
          statusOptions={statusOptions}
          onDraftChange={onDraftChange}
          unit={unit}
          projectId={projectId}
        />
      </TableCell>
      <TableCell>
        <EditableCell
          field="property_type"
          permissions={permissions}
          isEditing={isEditing}
          draft={draft}
          draftErrors={draftErrors}
          statusOptions={statusOptions}
          onDraftChange={onDraftChange}
          unit={unit}
          projectId={projectId}
        />
      </TableCell>
      <TableCell>
        <EditableCell
          field="area"
          permissions={permissions}
          isEditing={isEditing}
          draft={draft}
          draftErrors={draftErrors}
          statusOptions={statusOptions}
          onDraftChange={onDraftChange}
          unit={unit}
          projectId={projectId}
        />
      </TableCell>
      <TableCell>
        <EditableCell
          field="price_per_sqft"
          permissions={permissions}
          isEditing={isEditing}
          draft={draft}
          draftErrors={draftErrors}
          statusOptions={statusOptions}
          onDraftChange={onDraftChange}
          unit={unit}
          projectId={projectId}
        />
      </TableCell>
      <TableCell>
        <EditableCell
          field="total_price"
          permissions={permissions}
          isEditing={isEditing}
          draft={draft}
          draftErrors={draftErrors}
          statusOptions={statusOptions}
          onDraftChange={onDraftChange}
          unit={unit}
          projectId={projectId}
        />
      </TableCell>
      <TableCell>
        <EditableCell
          field="status"
          permissions={permissions}
          isEditing={isEditing}
          draft={draft}
          draftErrors={draftErrors}
          statusOptions={statusOptions}
          onDraftChange={onDraftChange}
          unit={unit}
          projectId={projectId}
        />
      </TableCell>
      <TableCell className="w-[88px] text-right">
        {isEditing ? (
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary hover:bg-primary/10"
              disabled={isSaving}
              onClick={onSaveEdit}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-slate-100"
              disabled={isSaving}
              onClick={onCancelEdit}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : canEditRow ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => onStartEdit(unit)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit unit</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </TableCell>
    </TableRow>
  )
}
