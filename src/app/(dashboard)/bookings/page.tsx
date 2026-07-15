"use client"

import { Suspense } from "react"

import { BookingsContent } from "@/components/booking-list-page/bookings-content"
import { DashboardPageLayout } from "@/components/layout/dashboard-page-layout"

export default function BookingsPage() {
  return (
    <DashboardPageLayout className="flex min-h-0 w-full flex-1">
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Loading bookings…
          </div>
        }
      >
        <BookingsContent />
      </Suspense>
    </DashboardPageLayout>
  )
}
