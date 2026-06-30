"use client"

import * as React from "react"
import { LogOut, MoreVertical, Settings, Trash2, User, HeadphonesIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from 'react'
import { useQueryClient } from "@tanstack/react-query"
import { useReduxAuth } from "@/lib/hooks/useReduxAuth"
import { clearPersistedQueryCache } from "@/lib/query-cache"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,  
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import URLS from "@/config/urls"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { GearIcon } from "@radix-ui/react-icons"
import { SupportModal } from "@/components/modals/support-modal"

function getCachedUserDisplay(userData: Record<string, unknown> | null | undefined) {
  if (!userData) return null

  const userObject =
    (userData.result as Record<string, unknown> | undefined) ||
    (userData.user as Record<string, unknown> | undefined) ||
    userData

  const name = String(userObject.name || userObject.full_name || "")
  const email = String(userObject.email || "")

  if (!name && !email) return null

  return {
    name,
    email,
    avatar: name ? name.substring(0, 2).toUpperCase() : "??",
  }
}

function isNetworkError(error: unknown) {
  return error instanceof TypeError && error.message === "Failed to fetch"
}

export function NavUser() {
  const { toast } = useToast();
  const { isMobile } = useSidebar()
  const [showLogoutConfirmation, setShowLogoutConfirmation] = React.useState(false)
  const [showClearDemoDataConfirmation, setShowClearDemoDataConfirmation] = React.useState(false)
  const [showSupportModal, setShowSupportModal] = React.useState(false)
  const router = useRouter()
  const queryClient = useQueryClient()
  const [user, setUser] = useState({ name: '', email: '', avatar: '' })
  const [showClearDemoDataButton, setShowClearDemoDataButton] = React.useState(false)
  const { user: reduxUser, token, logout: reduxLogout } = useReduxAuth()
  useEffect(() => {
    // Use Redux user data if available, fallback to localStorage
    const userData = reduxUser || (() => {
      try {
        const storedData = localStorage.getItem('map_user');
        return storedData ? JSON.parse(storedData) : null;
      } catch {
        return null;
      }
    })();
    
    const authToken = token || (userData?.access_token as string | undefined)

    const cachedUser = getCachedUserDisplay(userData as Record<string, unknown> | null)
    if (cachedUser) {
      setUser(cachedUser)
    }

    const fetchProfileData = async () => {
      if (!authToken) return

      try {
        const response = await fetch(`${URLS.PROFILE_NEW}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) return

        const res = await response.json()
        if (res.code !== 200) return

        const fullName = res.data.name || ""
        const avatarInitials = fullName ? fullName.substring(0, 2).toUpperCase() : "??"

        let profileImageUrl = ""
        const profileImage = res.data.profile_image
        if (profileImage && typeof profileImage === "string") {
          if (profileImage.startsWith("http")) {
            profileImageUrl = profileImage
          } else {
            const baseUrl = URLS.DOCUMENT_BASE_URL || ""
            profileImageUrl = baseUrl ? `${baseUrl}/uploads/profile/${profileImage}` : ""
          }
        }

        setUser({
          name: fullName,
          email: res.data.email || "",
          avatar: profileImageUrl || avatarInitials,
        })
      } catch (error) {
        if (!isNetworkError(error)) {
          console.error("Error fetching profile data:", error)
        }
      }
    }

    const fetchDemoDataStatus = async () => {
      if (!authToken) {
        setShowClearDemoDataButton(false)
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

        if (!response.ok) {
          setShowClearDemoDataButton(false)
          return
        }

        const data = await response.json()
        if (data.code === 200) {
          setShowClearDemoDataButton(data.result === 1 || data.result === "1")
        } else {
          setShowClearDemoDataButton(false)
        }
      } catch (error) {
        if (!isNetworkError(error)) {
          console.error("Error fetching demo data status:", error)
        }
        setShowClearDemoDataButton(false)
      }
    }

    fetchProfileData()
    fetchDemoDataStatus()
  }, [reduxUser, token])

  const handleLogout = async () => {
    try {
      // Clear Redux state
      reduxLogout();

      // Clear in-memory and persisted React Query cache
      queryClient.clear();
      clearPersistedQueryCache();

      // SESSION CLEAR (localStorage fallback)
      localStorage.removeItem("map_user");

      // DROPDOWN FITERS CLEAR
      localStorage.removeItem("current_filters");

      // DASHBOARD FILTERS CLEAR
      localStorage.removeItem("projects_dashboard_filters");
      localStorage.removeItem("sales_dashboard_filters");
      
      // SUMMARY FILTERS CLEAR
      localStorage.removeItem("current_lead_metrics_filters");
      localStorage.removeItem("current_opportunity_metrics_filters");
      localStorage.removeItem("current_company_metrics_filters");
      localStorage.removeItem("current_contact_metrics_filters");
      localStorage.removeItem("current_product_metrics_filters");
      localStorage.removeItem("current_quote_metrics_filters");

      reduxLogout();
      router.push("/login");

      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log out. Please try again.",
      });
    }

    setShowLogoutConfirmation(false);
  };

  const handleClearDemoData = () => {
    setShowClearDemoDataConfirmation(true);
  };

  const handleClearDemoDataConfirmed = async () => {
    const authToken = token || (() => {
      try {
        const storedData = localStorage.getItem('map_user');
        const userData = storedData ? JSON.parse(storedData) : null;
        return userData?.access_token;
      } catch {
        return null;
      }
    })();

    if (!authToken) {
      toast({ variant: "destructive", title: "Authentication Error", description: "User not logged in." });
      return;
    }

    try {
      const response = await fetch(URLS.DEMO_DATA_CLEAR, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      if (response.ok && result.code === 200) {
        toast({ title: "Success", description: "Demo data cleared successfully." });
        setShowClearDemoDataButton(false);
        // router.refresh(); // Refresh the page after clearing demo data
        window.location.reload()
      } else {
        throw new Error(result.msg || "Failed to clear demo data.");
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }

    setShowClearDemoDataConfirmation(false);
  };

  return (
    <SidebarMenu>
      <Dialog open={showLogoutConfirmation} onOpenChange={setShowLogoutConfirmation}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>Are you sure you want to log out?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogoutConfirmation(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Log out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showClearDemoDataConfirmation} onOpenChange={setShowClearDemoDataConfirmation}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Clear Demo Data</DialogTitle>
            <DialogDescription>Are you sure you want to clear the demo data? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDemoDataConfirmation(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearDemoDataConfirmed}>
              Clear Demo Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SupportModal 
        isOpen={showSupportModal} 
        onClose={() => setShowSupportModal(false)} 
      />

      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={user.name || "MAP User"}
              className={cn(
                "h-auto w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2.5 outline-none ring-0",
                "hover:bg-white/10 focus-visible:ring-0 data-[state=open]:bg-white/10",
                "group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:min-w-10 group-data-[collapsible=icon]:justify-center",
                "group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0!"
              )}
            >
              <Avatar className="h-9 w-9 shrink-0 rounded-full bg-white/15 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
                {user.avatar && user.avatar.startsWith("http") && (
                  <AvatarImage src={user.avatar} alt={user.name || "MAP User"} />
                )}
                <AvatarFallback className="rounded-full bg-transparent text-sm font-medium text-white">
                  {user.name ? user.name.substring(0, 1).toUpperCase() : "N"}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold text-white">{user.name || "MAP User"}</span>
                <span className="truncate text-xs text-white/70">{user.email || "demo_map@gmail.com"}</span>
              </div>
              <MoreVertical className="ml-auto size-4 shrink-0 text-white/70 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <User />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings/lead-settings")}>
                <Settings />
                Settings
              </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setShowSupportModal(true)}>
                    <HeadphonesIcon />
                    Get Support
                  </DropdownMenuItem>



              {/* {showClearDemoDataButton && (
                <DropdownMenuItem onClick={handleClearDemoData}>
                  <Trash2 />
                  Clear Demo Data
                </DropdownMenuItem>
              )} */}
            </DropdownMenuGroup>



            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                setShowLogoutConfirmation(true)
              }}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}