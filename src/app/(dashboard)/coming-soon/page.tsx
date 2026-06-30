"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

import { ComingSoon } from "@/components/coming-soon"
import { DashboardPageLayout } from "@/components/layout/dashboard-page-layout"

const moduleNames: Record<string, string> = {
  dashboard: "Dashboard",
  documents: "Documents",
  reports: "Reports",
  agents: "Agents",
  "settings-trash": "Trash",
  "settings-reporting-hierarchy": "Reporting Hierarchy",
}

function formatModuleName(key: string): string {
  if (!key) return "This Module"

  return key
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function ComingSoonContent() {
  const searchParams = useSearchParams()
  const moduleKey = searchParams.get("module") ?? ""
  const moduleName = moduleNames[moduleKey] ?? formatModuleName(moduleKey)

  return (
    <DashboardPageLayout className="w-full">
      <ComingSoon moduleName={moduleName} />
    </DashboardPageLayout>
  )
}

export default function ComingSoonPage() {
  return (
    <Suspense fallback={null}>
      <ComingSoonContent />
    </Suspense>
  )
}
