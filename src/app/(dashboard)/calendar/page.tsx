"use client"

import { useEffect, useState } from "react"

import { CalendarView } from "@/components/calendar-page/calendar-view"
import { DashboardPageLayout } from "@/components/layout/dashboard-page-layout"

export default function CalendarPage() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return null
  }

  return (
    <DashboardPageLayout className="w-full">
      <CalendarView />
    </DashboardPageLayout>
  )
}
