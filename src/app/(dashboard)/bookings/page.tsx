"use client"

import { BookingsContent } from "@/components/booking-list-page/bookings-content"
import { DashboardPageLayout } from "@/components/layout/dashboard-page-layout"

export default function BookingsPage() {
  return (
    <DashboardPageLayout className="flex min-h-0 w-full flex-1">
      <BookingsContent />
    </DashboardPageLayout>
  )
}
