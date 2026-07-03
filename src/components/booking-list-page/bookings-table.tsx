"use client"

import Link from "next/link"
import { ArrowLeft, Eye, Loader2, MoreVertical, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

const bookingTableHeadClass = (align: "left" | "right" | "center" = "left") =>
  cn(
    "sticky top-0 z-10 bg-primary px-4 align-middle font-bold text-primary-foreground min-h-12 py-4 text-sm",
    align === "right" && "text-right",
    align === "center" && "text-center",
    align === "left" && "text-left",
  )

function formatIndianCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`
  }
  return `₹${amount.toLocaleString("en-IN")}`
}

export interface BookingUnitRow {
  _id: string
  project_id: string
  project_name: string
  unit_no: string
  block?: string
  property_type: string
  area_sqft?: number
  area_cents?: number
  price_per_sqft: number
  total_price: number
  status: string
  customer_name?: string
}

function formatPropertyType(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatArea(unit: BookingUnitRow): string {
  if (unit.area_sqft != null && unit.area_sqft > 0) {
    return `${unit.area_sqft.toLocaleString("en-IN")} sq.ft`
  }
  if (unit.area_cents != null && unit.area_cents > 0) {
    return `${unit.area_cents.toLocaleString("en-IN")} cents`
  }
  return "—"
}

function getBookingDetailHref(booking: BookingUnitRow): string {
  const params = new URLSearchParams({
    projectId: booking.project_id,
    unitId: booking._id,
    unitStatus: "booking",
  })
  return `/bookings?${params.toString()}`
}

interface BookingsListTableProps {
  bookings: BookingUnitRow[]
  isLoading?: boolean
  filterLabel?: string
  headerAction?: React.ReactNode
  onBack?: () => void
  onBookingClick?: (booking: BookingUnitRow) => void
  onDeleteBooking?: (booking: BookingUnitRow) => void
}

export function BookingsListTable({
  bookings,
  isLoading,
  filterLabel,
  headerAction,
  onBack,
  onBookingClick,
  onDeleteBooking,
}: BookingsListTableProps) {
  const isMobile = useIsMobile()

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
          {onBack ? (
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={onBack}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to all bookings
            </Button>
          ) : null}
          {filterLabel ? (
            <p className="text-sm text-muted-foreground">
              Showing: <span className="font-medium text-foreground">{filterLabel}</span>
            </p>
          ) : null}
        </div>
        {headerAction}
      </div>

      <div className={isMobile ? "space-y-3" : "overflow-auto rounded-lg border border-slate-200/80 bg-white"}>
        {isMobile ? (
          bookings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-muted-foreground">
              No bookings found.
            </div>
          ) : (
            bookings.map((booking) => (
              <Card
                key={booking._id}
                className="cursor-pointer shadow-sm transition-shadow hover:shadow-md"
                onClick={() => onBookingClick?.(booking)}
              >
                <CardContent className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={getBookingDetailHref(booking)}
                        className="block break-words text-base font-semibold text-primary hover:text-primary/80 hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {booking.project_name || "—"}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Unit{" "}
                        <Link
                          href={getBookingDetailHref(booking)}
                          className="font-medium text-primary hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {booking.unit_no || "—"}
                        </Link>
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          onClick={(event) => event.stopPropagation()}
                          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          title="Actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation()
                            onBookingClick?.(booking)
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        {onDeleteBooking ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={(event) => {
                                event.stopPropagation()
                                onDeleteBooking(booking)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2">
                      <span className="w-20 shrink-0 text-xs text-muted-foreground">Block:</span>
                      <span>{booking.block || "—"}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-20 shrink-0 text-xs text-muted-foreground">Type:</span>
                      <span className="capitalize">{formatPropertyType(booking.property_type || "—")}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-20 shrink-0 text-xs text-muted-foreground">Area:</span>
                      <span>{formatArea(booking)}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-20 shrink-0 text-xs text-muted-foreground">Price:</span>
                      <span className="tabular-nums">{formatIndianCurrency(booking.price_per_sqft)} / sq.ft</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )
        ) : (
        <Table className="border-collapse">
          <TableHeader className="border-0 [&_tr]:border-0 [&_th]:border-0">
            <TableRow className="border-0 hover:bg-primary">
              <TableHead className={bookingTableHeadClass("left")}>Project Name</TableHead>
              <TableHead className={bookingTableHeadClass("left")}>Unit No</TableHead>
              <TableHead className={bookingTableHeadClass("left")}>Block</TableHead>
              <TableHead className={bookingTableHeadClass("left")}>Type</TableHead>
              <TableHead className={bookingTableHeadClass("left")}>Area</TableHead>
              <TableHead className={bookingTableHeadClass("right")}>Price / sq.ft</TableHead>
              <TableHead className={bookingTableHeadClass("center")}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr:first-child]:border-t-0">
            {bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No bookings found.
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => (
                <TableRow
                  key={booking._id}
                  className="group cursor-pointer even:bg-slate-50/40 hover:bg-muted/50"
                  onClick={() => onBookingClick?.(booking)}
                >
                  <TableCell className="px-4 py-3 text-sm font-medium text-slate-900">
                    <Link
                      href={getBookingDetailHref(booking)}
                      className="text-primary hover:text-primary/80 hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {booking.project_name || "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm">
                    <Link
                      href={getBookingDetailHref(booking)}
                      className="font-medium text-primary hover:text-primary/80 hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {booking.unit_no || "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm">{booking.block || "—"}</TableCell>
                  <TableCell className="px-4 py-3 text-sm capitalize">
                    {formatPropertyType(booking.property_type || "—")}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm">{formatArea(booking)}</TableCell>
                  <TableCell className="px-4 py-3 text-right text-sm tabular-nums">
                    {formatIndianCurrency(booking.price_per_sqft)}
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
                            onBookingClick?.(booking)
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        {onDeleteBooking ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={(event) => {
                                event.stopPropagation()
                                onDeleteBooking(booking)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        )}
      </div>
    </div>
  )
}
