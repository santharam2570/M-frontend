"use client"

import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { getApiErrorMessage } from "@/lib/api"
import {
  createProjectUnit,
  coerceProjectUnits,
  fetchUnitStatusOptionsApi,
  updateProjectUnit,
  type ProjectSettingOption,
} from "@/lib/projects/project-api"
import { UNIT_STATUS_OPTIONS_QUERY_KEY } from "@/lib/projects/project-shared-queries"
import {
  canPerformUnitAction,
  DEFAULT_UNIT_PERMISSIONS,
  UNIT_FIELD_DEFINITIONS,
  type UnitPermissions,
} from "@/lib/projects/unit-permissions"
import type { ProjectUnit, PropertyType } from "@/lib/projects/types"
import { leadDetailDashedEmptyClassName, leadDetailTableHeaderRowClassName, leadDetailTableWrapClassName } from "@/lib/form-field-styles"
import { cn } from "@/lib/utils"
import { UnitFormDialog } from "./units/unit-form-dialog"
import { UnitTableRow } from "./units/unit-table-row"
import {
  buildUnitUpdatePayload,
  CENTS_PROPERTY_TYPES,
  createUnitDraftFromUnit,
  getDefaultOptionValue,
  hasUnitDraftChanged,
  matchesUnitStatusFilter,
  validateUnitDraft,
  type UnitDraft,
  type UnitDraftErrors,
  type UnitStatusFilter,
} from "./units/unit-utils"

interface UnitsPanelProps {
  projectId: string
  units?: ProjectUnit[] | null
  statusFilter?: UnitStatusFilter | null
  /** When provided by the parent (shared settings query), skip a second fetch. */
  statusOptions?: ProjectSettingOption[]
  onRefresh?: () => void
  permissions?: UnitPermissions
}

type AddUnitFormErrors = {
  unitNo?: string
  propertyType?: string
  area?: string
  pricePerSqft?: string
  total?: string
  status?: string
}

