"use client"

import { CalendarView } from "@/components/calendar-page/calendar-view"
import { DashboardPageLayout } from "@/components/layout/dashboard-page-layout"

export default function CalendarPage() {
  return (
    <DashboardPageLayout className="flex min-h-0 w-full flex-1">
      <CalendarView />
    </DashboardPageLayout>
  )
}
