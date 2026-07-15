"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"

import {
  BookingDetailTable,
  type BookingReceiptSummary,
  type BookingUnitInfo,
} from "./booking-detail-table"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useBookingPermissions } from "@/hooks/useBookingPermissions"
import { getApiErrorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  BOOKING_DETAIL_STALE_MS,
  bookingDetailSnapshotQueryKey,
  bookingUnitSeedQueryKey,
  createBooking,
  fetchBookingDetailSnapshot,
  fetchBookingsForUnit,
  type BookingDetailSnapshot,
  updateBooking,
} from "@/lib/bookings/booking-detail-api"
import { leadDetailDashedEmptyClassName } from "@/lib/form-field-styles"

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
  const {
    canViewBookings,
    canAddBooking,
    canEditBooking,
    isLoading: isPermissionsLoading,
  } = useBookingPermissions()

  const snapshotKey = bookingDetailSnapshotQueryKey(projectId, unitId)
  const seedKey = bookingUnitSeedQueryKey(projectId, unitId)

  const [isSaving, setIsSaving] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingBooking, setEditingBooking] = useState<BookingDetailRecord | null>(null)

  const {
    data: snapshot,
    isLoading,
    isFetching,
    isPlaceholderData,
    error,
  } = useQuery({
    queryKey: snapshotKey,
    enabled: Boolean(projectId && unitId),
    staleTime: BOOKING_DETAIL_STALE_MS,
    placeholderData: () => {
      const seed = queryClient.getQueryData<BookingUnitContext>(seedKey)
      if (!seed) return undefined
      return { unit: seed, receipts: [], summary: null }
    },
    queryFn: async (): Promise<BookingDetailSnapshot> => {
      const token = getAuthToken()
      if (!token) {
        throw new Error("You are not logged in. Please sign in again.")
      }

      const cached = queryClient.getQueryData<BookingDetailSnapshot>(snapshotKey)
      const seed = queryClient.getQueryData<BookingUnitContext>(seedKey)
      return fetchBookingDetailSnapshot(projectId, unitId, token, {
        seedUnit: seed ?? cached?.unit ?? null,
      })
    },
  })

  const isDetailLoading = isLoading || (isPlaceholderData && isFetching)

  useEffect(() => {
    if (!error) return
    toast({
      title: "Error",
      description: getApiErrorMessage(error, "Failed to load booking details."),
      variant: "destructive",
    })
  }, [error, toast])

  const unit = snapshot?.unit ?? null
  const receipts = snapshot?.receipts ?? []
  const receiptSummary: BookingReceiptSummary | null = snapshot?.summary ?? null

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

  const updateSnapshot = (
    updater: (current: BookingDetailSnapshot | undefined) => BookingDetailSnapshot | undefined,
  ) => {
    queryClient.setQueryData<BookingDetailSnapshot>(snapshotKey, updater)
  }

  const handleBookingSubmit = async (values: BookingFormValues) => {
    const token = getAuthToken()
    if (!token || !unit) return

    const isUpdate = Boolean(editingBooking?._id)
    if (isUpdate && !canEditBooking) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to edit bookings.",
        variant: "destructive",
      })
      return
    }
    if (!isUpdate && !canAddBooking) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to add bookings.",
        variant: "destructive",
      })
      return
    }

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

      // Only refresh receipts for this unit — never re-fetch project-wide unit lists.
      const { receipts: refreshedReceipts, summary: refreshedSummary } = await fetchBookingsForUnit(
        projectId,
        unitId,
        token,
      )

      updateSnapshot((current) => ({
        unit: {
          ...(current?.unit ?? unit),
          linked_booking_id: saved._id || current?.unit.linked_booking_id || unit.linked_booking_id,
        },
        receipts: refreshedReceipts,
        summary: refreshedSummary,
      }))

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

  if (!isPermissionsLoading && !canViewBookings) {
    return (
      <div className={cn(leadDetailDashedEmptyClassName, "px-6 py-12")}>
        You don&apos;t have permission to view bookings.
      </div>
    )
  }

  if (!unit && !isDetailLoading) {
    return (
      <div className={cn(leadDetailDashedEmptyClassName, "px-6 py-12")}>
        Booking unit details are unavailable.
      </div>
    )
  }

  const canShowAddButton = Boolean(unit) && canAddBooking

  return (
    <>
      <BookingDetailTable
        receipts={receipts}
        summary={receiptSummary}
        unitInfo={unitInfo}
        isLoading={isDetailLoading && receipts.length === 0}
        filterLabel={unit ? `${unit.project_name} · Unit ${unit.unit_no}` : undefined}
        onEdit={
          canEditBooking
            ? (receipt) => {
                setEditingBooking(receipt)
                setIsDrawerOpen(true)
              }
            : undefined
        }
        headerAction={
          canShowAddButton ? (
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

      {unit && (canAddBooking || canEditBooking) ? (
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
