"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"
import type { FunnelStage } from "@/lib/reports/types"

interface SalesFunnelChartProps {
  stages: FunnelStage[]
  className?: string
}

export function SalesFunnelChart({ stages, className }: SalesFunnelChartProps) {
  const [progress, setProgress] = useState(0)
  const maxValue = Math.max(...stages.map((stage) => stage.value), 1)
  const total = stages.reduce((sum, stage) => sum + stage.value, 0)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setProgress(1))
    return () => cancelAnimationFrame(frame)
  }, [stages])

  return (
    <div className={cn("space-y-4", className)}>
      {stages.map((stage, index) => {
        const widthPercent = (stage.value / maxValue) * 100 * progress
        const sharePercent = total > 0 ? Math.round((stage.value / total) * 100) : 0
        const dropOff =
          index > 0 && stages[index - 1].value > 0
            ? Math.round(
                ((stages[index - 1].value - stage.value) / stages[index - 1].value) * 100,
              )
            : null

        return (
          <div key={stage.id} className="space-y-1.5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="truncate font-medium">{stage.label}</span>
                {dropOff != null && dropOff > 0 ? (
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                    −{dropOff}% drop
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2 pl-4 tabular-nums sm:pl-0">
                <span className="text-sm font-bold sm:text-base">
                  {stage.value.toLocaleString("en-IN")}
                </span>
                <span className="text-xs text-muted-foreground">({sharePercent}%)</span>
              </div>
            </div>

            <div className="relative h-8 overflow-hidden rounded-lg bg-muted/60 sm:h-9">
              <div
                className="absolute inset-y-0 left-0 flex items-center rounded-lg px-3 transition-all duration-700 ease-out"
                style={{
                  width: `${Math.max(widthPercent, stage.value > 0 ? 8 : 0)}%`,
                  backgroundColor: stage.color,
                  opacity: 0.9,
                }}
              >
                {widthPercent > 20 ? (
                  <span className="truncate text-xs font-semibold text-white">
                    {stage.value.toLocaleString("en-IN")} leads
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        )
      })}

      {total === 0 ? (
        <p className="pt-4 text-center text-sm text-muted-foreground">
          No funnel data for the selected filters.
        </p>
      ) : null}
    </div>
  )
}
