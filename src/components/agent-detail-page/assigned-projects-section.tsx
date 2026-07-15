"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Check, ChevronDown, Loader2 } from "lucide-react"

import { AssignedProjectUnitsPanel } from "@/components/agent-detail-page/assigned-project-units-panel"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/hooks/use-toast"
import { getApiErrorMessage } from "@/lib/api"
import { updateAgentApi } from "@/lib/agents/agent-api"
import type { Agent } from "@/lib/agents/types"
import {
  formSelectTriggerClassName,
  leadDetailDashedEmptyClassName,
  leadDetailFieldLabelClassName,
} from "@/lib/form-field-styles"
import { fetchProjectList } from "@/lib/projects/project-api"
import type { Project } from "@/lib/projects/types"
import { cn } from "@/lib/utils"

const DROPDOWN_ITEM_HEIGHT_CLASS = "h-10"
const DROPDOWN_LIST_MAX_HEIGHT_CLASS = "max-h-[calc(3*2.5rem+0.5rem)]"

interface AssignedProjectsSectionProps {
  agent: Agent
  onUpdated?: () => void
}

function buildAgentPayload(agent: Agent, assignedProjectIds: string[]) {
  return {
    name: agent.name,
    email: agent.email,
    phone: agent.phone,
    agent_type: agent.agent_type,
    rera_number: agent.rera_number,
    commission_rate: agent.commission_rate,
    branch_id: agent.branch_id,
    status: agent.status,
    address: agent.address,
    city: agent.city,
    state: agent.state,
    pincode: agent.pincode,
    pan_number: agent.pan_number,
    agency_name: agent.agency_name,
    assigned_project_ids: assignedProjectIds,
    notes: agent.notes,
  }
}

export function AssignedProjectsSection({ agent, onUpdated }: AssignedProjectsSectionProps) {
  const { toast } = useToast()
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(agent.assigned_project_ids)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const latestSelectionRef = useRef(selectedProjectIds)

  const {
    data: projectListResult,
    isLoading: isLoadingProjects,
    isError: hasProjectLoadError,
  } = useQuery({
    queryKey: ["project-list", "agent-assignment"],
    enabled: isPickerOpen,
    queryFn: () => fetchProjectList({ length: 500 }),
  })

  const projects = projectListResult?.projects ?? []
  const loadError = hasProjectLoadError ? "Failed to load projects." : null
  useEffect(() => {
    setSelectedProjectIds([...new Set(agent.assigned_project_ids.filter(Boolean))])
  }, [agent.assigned_project_ids])

  useEffect(() => {
    latestSelectionRef.current = selectedProjectIds
  }, [selectedProjectIds])

  const uniqueSelectedProjectIds = useMemo(
    () => [...new Set(selectedProjectIds.filter(Boolean))],
    [selectedProjectIds],
  )

  const projectOptions = useMemo(() => {
    const seen = new Set<string>()

    return projects.filter((project) => {
      if (!project._id || seen.has(project._id)) return false
      seen.add(project._id)
      return true
    })
  }, [projects])

  const selectedProjects = useMemo(() => {
    const fromList = uniqueSelectedProjectIds
      .map((id) => projectOptions.find((project) => project._id === id))
      .filter((project): project is Project => Boolean(project))

    if (fromList.length === uniqueSelectedProjectIds.length) {
      return fromList
    }

    return uniqueSelectedProjectIds.map((id, index) => {
      const matched = projectOptions.find((project) => project._id === id)
      if (matched) return matched

      return {
        _id: id,
        name: agent.assigned_project_names[index] || `Project ${index + 1}`,
      } as Project
    })
  }, [agent.assigned_project_names, projectOptions, uniqueSelectedProjectIds])

  const persistSelection = async (nextProjectIds: string[]) => {
    setSelectedProjectIds(nextProjectIds)
    latestSelectionRef.current = nextProjectIds
    setIsSaving(true)

    try {
      await updateAgentApi(agent._id, buildAgentPayload(agent, nextProjectIds))
      toast({ title: "Projects updated", description: "Assigned projects saved successfully." })
      onUpdated?.()
    } catch (error) {
      setSelectedProjectIds(agent.assigned_project_ids)
      latestSelectionRef.current = agent.assigned_project_ids
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to update assigned projects."),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleProject = (projectId: string) => {
    const nextProjectIds = uniqueSelectedProjectIds.includes(projectId)
      ? uniqueSelectedProjectIds.filter((id) => id !== projectId)
      : [...uniqueSelectedProjectIds, projectId]

    void persistSelection(nextProjectIds)
  }

  const triggerLabel =
    selectedProjects.length === 0
      ? "Select project"
      : selectedProjects.length === 1
        ? selectedProjects[0].name
        : `${selectedProjects.length} projects selected`

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className={leadDetailFieldLabelClassName}>Project Name</p>
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Saving" />
          ) : null}
        </div>

        {isPickerOpen && isLoadingProjects ? (
          <div className={cn(leadDetailDashedEmptyClassName, "flex items-center justify-center gap-2 py-4")}>
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading projects...
          </div>
        ) : loadError ? (
          <p className={cn(leadDetailFieldLabelClassName, leadDetailDashedEmptyClassName, "py-4 text-center")}>
            {loadError}
          </p>
        ) : (
          <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={isPickerOpen}
                disabled={isSaving}
                className={cn(
                  formSelectTriggerClassName,
                  "h-10 w-full font-normal text-muted-foreground hover:bg-background",
                  selectedProjects.length > 0 && "text-foreground",
                )}
              >
                <span className="truncate">{triggerLabel}</span>
                <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search projects..." />
                <CommandList className={cn(DROPDOWN_LIST_MAX_HEIGHT_CLASS, "overflow-y-auto")}>
                  <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                    No projects found.
                  </CommandEmpty>
                  <CommandGroup className="p-1">
                    {projectOptions.map((project) => {
                      const isSelected = uniqueSelectedProjectIds.includes(project._id)

                      return (
                        <CommandItem
                          key={project._id}
                          value={`${project._id} ${project.name}`}
                          onSelect={() => toggleProject(project._id)}
                          className={cn("cursor-pointer rounded-md px-2", DROPDOWN_ITEM_HEIGHT_CLASS)}
                        >
                          <span
                            className={cn(
                              "mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible",
                            )}
                          >
                            <Check className="h-3 w-3" />
                          </span>
                          <span className="truncate text-sm font-medium text-foreground">
                            {project.name}
                          </span>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {selectedProjects.length > 0 ? (
        <AssignedProjectUnitsPanel projects={selectedProjects} />
      ) : (
        <div className={leadDetailDashedEmptyClassName}>No projects assigned yet.</div>
      )}
    </div>
  )
}
