"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import {
  Building,
  FileText,
  Hash,
  IndianRupee,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react"

import { EditableField } from "@/components/lead-detail-page/editable-field"
import { EditableTitle } from "@/components/lead-detail-page/editable-title"
import { MatchedLeadsPanel } from "@/components/project-detail-page/matched-leads-panel"
import { ProjectDocumentsPanel } from "@/components/project-detail-page/project-documents-panel"
import { SiteVisitsPanel } from "@/components/project-detail-page/site-visits-panel"
import { UnitsPanel } from "@/components/project-detail-page/units-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useProjectPermissions } from "@/hooks/useProjectPermissions"
import { useUserData } from "@/hooks/useUserData"
import { getApiErrorMessage } from "@/lib/api"
import {
  coerceProjectUnits,
  fetchProjectSettingsListApi,
  mapProjectSettingsToOptions,
  resolveProjectStatusOption,
  updateProjectApi,
} from "@/lib/projects/project-api"
import {
  fetchMatchedLeadsSafe,
  fetchProjectDetailBundle,
  PROJECT_SETTINGS_QUERY_KEY,
  projectDetailQueryKey,
  projectMatchedLeadsQueryKey,
} from "@/lib/projects/project-shared-queries"
import type { Project } from "@/lib/projects/types"
import { formatIndianCurrency } from "@/lib/projects/types"
import {
  PROPERTY_TYPE_LABELS,
  RERA_STATUS_LABELS,
} from "@/lib/projects/types"
import {
  leadDetailBodyClassName,
  leadDetailBodyMutedClassName,
  leadDetailCaptionClassName,
  leadDetailCardClassName,
  leadDetailContentAreaClassName,
  leadDetailFieldValueClassName,
  leadDetailHeaderClassName,
  leadDetailIconBoxClassName,
  leadDetailMetaLabelClassName,
  leadDetailPageBackgroundClassName,
  leadDetailStatCardClassName,
  leadDetailPageTitleClassName,
  leadDetailSectionTitleClassName,
  leadDetailSubsectionLabelClassName,
  leadDetailTabBarClassName,
} from "@/lib/form-field-styles"
import { cn } from "@/lib/utils"
import { countUnitsWithOwnerSiteStatus, type UnitStatusFilter } from "./units/unit-utils"

