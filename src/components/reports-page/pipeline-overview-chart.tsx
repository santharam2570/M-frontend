"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, Layers, TrendingUp } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { BarChartItem } from "@/components/reports-page/animated-bar-chart"

const STAGE_COLORS = [
  "#003399",
  "#1d4ed8",
  "#2563eb",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#64748b",
  "#78716c",
  "#94a3b8",
  "#475569",
]

interface PipelineOverviewChartProps {
  data: BarChartItem[]
  className?: string
}

function getStageColor(index: number): string {
  return STAGE_COLORS[index % STAGE_COLORS.length]
}

export function PipelineOverviewChart({ data, className }: PipelineOverviewChartProps) {
  const [progress, setProgress] = useState(0)

  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data])
  const maxValue = useMemo(() => Math.max(...data.map((item) => item.value), 1), [data])
  const topStage = useMemo(
    () => [...data].sort((a, b) => b.value - a.value)[0],
    [data],
  )

  useEffect(() => {
    const frame = requestAnimationFrame(() => setProgress(1))
    return () => cancelAnimationFrame(frame)
  }, [data])

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No pipeline data for the selected filters.
      </p>
    )
  }

  return (
    <div className={cn("space-y-4 sm:space-y-5", className)}>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
        {[
          {
            icon: Layers,
            label: "In Pipeline",
            value: total.toLocaleString("en-IN"),
            accent: "from-[#003399]/10 to-[#003399]/5 text-[#003399]",
            span: "",
          },
          {
            icon: Activity,
            label: "Active Stages",
            value: String(data.length),
            accent: "from-violet-500/10 to-violet-500/5 text-violet-700",
            span: "",
          },
          {
            icon: TrendingUp,
            label: "Top Stage",
            value: topStage?.label ?? "—",
            accent: "from-emerald-500/10 to-emerald-500/5 text-emerald-700",
            compact: true,
            span: "col-span-2 lg:col-span-1",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={cn(
              "rounded-xl border bg-gradient-to-br px-3 py-2.5 sm:px-3.5 sm:py-3",
              stat.accent,
              stat.span,
            )}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide opacity-80 sm:gap-2 sm:text-xs">
              <stat.icon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
              <span className="truncate">{stat.label}</span>
            </div>
            <p
              className={cn(
                "mt-1 font-bold tabular-nums",
                stat.compact ? "truncate text-xs sm:text-sm" : "text-lg sm:text-xl",
              )}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span className="font-medium uppercase tracking-wide">Pipeline composition</span>
          <span className="tabular-nums">{total.toLocaleString("en-IN")} total</span>
        </div>
        <div className="overflow-x-auto pb-1">
          <div className="flex h-3 min-w-[240px] overflow-hidden rounded-full bg-muted/60 shadow-inner sm:h-4 sm:min-w-0">
          {data.map((item, index) => {
            const share = total > 0 ? (item.value / total) * 100 : 0
            if (share <= 0) return null

            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <div
                    className="h-full transition-all duration-700 ease-out first:rounded-l-full last:rounded-r-full"
                    style={{
                      width: `${share * progress}%`,
                      backgroundColor: getStageColor(index),
                      minWidth: share > 0 ? "4px" : 0,
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="font-medium">{item.label}</p>
                  <p className="tabular-nums">
                    {item.value.toLocaleString("en-IN")} · {Math.round(share)}%
                  </p>
                </TooltipContent>
              </Tooltip>
            )
          })}
          </div>
        </div>
      </div>

      <div className="max-h-[280px] overflow-y-auto overscroll-y-contain pr-1 sm:max-h-[320px]">
        <div className="relative space-y-0">
          {data.map((item, index) => {
            const color = getStageColor(index)
            const widthPercent = (item.value / maxValue) * 100 * progress
            const sharePercent = total > 0 ? Math.round((item.value / total) * 100) : 0
            const isLast = index === data.length - 1

            return (
              <div key={item.label} className="relative flex gap-2 pb-1 sm:gap-3">
                <div className="flex w-6 shrink-0 flex-col items-center sm:w-8">
                  <div
                    className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md ring-2 ring-background sm:h-8 sm:w-8 sm:text-[11px] sm:ring-4"
                    style={{ backgroundColor: color }}
                  >
                    {index + 1}
                  </div>
                  {!isLast ? (
                    <div
                      className="mt-1 w-0.5 flex-1 min-h-[20px] rounded-full sm:min-h-[24px]"
                      style={{
                        background: `linear-gradient(to bottom, ${color}, ${getStageColor(index + 1)}40)`,
                      }}
                    />
                  ) : null}
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="group mb-2 min-w-0 flex-1 rounded-xl border bg-card p-2.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:mb-3 sm:p-3"
                      style={{
                        opacity: progress,
                        transform: `translateX(${(1 - progress) * 12}px)`,
                        transitionDelay: `${index * 35}ms`,
                      }}
                    >
                      <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold sm:text-base">{item.label}</p>
                          <p className="text-[11px] text-muted-foreground sm:text-xs">
                            {sharePercent}% of pipeline volume
                          </p>
                        </div>
                        <div className="flex shrink-0 items-baseline gap-1.5 sm:block sm:text-right">
                          <p className="text-base font-bold tabular-nums sm:text-lg" style={{ color }}>
                            {Math.round(item.value * progress).toLocaleString("en-IN")}
                          </p>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            leads
                          </p>
                        </div>
                      </div>

                      <div className="relative h-2.5 overflow-hidden rounded-full bg-muted/70">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${Math.max(widthPercent, item.value > 0 ? 6 : 0)}%`,
                            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                            boxShadow: `0 0 12px ${color}55`,
                          }}
                        />
                      </div>

                      <div
                        className="mt-2 h-0.5 w-full rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                        }}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8} className="max-w-[240px]">
                    <p className="font-medium">{item.label}</p>
                    <p className="tabular-nums">
                      {item.value.toLocaleString("en-IN")} leads
                    </p>
                    <p className="text-background/80 tabular-nums">
                      {sharePercent}% share · {Math.round((item.value / maxValue) * 100)}% of peak
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
