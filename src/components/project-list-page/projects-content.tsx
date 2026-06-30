"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { FilterIcon, GripVertical, Plus, Search, X } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProjectsSummary } from "@/components/project-list-page/projects-summary"
import { ProjectsCards } from "@/components/project-list-page/projects-cards"
import { ProjectFormDrawer } from "@/components/project-list-page/project-form-drawer"
import { ProjectFilterDrawer } from "@/components/project-list-page/project-filter-drawer"
import {
  fetchProjectList,
  fetchProjectMetrics,
  normalizeCardColor,
  reorderProjectsApi,
  reorderProjectsList,
  sortProjectsByOrder,
  updateProjectCardColorApi,
} from "@/lib/projects/project-api"
import { getApiErrorMessage } from "@/lib/api"
import type { Project, ProjectFilterState } from "@/lib/projects/types"
import { useToast } from "@/hooks/use-toast"

function filterProjects(
  projects: Project[],
  search: string,
  filters: ProjectFilterState,
  metricFilter: string | null,
): Project[] {
  let result = [...projects]

  if (search.trim()) {
    const query = search.trim().toLowerCase()
    result = result.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.area_locality.toLowerCase().includes(query) ||
        project.location.toLowerCase().includes(query) ||
        project.project_no.toLowerCase().includes(query),
    )
  }

  if (filters.status) {
    result = result.filter((project) => project.status === filters.status)
  }

  if (filters.location) {
    result = result.filter((project) => project.area_locality === filters.location)
  }

  if (filters.property_type) {
    result = result.filter((project) =>
      project.property_types.includes(filters.property_type as Project["property_types"][number]),
    )
  }

  if (filters.rera_status) {
    result = result.filter((project) => project.rera_status === filters.rera_status)
  }

  if (metricFilter === "active") {
    result = result.filter((project) => project.status === "active")
  }

  if (metricFilter === "available-units") {
    result = result.filter((project) => project.available_units > 0)
  }

  if (metricFilter === "site-visits") {
    result = result.filter((project) => project.site_visits.length > 0)
  }

  return result
}

