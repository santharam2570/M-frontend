"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  Bookmark,
  Building2,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export interface BookingMetricsData {
  total_bookings: number
  bookings_this_month: number
  total_amount_paid: number
  registered_this_month: number
}

interface BookingsSummaryProps {
  onFilterByMetric: (metricType: string) => void
  activeMetricFilter?: string | null
  metrics?: BookingMetricsData | null
  isLoading?: boolean
}

interface Metric {
  id: string
  label: string
  value: number
  displayValue?: string
  highlight: boolean
  icon: LucideIcon
  iconClassName: string
  accentClassName: string
}

function formatIndianCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`
  return `₹${amount.toLocaleString("en-IN")}`
}

function toMetricValue(value: number | undefined | null): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function buildMetrics(metrics: BookingMetricsData): Metric[] {
  const totalAmountPaid = toMetricValue(metrics.total_amount_paid)

  return [
    {
      id: "total",
      label: "Total Bookings",
      value: toMetricValue(metrics.total_bookings),
      highlight: false,
      icon: LayoutGrid,
      iconClassName: "text-blue-600 bg-blue-50",
      accentClassName:
        "hover:border-blue-200 data-[active=true]:border-blue-300 data-[active=true]:bg-blue-50/60",
    },
    {
      id: "this-month",
      label: "Bookings This Month",
      value: toMetricValue(metrics.bookings_this_month),
      highlight: false,
      icon: Building2,
      iconClassName: "text-violet-600 bg-violet-50",
      accentClassName:
        "hover:border-violet-200 data-[active=true]:border-violet-300 data-[active=true]:bg-violet-50/60",
    },
    {
      id: "amount-paid",
      label: "Total Amount Paid",
      value: totalAmountPaid,
      displayValue: formatIndianCurrency(totalAmountPaid),
      highlight: false,
      icon: IndianRupee,
      iconClassName: "text-emerald-600 bg-emerald-50",
      accentClassName:
        "hover:border-emerald-200 data-[active=true]:border-emerald-300 data-[active=true]:bg-emerald-50/60",
    },
    {
      id: "registered-month",
      label: "Registered This Month",
      value: toMetricValue(metrics.registered_this_month),
      highlight: false,
      icon: Bookmark,
      iconClassName: "text-amber-600 bg-amber-50",
      accentClassName:
        "hover:border-amber-200 data-[active=true]:border-amber-300 data-[active=true]:bg-amber-50/60",
    },
  ]
}

const EMPTY_METRICS: BookingMetricsData = {
  total_bookings: 0,
  bookings_this_month: 0,
  total_amount_paid: 0,
  registered_this_month: 0,
}

export function BookingsSummary({
  onFilterByMetric,
  activeMetricFilter,
  metrics,
  isLoading = false,
}: BookingsSummaryProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const displayMetrics = buildMetrics(metrics ?? EMPTY_METRICS)

  return (
    <section className="mb-0 mt-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Bookmark className="h-5 w-5 text-primary" />
          Booking Summary
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 shrink-0 p-0"
          onClick={() => setIsCollapsed((prev) => !prev)}
          aria-label={isCollapsed ? "Expand summary" : "Collapse summary"}
        >
          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>

      <div
        className={cn(
          "grid grid-cols-1 gap-4 transition-all duration-300 ease-in-out sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4",
          isCollapsed ? "mt-0 max-h-0 overflow-hidden opacity-0" : "mt-0 max-h-[1200px] overflow-hidden opacity-100",
        )}
      >
        {displayMetrics.map((metric) => {
          const isActive = activeMetricFilter === metric.id
          const Icon = metric.icon

          return (
            <Card
              key={metric.id}
              data-active={isActive}
              className={cn(
                "min-h-[104px] cursor-pointer border shadow-sm transition-all duration-200 hover:shadow-md",
                metric.accentClassName,
                isActive && "shadow-md ring-2 ring-primary/40",
              )}
              onClick={() => onFilterByMetric(metric.id)}
            >
              <CardContent className="flex h-full items-center px-4 py-5">
                <div className="flex w-full items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p
                      title={metric.label}
                      className={cn(
                        "truncate text-sm font-bold uppercase leading-tight tracking-wide text-black",
                      )}
                    >
                      {metric.label}
                    </p>
                    <p
                      className={cn(
                        "mt-2 text-3xl font-bold tabular-nums leading-none tracking-tight text-black",
                        metric.highlight && metric.value > 0 && "text-red-600",
                        isLoading && "text-muted-foreground",
                        metric.id === "amount-paid" && "text-2xl",
                      )}
                    >
                      {isLoading
                        ? "—"
                        : metric.displayValue ?? metric.value.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
                      metric.iconClassName,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
