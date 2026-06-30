"use client"

import { useEffect, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { format, isValid, parseISO } from "date-fns"
import { CalendarIcon, IndianRupee, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  FormSelectContent,
  FormSelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  sheetFormContentClassName,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  formDatePickerButtonClassName,
  formInputClassName,
  formModalFooterButtonClassName,
  formModalFooterClassName,
  formSelectTriggerClassName,
  formTextareaClassName,
} from "@/lib/form-field-styles"
import { cn } from "@/lib/utils"

import type { BookingDetailRecord, BookingUnitContext } from "./booking-types"

const PAYMENT_MODES = [
  { label: "Cash", value: "cash" },
  { label: "Cheque", value: "cheque" },
  { label: "RTGS", value: "rtgs" },
  { label: "DD No.", value: "neft" },
  { label: "IMPS", value: "upi" },
  { label: "PhonePe", value: "phonepe" },
  { label: "GPay", value: "gpay" },
  { label: "Paytm", value: "paytm" },
] as const

const PAYMENT_TYPES = [
  { label: "Advance", value: "token" },
  { label: "Part Payment", value: "installment" },
  { label: "Full Payment", value: "final" },
] as const

const SALUTATIONS = ["Mr.", "Mrs.", "M/s"] as const

export const bookingFormSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  receipt_number: z.string().optional(),
  receipt_date: z.date({ message: "Receipt date is required" }),
  salutation: z.enum(["Mr.", "Mrs.", "M/s"]),
  amount_received: z
    .number({ message: "Amount received is required" })
    .min(1, "Amount received must be greater than zero"),
  payment_mode: z.enum(["cash", "cheque", "rtgs", "neft", "upi", "phonepe", "gpay", "paytm"]),
  payment_type: z.enum(["token", "installment", "final"]),
  payment_reference: z.string().optional(),
  plot_no: z.string().min(1, "Plot no. is required"),
  site_area: z.string().min(1, "Site area is required"),
  registration_date: z.date().optional().nullable(),
})

export type BookingFormValues = z.infer<typeof bookingFormSchema>

interface BookingNotesMeta {
  salutation?: string
  payment_reference?: string
  plain?: string
}

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <FormLabel className="text-sm font-medium text-foreground">
      {children} <span className="text-destructive">*</span>
    </FormLabel>
  )
}

function parseApiDate(value: unknown): Date | undefined {
  if (!value) return undefined
  const text = String(value).trim()
  if (!text) return undefined
  const iso = parseISO(text)
  if (isValid(iso)) return iso
  const direct = new Date(text)
  return isValid(direct) ? direct : undefined
}

function decodeBookingNotes(notes?: string): BookingNotesMeta {
  if (!notes?.trim()) return {}
  try {
    const parsed = JSON.parse(notes) as BookingNotesMeta
    if (parsed && typeof parsed === "object") return parsed
  } catch {
    return { plain: notes }
  }
  return {}
}

function formatSiteArea(unit: BookingUnitContext): string {
  if (unit.area_sqft != null && unit.area_sqft > 0) {
    return `${unit.area_sqft.toLocaleString("en-IN")} sq.ft`
  }
  if (unit.area_cents != null && unit.area_cents > 0) {
    return `${unit.area_cents.toLocaleString("en-IN")} cents`
  }
  return ""
}

