"use client"

import { AlertTriangle, Medal, Sparkles } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { AttentionAlert, TopPerformer } from "@/lib/reports/types"

const MEDAL_COLORS = ["text-amber-500", "text-slate-400", "text-amber-700"]

const SEVERITY_STYLES: Record<
  AttentionAlert["severity"],
  { dot: string; border: string }
> = {
  high: { dot: "bg-red-500", border: "border-red-200 bg-red-50/50" },
  medium: { dot: "bg-amber-500", border: "border-amber-200 bg-amber-50/50" },
  low: { dot: "bg-blue-500", border: "border-blue-200 bg-blue-50/50" },
}

interface ReportsInsightsPanelProps {
  topPerformers: TopPerformer[]
  attentionAlerts: AttentionAlert[]
  onFocusBranch?: (branchId: string) => void
  isLoading?: boolean
}

export function ReportsInsightsPanel({
  topPerformers,
  attentionAlerts,
  onFocusBranch,
  isLoading = false,
}: ReportsInsightsPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card className="border shadow-sm">
        <CardHeader className="border-b px-3 pb-3 pt-4 sm:px-6 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold sm:text-base">
            <Medal className="h-4 w-4 shrink-0 text-amber-500" />
            Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-3 sm:p-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : topPerformers.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Performance rankings will appear once activity is recorded.
            </p>
          ) : (
            <div className="max-h-[280px] overflow-y-auto overscroll-y-contain sm:max-h-[320px]">
              <ul className="divide-y">
                {topPerformers.map((performer, index) => (
                  <li
                    key={performer.id}
                    className="flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-muted/40 sm:gap-3 sm:px-4 sm:py-3"
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold",
                        index < 3 && MEDAL_COLORS[index],
                      )}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{performer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {performer.roleLabel}
                        {performer.branchName ? ` · ${performer.branchName}` : ""}
                      </p>
                    </div>
                    <div className="text-right text-xs tabular-nums">
                      <p className="font-bold text-primary">{performer.score} pts</p>
                      <p className="text-muted-foreground">
                        {performer.bookings}B · {performer.convertedLeads}C
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader className="border-b px-3 pb-3 pt-4 sm:px-6 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold sm:text-base">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            Needs Attention
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-3 sm:p-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : attentionAlerts.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-6 text-center">
              <div className="rounded-full bg-emerald-50 p-3 text-emerald-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium">All branches look healthy</p>
              <p className="text-xs text-muted-foreground">
                No critical alerts based on current conversion and booking data.
              </p>
            </div>
          ) : (
            <div className="max-h-[280px] overflow-y-auto overscroll-y-contain sm:max-h-[320px]">
              <ul className="space-y-2 p-3 sm:p-4">
                {attentionAlerts.map((alert) => {
                  const style = SEVERITY_STYLES[alert.severity]
                  return (
                    <li key={alert.id}>
                      <button
                        type="button"
                        disabled={!alert.branchId || !onFocusBranch}
                        onClick={() => alert.branchId && onFocusBranch?.(alert.branchId)}
                        className={cn(
                          "w-full rounded-lg border p-3 text-left transition-colors",
                          style.border,
                          alert.branchId && onFocusBranch && "hover:opacity-90 cursor-pointer",
                          !alert.branchId && "cursor-default",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", style.dot)} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{alert.title}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {alert.description}
                            </p>
                            {alert.branchId && onFocusBranch ? (
                              <p className="mt-1 text-[10px] font-medium text-primary">
                                Click to focus this branch
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
