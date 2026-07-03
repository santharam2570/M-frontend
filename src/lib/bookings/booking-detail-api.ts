import { format, isValid } from "date-fns"

import type { BookingReceiptSummary } from "@/components/booking-detail-page/booking-detail-table"
import type {
  BookingDetailRecord,
  BookingUnitContext,
} from "@/components/booking-detail-page/booking-types"
import type { BookingFormValues } from "@/components/booking-detail-page/booking-form-drawer"
import { BASE_URL } from "@/config/environment"
import URLS from "@/config/urls"
import { parseJsonResponse } from "@/lib/api"
import { fetchProjectDetail, fetchProjectUnits } from "@/lib/projects/project-api"
import type { ProjectUnit } from "@/lib/projects/types"

const PROJECT_BOOKING_UNITS_URL = `${BASE_URL}/project_booking_units`

type RawRecord = Record<string, unknown>

export type BookingDetailSnapshot = {
  unit: BookingUnitContext
  receipts: BookingDetailRecord[]
  summary: BookingReceiptSummary | null
}

interface BookingNotesMeta {
  salutation?: string
  payment_reference?: string
  plot_no?: string
  site_area?: string
  plain?: string
}

function resolveId(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (typeof value === "object" && value !== null) {
    if ("$oid" in value) return String((value as { $oid: string }).$oid)
    if ("_id" in value) return resolveId((value as { _id: unknown })._id)
    if ("id" in value) return String((value as { id: unknown }).id)
  }
  return ""
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function resolveBookingId(raw: RawRecord): string {
  return resolveId(raw._id ?? raw.id ?? raw.booking_id)
}

function resolveLinkedBookingId(raw: RawRecord): string | undefined {
  if (raw.booking_id) return resolveId(raw.booking_id)
  if (raw.linked_booking_id) return resolveId(raw.linked_booking_id)

  if (typeof raw.booking === "object" && raw.booking !== null) {
    const booking = raw.booking as RawRecord
    const bookingId = resolveBookingId(booking)
    return bookingId || undefined
  }

  return undefined
}

export function normalizeBooking(raw: RawRecord): BookingDetailRecord {
  const registrationDate =
    raw.registration_date ??
    raw.registrationDate ??
    raw.registration_date_time

  const unitNo = raw.unit_no ?? raw.plot_no ?? raw.plot_number

  return {
    _id: resolveBookingId(raw),
    project_id: resolveId(raw.project_id),
    project_name: raw.project_name ? String(raw.project_name) : undefined,
    unit_id: resolveId(raw.unit_id),
    unit_no: unitNo ? String(unitNo) : undefined,
    customer_name: String(raw.customer_name ?? ""),
    receipt_number: String(raw.receipt_number ?? ""),
    booking_date: String(raw.booking_date ?? ""),
    registration_date: registrationDate ? String(registrationDate) : null,
    amount_paid: toNumber(raw.amount_paid),
    amount_in_words: raw.amount_in_words ? String(raw.amount_in_words) : undefined,
    payment_type: String(raw.payment_type ?? ""),
    transaction_type: String(raw.transaction_type ?? ""),
    notes: raw.notes ? String(raw.notes) : undefined,
  }
}

function normalizeUnit(raw: RawRecord, projectId: string, projectName: string): BookingUnitContext {
  return {
    _id: resolveId(raw._id ?? raw.id),
    project_id: resolveId(raw.project_id) || projectId,
    project_name: projectName,
    unit_no: String(raw.unit_no ?? ""),
    area_sqft: raw.area_sqft != null ? toNumber(raw.area_sqft) : undefined,
    area_cents: raw.area_cents != null ? toNumber(raw.area_cents) : undefined,
    customer_name: raw.linked_lead_name ? String(raw.linked_lead_name) : undefined,
    linked_lead_id: raw.linked_lead_id ? resolveId(raw.linked_lead_id) : undefined,
    linked_booking_id: resolveLinkedBookingId(raw),
  }
}

function normalizeProjectUnitContext(
  unit: ProjectUnit,
  projectId: string,
  projectName: string,
): BookingUnitContext {
  return {
    _id: unit._id,
    project_id: projectId,
    project_name: projectName,
    unit_no: unit.unit_no,
    area_sqft: unit.area_sqft,
    area_cents: unit.area_cents,
    customer_name: unit.linked_lead_name,
    linked_lead_id: unit.linked_lead_id,
    linked_booking_id: unit.linked_booking_id,
  }
}

function mergeUnitContext(
  bookingUnit: BookingUnitContext | null,
  projectUnit: ProjectUnit | undefined,
  projectId: string,
  projectName: string,
): BookingUnitContext | null {
  const fromProject = projectUnit
    ? normalizeProjectUnitContext(projectUnit, projectId, projectName)
    : null

  if (!bookingUnit && !fromProject) return null
  if (!bookingUnit) return fromProject
  if (!fromProject) return bookingUnit

  return {
    ...bookingUnit,
    unit_no: bookingUnit.unit_no || fromProject.unit_no,
    area_sqft: bookingUnit.area_sqft ?? fromProject.area_sqft,
    area_cents: bookingUnit.area_cents ?? fromProject.area_cents,
    customer_name: bookingUnit.customer_name || fromProject.customer_name,
    linked_lead_id: bookingUnit.linked_lead_id || fromProject.linked_lead_id,
    linked_booking_id: bookingUnit.linked_booking_id || fromProject.linked_booking_id,
  }
}

function extractBookingsFromListPayload(data: unknown): RawRecord[] {
  if (!data) return []

  if (Array.isArray(data)) {
    return data.filter((item): item is RawRecord => typeof item === "object" && item !== null)
  }

  if (typeof data === "object" && data !== null) {
    const record = data as RawRecord

    for (const key of ["bookings", "data", "records", "items"] as const) {
      const value = record[key]
      if (Array.isArray(value)) {
        return value.filter((item): item is RawRecord => typeof item === "object" && item !== null)
      }
    }

    if (resolveBookingId(record)) {
      return [record]
    }
  }

  return []
}

async function fetchBookingUnitsRaw(
  projectId: string,
  token: string,
): Promise<RawRecord[]> {
  const response = await fetch(`${PROJECT_BOOKING_UNITS_URL}/${projectId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })

  const payload = await parseJsonResponse<{
    code?: number
    msg?: string
    data?: unknown
  }>(response)

  if (payload.code !== 200) {
    throw new Error(payload.msg || "Failed to load booking unit.")
  }

  const items = Array.isArray(payload.data) ? payload.data : []
  return items.filter((item): item is RawRecord => typeof item === "object" && item !== null)
}

export async function fetchBookingsForUnit(
  projectId: string,
  unitId: string,
  token: string,
): Promise<{ receipts: BookingDetailRecord[]; summary: BookingReceiptSummary | null }> {
  const params = new URLSearchParams({
    project_id: projectId,
    unit_id: unitId,
    page: "1",
    length: "100",
  })

  const response = await fetch(`${URLS.BOOKING_LIST}?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })

  const payload = await parseJsonResponse<{
    code?: number
    msg?: string
    data?: {
      bookings?: unknown[]
      summary?: {
        total_count?: number
        total_amount_paid?: number
      }
    }
  }>(response)

  if (payload.code !== 200) {
    throw new Error(payload.msg || "Failed to load booking receipts.")
  }

  const receipts = extractBookingsFromListPayload(payload.data).map(normalizeBooking)
  const apiSummary = payload.data?.summary

  const summary: BookingReceiptSummary | null = receipts.length
    ? {
        total_count: apiSummary?.total_count ?? receipts.length,
        total_amount:
          apiSummary?.total_amount_paid ??
          receipts.reduce((sum, receipt) => sum + receipt.amount_paid, 0),
      }
    : null

  return { receipts, summary }
}

