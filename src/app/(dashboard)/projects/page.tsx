"use client"

import { ProjectsContent } from "@/components/project-list-page/projects-content"
import { DashboardPageLayout } from "@/components/layout/dashboard-page-layout"

export default function ProjectsPage() {
  return (
    <DashboardPageLayout className="flex min-h-0 w-full flex-1">
      <ProjectsContent />
    </DashboardPageLayout>
  )
}
