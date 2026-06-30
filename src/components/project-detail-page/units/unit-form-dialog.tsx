"use client"

import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  FormSelectContent,
  FormSelectItem,
  Select,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ProjectSettingOption } from "@/lib/projects/project-api"
import type { PropertyType } from "@/lib/projects/types"
import { formatIndianCurrency, PROPERTY_TYPE_LABELS } from "@/lib/projects/types"
import {
  formInputClassName,
  formSelectTriggerClassName,
} from "@/lib/form-field-styles"
import { cn } from "@/lib/utils"
import { CENTS_PROPERTY_TYPES, calculateTotalPrice } from "./unit-utils"

const propertyTypeOptions = Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => ({
  value: value as PropertyType,
  label,
}))

type AddUnitFormErrors = {
  unitNo?: string
  propertyType?: string
  area?: string
  pricePerSqft?: string
  total?: string
  status?: string
}

interface UnitFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unitNo: string
  block: string
  propertyType: PropertyType
  areaValue: string
  pricePerSqft: string
  total: string
  status: string
  statusOptions: ProjectSettingOption[]
  isLoadingStatusOptions: boolean
  isSubmitting: boolean
  formErrors: AddUnitFormErrors
  onUnitNoChange: (value: string) => void
  onBlockChange: (value: string) => void
  onPropertyTypeChange: (value: PropertyType) => void
  onAreaChange: (value: string) => void
  onPricePerSqftChange: (value: string) => void
  onTotalChange: (value: string) => void
  onStatusChange: (value: string) => void
  onSubmit: () => void
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}

export function UnitFormDialog({
  open,
  onOpenChange,
  unitNo,
  block,
  propertyType,
  areaValue,
  pricePerSqft,
  total,
  status,
  statusOptions,
  isLoadingStatusOptions,
  isSubmitting,
  formErrors,
  onUnitNoChange,
  onBlockChange,
  onPropertyTypeChange,
  onAreaChange,
  onPricePerSqftChange,
  onTotalChange,
  onStatusChange,
  onSubmit,
}: UnitFormDialogProps) {
  const usesCents = CENTS_PROPERTY_TYPES.has(propertyType)
  const estimatedTotal = calculateTotalPrice(propertyType, areaValue, pricePerSqft)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add Unit</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="unit-no">Unit No *</Label>
            <Input
              id="unit-no"
              value={unitNo}
              onChange={(event) => onUnitNoChange(event.target.value)}
              placeholder="e.g. A-101"
              className={cn(formInputClassName, formErrors.unitNo && "border-destructive")}
            />
            <FieldError message={formErrors.unitNo} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="block">Block</Label>
            <Input
              id="block"
              value={block}
              onChange={(event) => onBlockChange(event.target.value)}
              placeholder="e.g. Block A"
              className={formInputClassName}
            />
          </div>

          <div className="grid gap-2">
            <Label>Property Type *</Label>
            <Select
              value={propertyType}
              onValueChange={(value) => onPropertyTypeChange(value as PropertyType)}
            >
              <SelectTrigger
                className={cn(
                  formSelectTriggerClassName,
                  formErrors.propertyType && "border-destructive",
                )}
              >
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <FormSelectContent>
                {propertyTypeOptions.map((option) => (
                  <FormSelectItem key={option.value} value={option.value}>
                    {option.label}
                  </FormSelectItem>
                ))}
              </FormSelectContent>
            </Select>
            <FieldError message={formErrors.propertyType} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="area">{usesCents ? "Area (cents) *" : "Area (sq.ft) *"}</Label>
            <Input
              id="area"
              type="number"
              min="0"
              value={areaValue}
              onChange={(event) => onAreaChange(event.target.value)}
              placeholder={usesCents ? "e.g. 8.5" : "e.g. 1250"}
              className={cn(formInputClassName, formErrors.area && "border-destructive")}
            />
            <FieldError message={formErrors.area} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="price-per-sqft">Price / sq.ft *</Label>
            <Input
              id="price-per-sqft"
              type="number"
              min="0"
              value={pricePerSqft}
              onChange={(event) => onPricePerSqftChange(event.target.value)}
              placeholder="e.g. 4200"
              className={cn(formInputClassName, formErrors.pricePerSqft && "border-destructive")}
            />
            <FieldError message={formErrors.pricePerSqft} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="total">Total *</Label>
            <Input
              id="total"
              type="number"
              min="0"
              value={total}
              onChange={(event) => onTotalChange(event.target.value)}
              placeholder="e.g. 5250000"
              className={cn(formInputClassName, formErrors.total && "border-destructive")}
            />
            <FieldError message={formErrors.total} />
          </div>

          {estimatedTotal > 0 && !total ? (
            <p className="text-sm text-muted-foreground">
              Suggested total from area × rate: {formatIndianCurrency(estimatedTotal)}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label>Status *</Label>
            <Select
              value={status}
              onValueChange={onStatusChange}
              disabled={isLoadingStatusOptions || statusOptions.length === 0}
            >
              <SelectTrigger
                className={cn(
                  formSelectTriggerClassName,
                  formErrors.status && "border-destructive",
                )}
              >
                <SelectValue
                  placeholder={
                    isLoadingStatusOptions ? "Loading statuses..." : "Select status"
                  }
                />
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
            <FieldError message={formErrors.status} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Unit"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