export async function fetchBookingDetailSnapshot(
  projectId: string,
  unitId: string,
  token: string,
): Promise<BookingDetailSnapshot> {
  const [project, projectUnits, bookingUnitItems, bookingsResult] = await Promise.all([
    fetchProjectDetail(projectId, token),
    fetchProjectUnits(projectId, token),
    fetchBookingUnitsRaw(projectId, token).catch(() => [] as RawRecord[]),
    fetchBookingsForUnit(projectId, unitId, token),
  ])

  const projectName = project.name || "Selected project"

  const fromBookingApi =
    bookingUnitItems
      .map((item) => normalizeUnit(item, projectId, projectName))
      .find((unit) => unit._id === unitId) ?? null

  const projectUnit = projectUnits.find((unit) => unit._id === unitId)
  const unit = mergeUnitContext(fromBookingApi, projectUnit, projectId, projectName)
  if (!unit) {
    throw new Error("Unit not found")
  }

  return {
    unit,
    receipts: bookingsResult.receipts,
    summary: bookingsResult.summary,
  }
}

function formatApiDate(value: Date | null | undefined): string | undefined {
  if (!value || !isValid(value)) return undefined
  return format(value, "yyyy-MM-dd")
}

function encodeBookingNotes(meta: BookingNotesMeta): string {
  return JSON.stringify(meta)
}

