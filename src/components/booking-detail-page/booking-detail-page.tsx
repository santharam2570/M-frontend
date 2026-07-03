"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import {
  BookingDetailTable,
  type BookingReceiptSummary,
  type BookingUnitInfo,
} from "./booking-detail-table"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { getApiErrorMessage } from "@/lib/api"
import {
  createBooking,
  fetchBookingDetailSnapshot,
  fetchBookingsForUnit,
  type BookingDetailSnapshot,
  updateBooking,
} from "@/lib/bookings/booking-detail-api"
import { Plus } from "lucide-react"

import {
  amountInWordsInr,
  BookingFormDrawer,
  createDefaultFormValues,
  decodeBookingNotes,
  formatSiteArea,
  mapBookingToFormValues,
  type BookingFormValues,
} from "./booking-form-drawer"
import type { BookingDetailPageProps, BookingDetailRecord, BookingUnitContext } from "./booking-types"

export type { BookingDetailRecord, BookingUnitContext } from "./booking-types"

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem("map_user") ?? "{}"
    const parsed = JSON.parse(stored)
    return parsed?.access_token ?? null
  } catch {
    return null
  }
}

export default function BookingDetailPage({
  projectId,
  unitId,
  onSaved,
}: BookingDetailPageProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const snapshotKey = useMemo(
    () => ["booking-detail-snapshot", projectId, unitId] as const,
    [projectId, unitId],
  )

  const cachedDetail = queryClient.getQueryData<BookingDetailSnapshot>(snapshotKey)

  const [unit, setUnit] = useState<BookingUnitContext | null>(cachedDetail?.unit ?? null)
  const [receipts, setReceipts] = useState<BookingDetailRecord[]>(cachedDetail?.receipts ?? [])
  const [receiptSummary, setReceiptSummary] = useState<BookingReceiptSummary | null>(
    cachedDetail?.summary ?? null,
  )
  const [isLoading, setIsLoading] = useState(!cachedDetail)
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

  const unitInfo = useMemo((): BookingUnitInfo | null => {
    if (!unit) return null

    const primaryReceipt =
      receipts.find((receipt) => receipt.registration_date) ?? receipts[0] ?? null
    const notesMeta = primaryReceipt ? decodeBookingNotes(primaryReceipt.notes) : {}

    return {
      plotNumber: unit.unit_no || primaryReceipt?.unit_no || notesMeta.plot_no || "",
      siteArea: notesMeta.site_area || formatSiteArea(unit),
      registrationDate:
        primaryReceipt?.registration_date ?? primaryReceipt?.booking_date ?? null,
    }
  }, [receipts, unit])

  const loadData = useCallback(
    async (options?: { silent?: boolean }) => {
      const token = getAuthToken()
      if (!token || !projectId || !unitId) {
        setUnit(null)
        setReceipts([])
        setReceiptSummary(null)
        setIsLoading(false)
        return
      }

      if (!options?.silent) {
        setIsLoading(true)
      }

      try {
        const snapshot = await fetchBookingDetailSnapshot(projectId, unitId, token)
        setUnit(snapshot.unit)
        setReceipts(snapshot.receipts)
        setReceiptSummary(snapshot.summary)
      } catch (error) {
        if (!options?.silent) {
          setUnit(null)
          setReceipts([])
          setReceiptSummary(null)
          toast({
            title: "Error",
            description: getApiErrorMessage(error, "Failed to load booking details."),
            variant: "destructive",
          })
        }
      } finally {
        if (!options?.silent) {
          setIsLoading(false)
        }
      }
    },
    [projectId, toast, unitId],
  )

  useEffect(() => {
    const snapshot = queryClient.getQueryData<BookingDetailSnapshot>(snapshotKey)
    if (snapshot) {
      setUnit(snapshot.unit)
      setReceipts(snapshot.receipts)
      setReceiptSummary(snapshot.summary)
      setIsLoading(false)
      void loadData({ silent: true })
      return
    }

    setUnit(null)
    setReceipts([])
    setReceiptSummary(null)
    void loadData()
  }, [loadData, queryClient, snapshotKey])

  useEffect(() => {
    if (isLoading || !unit) return
    queryClient.setQueryData<BookingDetailSnapshot>(snapshotKey, {
      unit,
      receipts,
      summary: receiptSummary,
    })
  }, [isLoading, queryClient, receiptSummary, receipts, snapshotKey, unit])

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

  if (!unit && !isLoading) {
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
        unitInfo={unitInfo}
        isLoading={isLoading && !unit}
        filterLabel={unit ? `${unit.project_name} · Unit ${unit.unit_no}` : undefined}
        onEdit={(receipt) => {
          setEditingBooking(receipt)
          setIsDrawerOpen(true)
        }}
        headerAction={
          unit ? (
            <Button
              type="button"
              className="w-full min-w-0 sm:min-w-[140px] sm:w-auto"
              onClick={() => {
                setEditingBooking(null)
                setIsDrawerOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {receipts.length > 0 ? "Add Payment" : "Add Booking"}
            </Button>
          ) : undefined
        }
      />

      {unit ? (
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
      ) : null}
    </>
  )
}
