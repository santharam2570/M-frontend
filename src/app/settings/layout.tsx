import { SettingsSidebar } from "@/components/sidebars/settings-sidebar"
import { SettingsAccessGate } from "@/components/sidebars/settings-access-gate"
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
        <SidebarInset className="min-w-0 overflow-x-hidden">
          <SettingsAccessGate>
            <div className="flex min-h-svh w-full min-w-0 flex-col">{children}</div>
          </SettingsAccessGate>
        </SidebarInset>
      </TooltipProvider>
      <Toaster />
    </SidebarProvider>
  )
}
