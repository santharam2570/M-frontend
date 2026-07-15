"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Check, FilterIcon, IdCard, Search, Shield, X } from "lucide-react"

import { AgentFilterDrawer } from "@/components/agent-list-page/agent-filter-drawer"
import { AgentFormDrawer } from "@/components/agent-list-page/agent-form-drawer"
import { AgentsSummary } from "@/components/agent-list-page/agents-summary"
import { AgentsTable } from "@/components/agent-list-page/agents-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DeleteItemAlert } from "@/components/ui/delete-item-alert"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import { useAgentPermissions } from "@/hooks/useAgentPermissions"
import { useUserData } from "@/hooks/useUserData"
import { getApiErrorMessage } from "@/lib/api"
import {
  deleteAgentApi,
  fetchAgentList,
  fetchAgentMetrics,
  fetchAgentRoles,
  invalidateAgentsCache,
  toggleAgentStatusApi,
} from "@/lib/agents/agent-api"
import type { Agent, AgentFilterState } from "@/lib/agents/types"
import {
  fetchBranches,
  getOrgIdFromAuth,
  getStoredAuthUser,
} from "@/lib/auth"
import { themeFilterCountBadgeClassName } from "@/lib/form-field-styles"
import { cn } from "@/lib/utils"

const METRIC_FILTER_LABELS: Record<string, string> = {
  total: "All Agents",
  active: "Active Agents",
  "new-this-month": "New This Month",
  "total-bookings": "Agents with Bookings",
}