function buildBookingUpdateBody(values: BookingFormValues): RawRecord {
  const notes = encodeBookingNotes({
    salutation: values.salutation,
    payment_reference: values.payment_reference?.trim() || undefined,
    plot_no: values.plot_no.trim() || undefined,
    site_area: values.site_area.trim() || undefined,
  })

  const bookingDate = formatApiDate(values.receipt_date)
  const registrationDate =
    formatApiDate(values.registration_date ?? undefined) ?? bookingDate

  const body: RawRecord = {
    customer_name: values.customer_name.trim(),
    booking_date: bookingDate,
    registration_date: registrationDate,
    amount_paid: values.amount_received,
    payment_type: values.payment_mode,
    transaction_type: values.payment_type,
    notes,
  }

  const plotNo = values.plot_no.trim()
  if (plotNo) {
    body.unit_no = plotNo
    body.plot_no = plotNo
  }

  const siteArea = values.site_area.trim()
  if (siteArea) {
    body.site_area = siteArea
  }

  return body
}

export async function createBooking(
  values: BookingFormValues,
  context: {
    projectId: string
    unitId: string
    leadId?: string
    amountInWords: string
  },
  token: string,
): Promise<BookingDetailRecord> {
  const body: RawRecord = {
    ...buildBookingUpdateBody(values),
    project_id: context.projectId,
    unit_id: context.unitId,
    amount_in_words: context.amountInWords,
  }

  const receiptNumber = values.receipt_number?.trim()
  if (receiptNumber) {
    body.receipt_number = receiptNumber
  }

  if (context.leadId) {
    body.lead_id = context.leadId
  }

  const response = await fetch(URLS.ADD_BOOKING, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const payload = await parseJsonResponse<{
    code?: number
    msg?: string
    data?: unknown
  }>(response)

  if (payload.code !== 200 || !payload.data || typeof payload.data !== "object") {
    throw new Error(payload.msg || "Failed to create booking.")
  }

  return normalizeBooking(payload.data as RawRecord)
}

export async function updateBooking(
  bookingId: string,
  values: BookingFormValues,
  token: string,
): Promise<BookingDetailRecord> {
  const response = await fetch(`${URLS.BOOKING_UPDATE}/${bookingId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(buildBookingUpdateBody(values)),
  })

  const payload = await parseJsonResponse<{
    code?: number
    msg?: string
    data?: unknown
  }>(response)

  if (payload.code !== 200 || !payload.data || typeof payload.data !== "object") {
    throw new Error(payload.msg || "Failed to update booking.")
  }

  return normalizeBooking(payload.data as RawRecord)
}
