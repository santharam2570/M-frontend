"use client"

import { useEffect, useState } from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export interface BarChartItem {
  label: string
  value: number
}

interface AnimatedBarChartProps {
  data: BarChartItem[]
  className?: string
  barColor?: string
  animationDurationMs?: number
}

export function AnimatedBarChart({
  data,
  className,
  barColor = "var(--primary)",
  animationDurationMs = 1200,
}: AnimatedBarChartProps) {
  const [progress, setProgress] = useState(0)
  const maxValue = Math.max(...data.map((item) => item.value), 1)

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
    <div className={cn("flex h-[280px] items-end gap-3 sm:gap-4", className)}>
      {data.map((item, index) => {
        const heightPercent = (item.value / maxValue) * 100 * progress

        return (
          <div
            key={item.label}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="flex w-full min-w-0 flex-1 flex-col items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label={`${item.label}: ${item.value.toLocaleString("en-IN")}`}
                >
                  <span
                    className="text-xs font-semibold tabular-nums text-foreground"
                    style={{
                      opacity: progress,
                      transform: `translateY(${(1 - progress) * 6}px)`,
                      transitionDelay: `${index * 60}ms`,
                    }}
                  >
                    {Math.round(item.value * progress).toLocaleString("en-IN")}
                  </span>

                  <div className="relative flex h-[200px] w-full items-end justify-center">
                    <div
                      className="w-full max-w-12 rounded-t-md shadow-sm transition-opacity hover:opacity-85"
                      style={{
                        height: `${heightPercent}%`,
                        backgroundColor: barColor,
                        transformOrigin: "bottom",
                        transition: "height 80ms linear, opacity 150ms ease",
                        boxShadow:
                          "0 8px 20px -10px color-mix(in srgb, var(--primary) 60%, transparent)",
                      }}
                    />
                  </div>

                  <span className="line-clamp-2 text-center text-[11px] font-medium leading-tight text-muted-foreground">
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
                  <p className="text-background/80 tabular-nums">
                    {Math.round((item.value / maxValue) * 100)}% of peak stage
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        )
      })}
    </div>
  )
}
