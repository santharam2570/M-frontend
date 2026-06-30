"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  Building2,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  MapPin,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import type { ProjectMetrics } from "@/lib/projects/types"

interface ProjectsSummaryProps {
  metrics: ProjectMetrics | null
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

function buildMetrics(metrics: ProjectMetrics): Metric[] {
  return [
    {
      id: "total",
      label: "Total Projects",
      value: metrics.total_projects,
      icon: Building2,
      iconClassName: "text-primary bg-primary/10",
      accentClassName:
        "hover:border-primary/30 data-[active=true]:border-primary/40 data-[active=true]:bg-primary/10",
    },
    {
      id: "active",
      label: "Active Projects",
      value: metrics.active_projects,
      icon: LayoutGrid,
      iconClassName: "text-emerald-600 bg-emerald-50",
      accentClassName:
        "hover:border-emerald-200 data-[active=true]:border-emerald-300 data-[active=true]:bg-emerald-50/60",
    },
    {
      id: "available-units",
      label: "Available Units",
      value: metrics.available_units,
      icon: MapPin,
      iconClassName: "text-amber-600 bg-amber-50",
      accentClassName:
        "hover:border-amber-200 data-[active=true]:border-amber-300 data-[active=true]:bg-amber-50/60",
    },
    {
      id: "site-visits",
      label: "Site Visits (7d)",
      value: metrics.site_visits_this_week,
      icon: CalendarCheck,
      iconClassName: "text-blue-600 bg-blue-50",
      accentClassName:
        "hover:border-blue-200 data-[active=true]:border-blue-300 data-[active=true]:bg-blue-50/60",
    },
  ]
}

export function ProjectsSummary({
  metrics,
  isLoading = false,
  onFilterByMetric,
  activeMetricFilter,
}: ProjectsSummaryProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse border-slate-200/80">
            <CardContent className="h-20 p-4" />
          </Card>
        ))}
      </div>
    )
  }

  const items = buildMetrics(metrics)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Project overview</p>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs text-muted-foreground"
          onClick={() => setCollapsed((prev) => !prev)}
        >
          {collapsed ? (
            <>
              Show <ChevronDown className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Hide <ChevronUp className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>

      {!collapsed ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {items.map((metric) => {
            const Icon = metric.icon
            const isActive = activeMetricFilter === metric.id

            return (
              <Card
                key={metric.id}
                data-active={isActive}
                className={cn(
                  "cursor-pointer border-slate-200/80 transition-colors",
                  metric.accentClassName,
                  !onFilterByMetric && "cursor-default",
                )}
                onClick={() => onFilterByMetric?.(metric.id)}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      metric.iconClassName,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">{metric.label}</p>
                    <p className="text-xl font-semibold tabular-nums">{metric.value}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
