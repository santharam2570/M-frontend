"use client"

import * as React from "react"
import type { CSSProperties, ReactNode } from "react"
import dynamic from "next/dynamic"
import { X } from "lucide-react"
import { Toaster } from "sonner"

import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header-layout/header"
import { Button } from "@/components/ui/button"

// These overlays are only needed on demand, so they are split into separate
// client chunks and loaded the first time the user opens them. This keeps the
// initial dashboard bundle smaller and improves time-to-interactive.
const SearchDialog = dynamic(
  () =>
    import("@/components/header-layout/search-dialog").then(
      (mod) => mod.SearchDialog
    ),
  { ssr: false }
)
const Calculator = dynamic(
  () =>
    import("@/components/header-layout/calculator").then(
      (mod) => mod.Calculator
    ),
  { ssr: false }
)
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext"
import { ThemeSync } from "@/components/theme-sync"
import {
  NotificationProvider,
  type Notification,
} from "@/hooks/use-notifications"

function DashboardChrome({ children }: { children: ReactNode }) {
  const { isDarkTheme } = useTheme()
  const [showSearchDialog, setShowSearchDialog] = React.useState(false)
  const [showNotificationsDrawer, setShowNotificationsDrawer] =
    React.useState(false)
  const [showCalculator, setShowCalculator] = React.useState(false)

  const [notifications, setNotifications] = React.useState<Notification[]>([
    {
      id: 1,
      title: "New order received",
      time: "5 min ago",
      read: false,
      type: "success",
    },
    {
      id: 2,
      title: "Payment confirmed",
      time: "1 hour ago",
      read: false,
      type: "info",
    },
    {
      id: 3,
      title: "Stock alert: Low inventory",
      time: "3 hours ago",
      read: true,
      type: "warning",
    },
    {
      id: 4,
      title: "System update required",
      time: "1 day ago",
      read: true,
      type: "error",
    },
  ])

  const clearAllNotifications = () => {
    setNotifications([])
  }

  return (
    <>
      <ThemeSync />
      <Toaster />
      <SidebarProvider
        defaultOpen={true}
        style={
          {
            "--sidebar-width": "17.5rem",
            "--sidebar-width-icon": "4.5rem",
          } as CSSProperties
        }
      >
        <TooltipProvider delayDuration={0}>
          <AppSidebar />
          <SidebarInset>
            <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
              <div className="shrink-0">
                <Header
                  setShowSearchDialog={setShowSearchDialog}
                  showNotificationsDrawer={showNotificationsDrawer}
                  setShowNotificationsDrawer={setShowNotificationsDrawer}
                  notifications={notifications}
                  setNotifications={setNotifications}
                  setShowCalculator={setShowCalculator}
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {children}
              </div>
            </div>
          </SidebarInset>
        </TooltipProvider>
      </SidebarProvider>

      {showSearchDialog && (
        <SearchDialog open={showSearchDialog} onOpenChange={setShowSearchDialog} />
      )}

      {showNotificationsDrawer && (
        <div
          className="fixed inset-0 bg-black/20 z-50 transition-opacity"
          onClick={() => setShowNotificationsDrawer(false)}
        >
          <div
            className={`fixed inset-y-0 right-0 w-full max-w-sm shadow-xl transition-transform duration-300 ease-in-out ${
              isDarkTheme
                ? "bg-gray-900 border-l border-gray-800"
                : "bg-background border-l"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full">
              <div
                className={`flex items-center justify-between p-4 ${
                  isDarkTheme ? "border-b border-gray-800" : "border-b"
                }`}
              >
                <h2 className="text-lg font-semibold">All Notifications</h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllNotifications}
                    className="text-sm text-muted-foreground"
                  >
                    Clear All
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowNotificationsDrawer(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                {notifications.length > 0 ? (
                  <div
                    className={`divide-y ${isDarkTheme ? "divide-gray-800" : ""}`}
                  >
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 ${
                          notification.read
                            ? ""
                            : isDarkTheme
                              ? "bg-gray-800/30"
                              : "bg-muted/30"
                        }`}
                      >
                        <div className="flex gap-3 items-start">
                          <div
                            className={`w-2 h-2 mt-1.5 rounded-full ${
                              notification.type === "success"
                                ? "bg-green-500"
                                : notification.type === "info"
                                  ? "bg-blue-500"
                                  : notification.type === "warning"
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                            }`}
                          />
                          <div>
                            <p className="text-sm font-medium">
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No notifications</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCalculator && (
        <Calculator onClose={() => setShowCalculator(false)} />
      )}
    </>
  )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <DashboardChrome>{children}</DashboardChrome>
      </NotificationProvider>
    </ThemeProvider>
  )
}
