"use client"

import {
  BarChart3,
  Bookmark,
  IndianRupee,
  PhoneCall,
  UserPlus,
  Users,
} from "lucide-react"

import { AnimatedBarChart } from "@/components/dashboard-page/animated-bar-chart"
import { AnimatedDonutChart } from "@/components/dashboard-page/animated-donut-chart"
import { DashboardPageLayout } from "@/components/layout/dashboard-page-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const dashboardMetrics = [
  {
    id: "new-leads",
    label: "New Leads",
    value: 120,
    icon: UserPlus,
    iconClassName: "text-blue-600 bg-blue-50",
    accentClassName: "hover:border-blue-200",
  },
  {
    id: "calls-made",
    label: "Calls Made",
    value: 85,
    icon: PhoneCall,
    iconClassName: "text-violet-600 bg-violet-50",
    accentClassName: "hover:border-violet-200",
  },
  {
    id: "site-visits",
    label: "Site Visits",
    value: 22,
    icon: Users,
    iconClassName: "text-amber-600 bg-amber-50",
    accentClassName: "hover:border-amber-200",
  },
  {
    id: "bookings",
    label: "Bookings",
    value: 6,
    icon: Bookmark,
    iconClassName: "text-emerald-600 bg-emerald-50",
    accentClassName: "hover:border-emerald-200",
  },
  {
    id: "revenue",
    label: "Revenue",
    value: "₹36.50 L",
    icon: IndianRupee,
    iconClassName: "text-primary bg-primary/10",
    accentClassName: "hover:border-primary/20",
  },
]

const leadsBySource = [
  { label: "Facebook", value: 48, color: "#e53935" },
  { label: "WhatsApp", value: 24, color: "#22c55e" },
  { label: "Referral", value: 24, color: "#eab308" },
  { label: "Website", value: 12, color: "#3b82f6" },
  { label: "Others", value: 12, color: "#f97316" },
]

const pipelineOverview = [
  { label: "New Lead", value: 120 },
  { label: "Contacted", value: 96 },
  { label: "Qualified", value: 65 },
  { label: "Site Visit", value: 34 },
  { label: "Negotiation", value: 28 },
  { label: "Booking", value: 18 },
]

export function DashboardContent() {
  return (
    <DashboardPageLayout className="w-full">
      <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4 md:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold md:text-2xl">
              <BarChart3 className="h-6 w-6 text-primary" />
              Reporting Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Live overview of leads, pipeline, and revenue performance
            </p>
          </div>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
          {dashboardMetrics.map((metric) => {
            const Icon = metric.icon

            return (
              <Card
                key={metric.id}
                className={cn(
                  "min-h-[104px] border shadow-sm transition-all duration-200 hover:shadow-md",
                  metric.accentClassName,
                )}
              >
                <CardContent className="flex h-full items-center px-4 py-5">
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {metric.label}
                      </p>
                      <p
                        className={cn(
                          "mt-2 text-3xl font-bold tabular-nums leading-none tracking-tight",
                          metric.id === "revenue" && "text-2xl",
                        )}
                      >
                        {typeof metric.value === "number"
                          ? metric.value.toLocaleString("en-IN")
                          : metric.value}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
                        metric.iconClassName,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card className="border shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-semibold">Leads by Source</CardTitle>
            </CardHeader>
            <CardContent className="py-8">
              <AnimatedDonutChart data={leadsBySource} size={320} strokeWidth={40} />
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-semibold">Pipeline Overview</CardTitle>
            </CardHeader>
            <CardContent className="py-6">
              <AnimatedBarChart data={pipelineOverview} />
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardPageLayout>
  )
}
