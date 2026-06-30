"use client"

import { ComingSoon } from "@/components/coming-soon"
import { DashboardPageLayout } from "@/components/layout/dashboard-page-layout"

interface EntityListPageProps {
  title: string
  moduleName: string
}

export function EntityListPage({ title, moduleName }: EntityListPageProps) {
  return (
    <DashboardPageLayout className="w-full">
      <ComingSoon moduleName={moduleName || title} />
    </DashboardPageLayout>
  )
}
