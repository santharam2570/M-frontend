"use client"

import { format, isValid, parseISO } from "date-fns"
import { Loader2, MoreVertical, Pencil } from "lucide-react"

import type { BookingDetailRecord } from "@/components/booking-detail-page/booking-types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

const bookingTableHeadClass = (align: "left" | "right" | "center" = "left") =>
  cn(
    "sticky top-0 z-10 bg-primary px-4 align-middle font-bold text-primary-foreground min-h-12 py-4 text-sm",
    align === "right" && "text-right",
    align === "center" && "text-center",
    align === "left" && "text-left",
  )

const PAYMENT_MODE_LABELS: Record<string, string> = {
  cash: "Cash",
  cheque: "Cheque",
  rtgs: "RTGS",
  neft: "DD No.",
  upi: "IMPS",
  phonepe: "PhonePe",
  gpay: "GPay",
  paytm: "Paytm",
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  token: "Advance",
  installment: "Part Payment",
  final: "Full Payment",
}

export interface BookingReceiptSummary {
  total_count: number
  total_amount: number
}

function formatIndianCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`
}

function formatReceiptDate(value?: string | null): string {
  if (!value?.trim()) return "—"
  const iso = parseISO(value)
  if (isValid(iso)) return format(iso, "dd MMM yyyy")
  const direct = new Date(value)
  return isValid(direct) ? format(direct, "dd MMM yyyy") : value
}

function formatPaymentMode(value: string): string {
  return PAYMENT_MODE_LABELS[value] ?? value ?? "—"
}

function formatPaymentType(value: string): string {
  return PAYMENT_TYPE_LABELS[value] ?? value ?? "—"
}

interface BookingDetailTableProps {
  receipts: BookingDetailRecord[]
  summary: BookingReceiptSummary | null
  isLoading?: boolean
  filterLabel?: string
  headerAction?: React.ReactNode
  onEdit?: (receipt: BookingDetailRecord) => void
}

export function BookingDetailTable({
  receipts,
  summary,
  isLoading,
  filterLabel,
  headerAction,
  onEdit,
}: BookingDetailTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading bookings...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {filterLabel ? (
            <p className="text-sm text-muted-foreground">
              Showing: <span className="font-medium text-foreground">{filterLabel}</span>
            </p>
          ) : null}
        </div>
        {headerAction}
      </div>

      <div className="overflow-auto rounded-lg border border-slate-200/80 bg-white">
      <Table className="border-collapse">
        <TableHeader className="border-0 [&_tr]:border-0 [&_th]:border-0">
          <TableRow className="border-0 hover:bg-primary">
            <TableHead className={bookingTableHeadClass("left")}>Customer</TableHead>
            <TableHead className={bookingTableHeadClass("left")}>Receipt No.</TableHead>
            <TableHead className={bookingTableHeadClass("left")}>Receipt Date</TableHead>
            <TableHead className={bookingTableHeadClass("right")}>Amount (Rs.)</TableHead>
            <TableHead className={bookingTableHeadClass("left")}>Payment Mode</TableHead>
            <TableHead className={bookingTableHeadClass("left")}>Payment Type</TableHead>
            <TableHead className={bookingTableHeadClass("center")}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr:first-child]:border-t-0">
            {receipts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No bookings found.
                </TableCell>
              </TableRow>
            ) : (
              receipts.map((receipt) => (
                <TableRow key={receipt._id} className="group even:bg-slate-50/40 hover:bg-muted/50">
                  <TableCell className="px-4 py-3 text-sm font-medium text-slate-900">
                    {receipt.customer_name || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm">{receipt.receipt_number || "—"}</TableCell>
                  <TableCell className="px-4 py-3 text-sm">
                    {formatReceiptDate(receipt.booking_date)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right text-sm font-medium tabular-nums">
                    {formatIndianCurrency(receipt.amount_paid)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm">
                    {formatPaymentMode(receipt.payment_type)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm">
                    {formatPaymentType(receipt.transaction_type)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          onClick={(event) => event.stopPropagation()}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          title="Actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation()
                            onEdit?.(receipt)
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {summary && receipts.length > 0 ? (
            <TableFooter>
              <TableRow className="bg-slate-100 font-medium hover:bg-slate-100">
                <TableCell colSpan={3} className="px-4 py-3 text-sm">
                  Total ({summary.total_count} receipt{summary.total_count !== 1 ? "s" : ""})
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm tabular-nums">
                  {formatIndianCurrency(summary.total_amount)}
                </TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
      </div>
    </div>
  )
}
