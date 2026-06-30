"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
import {
  canPerformUnitAction,
  DEFAULT_UNIT_PERMISSIONS,
  UNIT_FIELD_DEFINITIONS,
  type UnitPermissions,
} from "@/lib/projects/unit-permissions"
import type { ProjectUnit, PropertyType } from "@/lib/projects/types"
import { UnitFormDialog } from "./units/unit-form-dialog"
import { UnitTableRow } from "./units/unit-table-row"
import {
  buildUnitUpdatePayload,
  CENTS_PROPERTY_TYPES,
  createUnitDraftFromUnit,
  getDefaultOptionValue,
  hasUnitDraftChanged,
  validateUnitDraft,
  type UnitDraft,
  type UnitDraftErrors,
} from "./units/unit-utils"

interface UnitsPanelProps {
  projectId: string
  units?: ProjectUnit[] | null
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
  onRefresh,
  permissions = DEFAULT_UNIT_PERMISSIONS,
}: UnitsPanelProps) {
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [unitNo, setUnitNo] = useState("")
  const [block, setBlock] = useState("")
  const [propertyType, setPropertyType] = useState<PropertyType>("apartment")
  const [areaValue, setAreaValue] = useState("")
  const [pricePerSqft, setPricePerSqft] = useState("")
  const [total, setTotal] = useState("")
  const [status, setStatus] = useState("")
  const [statusOptions, setStatusOptions] = useState<ProjectSettingOption[]>([])
  const [isLoadingStatusOptions, setIsLoadingStatusOptions] = useState(false)
  const [formErrors, setFormErrors] = useState<AddUnitFormErrors>({})
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  const [draft, setDraft] = useState<UnitDraft | null>(null)
  const [draftErrors, setDraftErrors] = useState<UnitDraftErrors>({})
  const [isSavingRow, setIsSavingRow] = useState(false)

  const safeUnits = useMemo(() => coerceProjectUnits(units), [units])

  const sortedUnits = useMemo(
    () => [...safeUnits].sort((a, b) => a.unit_no.localeCompare(b.unit_no)),
    [safeUnits],
  )

  const usesCents = CENTS_PROPERTY_TYPES.has(propertyType)
  const canCreateUnits = canPerformUnitAction(permissions, "create")

  const loadStatusOptions = useCallback(async () => {
    setIsLoadingStatusOptions(true)

    try {
      const options = await fetchUnitStatusOptionsApi()
      setStatusOptions(options)
      return options
    } catch (error) {
      setStatusOptions([])
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to load unit status options."),
        variant: "destructive",
      })
      return []
    } finally {
      setIsLoadingStatusOptions(false)
    }
  }, [toast])

  useEffect(() => {
    void loadStatusOptions()
  }, [loadStatusOptions])

  useEffect(() => {
    if (!dialogOpen || statusOptions.length === 0) return
    setStatus(getDefaultOptionValue(statusOptions))
  }, [dialogOpen, statusOptions])

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
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Manage project units, pricing, and availability status.
          {canPerformUnitAction(permissions, "edit")
            ? " Hover a row and click the edit icon to update a unit."
            : null}
        </p>
        {canCreateUnits ? (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Unit
          </Button>
        ) : null}
      </div>

      {safeUnits.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-muted-foreground">
          No units added yet.
          {canCreateUnits ? " Click Add Unit to create the first one." : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200/80">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                {UNIT_FIELD_DEFINITIONS.map((field) => (
                  <TableHead key={field.key}>{field.label}</TableHead>
                ))}
                <TableHead className="w-[88px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUnits.map((unit) => (
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
        isLoadingStatusOptions={isLoadingStatusOptions}
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
