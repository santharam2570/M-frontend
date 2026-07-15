"use client"

import { DashboardPageLayout } from "@/components/layout/dashboard-page-layout"
import { ProfileSettingsTabs } from "@/components/profile/profile-settings-tabs"

export default function ProfilePage() {
  return (
    <DashboardPageLayout className="overflow-y-auto">
      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        <ProfileSettingsTabs />
      </div>
    </DashboardPageLayout>
  )
}
