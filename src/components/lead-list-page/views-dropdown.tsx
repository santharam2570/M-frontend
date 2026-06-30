"use client"

import { useState, useRef, useEffect } from "react"
import { LayoutGrid, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"

export type ViewMode = "default" | "compact" | "kanban"

interface ViewsDropdownProps {
  activeView: ViewMode
  onChange: (view: ViewMode) => void
}

export function ViewsDropdown({ activeView, onChange }: ViewsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isMobile = useIsMobile()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const viewOptions = [
    { value: "default", label: "Default" },
    { value: "compact", label: "Compact" },
    // { value: "kanban", label: "Kanban" },
  ]

  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleViewSelect = (view: ViewMode) => {
    onChange(view)
    setIsOpen(false)
  }

  // Get the active view label for display
  const getActiveViewLabel = () => {
    const option = viewOptions.find((opt) => opt.value === activeView)
    return option ? option.label : "Default"
  }

  return (
    <div className="relative inline-flex" ref={dropdownRef}>
      <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setIsOpen(!isOpen)}>
        <LayoutGrid className="h-3 w-3" />
        {!isMobile && getActiveViewLabel()}
        {isMobile && "View"}
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-8 w-40 rounded-md border bg-popover p-1 shadow-md animate-in fade-in-80">
          <div className="px-2 py-1.5 text-sm font-semibold">Select View</div>
          <div className="h-px bg-border mx-1 my-1"></div>
          <div className="py-1">
            {viewOptions.map((view) => (
              <div
                key={view.value}
                className={`flex items-center px-2 py-1.5 text-sm cursor-pointer rounded-sm ${
                  activeView === view.value
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}
                onClick={() => handleViewSelect(view.value as ViewMode)}
              >
                <span className="flex-1">{view.label}</span>
                {activeView === view.value && <Check className="h-4 w-4 ml-2" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