export function ProjectsContent() {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [token, setToken] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [activeMetricFilter, setActiveMetricFilter] = useState<string | null>(null)
  const [isReorderMode, setIsReorderMode] = useState(false)
  const [reorderProjects, setReorderProjects] = useState<Project[]>([])
  const [filters, setFilters] = useState<ProjectFilterState>({
    status: "",
    location: "",
    property_type: "",
    rera_status: "",
  })

  useEffect(() => {
    try {
      const stored = localStorage.getItem("map_user")
      const userData = stored ? JSON.parse(stored) : null
      if (!userData?.access_token) {
        router.push("/login")
        return
      }
      setToken(userData.access_token)
    } catch {
      router.push("/login")
    }
  }, [router])

  // Project list + metrics are cached across navigations (5-min staleTime in
  // the shared QueryClient). Returning to this page shows the cached data
  // instantly instead of re-fetching and flashing a loading state.
  const {
    data: listResult,
    isLoading: isListLoading,
    error: listError,
  } = useQuery({
    queryKey: ["project-list", searchQuery, filters],
    enabled: !!token,
    queryFn: () => fetchProjectList({ search: searchQuery, filters }),
  })

  const { data: metrics = null } = useQuery({
    queryKey: ["project-metrics"],
    enabled: !!token,
    queryFn: () => fetchProjectMetrics(),
  })

  useEffect(() => {
    if (listResult) {
      setProjects(listResult.projects)
    }
  }, [listResult])

  useEffect(() => {
    if (listError) {
      toast({
        title: "Error",
        description: getApiErrorMessage(listError, "Failed to load projects."),
        variant: "destructive",
      })
    }
  }, [listError, toast])

  // Only show the spinner on the very first load; cached returns render data
  // immediately and refresh silently in the background.
  const isLoading = isListLoading && projects.length === 0

  const refreshProjects = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["project-list"] })
    void queryClient.invalidateQueries({ queryKey: ["project-metrics"] })
  }, [queryClient])

  const locationOptions = useMemo(
    () => [...new Set(projects.map((project) => project.area_locality))].sort(),
    [projects],
  )

  const filteredProjects = useMemo(
    () => filterProjects(projects, searchQuery, filters, activeMetricFilter),
    [projects, searchQuery, filters, activeMetricFilter],
  )

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  const handleSearch = () => {
    setSearchQuery(search)
  }

  const handleClearSearch = () => {
    setSearch("")
    setSearchQuery("")
  }

  const handleMetricFilter = (metricId: string) => {
    setActiveMetricFilter((current) => (current === metricId ? null : metricId))
  }

  const handleToggleReorderMode = async () => {
    if (isReorderMode) {
      const orderedIds = reorderProjects.map((project) => project._id)

      try {
        await reorderProjectsApi(orderedIds)
        setProjects(reorderProjects)
        setIsReorderMode(false)
        setReorderProjects([])
        toast({
          title: "Order updated",
          description: "Project order saved successfully.",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: getApiErrorMessage(error, "Failed to save project order."),
          variant: "destructive",
        })
      }
      return
    }

    try {
      const { projects: allProjects } = await fetchProjectList({
        search: "",
        filters: {
          status: "",
          location: "",
          property_type: "",
          rera_status: "",
        },
      })
      setReorderProjects(sortProjectsByOrder(allProjects))
      setIsReorderMode(true)
    } catch (error) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to load projects for reordering."),
        variant: "destructive",
      })
    }
  }

  const handleReorder = (orderedIds: string[]) => {
    setReorderProjects(reorderProjectsList(reorderProjects, orderedIds))
  }

  const handleColorChange = async (projectId: string, color: string) => {
    const normalized = normalizeCardColor(color)

    setProjects((current) =>
      current.map((project) =>
        project._id === projectId ? { ...project, card_color: normalized } : project,
      ),
    )

    try {
      await updateProjectCardColorApi(projectId, normalized)
    } catch (error) {
      refreshProjects()
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to update card color."),
        variant: "destructive",
      })
    }
  }

  const displayedProjects = isReorderMode ? reorderProjects : filteredProjects

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 pt-0">
      <ProjectsSummary
        metrics={metrics}
        isLoading={isLoading}
        onFilterByMetric={handleMetricFilter}
        activeMetricFilter={activeMetricFilter}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search projects, locality, project no..."
                className="pl-9 pr-9"
              />
              {search ? (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <Button variant="outline" onClick={handleSearch}>
              Search
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={isReorderMode ? "default" : "outline"}
              className="gap-2"
              onClick={handleToggleReorderMode}
            >
              <GripVertical className="h-4 w-4" />
              {isReorderMode ? "Done Reordering" : "Reorder"}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={isReorderMode}
              onClick={() => setFilterOpen(true)}
            >
              <FilterIcon className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
            <Button className="gap-2" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Project
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {isReorderMode ? (
              <>Drag cards to reorder · showing all {reorderProjects.length} projects</>
            ) : (
              <>Showing {filteredProjects.length} of {projects.length} projects</>
            )}
          </span>
          {activeMetricFilter ? (
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setActiveMetricFilter(null)}
            >
              Clear metric filter
            </button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <ProjectsCards
            projects={displayedProjects}
            isLoading={isLoading}
            isReorderMode={isReorderMode}
            onReorder={handleReorder}
            onColorChange={handleColorChange}
          />
        </div>
      </div>

      <ProjectFormDrawer
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={refreshProjects}
      />

      <ProjectFilterDrawer
        open={filterOpen}
        onOpenChange={setFilterOpen}
        filters={filters}
        onFiltersChange={setFilters}
        locationOptions={locationOptions}
      />
    </div>
  )
}
