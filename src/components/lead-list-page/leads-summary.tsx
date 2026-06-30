"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ChevronUp,
  Clock,
  TrendingUp,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LeadMetricsData } from "@/lib/leads/lead-api"

export type { LeadMetricsData }

interface LeadsSummaryProps {
  onFilterByMetric: (metricType: string) => void
  activeMetricFilter?: string | null
  metrics?: LeadMetricsData | null
  isLoading?: boolean
}

interface Metric {
  id: string
  label: string
  value: number
  highlight: boolean
  icon: LucideIcon
  iconClassName: string
  accentClassName: string
}

function toMetricValue(value: number | undefined | null): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function buildMetrics(metrics: LeadMetricsData): Metric[] {
  const agingDays = metrics.aging_days || 7

  return [
    {
      id: "this-week",
      label: "This Week",
      value: toMetricValue(metrics.created_this_week),
      highlight: false,
      icon: CalendarDays,
      iconClassName: "text-blue-600 bg-blue-50",
      accentClassName: "hover:border-blue-200 data-[active=true]:border-blue-300 data-[active=true]:bg-blue-50/60",
    },
    {
      id: "aging",
      label: `Aging >${agingDays} Days`,
      value: toMetricValue(metrics.aging_leads),
      highlight: true,
      icon: Clock,
      iconClassName: "text-red-600 bg-red-50",
      accentClassName: "hover:border-red-200 data-[active=true]:border-red-300 data-[active=true]:bg-red-50/60",
    },
    {
      id: "followup-today",
      label: "Follow-up Today",
      value: toMetricValue(metrics.followup_today),
      highlight: false,
      icon: UserCheck,
      iconClassName: "text-amber-600 bg-amber-50",
      accentClassName: "hover:border-amber-200 data-[active=true]:border-amber-300 data-[active=true]:bg-amber-50/60",
    },
    {
      id: "created-month",
      label: "Created This Month",
      value: toMetricValue(metrics.created_this_month),
      highlight: false,
      icon: CalendarPlus,
      iconClassName: "text-violet-600 bg-violet-50",
      accentClassName: "hover:border-violet-200 data-[active=true]:border-violet-300 data-[active=true]:bg-violet-50/60",
    },
    {
      id: "converted-month",
      label: "Converted This Month",
      value: toMetricValue(metrics.converted_this_month),
      highlight: false,
      icon: TrendingUp,
      iconClassName: "text-emerald-600 bg-emerald-50",
      accentClassName: "hover:border-emerald-200 data-[active=true]:border-emerald-300 data-[active=true]:bg-emerald-50/60",
    },
  ]
}

const EMPTY_METRICS: LeadMetricsData = {
  active_leads: 0,
  created_this_week: 0,
  converted_this_week: 0,
  aging_leads: 0,
  aging_days: 7,
  followup_today: 0,
  created_this_month: 0,
  converted_this_month: 0,
}

export function LeadsSummary({
  onFilterByMetric,
  activeMetricFilter,
  metrics,
  isLoading = false,
}: LeadsSummaryProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const displayMetrics = buildMetrics(metrics ?? EMPTY_METRICS)

  return (
    <section className="mb-1">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Lead Summary
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 shrink-0"
          onClick={() => setIsCollapsed((prev) => !prev)}
          aria-label={isCollapsed ? "Expand summary" : "Collapse summary"}
        >
          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>

      <div
        className={cn(
          "grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5 transition-all duration-300 ease-in-out",
          isCollapsed ? "max-h-0 overflow-hidden opacity-0 mt-0" : "max-h-[600px] opacity-100 mt-2",
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
                "cursor-pointer border shadow-sm transition-all duration-200 hover:shadow-md min-h-[104px]",
                metric.accentClassName,
                isActive && "ring-2 ring-primary/40 shadow-md"
              )}
              onClick={() => onFilterByMetric(metric.id)}
            >
              <CardContent className="flex h-full items-center px-4 py-5">
                <div className="flex w-full items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-xs font-medium uppercase tracking-wide truncate leading-tight",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {metric.label}
                    </p>
                    <p
                      className={cn(
                        "mt-2 text-3xl font-bold tabular-nums tracking-tight leading-none",
                        isActive && "text-primary",
                        metric.highlight && metric.value > 0 && "text-red-600",
                        isLoading && "text-muted-foreground"
                      )}
                    >
                      {isLoading ? "—" : metric.value.toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
                      metric.iconClassName
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
