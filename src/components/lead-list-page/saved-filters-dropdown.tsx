"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { BookmarkIcon, XCircleIcon, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"
import { URLS } from "@/config/urls"
import { parseJsonResponse } from "@/lib/api"

interface CustomFilter {
  name: string
  filters: any
  _id?: string
  filter_name?: string
  filter_datas?: any[]
}

interface SavedFiltersDropdownProps {
  activeFilter: string | null
  onChange: (filter: string | null, filterData?: any) => void
  onApplyFilterData?: (filterData: any) => void
  customFilters?: CustomFilter[]
}

export function SavedFiltersDropdown({ activeFilter, onChange, onApplyFilterData, customFilters = [] }: SavedFiltersDropdownProps) {
  // Removed default filters as per requirement to only show dynamic values
  const [savedFilters, setSavedFilters] = useState<CustomFilter[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const isMobile = useIsMobile()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchSavedFilters = async () => {
      try {
        setIsLoading(true)

        const savedFilterUrl = URLS.GET_SAVED_FILTER
        if (!savedFilterUrl) {
          setSavedFilters([])
          return
        }

        const storedData = localStorage.getItem("map_user")
        if (!storedData) return

        const userData = JSON.parse(storedData)
        const token = userData.access_token
        if (!token) return

        const response = await fetch(`${savedFilterUrl}?associate_to=lead`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.status === 404) {
          setSavedFilters([])
          return
        }

        if (!response.ok) {
          console.warn(`Saved filters request failed: ${response.status}`)
          setSavedFilters([])
          return
        }

        const result = await parseJsonResponse<{ code?: number; data?: unknown[] }>(response)

        if (result.code === 200 && Array.isArray(result.data)) {
          const apiFilters = result.data.map((filter: any) => ({
            name: filter.filter_name,
            filters: filter.filter_datas,
            _id: filter._id,
            filter_name: filter.filter_name,
            filter_datas: filter.filter_datas,
          }))

          setSavedFilters(apiFilters)
        } else {
          setSavedFilters([])
        }
      } catch (error) {
        console.warn("Error fetching saved filters:", error)
        setSavedFilters([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchSavedFilters()
  }, [])

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

  const handleResetFilter = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  const handleFilterSelect = (filter: string) => {
    // Find the complete filter data for the selected filter
    const selectedFilter = savedFilters.find((f) => f.name === filter)
    
    if (filter === activeFilter) {
      // If clicking the active filter, deselect it
      onChange(null)
    } else if (selectedFilter) {
      // Pass both the filter name and the filter data
      onChange(filter, selectedFilter.filter_datas)
      
      // If onApplyFilterData is provided, call it with the filter data
      if (onApplyFilterData) {
        onApplyFilterData(selectedFilter.filter_datas)
        
        // Store the filter data in localStorage for the filter drawer to use
        localStorage.setItem('current_filters', JSON.stringify(selectedFilter.filter_datas))
      }
    } else {
      // Fallback if filter data not found
      onChange(filter)
    }
    
    setIsOpen(false)
  }

  // Only use saved filters from API
  const allFilters = savedFilters.map((filter) => filter.name)

  return (
    <div className="relative inline-flex" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        className={`h-8 text-xs gap-1 ${activeFilter ? "pr-7" : "px-2"}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <BookmarkIcon className="h-3 w-3" />
        {!isMobile && (activeFilter ? activeFilter : "Saved Filters")}
        {isMobile && (activeFilter ? activeFilter : "Filters")}
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-8 w-56 rounded-md border bg-popover p-1 shadow-md animate-in fade-in-80">
          <div className="px-2 py-1.5 text-sm font-semibold">Saved Filters</div>
          <div className="h-px bg-border mx-1 my-1"></div>
          <div className="max-h-[300px] overflow-y-auto py-1">
            {isLoading ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading filters...</div>
            ) : allFilters.length > 0 ? (
              allFilters.map((filter) => (
                <div
                  key={filter}
                  className={`flex items-center px-2 py-1.5 text-sm cursor-pointer rounded-sm ${
                    activeFilter === filter
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => handleFilterSelect(filter)}
                >
                  <span className="flex-1">{filter}</span>
                  {activeFilter === filter && <Check className="h-4 w-4" />}
                </div>
              ))
            ) : (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">No saved filters</div>
            )}
          </div>
        </div>
      )}

      {activeFilter && (
        <button
          className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center"
          onClick={handleResetFilter}
          aria-label="Clear filter"
        >
          <XCircleIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
        </button>
      )}
    </div>
  )
}