export function UnitsPanel({
  projectId,
  units,
  statusFilter = null,
  statusOptions: statusOptionsProp,
  onRefresh,
  permissions = DEFAULT_UNIT_PERMISSIONS,
}: UnitsPanelProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [unitNo, setUnitNo] = useState("")
  const [block, setBlock] = useState("")
  const [propertyType, setPropertyType] = useState<PropertyType>("apartment")
  const [areaValue, setAreaValue] = useState("")
  const [pricePerSqft, setPricePerSqft] = useState("")
  const [total, setTotal] = useState("")
  const [status, setStatus] = useState("")
  const [formErrors, setFormErrors] = useState<AddUnitFormErrors>({})
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  const [draft, setDraft] = useState<UnitDraft | null>(null)
  const [draftErrors, setDraftErrors] = useState<UnitDraftErrors>({})
  const [isSavingRow, setIsSavingRow] = useState(false)

  const hasParentStatusOptions = statusOptionsProp !== undefined

  const {
    data: queriedStatusOptions = [],
    isLoading: isLoadingStatusOptions,
  } = useQuery({
    queryKey: UNIT_STATUS_OPTIONS_QUERY_KEY,
    queryFn: () => fetchUnitStatusOptionsApi(),
    enabled: !hasParentStatusOptions,
  })

  const statusOptions = hasParentStatusOptions
    ? statusOptionsProp
    : queriedStatusOptions

  const safeUnits = useMemo(() => coerceProjectUnits(units), [units])

  const sortedUnits = useMemo(
    () => [...safeUnits].sort((a, b) => a.unit_no.localeCompare(b.unit_no)),
    [safeUnits],
  )

  const filteredUnits = useMemo(
    () =>
      sortedUnits.filter((unit) =>
        matchesUnitStatusFilter(unit.status, statusFilter, statusOptions),
      ),
    [sortedUnits, statusFilter, statusOptions],
  )

  const statusFilterLabel = useMemo(() => {
    switch (statusFilter) {
      case "available":
        return "Available"
      case "on_hold":
        return "On Hold"
      case "booked":
        return "Booked"
      case "owner_site":
        return "Owner Site"
      default:
        return null
    }
  }, [statusFilter])

  const usesCents = CENTS_PROPERTY_TYPES.has(propertyType)
  const canCreateUnits = canPerformUnitAction(permissions, "create")

  const resetForm = () => {
    setUnitNo("")
    setBlock("")
    setPropertyType("apartment")
    setAreaValue("")
    setPricePerSqft("")
    setTotal("")
    setStatus(getDefaultOptionValue(statusOptions))
    setFormErrors({})
  }

  const validateAddForm = (): AddUnitFormErrors => {
    const errors: AddUnitFormErrors = {}

    if (!unitNo.trim()) {
      errors.unitNo = "Unit number is required."
    }
    if (!propertyType) {
      errors.propertyType = "Property type is required."
    }
    if (!areaValue.trim() || Number(areaValue) <= 0) {
      errors.area = usesCents ? "Area in cents is required." : "Area in sq.ft is required."
    }
    if (!pricePerSqft.trim() || Number(pricePerSqft) <= 0) {
      errors.pricePerSqft = "Price per sq.ft is required."
    }
    if (!total.trim() || Number(total) <= 0) {
      errors.total = "Total is required."
    }
    if (!status) {
      errors.status = "Status is required."
    }

    return errors
  }

  const invalidateBookingQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ["booking-units"] })
    void queryClient.invalidateQueries({ queryKey: ["booking-metrics"] })
  }

  const handleAddUnit = async () => {
    const errors = validateAddForm()
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)

    try {
      const payload = {
        unit_no: unitNo.trim(),
        block: block.trim() || undefined,
        property_type: propertyType,
        price_per_sqft: Number(pricePerSqft),
        total_price: Number(total),
        status: status as ProjectUnit["status"],
        ...(usesCents
          ? { area_cents: Number(areaValue) }
          : { area_sqft: Number(areaValue) }),
      }

      await createProjectUnit(projectId, payload)

      toast({
        title: "Unit added",
        description: `${payload.unit_no} was added successfully.`,
      })

      setDialogOpen(false)
      resetForm()
      onRefresh?.()
      invalidateBookingQueries()
    } catch (error) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to add unit."),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStartRowEdit = (unit: ProjectUnit) => {
    if (editingUnitId && editingUnitId !== unit._id) {
      toast({
        title: "Finish current edit",
        description: "Save or cancel the current row before editing another unit.",
        variant: "destructive",
      })
      return
    }

    setEditingUnitId(unit._id)
    setDraft(createUnitDraftFromUnit(unit, statusOptions))
    setDraftErrors({})
  }

  const handleCancelRowEdit = () => {
    setEditingUnitId(null)
    setDraft(null)
    setDraftErrors({})
  }

  const handleDraftChange = (patch: Partial<UnitDraft>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current))
    setDraftErrors({})
  }

  const handleSaveRowEdit = async () => {
    if (!editingUnitId || !draft) return

    const unit = safeUnits.find((item) => item._id === editingUnitId)
    if (!unit) return

    const errors = validateUnitDraft(draft)
    setDraftErrors(errors)
    if (Object.keys(errors).length > 0) return

    if (!hasUnitDraftChanged(unit, draft, statusOptions)) {
      handleCancelRowEdit()
      return
    }

    setIsSavingRow(true)

    try {
      await updateProjectUnit(editingUnitId, buildUnitUpdatePayload(draft))
      toast({
        title: "Unit updated",
        description: `${draft.unit_no} was saved successfully.`,
      })
      handleCancelRowEdit()
      onRefresh?.()
      invalidateBookingQueries()
    } catch (error) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to update unit."),
        variant: "destructive",
      })
    } finally {
      setIsSavingRow(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-muted-foreground">
          Manage project units, pricing, and availability status.
          {canPerformUnitAction(permissions, "edit")
            ? " Hover a row and click the edit icon to update a unit."
            : null}
        </p>
        {canCreateUnits ? (
          <Button
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => {
              setStatus(getDefaultOptionValue(statusOptions))
              setDialogOpen(true)
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Unit
          </Button>
        ) : null}
      </div>

      {safeUnits.length === 0 ? (
        <div className={leadDetailDashedEmptyClassName}>
          No units added yet.
          {canCreateUnits ? " Click Add Unit to create the first one." : null}
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className={leadDetailDashedEmptyClassName}>
          No units with {statusFilterLabel} status.
        </div>
      ) : (
        <div className={cn(leadDetailTableWrapClassName, "responsive-table-wrap overflow-hidden")}>
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className={leadDetailTableHeaderRowClassName}>
                {UNIT_FIELD_DEFINITIONS.map((field) => (
                  <TableHead key={field.key}>{field.label}</TableHead>
                ))}
                <TableHead className="w-[88px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUnits.map((unit) => (
                <UnitTableRow
                  key={unit._id}
                  projectId={projectId}
                  unit={unit}
                  statusOptions={statusOptions}
                  permissions={permissions}
                  isEditing={editingUnitId === unit._id}
                  isSaving={isSavingRow && editingUnitId === unit._id}
                  draft={editingUnitId === unit._id ? draft : null}
                  draftErrors={editingUnitId === unit._id ? draftErrors : {}}
                  onStartEdit={handleStartRowEdit}
                  onCancelEdit={handleCancelRowEdit}
                  onSaveEdit={handleSaveRowEdit}
                  onDraftChange={handleDraftChange}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <UnitFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}
        unitNo={unitNo}
        block={block}
        propertyType={propertyType}
        areaValue={areaValue}
        pricePerSqft={pricePerSqft}
        total={total}
        status={status}
        statusOptions={statusOptions}
        isLoadingStatusOptions={!hasParentStatusOptions && isLoadingStatusOptions}
        isSubmitting={isSubmitting}
        formErrors={formErrors}
        onUnitNoChange={setUnitNo}
        onBlockChange={setBlock}
        onPropertyTypeChange={setPropertyType}
        onAreaChange={setAreaValue}
        onPricePerSqftChange={setPricePerSqft}
        onTotalChange={setTotal}
        onStatusChange={setStatus}
        onSubmit={handleAddUnit}
      />
    </div>
  )
}
