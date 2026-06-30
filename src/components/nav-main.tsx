"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Bookmark,
  Building2,
  Calendar,
  FileText,
  IdCard,
  IndianRupee,
  LayoutGrid,
  UserPlus,
  UserRoundCheck,
  Waypoints,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface NavItem {
  title: string
  url: string
  icon: LucideIcon
}

const navigationItems: NavItem[] = [
  { title: "Dashboard", icon: LayoutGrid, url: "/dashboard" },
  { title: "Calendar", icon: Calendar, url: "/calendar" },
  { title: "Leads", icon: UserPlus, url: "/lead" },
  { title: "Projects", icon: Building2, url: "/projects" },
  { title: "Bookings", icon: Bookmark, url: "/bookings" },
  { title: "Payments", icon: IndianRupee, url: "/invoice" },
  { title: "Documents", icon: FileText, url: "/coming-soon?module=documents" },
  { title: "Reports", icon: BarChart3, url: "/dashboard" },
  { title: "Agents", icon: IdCard, url: "/coming-soon?module=agents" },
]

const navButtonClass =
  "h-10 gap-3 rounded-lg px-3 text-[13px] font-medium text-white/90 hover:bg-white/10 hover:text-white active:bg-white/10 data-active:bg-[#e53935] data-active:text-white data-active:font-semibold [&>svg]:size-[18px] [&>svg]:shrink-0 [&>svg]:text-white/90 data-active:[&>svg]:text-white group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:min-w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0! group-data-[collapsible=icon]:[&>svg]:size-5 group-data-[collapsible=icon]:data-active:rounded-full group-data-[collapsible=icon]:hover:rounded-full"

function isActiveRoute(pathname: string, url: string): boolean {
  const [basePath, queryString] = url.split("?")

  if (basePath === "/coming-soon") {
    if (pathname !== "/coming-soon" || !queryString) {
      return false
    }

    if (typeof window === "undefined") {
      return false
    }

    const currentParams = new URLSearchParams(window.location.search)
    const urlParams = new URLSearchParams(queryString)
    const moduleParam = urlParams.get("module")

    return moduleParam ? currentParams.get("module") === moduleParam : false
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

    return true
  }

  return false
}

export function NavMain() {
  const pathname = usePathname()

  return (
    <SidebarGroup className="p-0">
      <SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1.5">
        {navigationItems.map((item) => {
          const isActive = isActiveRoute(pathname, item.url)
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
                <Link href={item.url}>
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
