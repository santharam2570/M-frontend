"use client"

import LeadDetailPage from "@/components/lead-detail-page/lead-detail-page"
import { DashboardPageLayout } from "@/components/layout/dashboard-page-layout"

export default function LeadDetailRoutePage() {
  return (
    <DashboardPageLayout className="flex min-h-0 w-full flex-1">
      <LeadDetailPage />
    </DashboardPageLayout>
  )
}
