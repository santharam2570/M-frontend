import type { UpdateProjectUnitPayload } from "@/lib/projects/project-api"
import type { ProjectSettingOption } from "@/lib/projects/project-api"
import type { UnitFieldKey } from "@/lib/projects/unit-permissions"
import type { ProjectUnit, PropertyType } from "@/lib/projects/types"

export const CENTS_PROPERTY_TYPES = new Set<PropertyType>([
  "plot",
  "agri_land",
  "industrial_land",
])

const DEFAULT_STATUS_COLOR = "#64748b"

export type UnitDraft = {
  unit_no: string
  block: string
  property_type: PropertyType
  area: string
  price_per_sqft: string
  total_price: string
  status: string
}

export type UnitDraftErrors = Partial<Record<UnitFieldKey, string>>

export function getStatusOption(
  status: string,
  options: ProjectSettingOption[],
): ProjectSettingOption | undefined {
  const byValue = options.find((option) => option.value === status)
  if (byValue) return byValue

  return options.find(
    (option) => option.label.toLowerCase() === status.toLowerCase(),
  )
}

export function getDefaultOptionValue(options: ProjectSettingOption[]): string {
  return options.find((option) => option.isDefault)?.value ?? options[0]?.value ?? ""
}

export function resolveStatusValue(
  status: string,
  options: ProjectSettingOption[],
): string {
  return getStatusOption(status, options)?.value ?? status
}

export function getStatusLabel(
  status: string,
  options: ProjectSettingOption[],
): string {
  return getStatusOption(status, options)?.label ?? status
}

function getContrastTextColor(hexColor: string): string {
  const hex = hexColor.replace("#", "")
  if (hex.length !== 6) return "#ffffff"

  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000

  return brightness > 128 ? "#000000" : "#ffffff"
}

export function getStatusBadgeStyle(
  status: string,
  options: ProjectSettingOption[],
): { backgroundColor: string; color: string; borderColor: string } {
  const color = getStatusOption(status, options)?.color ?? DEFAULT_STATUS_COLOR

  return {
    backgroundColor: color,
    color: getContrastTextColor(color),
    borderColor: color,
  }
}

export function isBookingStatus(
  status: string,
  options: ProjectSettingOption[] = [],
): boolean {
  const label = getStatusLabel(status, options).toLowerCase().trim()
  return label === "booking" || label === "booked"
}

export function isOwnerSiteStatus(
  status: string,
  options: ProjectSettingOption[] = [],
): boolean {
  const label = getStatusLabel(status, options).toLowerCase().trim()
  return label === "owner site" || label === "owner_site"
}

export function countUnitsWithOwnerSiteStatus(
  units: ProjectUnit[],
  options: ProjectSettingOption[] = [],
): number {
  return units.filter((unit) => isOwnerSiteStatus(unit.status, options)).length
}

export function getUnitAreaValue(unit: ProjectUnit): string {
  if (unit.area_cents != null) return String(unit.area_cents)
  if (unit.area_sqft != null) return String(unit.area_sqft)
  return ""
}

export function formatUnitArea(unit: ProjectUnit): string {
  if (unit.area_cents != null) return `${unit.area_cents} cents`
  if (unit.area_sqft != null) return `${unit.area_sqft} sq.ft`
  return "—"
}

export function createUnitDraftFromUnit(
  unit: ProjectUnit,
  statusOptions: ProjectSettingOption[],
): UnitDraft {
  return {
    unit_no: unit.unit_no,
    block: unit.block ?? "",
    property_type: unit.property_type,
    area: getUnitAreaValue(unit),
    price_per_sqft: String(unit.price_per_sqft),
    total_price: String(unit.total_price),
    status: resolveStatusValue(unit.status, statusOptions),
  }
}

export function calculateTotalPrice(
  propertyType: PropertyType,
  areaValue: string,
  pricePerSqft: string,
): number {
  const area = Number(areaValue)
  const rate = Number(pricePerSqft)
  if (!Number.isFinite(area) || !Number.isFinite(rate) || area <= 0 || rate <= 0) {
    return 0
  }

  return Math.round(area * rate)
}

export function validateUnitDraft(draft: UnitDraft): UnitDraftErrors {
  const errors: UnitDraftErrors = {}
  const usesCents = CENTS_PROPERTY_TYPES.has(draft.property_type)

  if (!draft.unit_no.trim()) {
    errors.unit_no = "Unit number is required."
  }
  if (!draft.property_type) {
    errors.property_type = "Property type is required."
  }
  if (!draft.area.trim() || Number(draft.area) <= 0) {
    errors.area = usesCents ? "Area in cents is required." : "Area in sq.ft is required."
  }
  if (!draft.price_per_sqft.trim() || Number(draft.price_per_sqft) <= 0) {
    errors.price_per_sqft = "Price per sq.ft is required."
  }
  if (!draft.total_price.trim() || Number(draft.total_price) <= 0) {
    errors.total_price = "Total is required."
  }
  if (!draft.status) {
    errors.status = "Status is required."
  }

  return errors
}

export function buildUnitUpdatePayload(draft: UnitDraft): UpdateProjectUnitPayload {
  const usesCents = CENTS_PROPERTY_TYPES.has(draft.property_type)

  return {
    unit_no: draft.unit_no.trim(),
    block: draft.block.trim() || undefined,
    property_type: draft.property_type,
    price_per_sqft: Number(draft.price_per_sqft),
    total_price: Number(draft.total_price),
    status: draft.status as ProjectUnit["status"],
    ...(usesCents
      ? { area_cents: Number(draft.area), area_sqft: undefined }
      : { area_sqft: Number(draft.area), area_cents: undefined }),
  }
}

export function hasUnitDraftChanged(
  unit: ProjectUnit,
  draft: UnitDraft,
  statusOptions: ProjectSettingOption[],
): boolean {
  const original = createUnitDraftFromUnit(unit, statusOptions)
  return (Object.keys(original) as Array<keyof UnitDraft>).some(
    (key) => original[key] !== draft[key],
  )
}
