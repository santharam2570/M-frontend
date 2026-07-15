"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Bookmark,
  Building2,
  Calendar,
  FileText,
  IdCard,
  IndianRupee,
  LayoutDashboard,
  UserPlus,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { RoleTier } from "@/lib/auth"

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useRolePermissions } from "@/hooks/useRolePermissions"
import { useUserData } from "@/hooks/useUserData"

interface NavItem {
  title: string
  url: string
  icon: LucideIcon
  permissionKey?: string
  roleTiers?: RoleTier[]
}

const navigationItems: NavItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard" },
  { title: "Calendar", icon: Calendar, url: "/calendar" },
  { title: "Leads", icon: UserPlus, url: "/lead", permissionKey: "lead" },
  { title: "Projects", icon: Building2, url: "/projects", permissionKey: "project" },
  { title: "Bookings", icon: Bookmark, url: "/bookings", permissionKey: "booking" },
  { title: "Payments", icon: IndianRupee, url: "/coming-soon?module=payments" },
  { title: "Documents", icon: FileText, url: "/coming-soon?module=documents" },
  { title: "Reports", icon: BarChart3, url: "/reports", permissionKey: "reports" },
  { title: "Agents", icon: IdCard, url: "/agents", permissionKey: "agent" },
]

const navButtonClass =
  "h-10 gap-3 rounded-lg px-3 text-[13px] font-medium text-white/90 hover:bg-white/10 hover:text-white active:bg-white/10 data-active:bg-[#e53935] data-active:text-white data-active:font-semibold [&>svg]:size-[18px] [&>svg]:shrink-0 [&>svg]:text-white/90 data-active:[&>svg]:text-white group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:min-w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0! group-data-[collapsible=icon]:[&>svg]:size-5 group-data-[collapsible=icon]:data-active:rounded-full group-data-[collapsible=icon]:hover:rounded-full"

function isActiveRoute(
  pathname: string,
  url: string,
  currentModule: string | null
): boolean {
  const [basePath, queryString] = url.split("?")

  if (basePath === "/coming-soon") {
    if (pathname !== "/coming-soon" || !queryString) {
      return false
    }

    const urlParams = new URLSearchParams(queryString)
    const moduleParam = urlParams.get("module")

    return moduleParam ? currentModule === moduleParam : false
  }

  if (pathname === basePath) {
    return true
  }

  if (pathname.startsWith(`${basePath}/`)) {
    if (basePath === "/lead") {
      return !pathname.startsWith("/lead-values")
    }

    if (basePath === "/projects") {
      return true
    }

    if (basePath === "/bookings") {
      return true
    }

    if (basePath === "/agents") {
      return true
    }

    if (basePath === "/reports") {
      return true
    }

    if (basePath === "/dashboard") {
      return true
    }

    return true
  }

  return false
}

export function NavMain() {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  const { userData, orgId, roleTier, isAuthLoading } = useUserData()
  const { hasPermission, isLoading: permissionsLoading } = useRolePermissions(
    userData,
    orgId
  )
  // Keep SSR and first client paint identical; filter once auth/permissions hydrate.
  const [navReady, setNavReady] = useState(false)
  const [currentModule, setCurrentModule] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthLoading && !permissionsLoading) {
      setNavReady(true)
    }
  }, [isAuthLoading, permissionsLoading])

  useEffect(() => {
    if (pathname !== "/coming-soon") {
      setCurrentModule(null)
      return
    }
    setCurrentModule(new URLSearchParams(window.location.search).get("module"))
  }, [pathname])

  const visibleItems = useMemo(() => {
    if (!navReady) {
      return navigationItems.filter((item) => !item.permissionKey)
    }

    return navigationItems.filter((item) => {
      if (item.roleTiers && !item.roleTiers.includes(roleTier)) {
        return false
      }
      return !item.permissionKey || hasPermission(item.permissionKey)
    })
  }, [hasPermission, navReady, roleTier])

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <SidebarGroup className="p-0">
      <SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1.5">
        {visibleItems.map((item) => {
          const isActive = isActiveRoute(pathname, item.url, currentModule)
          const Icon = item.icon

          return (
            <SidebarMenuItem
              key={item.title}
              className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
            >
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={item.title}
                className={navButtonClass}
              >
                <Link href={item.url} onClick={handleNavClick}>
                  <Icon strokeWidth={1.75} />
                  <span className="truncate group-data-[collapsible=icon]:hidden">
                    {item.title}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
