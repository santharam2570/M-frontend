"use client"

import { Crown, TrendingUp } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { BranchCommandCard } from "@/lib/reports/types"

const STATUS_STYLES: Record<
  BranchCommandCard["statusLabel"],
  { label: string; className: string }
> = {
  excellent: { label: "Excellent", className: "bg-emerald-500/15 text-emerald-700" },
  healthy: { label: "Healthy", className: "bg-blue-500/15 text-blue-700" },
  watch: { label: "Watch", className: "bg-amber-500/15 text-amber-700" },
  critical: { label: "Critical", className: "bg-red-500/15 text-red-700" },
}

function formatIndianCurrency(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  return `₹${amount.toLocaleString("en-IN")}`
}

interface BranchCommandGridProps {
  branches: BranchCommandCard[]
  selectedBranchId?: string
  onSelectBranch: (branchId: string) => void
  isLoading?: boolean
}

export function BranchCommandGrid({
  branches,
  selectedBranchId,
  onSelectBranch,
  isLoading = false,
}: BranchCommandGridProps) {
  if (isLoading) {
    return (
      <div className="max-h-[364px] overflow-y-auto overscroll-y-contain pr-1">
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} className="h-[176px] animate-pulse bg-muted/40" />
          ))}
        </div>
      </div>
    )
  }

  if (branches.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex min-h-[120px] items-center justify-center text-sm text-muted-foreground">
          No branch performance data available yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-h-[364px] overflow-y-auto overscroll-y-contain pr-1">
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {branches.map((branch) => {
          const isSelected = selectedBranchId === branch.id
          const status = STATUS_STYLES[branch.statusLabel]

          return (
            <button
              key={branch.id}
              type="button"
              onClick={() => onSelectBranch(branch.id)}
              className={cn(
                "group relative min-h-[176px] overflow-hidden rounded-xl border bg-card p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                isSelected && "border-primary ring-2 ring-primary/20",
              )}
            >
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{ backgroundColor: branch.accentColor }}
            />

            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {branch.rank === 1 ? (
                    <Crown className="h-4 w-4 shrink-0 text-amber-500" />
                  ) : (
                    <span className="text-xs font-bold tabular-nums text-muted-foreground">
                      #{branch.rank}
                    </span>
                  )}
                  <p className="truncate font-semibold">{branch.name}</p>
                </div>
                <span
                  className={cn(
                    "mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    status.className,
                  )}
                >
                  {status.label}
                </span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums text-primary">
                  {branch.healthScore}
                </p>
                <p className="text-[10px] text-muted-foreground">score</p>
              </div>
            </div>

            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${branch.healthScore}%`,
                  backgroundColor: branch.accentColor,
                }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="font-bold tabular-nums">{branch.leads}</p>
                <p className="text-muted-foreground">Leads</p>
              </div>
              <div>
                <p className="font-bold tabular-nums">{branch.bookings}</p>
                <p className="text-muted-foreground">Bookings</p>
              </div>
              <div>
                <p className="flex items-center justify-center gap-0.5 font-bold tabular-nums">
                  <TrendingUp className="h-3 w-3 text-emerald-600" />
                  {branch.conversionRate}%
                </p>
                <p className="text-muted-foreground">Conv.</p>
              </div>
            </div>

            <p className="mt-2 text-center text-[11px] font-medium text-muted-foreground">
              {formatIndianCurrency(branch.revenue)} revenue
            </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
