"use client"

import * as React from "react"
import {
  AlertCircle,
  Calculator,
  Maximize,
  Minimize,
  Moon,
  Search,
  Sun,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import URLS from "@/config/urls"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useSidebar } from "@/components/ui/sidebar"
import { useReduxAuth } from "@/lib/hooks/useReduxAuth"
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
  const [showDemoDataBanner, setShowDemoDataBanner] = React.useState(false)
  const [showClearDemoDataConfirmation, setShowClearDemoDataConfirmation] =
    React.useState(false)
  const { toast } = useToast()
  const { open: isSidebarOpen } = useSidebar()
  const { token } = useReduxAuth()
  const { isDarkTheme, toggleTheme } = useTheme()
  const { isFullscreen, toggleFullscreen } = useFullscreen()

  React.useEffect(() => {
    const authToken =
      token ||
      (() => {
        try {
          const storedData = localStorage.getItem("map_user")
          const userData = storedData ? JSON.parse(storedData) : null
          return userData?.access_token
        } catch {
          return null
        }
      })()

    const fetchDemoDataStatus = async () => {
      if (!authToken) {
        setShowDemoDataBanner(false)
        return
      }

      try {
        const response = await fetch(URLS.DEMO_DATA_CHECK, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        })
        const data = await response.json()
        if (response.ok && data.code === 200) {
          setShowDemoDataBanner(data.result === 1 || data.result === "1")
        } else {
          setShowDemoDataBanner(false)
        }
      } catch {
        setShowDemoDataBanner(false)
      }
    }

    fetchDemoDataStatus()
  }, [token])

  const handleClearDemoData = () => {
    setShowClearDemoDataConfirmation(true)
  }

  const handleClearDemoDataConfirmed = async () => {
    const authToken =
      token ||
      (() => {
        try {
          const storedData = localStorage.getItem("map_user")
          const userData = storedData ? JSON.parse(storedData) : null
          return userData?.access_token
        } catch {
          return null
        }
      })()

    if (!authToken) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "User not logged in.",
      })
      return
    }

    try {
      const response = await fetch(URLS.DEMO_DATA_CLEAR, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      })
      const result = await response.json()
      if (response.ok && result.code === 200) {
        toast({
          title: "Success",
          description: "Demo data cleared successfully.",
        })
        setShowDemoDataBanner(false)
        window.location.reload()
      } else {
        throw new Error(result.msg || "Failed to clear demo data.")
      }
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to clear demo data.",
      })
    }
    setShowClearDemoDataConfirmation(false)
  }

  const openSearch = () => {
    setShowSearchDialog(true)
  }

  return (
    <TooltipProvider>
      <header className="border-b px-4 py-3 flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger className="h-8 w-8" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}</p>
            </TooltipContent>
          </Tooltip>
          <div className="relative w-64">
            <Button
              variant="ghost"
              className="w-full justify-start pl-8 h-9 font-normal"
              onClick={openSearch}
            >
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              Search...
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showDemoDataBanner && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                Demo data is active
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-2 text-xs font-medium text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900 hover:text-amber-900 dark:hover:text-amber-100"
                onClick={handleClearDemoData}
              >
                Clear
              </Button>
            </div>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                className="h-8 w-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
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
                className="h-8 w-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
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
                className="h-8 w-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
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

        <Dialog
          open={showClearDemoDataConfirmation}
          onOpenChange={setShowClearDemoDataConfirmation}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirm Clear Demo Data</DialogTitle>
              <DialogDescription>
                Are you sure you want to clear the demo data? This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowClearDemoDataConfirmation(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleClearDemoDataConfirmed}
              >
                Clear Demo Data
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>
    </TooltipProvider>
  )
}
