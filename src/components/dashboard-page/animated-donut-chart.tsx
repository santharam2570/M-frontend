"use client"

import { useEffect, useMemo, useState } from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export interface DonutSegment {
  label: string
  value: number
  color: string
}

interface AnimatedDonutChartProps {
  data: DonutSegment[]
  className?: string
  size?: number
  strokeWidth?: number
  animationDurationMs?: number
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleInDegrees: number,
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  }
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1

  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ")
}

export function AnimatedDonutChart({
  data,
  className,
  size = 320,
  strokeWidth = 40,
  animationDurationMs = 1200,
}: AnimatedDonutChartProps) {
  const [progress, setProgress] = useState(0)
  const isLarge = size >= 300
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const radius = (size - strokeWidth) / 2
  const center = size / 2

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

  const segments = useMemo(() => {
    let angle = 0

    return data.map((segment) => {
      const segmentAngle = total > 0 ? (segment.value / total) * 360 : 0
      const startAngle = angle
      angle += segmentAngle

      return {
        ...segment,
        segmentAngle,
        startAngle,
        percentage: total > 0 ? Math.round((segment.value / total) * 100) : 0,
      }
    })
  }, [data, total])

  return (
    <div className={cn("flex flex-col items-center", isLarge ? "gap-8" : "gap-5", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/50"
          />
          {segments.map((segment) => {
            const animatedAngle = segment.segmentAngle * progress

            if (animatedAngle <= 0) return null

            const endAngle = segment.startAngle + animatedAngle

            return (
              <Tooltip key={segment.label}>
                <TooltipTrigger asChild>
                  <g className="cursor-pointer outline-none">
                    <path
                      d={describeArc(center, center, radius, segment.startAngle, endAngle)}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={strokeWidth + 16}
                      strokeLinecap="butt"
                      style={{ opacity: progress > 0 ? 1 : 0 }}
                    />
                    <path
                      d={describeArc(center, center, radius, segment.startAngle, endAngle)}
                      fill="none"
                      stroke={segment.color}
                      strokeWidth={strokeWidth}
                      strokeLinecap="butt"
                      className="pointer-events-none transition-opacity duration-300"
                      style={{
                        opacity: progress > 0 ? 1 : 0,
                      }}
                    />
                  </g>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  <div className="space-y-0.5 text-center">
                    <p className="font-medium">{segment.label}</p>
                    <p className="tabular-nums">
                      {segment.value.toLocaleString("en-IN")} leads ({segment.percentage}%)
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p
            className={cn(
              "font-bold tabular-nums text-primary",
              isLarge ? "text-4xl" : "text-3xl",
            )}
          >
            {Math.round(total * progress).toLocaleString("en-IN")}
          </p>
          <p
            className={cn(
              "font-medium uppercase tracking-wide text-muted-foreground",
              isLarge ? "text-sm" : "text-xs",
            )}
          >
            Total Leads
          </p>
        </div>
      </div>

      <div
        className={cn(
          "grid w-full gap-x-5 gap-y-3",
          isLarge ? "grid-cols-2 text-base sm:grid-cols-3" : "grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3",
        )}
      >
        {segments.map((segment, index) => (
          <Tooltip key={segment.label}>
            <TooltipTrigger asChild>
              <div
                className="flex cursor-default items-center gap-2 rounded-md px-1 py-0.5 text-sm transition-colors hover:bg-muted/60"
                style={{
                  opacity: progress,
                  transform: `translateY(${(1 - progress) * 8}px)`,
                  transitionDelay: `${index * 80}ms`,
                }}
              >
                <span
                  className={cn(
                    "shrink-0 rounded-full",
                    isLarge ? "h-3 w-3" : "h-2.5 w-2.5",
                  )}
                  style={{ backgroundColor: segment.color }}
                />
                <span className="truncate text-muted-foreground">{segment.label}</span>
                <span className="ml-auto font-semibold tabular-nums">{segment.percentage}%</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              <p className="font-medium">{segment.label}</p>
              <p className="tabular-nums">
                {segment.value.toLocaleString("en-IN")} leads · {segment.percentage}% of total
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  )
}
