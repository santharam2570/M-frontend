"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format, isValid } from "date-fns"
import { Loader2, Plus } from "lucide-react"

import {
  BookingDetailTable,
  type BookingReceiptSummary,
} from "./booking-detail-table"
import { Button } from "@/components/ui/button"
import { BASE_URL } from "@/config/environment"
import URLS from "@/config/urls"
import { useToast } from "@/hooks/use-toast"
import { getApiErrorMessage, parseJsonResponse } from "@/lib/api"

import {
  amountInWordsInr,
  BookingFormDrawer,
  createDefaultFormValues,
  mapBookingToFormValues,
  type BookingFormValues,
} from "./booking-form-drawer"
import type { BookingDetailPageProps, BookingDetailRecord, BookingUnitContext } from "./booking-types"

export type { BookingDetailRecord, BookingUnitContext } from "./booking-types"

const PROJECT_BOOKING_UNITS_URL = `${BASE_URL}/project_booking_units`

type RawRecord = Record<string, unknown>

interface BookingNotesMeta {
  salutation?: string
  payment_reference?: string
  plain?: string
}

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem("map_user") ?? "{}"
    const parsed = JSON.parse(stored)
    return parsed?.access_token ?? null
  } catch {
    return null
  }
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

function formatApiDate(value: Date | null | undefined): string | undefined {
  if (!value || !isValid(value)) return undefined
  return format(value, "yyyy-MM-dd")
}

function encodeBookingNotes(meta: BookingNotesMeta): string {
  return JSON.stringify(meta)
}

function resolveBookingId(raw: RawRecord): string {
  return resolveId(raw._id ?? raw.id ?? raw.booking_id)
}

function extractBookingsFromListPayload(data: unknown): RawRecord[] {
  if (!data) return []

  if (Array.isArray(data)) {
    return data.filter((item): item is RawRecord => typeof item === "object" && item !== null)
  }

  if (typeof data === "object" && data !== null) {
    const record = data as RawRecord

    if (Array.isArray(record.bookings)) {
      return record.bookings.filter(
        (item): item is RawRecord => typeof item === "object" && item !== null,
      )
    }

    if (Array.isArray(record.data)) {
      return record.data.filter(
        (item): item is RawRecord => typeof item === "object" && item !== null,
      )
    }

    if (Array.isArray(record.records)) {
      return record.records.filter(
        (item): item is RawRecord => typeof item === "object" && item !== null,
      )
    }

    if (Array.isArray(record.items)) {
      return record.items.filter(
        (item): item is RawRecord => typeof item === "object" && item !== null,
      )
    }

    if (resolveBookingId(record)) {
      return [record]
    }
  }

  return []
}

function normalizeBooking(raw: RawRecord): BookingDetailRecord {
  return {
    _id: resolveBookingId(raw),
    project_id: resolveId(raw.project_id),
    project_name: raw.project_name ? String(raw.project_name) : undefined,
    unit_id: resolveId(raw.unit_id),
    unit_no: raw.unit_no ? String(raw.unit_no) : undefined,
    customer_name: String(raw.customer_name ?? ""),
    receipt_number: String(raw.receipt_number ?? ""),
    booking_date: String(raw.booking_date ?? ""),
    registration_date: raw.registration_date ? String(raw.registration_date) : null,
    amount_paid: toNumber(raw.amount_paid),
    amount_in_words: raw.amount_in_words ? String(raw.amount_in_words) : undefined,
    payment_type: String(raw.payment_type ?? ""),
    transaction_type: String(raw.transaction_type ?? ""),
    notes: raw.notes ? String(raw.notes) : undefined,
  }
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

async function fetchBookingUnit(
  projectId: string,
  unitId: string,
  token: string,
): Promise<BookingUnitContext | null> {
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
  const match = items
    .filter((item): item is RawRecord => typeof item === "object" && item !== null)
    .map((item) => normalizeUnit(item, projectId, ""))
    .find((unit) => unit._id === unitId)

  if (!match) return null

  const projectsResponse = await fetch(`${URLS.PROJECT_LIST}?page=1&length=500&search=`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      draw: 1,
      search: { value: "", regex: false },
      filter: [],
    }),
  })

  const projectsPayload = await parseJsonResponse<{
    code?: number
    data?: unknown
  }>(projectsResponse)

  const projectItems = Array.isArray(projectsPayload.data) ? projectsPayload.data : []
  const projectName =
    projectItems
      .filter((item): item is RawRecord => typeof item === "object" && item !== null)
      .map((item) => ({ _id: resolveId(item._id ?? item.id), name: String(item.name ?? "") }))
      .find((project) => project._id === projectId)?.name ?? "Selected project"

  return { ...match, project_name: projectName }
}

