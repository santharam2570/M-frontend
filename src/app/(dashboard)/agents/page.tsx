"use client"

import { AgentsContent } from "@/components/agent-list-page/agents-content"
import { DashboardPageLayout } from "@/components/layout/dashboard-page-layout"

export default function AgentsPage() {
  return (
    <DashboardPageLayout className="flex min-h-0 w-full flex-1">
      <AgentsContent />
    </DashboardPageLayout>
  )
}
