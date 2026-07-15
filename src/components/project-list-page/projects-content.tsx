"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, FilterIcon, GripVertical, Plus, Search, Shield, X } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ProjectsSummary } from "@/components/project-list-page/projects-summary"
import { ProjectsCards } from "@/components/project-list-page/projects-cards"
import { ProjectFormDrawer } from "@/components/project-list-page/project-form-drawer"
import { ProjectFilterDrawer } from "@/components/project-list-page/project-filter-drawer"
import {
  fetchProjectList,
  fetchProjectMetrics,
  fetchProjectSettingsListApi,
  isActiveProjectStatus,
  mapProjectSettingsToOptions,
  normalizeCardColor,
  reorderProjectsApi,
  reorderProjectsList,
  sortProjectsByOrder,
  updateProjectCardColorApi,
  type ProjectSettingOption,
} from "@/lib/projects/project-api"
import { PROJECT_SETTINGS_QUERY_KEY } from "@/lib/projects/project-shared-queries"
import { getApiErrorMessage } from "@/lib/api"
import type { Project, ProjectFilterState } from "@/lib/projects/types"
import { EMPTY_PROJECT_FILTERS } from "@/lib/projects/types"
import { useToast } from "@/hooks/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"
import { useProjectPermissions } from "@/hooks/useProjectPermissions"

function filterProjects(
  projects: Project[],
  search: string,
  filters: ProjectFilterState,
  metricFilter: string | null,
  statusOptions: ProjectSettingOption[] = [],
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

  if (filters.branch_id) {
    result = result.filter((project) => project.branch_id === filters.branch_id)
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
    result = result.filter((project) => isActiveProjectStatus(project.status, statusOptions))
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
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const {
    canViewProjects,
    canAddProject,
    canEditProject,
    isLoading: isPermissionsLoading,
  } = useProjectPermissions()
  const [token, setToken] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [activeMetricFilter, setActiveMetricFilter] = useState<string | null>(null)
  const [isReorderMode, setIsReorderMode] = useState(false)
  const [reorderProjects, setReorderProjects] = useState<Project[]>([])
  const [filters, setFilters] = useState<ProjectFilterState>(EMPTY_PROJECT_FILTERS)

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

  const { data: projectSettings } = useQuery({
    queryKey: PROJECT_SETTINGS_QUERY_KEY,
    enabled: !!token,
    queryFn: () => fetchProjectSettingsListApi(),
  })

  const statusOptions = useMemo(
    () => mapProjectSettingsToOptions(projectSettings?.project_status),
    [projectSettings],
  )

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

  const filteredProjects = useMemo(
    () => filterProjects(projects, searchQuery, filters, activeMetricFilter, statusOptions),
    [projects, searchQuery, filters, activeMetricFilter, statusOptions],
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
        filters: EMPTY_PROJECT_FILTERS,
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

  if (isPermissionsLoading) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center p-4 pt-0 text-sm text-muted-foreground">
          Loading projects...
        </main>
      </div>
    )
  }

  if (!canViewProjects) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <main className="flex min-h-0 flex-1 flex-col p-4 pt-0">
          <Card className="border-none shadow-sm">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Shield className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Access restricted</p>
                <p className="text-sm text-muted-foreground">
                  You don&apos;t have permission to view projects. Ask an admin to enable the View Project permission for your role.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 pt-0">
        <ProjectsSummary
          metrics={metrics}
          isLoading={isLoading}
          onFilterByMetric={handleMetricFilter}
          activeMetricFilter={activeMetricFilter}
        />

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="relative w-full min-w-0 sm:w-[220px] sm:shrink-0 md:w-[260px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search projects..."
                className={`h-8 py-1 pl-8 text-sm transition-all ${search ? "pr-20" : "pr-3"}`}
              />
              {search ? (
                <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-1"
                          onClick={handleSearch}
                        >
                          <Check className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Search</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={handleClearSearch}
                          className="flex h-6 w-6 items-center justify-center rounded-full p-1 transition-colors hover:bg-accent"
                          aria-label="Clear search"
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Clear Search</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ) : null}
            </div>

            <p className="flex h-8 shrink-0 items-center text-sm text-muted-foreground sm:whitespace-nowrap">
              {isReorderMode ? (
                <span>
                  Drag cards to reorder · showing all{" "}
                  <span className="font-medium text-foreground">{reorderProjects.length}</span> projects
                </span>
              ) : searchQuery ? (
                <span>
                  Search Results: <span className="font-medium text-foreground">{filteredProjects.length}</span>
                  {searchQuery && <span className="ml-1">for &quot;{searchQuery}&quot;</span>}
                </span>
              ) : activeFilterCount > 0 || activeMetricFilter ? (
                <span>
                  Filtered: <span className="font-medium text-foreground">{filteredProjects.length}</span> / Total:{" "}
                  <span className="font-medium text-foreground">{projects.length}</span>
                </span>
              ) : (
                <span>
                  No of Records: <span className="font-medium text-foreground">{projects.length}</span>
                </span>
              )}
            </p>
          </div>

          <div className="flex shrink-0 flex-nowrap items-center justify-start gap-2 sm:justify-end">
            {canEditProject ? (
              <Button
                variant={isReorderMode ? "default" : "outline"}
                size="sm"
                className="h-8 shrink-0 gap-1.5 px-3 text-xs"
                onClick={handleToggleReorderMode}
              >
                <GripVertical className="h-3.5 w-3.5" />
                {isReorderMode ? (isMobile ? "Done" : "Done Reordering") : (isMobile ? "Reorder" : "Reorder")}
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1.5 px-3 text-xs"
              disabled={isReorderMode}
              onClick={() => setFilterOpen(true)}
            >
              <FilterIcon className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
            {canAddProject ? (
              <Button
                size="sm"
                className="h-8 shrink-0 gap-1.5 px-3 text-xs"
                onClick={() => setFormOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                {isMobile ? "Add" : "Add Project"}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
          <ProjectsCards
            projects={displayedProjects}
            isLoading={isLoading}
            isReorderMode={isReorderMode}
            onReorder={handleReorder}
            onColorChange={handleColorChange}
            statusOptions={statusOptions}
          />
        </div>
      </main>

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
      />
    </div>
  )
}
