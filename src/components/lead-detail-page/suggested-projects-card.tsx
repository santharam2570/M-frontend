"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Building, Check, ChevronDown, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import {
  formSelectTriggerClassName,
  leadDetailBodyMutedClassName,
  leadDetailSectionTitleClassName,
} from "@/lib/form-field-styles"
import { updateLeadSuggestedProjects } from "@/lib/leads/lead-api"
import { fetchProjectList } from "@/lib/projects/project-api"
import type { Project } from "@/lib/projects/types"
import { cn } from "@/lib/utils"

const leadDetailCardClassName =
  "rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]"

const DROPDOWN_ITEM_HEIGHT_CLASS = "h-10"
const DROPDOWN_LIST_MAX_HEIGHT_CLASS = "max-h-[calc(3*2.5rem+0.5rem)]"
// 3 project rows (py-2.5 + h-8 icon) plus space-y-2 gaps
const SELECTED_LIST_MAX_HEIGHT_CLASS = "max-h-[calc(3*3.25rem+1rem)]"

interface SuggestedProjectsCardProps {
  leadId: string
  selectedProjectIds: string[]
  onSelectedProjectIdsChange: (projectIds: string[]) => void
}

function ProjectNameRow({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
        <Building className="h-4 w-4" />
      </div>
      <span className="text-base font-semibold uppercase tracking-wide text-slate-900">{name}</span>
    </div>
  )
}

export function SuggestedProjectsCard({
  leadId,
  selectedProjectIds,
  onSelectedProjectIdsChange,
}: SuggestedProjectsCardProps) {
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const latestSelectionRef = useRef(selectedProjectIds)

  useEffect(() => {
    latestSelectionRef.current = selectedProjectIds
  }, [selectedProjectIds])

  useEffect(() => {
    let cancelled = false

    const loadProjects = async () => {
      setIsLoadingProjects(true)
      setLoadError(null)

      try {
        const { projects: projectList } = await fetchProjectList({ length: 500 })
        if (!cancelled) {
          setProjects(projectList)
        }
      } catch {
        if (!cancelled) {
          setProjects([])
          setLoadError("Failed to load projects.")
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProjects(false)
        }
      }
    }

    void loadProjects()

    return () => {
      cancelled = true
    }
  }, [])

  const selectedProjects = useMemo(
    () =>
      selectedProjectIds
        .map((id) => projects.find((project) => project._id === id))
        .filter((project): project is Project => Boolean(project)),
    [projects, selectedProjectIds],
  )

  const persistSelection = async (nextProjectIds: string[]) => {
    if (!leadId) return

    onSelectedProjectIdsChange(nextProjectIds)
    latestSelectionRef.current = nextProjectIds
    setIsSaving(true)

    try {
      await updateLeadSuggestedProjects(leadId, nextProjectIds)
    } catch (error) {
      toast({
        title: "Saved locally",
        description:
          error instanceof Error
            ? `${error.message} Your selection is kept in this browser.`
            : "Could not sync to server. Your selection is kept in this browser.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleProject = (projectId: string) => {
    const nextProjectIds = selectedProjectIds.includes(projectId)
      ? selectedProjectIds.filter((id) => id !== projectId)
      : [...selectedProjectIds, projectId]

    void persistSelection(nextProjectIds)
  }

  const triggerLabel =
    selectedProjects.length === 0
      ? "Select projects"
      : selectedProjects.length === 1
        ? selectedProjects[0].name
        : `${selectedProjects.length} projects selected`

  return (
    <Card className={leadDetailCardClassName}>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className={leadDetailSectionTitleClassName}>Suggested Projects</h3>
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Saving" />
          ) : null}
        </div>

        {isLoadingProjects ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading projects...
          </div>
        ) : loadError ? (
          <p
            className={cn(
              leadDetailBodyMutedClassName,
              "rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center",
            )}
          >
            {loadError}
          </p>
        ) : projects.length === 0 ? (
          <p
            className={cn(
              leadDetailBodyMutedClassName,
              "rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center",
            )}
          >
            No projects found.
          </p>
        ) : (
          <div className="space-y-3">
            <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={isPickerOpen}
                  disabled={!leadId || isSaving}
                  className={cn(
                    formSelectTriggerClassName,
                    "h-10 font-normal text-muted-foreground hover:bg-background",
                    selectedProjects.length > 0 && "text-foreground",
                  )}
                >
                  <span className="truncate">{triggerLabel}</span>
                  <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className={cn(
                  leadDetailCardClassName,
                  "w-[var(--radix-popover-trigger-width)] p-0",
                )}
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Search projects..." />
                  <CommandList className={cn(DROPDOWN_LIST_MAX_HEIGHT_CLASS, "overflow-y-auto")}>
                    <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                      No projects found.
                    </CommandEmpty>
                    <CommandGroup className="p-1">
                      {projects.map((project) => {
                        const isSelected = selectedProjectIds.includes(project._id)

                        return (
                          <CommandItem
                            key={project._id}
                            value={project.name}
                            onSelect={() => toggleProject(project._id)}
                            className={cn(
                              "cursor-pointer rounded-md px-2",
                              DROPDOWN_ITEM_HEIGHT_CLASS,
                            )}
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
                            <span className="truncate text-sm font-medium text-slate-900">
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

            <div
              className={cn(
                "space-y-2",
                selectedProjects.length > 3 && cn(SELECTED_LIST_MAX_HEIGHT_CLASS, "overflow-y-auto"),
              )}
            >
              {selectedProjects.length === 0 ? (
                <p
                  className={cn(
                    leadDetailBodyMutedClassName,
                    "rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center",
                  )}
                >
                  No projects selected.
                </p>
              ) : (
                selectedProjects.map((project) => (
                  <ProjectNameRow key={project._id} name={project.name} />
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
