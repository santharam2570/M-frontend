
'use client'

import { 
  User, Settings, Bell, CreditCard, Lock, Keyboard, 
  Languages, HelpCircle, Building, Building2, Sliders, Package, 
  Flag, Briefcase, ClipboardList, FileSignature, ShieldCheck,
  Users, Hash, FileText, Mail, MessageCircle, ArrowLeft,
  MessageSquare, ChevronRight, GitBranch, LucideIcon, HeadphonesIcon
} from "lucide-react"

import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarRail, 
  SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton, 
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/ui/sidebar"
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
          title: "Branches",
          url: "/settings/branches",
        },
        // {
        //   title: "Teams",
        //   url: "/settings/teams",
        // },
        // {
        //   title: "Reporting Hierarchy",
        //   url: "/coming-soon?module=settings-reporting-hierarchy",
        // },

        // {
        //   title: "Record Numbering",
        //   url: "/settings/record-numbering",
        // },
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
  return (
    <Link href="/lead" className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-primary hover:text-primary/80">
      <ArrowLeft className="h-4 w-4" />
      <span>Back</span>
    </Link>
  )
}

function NavMain({ items, onSupportClick }: { items: NavSection[], onSupportClick: () => void }) {
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
                            <Link href={subItem.url}>
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
  const { canManageBranches, isAuthLoading } = useUserData()

  const navItems = useMemo(() => {
    if (isAuthLoading || canManageBranches) {
      return settingsData.navMain
    }

    return settingsData.navMain.map((section) => ({
      ...section,
      items: section.items.filter((item) => item.url !== "/settings/branches"),
    }))
  }, [canManageBranches, isAuthLoading])

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


