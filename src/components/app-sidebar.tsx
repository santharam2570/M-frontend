"use client"

import type * as React from "react"

import { MapSidebarLogo } from "@/components/brand/map-sidebar-logo"
import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 bg-[#003399] text-white"
      {...props}
    >
      <SidebarHeader className="flex items-center justify-center gap-0 overflow-hidden px-4 pb-4 pt-5 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pb-3 group-data-[collapsible=icon]:pt-4">
        <MapSidebarLogo />
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto px-2 py-1 group-data-[collapsible=icon]:overflow-x-hidden group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:py-2">
        <NavMain />
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-white/10 bg-[#002b7f] p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-t-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-1 group-data-[collapsible=icon]:pb-3">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
