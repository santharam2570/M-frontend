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
  size = 220,
  strokeWidth = 32,
  animationDurationMs = 1200,
}: AnimatedDonutChartProps) {
  const [progress, setProgress] = useState(0)
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const labelPadding = 28
  const canvasSize = size + labelPadding * 2
  const center = canvasSize / 2
  const radius = (size - strokeWidth) / 2
  const labelRadius = radius + strokeWidth / 2 + 14

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
      const midAngle = startAngle + segmentAngle / 2
      const labelPosition = polarToCartesian(center, center, labelRadius, midAngle)

      return {
        ...segment,
        segmentAngle,
        startAngle,
        labelPosition,
        percentage: total > 0 ? ((segment.value / total) * 100).toFixed(1) : "0.0",
      }
    })
  }, [center, data, labelRadius, total])

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-8 lg:flex-row lg:items-center lg:gap-10 xl:gap-14",
        className,
      )}
    >
      <div
        className="relative shrink-0 overflow-visible"
        style={{ width: canvasSize, height: canvasSize }}
      >
        <svg
          width={canvasSize}
          height={canvasSize}
          viewBox={`0 0 ${canvasSize} ${canvasSize}`}
          className="overflow-visible"
        >
          <g className="rotate-[-90deg]" style={{ transformOrigin: `${center}px ${center}px` }}>
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-muted/35"
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
                        strokeWidth={strokeWidth + 14}
                        strokeLinecap="butt"
                      />
                      <path
                        d={describeArc(center, center, radius, segment.startAngle, endAngle)}
                        fill="none"
                        stroke={segment.color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="butt"
                        style={{ opacity: progress > 0 ? 1 : 0 }}
                      />
                    </g>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8}>
                    <div className="space-y-0.5 text-center">
                      <p className="font-medium">{segment.label}</p>
                      <p className="tabular-nums">
                        {segment.percentage}% of total leads
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </g>
        </svg>

        {segments.map((segment) => (
          <span
            key={`${segment.label}-label`}
            className="pointer-events-none absolute text-[10px] font-semibold tabular-nums text-foreground sm:text-[11px]"
            style={{
              left: segment.labelPosition.x,
              top: segment.labelPosition.y,
              transform: "translate(-50%, -50%)",
              opacity: progress,
            }}
          >
            {segment.percentage}%
          </span>
        ))}
      </div>

      <div className="flex w-full max-w-[240px] flex-col justify-center gap-3.5 lg:max-w-[200px] lg:gap-4">
        {segments.map((segment, index) => (
          <Tooltip key={segment.label}>
            <TooltipTrigger asChild>
              <div
                className="flex items-center gap-3 text-sm"
                style={{
                  opacity: progress,
                  transform: `translateX(${(1 - progress) * 6}px)`,
                  transitionDelay: `${index * 70}ms`,
                }}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {segment.label}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-foreground">
                  {segment.percentage}%
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={6}>
              <p className="font-medium">{segment.label}</p>
              <p className="tabular-nums">{segment.percentage}% of total leads</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  )
}
