"use client"

import ProjectDetailPage from "@/components/project-detail-page/project-detail-page"
import { DashboardPageLayout } from "@/components/layout/dashboard-page-layout"

export default function ProjectDetailRoutePage() {
  return (
    <DashboardPageLayout className="flex min-h-0 w-full flex-1">
      <ProjectDetailPage />
    </DashboardPageLayout>
  )
}
