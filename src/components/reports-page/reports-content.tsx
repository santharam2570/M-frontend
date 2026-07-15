"use client"

import { Shield } from "lucide-react"

import { SuperAdminReports } from "@/components/reports-page/super-admin-reports"
import { DashboardPageLayout } from "@/components/layout/dashboard-page-layout"
import { Card, CardContent } from "@/components/ui/card"
import { useReportsPermissions } from "@/hooks/useReportsPermissions"

export function ReportsContent() {
  const { canViewReports, isPermissionResolved } = useReportsPermissions()

  if (isPermissionResolved && !canViewReports) {
    return (
      <DashboardPageLayout className="w-full">
        <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4 md:p-6">
          <Card className="border-none shadow-sm">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Shield className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Access restricted</p>
                <p className="text-sm text-muted-foreground">
                  You don&apos;t have permission to view reports. Ask an admin to enable the Reports
                  permission for your role.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardPageLayout>
    )
  }

  return <SuperAdminReports />
}
