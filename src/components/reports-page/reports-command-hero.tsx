"use client"

import { useEffect, useState } from "react"
import { Activity, Building2, IndianRupee, Users } from "lucide-react"

import { BRAND_NAME } from "@/config/brand"
import { cn } from "@/lib/utils"
import type { ReportsSummary } from "@/lib/reports/types"

function formatIndianCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`
  return `₹${amount.toLocaleString("en-IN")}`
}

function getHealthStatus(score: number) {
  if (score >= 80) return { label: "Excellent", className: "bg-emerald-400/20 text-emerald-200" }
  if (score >= 60) return { label: "Good", className: "bg-amber-400/20 text-amber-200" }
  if (score >= 35) return { label: "Fair", className: "bg-orange-400/20 text-orange-200" }
  return { label: "Critical", className: "bg-red-400/20 text-red-200" }
}

function HealthRing({ score, size = 112 }: { score: number; size?: number }) {
  const [progress, setProgress] = useState(0)
  const stroke = Math.max(9, Math.round(size * 0.09))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  useEffect(() => {
    const frame = requestAnimationFrame(() => setProgress(score))
    return () => cancelAnimationFrame(frame)
  }, [score])

  const ringColor =
    score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : score >= 35 ? "#fb923c" : "#f87171"

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-3xl font-bold tabular-nums leading-none tracking-tight">
          {Math.round(progress)}
        </span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-white/65">
          / 100
        </span>
      </div>
    </div>
  )
}

interface ReportsCommandHeroProps {
  summary: ReportsSummary
  orgHealthScore: number
  isLoading?: boolean
}

export function ReportsCommandHero({
  summary,
  orgHealthScore,
  isLoading = false,
}: ReportsCommandHeroProps) {
  const teamSize = summary.totalAdmins + summary.totalManagers + summary.totalUsers
  const healthStatus = getHealthStatus(isLoading ? 0 : orgHealthScore)

  return (
    <section className="relative mb-6 shrink-0 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-[#003399] via-[#0047b3] to-[#1e5fbf] text-white shadow-lg">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative grid grid-cols-1 gap-4 p-4 sm:gap-5 sm:p-5 lg:grid-cols-[1fr_220px] lg:items-stretch lg:gap-6 lg:p-6">
        {/* Left: Organization Pulse */}
        <div className="flex min-w-0 flex-col justify-between gap-4">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55 sm:text-xs">
              {BRAND_NAME} Reports
            </p>
            <h2 className="text-lg font-bold tracking-tight sm:text-xl md:text-2xl">
              Organization Pulse
            </h2>
            <p className="mt-1 max-w-xl text-xs text-white/70 sm:text-sm">
              Real-time health across {summary.totalBranches} branches, {teamSize} team members,
              and {summary.totalProjects} active projects.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
            {[
              { icon: Building2, label: "Branches", value: summary.totalBranches },
              { icon: Users, label: "Team", value: teamSize },
              { icon: Activity, label: "Conv. Rate", value: `${summary.conversionRate}%` },
              {
                icon: IndianRupee,
                label: "Revenue",
                value: formatIndianCurrency(summary.totalRevenue),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/10 bg-white/10 px-2.5 py-2 backdrop-blur-sm sm:px-3 sm:py-2.5"
              >
                <div className="flex items-center gap-1.5 text-white/65">
                  <item.icon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                  <span className="truncate text-[9px] font-medium uppercase tracking-wide sm:text-[10px]">
                    {item.label}
                  </span>
                </div>
                <p
                  className={cn(
                    "mt-1 truncate font-bold tabular-nums text-white",
                    item.label === "Revenue" ? "text-sm sm:text-base" : "text-lg sm:text-xl",
                  )}
                >
                  {isLoading ? "—" : item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Org Health card — compact, content-sized */}
        <div className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-4 py-4 text-center backdrop-blur-sm sm:px-5 sm:py-4 lg:self-stretch">
          <div className="flex w-full items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
              Org Health
            </p>
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                healthStatus.className,
              )}
            >
              {isLoading ? "—" : healthStatus.label}
            </span>
          </div>

          <HealthRing score={isLoading ? 0 : orgHealthScore} size={112} />

          <p className="text-[11px] leading-snug text-white/65">
            Conversion, bookings, leads &amp; revenue
          </p>
        </div>
      </div>
    </section>
  )
}