export function AgentsContent() {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { userData, isAuthLoading, orgId, getBranchName } = useUserData()
  const { canViewAgents, canEditAgent, canDeleteAgent, isLoading: isPermissionsLoading } =
    useAgentPermissions()
  const token = userData?.access_token ?? null
  const [search, setSearch] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null)
  const [activeMetricFilter, setActiveMetricFilter] = useState<string | null>(null)
  const [filters, setFilters] = useState<AgentFilterState>({
    status: "",
    agent_type: "",
    branch_id: "",
  })
  const [branchOptions, setBranchOptions] = useState<Array<{ value: string; label: string }>>([])

  useEffect(() => {
    if (isAuthLoading) return
    if (!userData) router.push("/login")
  }, [isAuthLoading, userData, router])

  useEffect(() => {
    const loadBranches = async () => {
      const orgId = getOrgIdFromAuth(getStoredAuthUser())
      if (!orgId) return

      try {
        const stored = getStoredAuthUser()
        const branches = await fetchBranches(orgId, stored?.access_token as string | undefined)
        setBranchOptions(
          branches
            .filter((branch) => branch.status === "active")
            .map((branch) => ({ value: branch.id, label: branch.name })),
        )
      } catch {
        setBranchOptions([])
      }
    }

    void loadBranches()
  }, [])

  const {
    data: listResult,
    isLoading: isListLoading,
    error: listError,
  } = useQuery({
    queryKey: ["agent-list", searchQuery, filters, activeMetricFilter, orgId],
    enabled: !!token,
    queryFn: () =>
      fetchAgentList({
        search: searchQuery,
        filters,
        metricFilter: activeMetricFilter,
        orgId: orgId ?? undefined,
      }),
  })

  const { data: metrics = null, isLoading: isMetricsLoading } = useQuery({
    queryKey: ["agent-metrics", orgId],
    enabled: !!token,
    queryFn: () => fetchAgentMetrics(orgId ?? undefined),
  })

  const { data: roles = [] } = useQuery({
    queryKey: ["agent-roles"],
    enabled: !!token,
    queryFn: () => fetchAgentRoles(),
  })

  useEffect(() => {
    if (listError) {
      toast({
        title: "Error",
        description: getApiErrorMessage(listError, "Failed to load agents."),
        variant: "destructive",
      })
    }
  }, [listError, toast])

  const agents = listResult?.agents ?? []
  const isLoading = isListLoading && agents.length === 0

  const refreshAgents = useCallback(() => {
    invalidateAgentsCache()
    void queryClient.invalidateQueries({ queryKey: ["agent-list"] })
    void queryClient.invalidateQueries({ queryKey: ["agent-metrics"] })
  }, [queryClient])

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  const filterLabel = useMemo(() => {
    const parts: string[] = []

    if (activeMetricFilter) {
      parts.push(METRIC_FILTER_LABELS[activeMetricFilter] ?? activeMetricFilter)
    }

    if (filters.status) {
      parts.push(filters.status === "active" ? "Active" : "Inactive")
    }

    if (filters.agent_type) {
      parts.push(filters.agent_type.replace("_", " "))
    }

    if (filters.branch_id) {
      const branch = branchOptions.find((option) => option.value === filters.branch_id)
      if (branch) parts.push(branch.label)
    }

    return parts.length > 0 ? parts.join(" · ") : undefined
  }, [activeMetricFilter, filters, branchOptions])

  const handleSearch = () => {
    setSearchQuery(search)
  }

  const handleClearSearch = () => {
    setSearch("")
    setSearchQuery("")
  }

  const handleMetricFilter = (metricId: string) => {
    if (metricId === "total" || metricId === "total-bookings") {
      setActiveMetricFilter((current) => (current === metricId ? null : metricId))
      return
    }
    setActiveMetricFilter((current) => (current === metricId ? null : metricId))
  }

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent)
    setFormOpen(true)
  }

  const handleToggleStatus = async (agent: Agent) => {
    const nextStatus = agent.status === "active" ? "inactive" : "active"
    try {
      await toggleAgentStatusApi(agent._id, nextStatus)
      toast({
        title: "Status updated",
        description: `${agent.name} is now ${nextStatus}.`,
      })
      refreshAgents()
    } catch (error) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to update agent status."),
        variant: "destructive",
      })
    }
  }

  const handleDeleteAgent = async () => {
    if (!deleteTarget) return

    try {
      await deleteAgentApi(deleteTarget._id)
      toast({
        title: "Agent deleted",
        description: `${deleteTarget.name} has been removed.`,
      })
      setDeleteTarget(null)
      refreshAgents()
    } catch (error) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to delete agent."),
        variant: "destructive",
      })
    }
  }

  const handleApplyFilters = (nextFilters: AgentFilterState) => {
    setFilters(nextFilters)
  }

  const handleClearFilters = () => {
    setFilters({ status: "", agent_type: "", branch_id: "" })
    setActiveMetricFilter(null)
  }

  if (isAuthLoading || isPermissionsLoading) {
    return (
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-4 pb-6 pt-2 sm:px-6">
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          Loading agents...
        </div>
      </div>
    )
  }

  if (!canViewAgents) {
    return (
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-4 pb-6 pt-2 sm:px-6">
        <Card className="border-none shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Shield className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Access restricted</p>
              <p className="text-sm text-muted-foreground">
                You don&apos;t have permission to view agents. Ask an admin to enable the View Agent permission for your role.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-4 pb-6 pt-2 sm:px-6">
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <IdCard className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-foreground lg:text-2xl">Agents</h1>
        </div>
      </div>

      <AgentsSummary
        metrics={metrics}
        isLoading={isMetricsLoading}
        onFilterByMetric={handleMetricFilter}
        activeMetricFilter={activeMetricFilter}
      />

      <div className="mb-4 mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full max-w-xl items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch()
              }}
              placeholder="Search by name, email, phone, role..."
              className="h-10 pl-9 pr-9"
            />
            {search ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={handleSearch}>
                  <Check className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Search</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-10 gap-2"
            onClick={() => setFilterOpen(true)}
          >
            <FilterIcon className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 ? (
              <span className={cn("rounded-full px-1.5 py-0.5", themeFilterCountBadgeClassName)}>
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
          {(activeFilterCount > 0 || activeMetricFilter) && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <AgentsTable
          agents={agents}
          isLoading={isLoading}
          filterLabel={filterLabel}
          roles={roles}
          getBranchName={getBranchName}
          onEditAgent={canEditAgent ? handleEditAgent : undefined}
          onDeleteAgent={canDeleteAgent ? setDeleteTarget : undefined}
          onToggleStatus={canEditAgent ? handleToggleStatus : undefined}
        />
      </div>

      <AgentFormDrawer
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingAgent(null)
        }}
        agent={editingAgent}
        onSuccess={refreshAgents}
      />

      <AgentFilterDrawer
        open={filterOpen}
        onOpenChange={setFilterOpen}
        filters={filters}
        branchOptions={branchOptions}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      <DeleteItemAlert
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onDelete={handleDeleteAgent}
        itemName={deleteTarget?.name ?? ""}
        itemType="Agent"
      />
    </div>
  )
}