async function fetchBookingById(
  bookingId: string,
  token: string,
): Promise<BookingDetailRecord | null> {
  const response = await fetch(`${URLS.BOOKING_DETAIL}/${bookingId}`, {
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

  if (payload.code !== 200 || !payload.data || typeof payload.data !== "object") {
    return null
  }

  return normalizeBooking(payload.data as RawRecord)
}

async function fetchBookingsForUnit(
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

async function fetchBookingForUnit(
  projectId: string,
  unitId: string,
  token: string,
): Promise<BookingDetailRecord | null> {
  const params = new URLSearchParams({
    project_id: projectId,
    unit_id: unitId,
    page: "1",
    length: "1",
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
    data?: { bookings?: unknown[] }
  }>(response)

  if (payload.code !== 200) {
    throw new Error(payload.msg || "Failed to load booking details.")
  }

  const bookings = extractBookingsFromListPayload(payload.data)
  if (bookings.length === 0) return null

  return normalizeBooking(bookings[0])
}

async function loadExistingBooking(
  projectId: string,
  unitId: string,
  unit: BookingUnitContext,
  bookingId: string | undefined,
  token: string,
): Promise<BookingDetailRecord | null> {
  if (bookingId) {
    const byId = await fetchBookingById(bookingId, token)
    if (byId) return byId
  }

  if (unit.linked_booking_id) {
    const byUnitBookingId = await fetchBookingById(unit.linked_booking_id, token)
    if (byUnitBookingId) return byUnitBookingId
  }

  return fetchBookingForUnit(projectId, unitId, token)
}

function resolveBookingIdForSave(
  booking: BookingDetailRecord | null,
  unit: BookingUnitContext,
  explicitBookingId?: string,
): string {
  return explicitBookingId || booking?._id || unit.linked_booking_id || ""
}

async function verifyBookingExists(
  bookingId: string,
  token: string,
): Promise<BookingDetailRecord | null> {
  return fetchBookingById(bookingId, token)
}

function buildBookingUpdateBody(values: BookingFormValues): RawRecord {
  const notes = encodeBookingNotes({
    salutation: values.salutation,
    payment_reference: values.payment_reference?.trim() || undefined,
  })

  const bookingDate = formatApiDate(values.receipt_date)
  const registrationDate =
    formatApiDate(values.registration_date ?? undefined) ?? bookingDate

  return {
    customer_name: values.customer_name.trim(),
    booking_date: bookingDate,
    registration_date: registrationDate,
    amount_paid: values.amount_received,
    payment_type: values.payment_mode,
    transaction_type: values.payment_type,
    notes,
  }
}

async function createBooking(
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

async function updateBooking(
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

export default function BookingDetailPage({
  projectId,
  unitId,
  bookingId,
  onSaved,
}: BookingDetailPageProps) {
  const { toast } = useToast()
  const [unit, setUnit] = useState<BookingUnitContext | null>(null)
  const [booking, setBooking] = useState<BookingDetailRecord | null>(null)
  const [receipts, setReceipts] = useState<BookingDetailRecord[]>([])
  const [receiptSummary, setReceiptSummary] = useState<BookingReceiptSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingBooking, setEditingBooking] = useState<BookingDetailRecord | null>(null)

  const formInitialValues = useMemo(() => {
    if (!unit) {
      return createDefaultFormValues({
        _id: "",
        project_id: projectId,
        project_name: "",
        unit_no: "",
      })
    }

    if (editingBooking) {
      return mapBookingToFormValues(editingBooking, unit)
    }

    const latestReceipt = receipts[0] ?? null
    return createDefaultFormValues(unit, latestReceipt)
  }, [editingBooking, projectId, receipts, unit])

  const loadData = useCallback(async () => {
    const token = getAuthToken()
    if (!token || !projectId || !unitId) {
      setUnit(null)
      setBooking(null)
      setReceipts([])
      setReceiptSummary(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const unitData = await fetchBookingUnit(projectId, unitId, token)
      if (!unitData) {
        setUnit(null)
        setBooking(null)
        setReceipts([])
        setReceiptSummary(null)
        toast({
          title: "Unit not found",
          description: "Could not load the selected booking unit.",
          variant: "destructive",
        })
        return
      }

      setUnit(unitData)

      const [{ receipts: unitReceipts, summary }, existingBooking] = await Promise.all([
        fetchBookingsForUnit(projectId, unitId, token),
        loadExistingBooking(projectId, unitId, unitData, bookingId, token),
      ])

      setReceipts(unitReceipts)
      setReceiptSummary(summary)
      setBooking(existingBooking)
    } catch (error) {
      setUnit(null)
      setBooking(null)
      setReceipts([])
      setReceiptSummary(null)
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to load booking details."),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [bookingId, projectId, toast, unitId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleBookingSubmit = async (values: BookingFormValues) => {
    const token = getAuthToken()
    if (!token || !unit) return

    const isUpdate = Boolean(editingBooking?._id)

    setIsSaving(true)
    try {
      const saveContext = {
        projectId,
        unitId,
        leadId: unit.linked_lead_id,
        amountInWords: amountInWordsInr(values.amount_received),
      }

      let saved: BookingDetailRecord
      if (isUpdate && editingBooking) {
        saved = await updateBooking(editingBooking._id, values, token)
      } else {
        saved = await createBooking(values, saveContext, token)
      }

      setBooking(saved)
      setUnit((current) =>
        current
          ? {
              ...current,
              linked_booking_id: saved._id || current.linked_booking_id,
            }
          : current,
      )

      const { receipts: refreshedReceipts, summary: refreshedSummary } = await fetchBookingsForUnit(
        projectId,
        unitId,
        token,
      )
      setReceipts(refreshedReceipts)
      setReceiptSummary(refreshedSummary)
      setEditingBooking(null)
      toast({
        title: isUpdate ? "Payment updated" : receipts.length > 0 ? "Payment added" : "Booking created",
        description: isUpdate
          ? "Payment details were saved successfully."
          : receipts.length > 0
            ? "A new payment receipt was added for this unit."
            : "A new booking receipt was created for this unit.",
      })
      onSaved?.(saved)
      setIsDrawerOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to save booking."),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading booking details...
      </div>
    )
  }

  if (!unit) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-muted-foreground">
        Booking unit details are unavailable.
      </div>
    )
  }

  return (
    <>
      <BookingDetailTable
        receipts={receipts}
        summary={receiptSummary}
        filterLabel={`${unit.project_name} · Unit ${unit.unit_no}`}
        onEdit={(receipt) => {
          setEditingBooking(receipt)
          setIsDrawerOpen(true)
        }}
        headerAction={
          <Button
            type="button"
            className="min-w-[140px]"
            onClick={() => {
              setEditingBooking(null)
              setIsDrawerOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {receipts.length > 0 ? "Add Payment" : "Add Booking"}
          </Button>
        }
      />

      <BookingFormDrawer
        open={isDrawerOpen}
        onOpenChange={(open) => {
          setIsDrawerOpen(open)
          if (!open) {
            setEditingBooking(null)
          }
        }}
        unit={unit}
        initialValues={formInitialValues}
        isEdit={Boolean(editingBooking)}
        isAddingPayment={!editingBooking && receipts.length > 0}
        isSubmitting={isSaving}
        onSubmit={handleBookingSubmit}
      />
    </>
  )
}
