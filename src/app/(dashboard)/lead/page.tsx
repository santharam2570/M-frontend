"use client"

import { LeadsContent } from "@/components/lead-list-page/leads-content"
import { DashboardPageLayout } from "@/components/layout/dashboard-page-layout"

export default function LeadsPage() {
  return (
    <DashboardPageLayout className="flex min-h-0 w-full flex-1">
      <LeadsContent />
    </DashboardPageLayout>
  )
}
