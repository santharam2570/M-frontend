
'use client'

import { 
  Settings, Bell, CreditCard, Lock, Keyboard, 
  Languages, HelpCircle, Building, Building2, Sliders, Package, 
  Flag, Briefcase, ClipboardList, FileSignature, ShieldCheck,
  Users, Hash, FileText, Mail, MessageCircle, ArrowLeft,
  MessageSquare, ChevronRight, GitBranch, LucideIcon, HeadphonesIcon
} from "lucide-react"

import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarRail, 
  SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton, 
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { SupportModal } from "@/components/modals/support-modal"
import { useUserData } from "@/hooks/useUserData"
import { useMemo, useState } from "react"

type SubItem = {
  title: string;
  url: string;
  isModal?: boolean;
};

type NavSection = {
  title: string;
  icon: LucideIcon;
  isActive: boolean;
  items: SubItem[];
  isModal?: boolean;
};

const settingsData: { navMain: NavSection[] } = {
  navMain: [
    {
      title: "Organization",
      icon: Building2,
      isActive: true,
      items: [
        {
          title: "Organization Profile",
          url: "/settings/company-profile",
        },
        {
          title: "User Management",
          url: "/settings/manage-users",
        },
        {
          title: "Roles & Permissions",
          url: "/settings/roles-permissions",
        },
        {
          title: "Branches",
          url: "/settings/branches",
        },
        {
          title: "Trash",
          url: "/coming-soon?module=settings-trash",
        },
      ],
    },
    {
      title: "Module Settings",
      icon: Settings,
      isActive: true,
      items: [

        {
          title: "Leads",
          url: "/settings/lead-settings",
        },
        {
          title: "Projects",
          url: "/settings/project-settings",
        },
      ],
    },

  ],
};

function BackButton() {
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <Link
      href="/lead"
      className="flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      onClick={() => {
        if (isMobile) setOpenMobile(false)
      }}
    >
      <ArrowLeft className="h-4 w-4" />
      <span>Back</span>
    </Link>
  )
}

function NavMain({ items, onSupportClick }: { items: NavSection[], onSupportClick: () => void }) {
  const { isMobile, setOpenMobile } = useSidebar()

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <>
      {items.map((section: NavSection) => (
        <SidebarGroup key={section.title}>
          <SidebarMenu>
            <Collapsible key={section.title} asChild defaultOpen={section.isActive} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={section.title}>
                    {section.icon && <section.icon />}
                    <span className="font-bold">{section.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {section.items?.map((subItem: SubItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        {subItem.isModal ? (
                          <SidebarMenuSubButton onClick={onSupportClick}>
                            <span>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        ) : (
                          <SidebarMenuSubButton asChild>
                            <Link href={subItem.url} onClick={handleNavClick}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        )}
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}

export function SettingsSidebar() {
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false)
  const {
    canManageBranches,
    canManageRoles,
    canManageUsers,
    canAccessSettings,
    isAuthLoading,
    hasTier,
    can,
  } = useUserData()

  const navItems = useMemo(() => {
    if (isAuthLoading) {
      return settingsData.navMain
    }

    return settingsData.navMain
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (item.url === "/settings/branches") return canManageBranches
          if (item.url === "/settings/roles-permissions") return canManageRoles
          if (item.url === "/settings/manage-users") return canManageUsers
          if (item.url === "/settings/company-profile") {
            return (
              canAccessSettings &&
              (hasTier("super_admin", "admin") || can("manage_settings") || can("settings"))
            )
          }
          if (item.url === "/settings/lead-settings") {
            return (
              hasTier("super_admin", "admin") ||
              can("manage_lead_settings") ||
              can("settings")
            )
          }
          if (item.url === "/settings/project-settings") {
            return hasTier("super_admin", "admin") || can("settings")
          }
          return canAccessSettings
        }),
      }))
      .filter((section) => section.items.length > 0)
  }, [
    can,
    canAccessSettings,
    canManageBranches,
    canManageRoles,
    canManageUsers,
    hasTier,
    isAuthLoading,
  ])

  const handleSupportClick = () => {
    setIsSupportModalOpen(true)
  }

  const handleCloseSupportModal = () => {
    setIsSupportModalOpen(false)
  }

  return (
    <>
      <Sidebar>
        <SidebarHeader className="border-b px-2 py-2">
          <BackButton />
        </SidebarHeader>
        <SidebarContent>
          <NavMain items={navItems} onSupportClick={handleSupportClick} />
        </SidebarContent>
      </Sidebar>
      
      <SupportModal 
        isOpen={isSupportModalOpen} 
        onClose={handleCloseSupportModal} 
      />
    </>
  )
}


