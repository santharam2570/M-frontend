export type UnitFieldKey =
  | "unit_no"
  | "block"
  | "property_type"
  | "area"
  | "price_per_sqft"
  | "total_price"
  | "status"

export type UnitActionKey = "create" | "edit" | "delete"

export interface UnitFieldDefinition {
  key: UnitFieldKey
  label: string
  permissionKey: UnitFieldKey
}

export interface UnitPermissions {
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  fields: Record<UnitFieldKey, boolean>
}

export const UNIT_FIELD_DEFINITIONS: UnitFieldDefinition[] = [
  { key: "unit_no", label: "Unit No", permissionKey: "unit_no" },
  { key: "block", label: "Block", permissionKey: "block" },
  { key: "property_type", label: "Type", permissionKey: "property_type" },
  { key: "area", label: "Area", permissionKey: "area" },
  { key: "price_per_sqft", label: "Price / sq.ft", permissionKey: "price_per_sqft" },
  { key: "total_price", label: "Total", permissionKey: "total_price" },
  { key: "status", label: "Status", permissionKey: "status" },
]

export const DEFAULT_UNIT_PERMISSIONS: UnitPermissions = {
  canCreate: true,
  canEdit: true,
  canDelete: false,
  fields: {
    unit_no: true,
    block: true,
    property_type: true,
    area: true,
    price_per_sqft: true,
    total_price: true,
    status: true,
  },
}

export function canPerformUnitAction(
  permissions: UnitPermissions,
  action: UnitActionKey,
): boolean {
  switch (action) {
    case "create":
      return permissions.canCreate
    case "edit":
      return permissions.canEdit
    case "delete":
      return permissions.canDelete
    default:
      return false
  }
}

export function canEditUnitField(
  permissions: UnitPermissions,
  field: UnitFieldKey,
): boolean {
  return permissions.canEdit && permissions.fields[field]
}

export function getEditableUnitFields(permissions: UnitPermissions): UnitFieldKey[] {
  return UNIT_FIELD_DEFINITIONS.filter((field) =>
    canEditUnitField(permissions, field.key),
  ).map((field) => field.key)
}
