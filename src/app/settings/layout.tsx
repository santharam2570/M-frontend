import { SettingsSidebar } from "@/components/sidebars/settings-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "sonner"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <TooltipProvider delayDuration={0}>
        <SettingsSidebar />
        <SidebarInset>{children}</SidebarInset>
      </TooltipProvider>
      <Toaster />
    </SidebarProvider>
  )
}