export function amountInWordsInr(amount: number): string {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ]
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

  function twoDigits(value: number): string {
    if (value < 20) return ones[value]
    return `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${ones[value % 10]}` : ""}`.trim()
  }

  function convert(value: number): string {
    if (!Number.isFinite(value) || value === 0) return "Zero"
    if (value < 0) return `Minus ${convert(Math.abs(value))}`

    let remaining = Math.floor(value)
    const parts: string[] = []

    const crore = Math.floor(remaining / 10000000)
    remaining %= 10000000
    const lakh = Math.floor(remaining / 100000)
    remaining %= 100000
    const thousand = Math.floor(remaining / 1000)
    remaining %= 1000
    const hundred = Math.floor(remaining / 100)
    remaining %= 100

    if (crore) parts.push(`${twoDigits(crore)} Crore`)
    if (lakh) parts.push(`${twoDigits(lakh)} Lakh`)
    if (thousand) parts.push(`${twoDigits(thousand)} Thousand`)
    if (hundred) parts.push(`${twoDigits(hundred)} Hundred`)
    if (remaining) parts.push(twoDigits(remaining))

    return parts.join(" ").trim()
  }

  const rupees = Math.floor(Math.abs(amount))
  const paise = Math.round((Math.abs(amount) - rupees) * 100)
  let words = `${convert(rupees)} Rupees`
  if (paise) words += ` and ${convert(paise)} Paise`
  return `${words} Only`
}

export function createDefaultFormValues(
  unit: BookingUnitContext,
  previousReceipt?: BookingDetailRecord | null,
): BookingFormValues {
  if (previousReceipt) {
    const notesMeta = decodeBookingNotes(previousReceipt.notes)
    const salutation = SALUTATIONS.includes(notesMeta.salutation as (typeof SALUTATIONS)[number])
      ? (notesMeta.salutation as (typeof SALUTATIONS)[number])
      : "Mr."

    return {
      customer_name: previousReceipt.customer_name || unit.customer_name || "",
      receipt_number: "",
      receipt_date: new Date(),
      salutation,
      amount_received: 0,
      payment_mode: "cash",
      payment_type: "installment",
      payment_reference: "",
      plot_no: previousReceipt.unit_no || unit.unit_no || "",
      site_area: formatSiteArea(unit),
      registration_date: parseApiDate(previousReceipt.registration_date) ?? null,
    }
  }

  return {
    customer_name: unit.customer_name || "",
    receipt_number: "",
    receipt_date: new Date(),
    salutation: "Mr.",
    amount_received: 0,
    payment_mode: "cash",
    payment_type: "token",
    payment_reference: "",
    plot_no: unit.unit_no || "",
    site_area: formatSiteArea(unit),
    registration_date: null,
  }
}

export function mapBookingToFormValues(
  booking: BookingDetailRecord,
  unit: BookingUnitContext,
): BookingFormValues {
  const notesMeta = decodeBookingNotes(booking.notes)
  const salutation = SALUTATIONS.includes(notesMeta.salutation as (typeof SALUTATIONS)[number])
    ? (notesMeta.salutation as (typeof SALUTATIONS)[number])
    : "Mr."

  return {
    customer_name: booking.customer_name || unit.customer_name || "",
    receipt_number: booking.receipt_number || "",
    receipt_date: parseApiDate(booking.booking_date) ?? new Date(),
    salutation,
    amount_received: booking.amount_paid || 0,
    payment_mode: PAYMENT_MODES.some((mode) => mode.value === booking.payment_type)
      ? (booking.payment_type as BookingFormValues["payment_mode"])
      : "cash",
    payment_type: PAYMENT_TYPES.some((type) => type.value === booking.transaction_type)
      ? (booking.transaction_type as BookingFormValues["payment_type"])
      : "token",
    payment_reference: notesMeta.payment_reference || "",
    plot_no: booking.unit_no || unit.unit_no || "",
    site_area: formatSiteArea(unit),
    registration_date: parseApiDate(booking.registration_date) ?? null,
  }
}

interface BookingFormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unit: BookingUnitContext
  initialValues: BookingFormValues
  isEdit?: boolean
  isAddingPayment?: boolean
  isSubmitting?: boolean
  onSubmit: (values: BookingFormValues) => void | Promise<void>
}

export function BookingFormDrawer({
  open,
  onOpenChange,
  unit,
  initialValues,
  isEdit = false,
  isAddingPayment = false,
  isSubmitting = false,
  onSubmit,
}: BookingFormDrawerProps) {
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: initialValues,
  })

  const amountReceived = form.watch("amount_received")
  const paymentMode = form.watch("payment_mode")
  const salutation = form.watch("salutation")
  const customerName = form.watch("customer_name")

  const amountInWords = useMemo(
    () => amountInWordsInr(Number(amountReceived) || 0),
    [amountReceived],
  )

  useEffect(() => {
    if (open) {
      form.reset(initialValues)
    }
  }, [open, initialValues, form])

  function handleClose() {
    if (isSubmitting) return
    onOpenChange(false)
    form.reset(initialValues)
  }

  async function handleFormSubmit(values: BookingFormValues) {
    await onSubmit(values)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(newOpen) => {
        if (isSubmitting) return
        onOpenChange(newOpen)
        if (!newOpen) {
          form.reset(initialValues)
        }
      }}
    >
      <SheetContent
        side="right"
        className={cn(sheetFormContentClassName, "data-[side=right]:sm:max-w-lg")}
      >
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6">
          <SheetHeader className="p-0 pb-5">
            <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
              <IndianRupee className="h-5 w-5 text-primary" />
              {isEdit ? "Update Payment" : isAddingPayment ? "Add Payment" : "Add Booking"}
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              {unit.project_name} · Unit {unit.unit_no}
              {isAddingPayment && !isEdit ? (
                <span className="mt-1 block">
                  Record an additional advance or part payment for this unit.
                </span>
              ) : null}
            </SheetDescription>
            <Separator className="mt-4" />
          </SheetHeader>

          <Form {...form}>
            <form id="booking-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="salutation"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <RequiredLabel>Salutation</RequiredLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger size="form" className={formSelectTriggerClassName}>
                            <SelectValue placeholder="Select salutation" />
                          </SelectTrigger>
                        </FormControl>
                        <FormSelectContent>
                          {SALUTATIONS.map((option) => (
                            <FormSelectItem key={option} value={option}>
                              {option}
                            </FormSelectItem>
                          ))}
                        </FormSelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <RequiredLabel>Customer Name</RequiredLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter customer name"
                          disabled={isSubmitting}
                          className={formInputClassName}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                Received with thanks from{" "}
                <span className="font-semibold text-slate-900">
                  {salutation} {customerName || "—"}
                </span>
              </div>

              <FormField
                control={form.control}
                name="receipt_number"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-foreground">Receipt No.</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Auto-generated if left blank"
                        disabled={isSubmitting}
                        className={formInputClassName}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="receipt_date"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <RequiredLabel>Receipt Date</RequiredLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={isSubmitting}
                              className={cn(
                                formDatePickerButtonClassName,
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                              {field.value ? format(field.value, "PPP") : "Select receipt date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="registration_date"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium text-foreground">
                        Registration Date
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={isSubmitting}
                              className={cn(
                                formDatePickerButtonClassName,
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                              {field.value ? format(field.value, "PPP") : "Select registration date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ?? undefined}
                            onSelect={field.onChange}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="amount_received"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <RequiredLabel>Amount (Rs.)</RequiredLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0.00"
                          disabled={isSubmitting}
                          className={formInputClassName}
                          onChange={(event) => field.onChange(Number(event.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payment_mode"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <RequiredLabel>Payment Mode</RequiredLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger size="form" className={formSelectTriggerClassName}>
                            <SelectValue placeholder="Select payment mode" />
                          </SelectTrigger>
                        </FormControl>
                        <FormSelectContent>
                          {PAYMENT_MODES.map((option) => (
                            <FormSelectItem key={option.value} value={option.value}>
                              {option.label}
                            </FormSelectItem>
                          ))}
                        </FormSelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="payment_type"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <RequiredLabel>Payment Type</RequiredLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger size="form" className={formSelectTriggerClassName}>
                          <SelectValue placeholder="Select payment type" />
                        </SelectTrigger>
                      </FormControl>
                      <FormSelectContent>
                        {PAYMENT_TYPES.map((option) => (
                          <FormSelectItem key={option.value} value={option.value}>
                            {option.label}
                          </FormSelectItem>
                        ))}
                      </FormSelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {paymentMode === "neft" ? (
                <FormField
                  control={form.control}
                  name="payment_reference"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium text-foreground">DD No.</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter DD number"
                          disabled={isSubmitting}
                          className={formInputClassName}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="plot_no"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <RequiredLabel>Plot No.</RequiredLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Plot / unit number"
                          disabled={isSubmitting}
                          className={formInputClassName}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="site_area"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <RequiredLabel>Site Area</RequiredLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Site area"
                          disabled={isSubmitting}
                          className={formInputClassName}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-medium text-foreground">
                  Amount in Words (Rupees)
                </FormLabel>
                <Textarea
                  readOnly
                  value={amountInWords}
                  className={cn(formTextareaClassName, "min-h-[72px] border-dashed bg-amber-50/50")}
                />
              </FormItem>

              <div className="pb-4" />
            </form>
          </Form>
        </div>

        <div className={formModalFooterClassName}>
          <Button
            type="submit"
            form="booking-form"
            className={formModalFooterButtonClassName}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : isEdit ? (
              "Update"
            ) : isAddingPayment ? (
              "Add Payment"
            ) : (
              "Save"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={formModalFooterButtonClassName}
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
