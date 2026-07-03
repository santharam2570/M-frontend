"use client"

import * as React from "react"
import {
  Calculator,
  Maximize,
  Minimize,
  Moon,
  Search,
  Sun,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useSidebar } from "@/components/ui/sidebar"
import { useTheme } from "@/contexts/ThemeContext"
import { useFullscreen } from "@/hooks/use-fullscreen"
import type { Notification } from "@/hooks/use-notifications"

interface HeaderProps {
  setShowSearchDialog: (value: boolean) => void
  showNotificationsDrawer?: boolean
  setShowNotificationsDrawer?: (value: boolean) => void
  notifications: Notification[]
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>
  setShowCalculator: (value: boolean) => void
}

export function Header({
  setShowSearchDialog,
  setShowCalculator,
}: HeaderProps) {
  const { open: isSidebarOpen } = useSidebar()
  const { isDarkTheme, toggleTheme } = useTheme()
  const { isFullscreen, toggleFullscreen } = useFullscreen()

  const openSearch = () => {
    setShowSearchDialog(true)
  }

  return (
    <TooltipProvider>
      <header className="flex w-full min-w-0 items-center justify-between gap-2 border-b px-2 py-2 sm:gap-3 sm:px-4 sm:py-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger className="h-8 w-8 shrink-0" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}</p>
            </TooltipContent>
          </Tooltip>
          <div className="relative min-w-0 flex-1 md:max-w-xs lg:max-w-sm">
            <Button
              variant="ghost"
              className="h-9 w-full justify-start pl-8 font-normal md:pl-8"
              onClick={openSearch}
            >
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <span className="hidden sm:inline">Search...</span>
              <span className="sr-only sm:hidden">Search</span>
            </Button>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                className="h-8 w-8 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl"
                onClick={() => setShowCalculator(true)}
              >
                <Calculator className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Calculator</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                className="hidden h-8 w-8 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl md:inline-flex"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                className="h-8 w-8 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl"
                onClick={toggleTheme}
              >
                {isDarkTheme ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isDarkTheme ? "Light Mode" : "Dark Mode"}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  )
}
