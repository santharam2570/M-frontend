"use client"

import { useEffect, useMemo, useState } from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export interface BarChartItem {
  label: string
  value: number
  color?: string
}

interface AnimatedBarChartProps {
  data: BarChartItem[]
  className?: string
  yAxisMax?: number
  animationDurationMs?: number
}

const DEFAULT_BAR_COLORS = [
  "#3b82f6",
  "#14b8a6",
  "#ec4899",
  "#f97316",
  "#eab308",
]

const CHART_HEIGHT = 210

export function AnimatedBarChart({
  data,
  className,
  yAxisMax,
  animationDurationMs = 1200,
}: AnimatedBarChartProps) {
  const [progress, setProgress] = useState(0)
  const maxValue = yAxisMax ?? Math.max(...data.map((item) => item.value), 1)
  const yTicks = useMemo(() => [0, 50, 100, 150].filter((tick) => tick <= maxValue), [maxValue])

  useEffect(() => {
    let frame = 0
    const start = performance.now()

    const animate = (now: number) => {
      const elapsed = now - start
      const nextProgress = Math.min(elapsed / animationDurationMs, 1)
      setProgress(nextProgress)

      if (nextProgress < 1) {
        frame = requestAnimationFrame(animate)
      }
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [animationDurationMs, data])

  return (
    <div className={cn("w-full", className)}>
      <div className="flex gap-2 sm:gap-3">
        <div
          className="flex w-7 shrink-0 flex-col justify-between text-right text-[11px] font-medium tabular-nums text-muted-foreground"
          style={{ height: CHART_HEIGHT + 52 }}
        >
          {[...yTicks].reverse().map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div
            className="pointer-events-none absolute inset-x-0"
            style={{ top: 20, height: CHART_HEIGHT }}
          >
            {yTicks
              .filter((tick) => tick > 0)
              .map((tick) => (
                <div
                  key={tick}
                  className="absolute left-0 right-0 border-t border-dashed border-border/80"
                  style={{ bottom: `${(tick / maxValue) * 100}%` }}
                  aria-hidden
                />
              ))}
          </div>

          <div className="flex items-end gap-2 sm:gap-3" style={{ height: CHART_HEIGHT + 52 }}>
            {data.map((item, index) => {
              const barColor =
                item.color ?? DEFAULT_BAR_COLORS[index % DEFAULT_BAR_COLORS.length]
              const heightPercent = (item.value / maxValue) * 100 * progress

              return (
                <div
                  key={item.label}
                  className="relative z-10 flex min-w-0 flex-1 flex-col items-center"
                  style={{ height: CHART_HEIGHT + 52 }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="flex h-full w-full min-w-0 flex-col items-center justify-end gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        aria-label={`${item.label}: ${item.value.toLocaleString("en-IN")}`}
                      >
                        <span
                          className="text-xs font-semibold tabular-nums text-foreground"
                          style={{
                            opacity: progress,
                            transform: `translateY(${(1 - progress) * 4}px)`,
                            transitionDelay: `${index * 60}ms`,
                          }}
                        >
                          {Math.round(item.value * progress).toLocaleString("en-IN")}
                        </span>

                        <div
                          className="flex w-full items-end justify-center px-0.5"
                          style={{ height: CHART_HEIGHT }}
                        >
                          <div
                            className="w-full max-w-[42px] rounded-t-lg transition-opacity hover:opacity-90 sm:max-w-[48px]"
                            style={{
                              height: `${heightPercent}%`,
                              minHeight: item.value > 0 && progress > 0 ? "4px" : "0",
                              backgroundColor: barColor,
                              boxShadow: `0 6px 16px -8px ${barColor}99`,
                            }}
                          />
                        </div>

                        <span className="line-clamp-2 min-h-[28px] text-center text-[11px] font-medium leading-tight text-muted-foreground">
                          {item.label}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={8}>
                      <div className="space-y-0.5 text-center">
                        <p className="font-medium">{item.label}</p>
                        <p className="tabular-nums">
                          {item.value.toLocaleString("en-IN")} leads
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
