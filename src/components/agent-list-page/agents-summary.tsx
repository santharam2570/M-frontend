"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  IdCard,
  UserCheck,
  UserPlus,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AgentMetrics } from "@/lib/agents/types"

interface AgentsSummaryProps {
  metrics: AgentMetrics | null
  isLoading?: boolean
  onFilterByMetric?: (metricId: string) => void
  activeMetricFilter?: string | null
}

interface Metric {
  id: string
  label: string
  value: number
  icon: LucideIcon
  iconClassName: string
  accentClassName: string
}

function toMetricValue(value: number | undefined | null): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function buildMetrics(metrics: AgentMetrics): Metric[] {
  return [
    {
      id: "total",
      label: "Total Agents",
      value: toMetricValue(metrics.total_agents),
      icon: IdCard,
      iconClassName: "text-primary bg-primary/10",
      accentClassName:
        "hover:border-primary/30 data-[active=true]:border-primary/40 data-[active=true]:bg-primary/10",
    },
    {
      id: "active",
      label: "Active Agents",
      value: toMetricValue(metrics.active_agents),
      icon: UserCheck,
      iconClassName: "text-emerald-600 bg-emerald-50",
      accentClassName:
        "hover:border-emerald-200 data-[active=true]:border-emerald-300 data-[active=true]:bg-emerald-50/60",
    },
    {
      id: "new-this-month",
      label: "New This Month",
      value: toMetricValue(metrics.new_this_month),
      icon: UserPlus,
      iconClassName: "text-violet-600 bg-violet-50",
      accentClassName:
        "hover:border-violet-200 data-[active=true]:border-violet-300 data-[active=true]:bg-violet-50/60",
    },
    {
      id: "total-bookings",
      label: "Total Bookings",
      value: toMetricValue(metrics.total_bookings),
      icon: Bookmark,
      iconClassName: "text-amber-600 bg-amber-50",
      accentClassName:
        "hover:border-amber-200 data-[active=true]:border-amber-300 data-[active=true]:bg-amber-50/60",
    },
  ]
}

const EMPTY_METRICS: AgentMetrics = {
  total_agents: 0,
  active_agents: 0,
  new_this_month: 0,
  total_bookings: 0,
}

export function AgentsSummary({
  metrics,
  isLoading = false,
  onFilterByMetric,
  activeMetricFilter,
}: AgentsSummaryProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const displayMetrics = buildMetrics(metrics ?? EMPTY_METRICS)

  return (
    <section className="mb-0 mt-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <IdCard className="h-5 w-5 text-primary" />
          Agent Summary
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
          const Icon = metric.icon
          const isActive = activeMetricFilter === metric.id

          return (
            <Card
              key={metric.id}
              data-active={isActive}
              className={cn(
                "min-h-[104px] cursor-pointer border shadow-sm transition-all duration-200 hover:shadow-md",
                metric.accentClassName,
                isActive && "shadow-md ring-2 ring-primary/40",
                !onFilterByMetric && "cursor-default",
              )}
              onClick={() => onFilterByMetric?.(metric.id)}
            >
              <CardContent className="flex h-full items-center px-4 py-5">
                <div className="flex w-full items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p
                      title={metric.label}
                      className="truncate text-sm font-bold uppercase leading-tight tracking-wide text-black"
                    >
                      {metric.label}
                    </p>
                    <p
                      className={cn(
                        "mt-2 text-3xl font-bold tabular-nums leading-none tracking-tight text-black",
                        isLoading && "text-muted-foreground",
                      )}
                    >
                      {isLoading ? "—" : metric.value.toLocaleString("en-IN")}
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
