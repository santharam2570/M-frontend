"use client"

import type { ReactNode } from "react"

interface DashboardPageLayoutProps {
  children: ReactNode
  className?: string
}

/**
 * Thin content wrapper for dashboard pages.
 *
 * The persistent app chrome (sidebar, header, theme/notification providers,
 * toaster and global dialogs) lives in `src/app/(dashboard)/layout.tsx` so it
 * survives client-side navigations. This wrapper only provides the per-page
 * content sizing so navigating between pages no longer remounts the chrome.
 */
export function DashboardPageLayout({
  children,
  className = "",
}: DashboardPageLayoutProps) {
  return (
    <div className={`flex h-full min-h-0 w-full flex-1 flex-col ${className}`}>
      {children}
    </div>
  )
}