const RERA_STATUS_OPTIONS = Object.entries(RERA_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { userData, isAuthLoading } = useUserData()
  const {
    canViewProjects,
    canEditProject,
    isLoading: isPermissionsLoading,
  } = useProjectPermissions()
  const canViewProjectDocuments = canViewProjects
  const canAddProjectDocument = canEditProject
  const canDownloadProjectDocument = canViewProjects
  const projectId = Array.isArray(params?.id) ? params.id[0] : String(params?.id ?? "")
  const token = userData?.access_token ?? null

  const [activeTab, setActiveTab] = useState("units")
  const [unitStatusFilter, setUnitStatusFilter] = useState<UnitStatusFilter | null>(null)

  useEffect(() => {
    if (isAuthLoading) return
    if (!userData) router.push("/login")
  }, [isAuthLoading, userData, router])

  const { data: settings } = useQuery({
    queryKey: PROJECT_SETTINGS_QUERY_KEY,
    enabled: !!token,
    queryFn: () => fetchProjectSettingsListApi(),
  })

  const statusOptions = useMemo(
    () => mapProjectSettingsToOptions(settings?.unit_status),
    [settings],
  )
  const projectStatusOptions = useMemo(
    () => mapProjectSettingsToOptions(settings?.project_status),
    [settings],
  )

  const {
    data: project,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: projectDetailQueryKey(projectId),
    enabled: !!token && !!projectId,
    queryFn: () => fetchProjectDetailBundle(projectId),
  })

  const { data: matchedLeads = [] } = useQuery({
    queryKey: projectMatchedLeadsQueryKey(projectId),
    enabled: !!token && !!projectId,
    queryFn: () => fetchMatchedLeadsSafe(projectId),
  })

  const documentsCount = project?.documents?.length ?? 0

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to load project details."),
        variant: "destructive",
      })
    }
  }, [error, toast])
  const ownerSiteUnits = useMemo(() => {
    if (!project) return 0

    const units = coerceProjectUnits(project.units)
    if (statusOptions.length > 0) {
      return countUnitsWithOwnerSiteStatus(units, statusOptions)
    }

    return project.owner_site_units ?? 0
  }, [project, statusOptions])

  const projectStatusOption = useMemo(
    () =>
      project
        ? resolveProjectStatusOption(project.status, projectStatusOptions)
        : undefined,
    [project, projectStatusOptions],
  )

  const refreshProject = (options?: { silent?: boolean }) => {
    void queryClient.invalidateQueries({ queryKey: projectDetailQueryKey(projectId) })
    if (!options?.silent) {
      void queryClient.invalidateQueries({ queryKey: projectMatchedLeadsQueryKey(projectId) })
    }
  }

  const patchProjectCache = (updater: (prev: Project) => Project) => {
    queryClient.setQueryData<Project>(projectDetailQueryKey(projectId), (prev) =>
      prev ? updater(prev) : prev,
    )
  }

  const handleFieldUpdate = async (field: string, value: string) => {
    if (!project) return

    let parsedValue: string | number | string[] = value

    if (field === "price_per_cent") {
      parsedValue = value.trim()
    }

    if (
      field === "price_per_sqft" ||
      field === "price_range_min" ||
      field === "price_range_max"
    ) {
      parsedValue = Number(value) || 0
    }

    if (field === "highlights") {
      parsedValue = value.split("\n").map((line) => line.trim()).filter(Boolean)
    }

    try {
      const updated = await updateProjectApi(project._id, { [field]: parsedValue })
      patchProjectCache((prev) => ({
        ...prev,
        ...updated,
        units: prev.units,
        site_visits: prev.site_visits,
        documents: prev.documents,
      }))
      toast({
        title: "Updated",
        description: `${field.replace(/_/g, " ")} saved successfully.`,
      })
    } catch (updateError) {
      toast({
        title: "Error",
        description: getApiErrorMessage(updateError, "Failed to update project."),
        variant: "destructive",
      })
    }
  }

  const handleTitleSave = (value: string) => {
    void handleFieldUpdate("name", value.toUpperCase())
  }

  const handleUnitStatusFilter = (filter: UnitStatusFilter) => {
    setUnitStatusFilter((current) => (current === filter ? null : filter))
    setActiveTab("units")
  }

  if (isLoading && !project) {
    return (
      <div className={cn("flex min-h-0 flex-1 flex-col items-center justify-center gap-3", leadDetailPageBackgroundClassName)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className={leadDetailBodyMutedClassName}>Loading project details...</p>
      </div>
    )
  }

  if (error && !project) {
    return (
      <div className={cn("flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4", leadDetailPageBackgroundClassName)}>
        <p className="text-center text-sm text-destructive">
          {getApiErrorMessage(error, "Failed to load project details.")}
        </p>
        <Button
          variant="outline"
          onClick={() => {
            void refetch()
          }}
          disabled={isFetching}
        >
          Retry
        </Button>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <p className="text-sm text-muted-foreground">Project not found.</p>
        <Button asChild variant="outline">
          <Link href="/projects">Back to Projects</Link>
        </Button>
      </div>
    )
  }

  if (!canViewProjects && !isPermissionsLoading) {
    return (
      <div className={cn("flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8", leadDetailContentAreaClassName)}>
        <p className="text-sm text-muted-foreground">You don&apos;t have permission to view projects.</p>
        <Button variant="outline" onClick={() => router.push("/projects")}>
          Back to Projects
        </Button>
      </div>
    )
  }

  const propertyTypeLabels = project.property_types
    .map((type) => PROPERTY_TYPE_LABELS[type])
    .join(", ")

  const unitMetricFilters = [
    {
      id: "available" as const,
      label: "Available",
      value: project.available_units,
      activeClassName:
        "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200 dark:border-emerald-700 dark:bg-emerald-950/50 dark:ring-emerald-800",
      valueClassName: "text-emerald-600 dark:text-emerald-400",
    },
    {
      id: "on_hold" as const,
      label: "On Hold",
      value: project.blocked_units,
      activeClassName:
        "border-amber-300 bg-amber-50 ring-1 ring-amber-200 dark:border-amber-700 dark:bg-amber-950/50 dark:ring-amber-800",
      valueClassName: "text-amber-600 dark:text-amber-400",
    },
    {
      id: "booked" as const,
      label: "Booked",
      value: project.sold_units,
      activeClassName:
        "border-blue-300 bg-blue-50 ring-1 ring-blue-200 dark:border-blue-700 dark:bg-blue-950/50 dark:ring-blue-800",
      valueClassName: "text-blue-600 dark:text-blue-400",
    },
    {
      id: "owner_site" as const,
      label: "Owner Site",
      value: ownerSiteUnits,
      activeClassName:
        "border-violet-300 bg-violet-50 ring-1 ring-violet-200 dark:border-violet-700 dark:bg-violet-950/50 dark:ring-violet-800",
      valueClassName: "text-violet-600 dark:text-violet-400",
    },
  ]

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", leadDetailContentAreaClassName)}>
      <div className={cn(leadDetailHeaderClassName, "shrink-0 px-3 py-4 sm:px-4 lg:px-6 lg:py-5")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <EditableTitle
                value={project.name}
                onSave={handleTitleSave}
                className={leadDetailPageTitleClassName}
                canEdit={canEditProject}
              />
              <Badge variant="outline" className="font-mono text-xs">
                {project.project_no}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  !projectStatusOption?.color &&
                    (projectStatusOption?.label ?? project.status).toLowerCase() === "active" &&
                    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
                  !projectStatusOption?.color &&
                    (projectStatusOption?.label ?? project.status).toLowerCase() === "inactive" &&
                    "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400",
                )}
                style={
                  projectStatusOption?.color
                    ? {
                        borderColor: `${projectStatusOption.color}40`,
                        backgroundColor: `${projectStatusOption.color}14`,
                        color: projectStatusOption.color,
                      }
                    : undefined
                }
              >
                {projectStatusOption?.label ?? project.status}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1">
              <span className={leadDetailCaptionClassName}>
                <MapPin className="mr-1 inline h-3.5 w-3.5" />
                {project.area_locality}, {project.location}
              </span>
              <span className={leadDetailCaptionClassName}>
                Created {project.create_date}
              </span>
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {unitMetricFilters.map((metric) => (
              <button
                key={metric.id}
                type="button"
                onClick={() => handleUnitStatusFilter(metric.id)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-colors",
                  unitStatusFilter === metric.id
                    ? metric.activeClassName
                    : cn(leadDetailStatCardClassName, "hover:bg-muted/50"),
                )}
              >
                <p className={leadDetailMetaLabelClassName}>{metric.label}</p>
                <p className={cn("text-lg font-semibold tabular-nums", metric.valueClassName)}>
                  {metric.value}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto xl:overflow-hidden">
        <div
          className={cn(
            "flex flex-col gap-4 p-3 sm:gap-5 sm:p-4 lg:p-6 xl:min-h-0 xl:flex-1 xl:flex-row xl:overflow-hidden",
            leadDetailContentAreaClassName,
          )}
        >
          <aside className="order-2 w-full space-y-4 xl:order-1 xl:w-[300px] xl:shrink-0 xl:overflow-y-auto custom-scrollbar">
          <Card className={leadDetailCardClassName}>
            <CardContent className="p-5">
              <h3 className={cn(leadDetailSectionTitleClassName, "mb-1")}>Commercial</h3>
              <div className="space-y-0">
                <EditableField
                  variant="detail"
                  icon={IndianRupee}
                  field="price_per_sqft"
                  value={String(project.price_per_sqft)}
                  label="Price per sq.ft (₹)"
                  type="number"
                  canEdit={canEditProject}
                  onSave={handleFieldUpdate}
                />
                <EditableField
                  variant="detail"
                  icon={IndianRupee}
                  field="price_per_cent"
                  value={
                    project.price_per_cent != null ? String(project.price_per_cent) : ""
                  }
                  label="Price per cent (₹)"
                  type="number"
                  canEdit={canEditProject}
                  onSave={handleFieldUpdate}
                />
                <EditableField
                  variant="detail"
                  icon={IndianRupee}
                  field="price_range_min"
                  value={String(project.price_range_min)}
                  label="Min Price (₹)"
                  type="number"
                  canEdit={canEditProject}
                  onSave={handleFieldUpdate}
                />
                <EditableField
                  variant="detail"
                  icon={IndianRupee}
                  field="price_range_max"
                  value={String(project.price_range_max)}
                  label="Max Price (₹)"
                  type="number"
                  canEdit={canEditProject}
                  onSave={handleFieldUpdate}
                />
                <div className={cn("flex items-start gap-3 border-b border-border py-3")}>
                  <div className={leadDetailIconBoxClassName}>
                    <Building className="h-4 w-4" />
                  </div>
                  <div>
                    <p className={leadDetailSubsectionLabelClassName}>
                      Property Types
                    </p>
                    <p className={cn(leadDetailFieldValueClassName, "mt-0.5")}>{propertyTypeLabels}</p>
                  </div>
                </div>
              </div>
              <p className={cn(leadDetailSubsectionLabelClassName, "mt-4 mb-2")}>Price range</p>
              <p className={leadDetailBodyClassName}>
                {formatIndianCurrency(project.price_range_min)} –{" "}
                {formatIndianCurrency(project.price_range_max)}
              </p>
            </CardContent>
          </Card>

          <Card className={leadDetailCardClassName}>
            <CardContent className="p-5">
              <h3 className={cn(leadDetailSectionTitleClassName, "mb-1")}>Legal & Compliance</h3>
              <div className="space-y-0">
                <EditableField
                  variant="detail"
                  icon={ShieldCheck}
                  field="rera_status"
                  value={project.rera_status}
                  label="RERA Status"
                  options={RERA_STATUS_OPTIONS}
                  canEdit={canEditProject}
                  onSave={handleFieldUpdate}
                />
                <EditableField
                  variant="detail"
                  icon={Hash}
                  field="rera_number"
                  value={project.rera_number ?? ""}
                  label="RERA Number"
                  canEdit={canEditProject}
                  onSave={handleFieldUpdate}
                />
                <EditableField
                  variant="detail"
                  icon={FileText}
                  field="dtcp_status"
                  value={project.dtcp_status ?? ""}
                  label="DTCP Status"
                  canEdit={canEditProject}
                  onSave={handleFieldUpdate}
                />
                <EditableField
                  variant="detail"
                  icon={Hash}
                  field="dtcp_number"
                  value={project.dtcp_number ?? ""}
                  label="DTCP Number"
                  canEdit={canEditProject}
                  onSave={handleFieldUpdate}
                />
                <EditableField
                  variant="detail"
                  icon={MapPin}
                  field="area_locality"
                  value={project.area_locality}
                  label="Locality"
                  canEdit={canEditProject}
                  onSave={handleFieldUpdate}
                />
                <EditableField
                  variant="detail"
                  icon={MapPin}
                  field="location"
                  value={project.location}
                  label="City / District"
                  canEdit={canEditProject}
                  onSave={handleFieldUpdate}
                />
                <EditableField
                  variant="detail"
                  icon={Building}
                  field="status"
                  value={
                    resolveProjectStatusOption(project.status, projectStatusOptions)?.value ??
                    project.status
                  }
                  label="Status"
                  options={projectStatusOptions}
                  canEdit={canEditProject}
                  onSave={handleFieldUpdate}
                />
              </div>
            </CardContent>
          </Card>

          <Card className={leadDetailCardClassName}>
            <CardContent className="p-5">
              <h3 className={cn(leadDetailSectionTitleClassName, "mb-3")}>Key Highlights</h3>
              {project.highlights.length > 0 ? (
                <ul className="space-y-2">
                  {project.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2 text-sm text-foreground/90">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No highlights added.</p>
              )}
            </CardContent>
          </Card>
          </aside>

          <div className="order-1 min-w-0 w-full xl:order-2 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col xl:overflow-hidden">
            <Card className={cn(leadDetailCardClassName, "flex min-h-[min(480px,calc(100vh-16rem))] flex-col overflow-hidden xl:min-h-0 xl:flex-1")}>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className={cn(leadDetailTabBarClassName, "shrink-0 px-2")}>
                  <div className="overflow-x-auto px-4 [-webkit-overflow-scrolling:touch]">
                    <TabsList className="flex h-auto w-max min-w-full justify-start gap-0.5 border-b-0 bg-transparent p-0 sm:gap-1">
                      <TabsTrigger
                        value="units"
                        className="shrink-0 rounded-none border-b-2 border-transparent px-3 py-3 text-xs font-medium text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none sm:px-4 sm:py-3.5 sm:text-sm"
                      >
                        Units ({coerceProjectUnits(project.units).length})
                      </TabsTrigger>
                      <TabsTrigger
                        value="site-visits"
                        className="shrink-0 rounded-none border-b-2 border-transparent px-3 py-3 text-xs font-medium text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none sm:px-4 sm:py-3.5 sm:text-sm"
                      >
                        Site Visits ({project.site_visits.length})
                      </TabsTrigger>
                      <TabsTrigger
                        value="matched-leads"
                        className="shrink-0 rounded-none border-b-2 border-transparent px-3 py-3 text-xs font-medium text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none sm:px-4 sm:py-3.5 sm:text-sm"
                      >
                        <Target className="mr-1.5 inline h-3.5 w-3.5" />
                        Matched Leads ({matchedLeads.length})
                      </TabsTrigger>
                      <TabsTrigger
                        value="documents"
                        className="shrink-0 rounded-none border-b-2 border-transparent px-3 py-3 text-xs font-medium text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none sm:px-4 sm:py-3.5 sm:text-sm"
                        disabled={!canViewProjectDocuments}
                      >
                        Documents ({documentsCount})
                      </TabsTrigger>
                      <TabsTrigger
                        value="overview"
                        className="shrink-0 rounded-none border-b-2 border-transparent px-3 py-3 text-xs font-medium text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none sm:px-4 sm:py-3.5 sm:text-sm"
                      >
                        Overview
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-3 sm:p-5 lg:p-6">
                <TabsContent value="units" forceMount className="m-0 data-[state=inactive]:hidden">
                  <UnitsPanel
                    projectId={project._id}
                    units={project.units}
                    statusFilter={unitStatusFilter}
                    statusOptions={statusOptions}
                    onRefresh={() => refreshProject({ silent: true })}
                    permissions={{
                      canCreate: canEditProject,
                      canEdit: canEditProject,
                      canDelete: canEditProject,
                      fields: {
                        unit_no: canEditProject,
                        block: canEditProject,
                        property_type: canEditProject,
                        area: canEditProject,
                        price_per_sqft: canEditProject,
                        total_price: canEditProject,
                        status: canEditProject,
                      },
                    }}
                  />
                </TabsContent>

                <TabsContent value="site-visits" forceMount className="m-0 data-[state=inactive]:hidden">
                  <SiteVisitsPanel
                    projectId={project._id}
                    siteVisits={project.site_visits}
                    onRefresh={() => refreshProject({ silent: true })}
                  />
                </TabsContent>

                <TabsContent value="matched-leads" forceMount className="m-0 data-[state=inactive]:hidden">
                  <MatchedLeadsPanel leads={matchedLeads} />
                </TabsContent>

                <TabsContent value="documents" forceMount className="m-0 data-[state=inactive]:hidden">
                  {!canViewProjectDocuments ? (
                    <p className={cn(leadDetailBodyMutedClassName, "py-4")}>
                      You don&apos;t have permission to view documents.
                    </p>
                  ) : (
                    <ProjectDocumentsPanel
                      projectId={projectId}
                      documents={project.documents}
                      canAddDocument={canAddProjectDocument}
                      canDownloadDocument={canDownloadProjectDocument}
                      onRefresh={() => refreshProject({ silent: true })}
                    />
                  )}
                </TabsContent>

                <TabsContent value="overview" forceMount className="m-0 space-y-4 data-[state=inactive]:hidden">
                  <div>
                    <h3 className={cn(leadDetailSectionTitleClassName, "mb-2")}>Description</h3>
                    <EditableField
                      field="description"
                      value={project.description ?? ""}
                      label="Project Description"
                      isTextarea
                      canEdit={canEditProject}
                      onSave={handleFieldUpdate}
                    />
                  </div>
                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <h3 className={leadDetailSectionTitleClassName}>Lead Matching Band</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Budget {formatIndianCurrency(project.budget_min)} –{" "}
                      {formatIndianCurrency(project.budget_max)} · Types: {propertyTypeLabels}
                    </p>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  </div>
  )
}
