"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
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
import { getApiErrorMessage } from "@/lib/api"
import {
  coerceProjectUnits,
  fetchProjectDetail,
  fetchProjectDocuments,
  fetchProjectMatchedLeads,
  fetchProjectSiteVisits,
  fetchProjectUnits,
  fetchUnitStatusOptionsApi,
  updateProjectApi,
  type ProjectSettingOption,
} from "@/lib/projects/project-api"
import type { MatchedLead, Project } from "@/lib/projects/types"
import { formatIndianCurrency } from "@/lib/projects/types"
import {
  PROJECT_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  RERA_STATUS_LABELS,
} from "@/lib/projects/types"
import {
  leadDetailBodyClassName,
  leadDetailBodyMutedClassName,
  leadDetailCaptionClassName,
  leadDetailMetaLabelClassName,
  leadDetailMetaTextClassName,
  leadDetailPageTitleClassName,
  leadDetailSectionTitleClassName,
  leadDetailSubsectionLabelClassName,
} from "@/lib/form-field-styles"
import { cn } from "@/lib/utils"
import { countUnitsWithOwnerSiteStatus } from "./units/unit-utils"
import type { UnitStatusFilter } from "./units/unit-utils"

const leadDetailCardClassName =
  "rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]"

const PROJECT_STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const RERA_STATUS_OPTIONS = Object.entries(RERA_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

type ProjectDetailSnapshot = {
  project: Project
  matchedLeads: MatchedLead[]
  documentsCount: number
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const projectId = Array.isArray(params?.id) ? params.id[0] : String(params?.id ?? "")
  const cachedDetail = projectId
    ? queryClient.getQueryData<ProjectDetailSnapshot>([
        "project-detail-snapshot",
        projectId,
      ])
    : undefined

  const [project, setProject] = useState<Project | null>(cachedDetail?.project ?? null)
  const [matchedLeads, setMatchedLeads] = useState<MatchedLead[]>(cachedDetail?.matchedLeads ?? [])
  const [isLoading, setIsLoading] = useState(!cachedDetail)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("units")
  const [unitStatusFilter, setUnitStatusFilter] = useState<UnitStatusFilter | null>(null)
  const [statusOptions, setStatusOptions] = useState<ProjectSettingOption[]>([])
  const [documentsCount, setDocumentsCount] = useState(cachedDetail?.documentsCount ?? 0)

  const loadProject = useCallback(async (options?: { silent?: boolean }) => {
    if (!projectId) {
      setProject(null)
      setMatchedLeads([])
      setDocumentsCount(0)
      setIsLoading(false)
      return
    }

    if (!options?.silent) {
      setIsLoading(true)
    }

    try {
      const [detail, units, siteVisits, matchedLeadsResult, documents] = await Promise.all([
        fetchProjectDetail(projectId),
        fetchProjectUnits(projectId),
        fetchProjectSiteVisits(projectId).catch(() => []),
        fetchProjectMatchedLeads(projectId).catch(() => []),
        fetchProjectDocuments(projectId).catch(() => []),
      ])

      const normalizedUnits = coerceProjectUnits(units)
      const detailUnits = coerceProjectUnits(detail.units)
      const projectDocuments =
        documents.length > 0 ? documents : detail.documents ?? []

      setProject({
        ...detail,
        units: normalizedUnits.length > 0 ? normalizedUnits : detailUnits,
        site_visits: siteVisits.length > 0 ? siteVisits : detail.site_visits,
        documents: projectDocuments,
      })
      setMatchedLeads(matchedLeadsResult)
      setDocumentsCount(projectDocuments.length)
      setError(null)
    } catch (error) {
      if (!options?.silent) {
        setProject(null)
        setDocumentsCount(0)
        const message = getApiErrorMessage(error, "Failed to load project details.")
        setError(message)
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        })
      }
    } finally {
      if (!options?.silent) {
        setIsLoading(false)
      }
    }
  }, [projectId, toast])

  useEffect(() => {
    fetchUnitStatusOptionsApi()
      .then(setStatusOptions)
      .catch(() => setStatusOptions([]))
  }, [])

  const ownerSiteUnits = useMemo(() => {
    if (!project) return 0

    const units = coerceProjectUnits(project.units)
    if (statusOptions.length > 0) {
      return countUnitsWithOwnerSiteStatus(units, statusOptions)
    }

    return project.owner_site_units ?? 0
  }, [project, statusOptions])

  useEffect(() => {
    if (!projectId) {
      setProject(null)
      setMatchedLeads([])
      setDocumentsCount(0)
      setIsLoading(false)
      return
    }

    try {
      const stored = localStorage.getItem("map_user")
      const userData = stored ? JSON.parse(stored) : null
      if (!userData?.access_token) {
        router.push("/login")
        return
      }
    } catch {
      router.push("/login")
      return
    }

    const snapshot = queryClient.getQueryData<ProjectDetailSnapshot>([
      "project-detail-snapshot",
      projectId,
    ])

    if (snapshot) {
      setProject(snapshot.project)
      setMatchedLeads(snapshot.matchedLeads)
      setDocumentsCount(snapshot.documentsCount)
      setIsLoading(false)
      setError(null)
      void loadProject({ silent: true })
      return
    }

    setProject(null)
    setMatchedLeads([])
    setDocumentsCount(0)
    setError(null)
    void loadProject()
  }, [projectId, loadProject, queryClient, router])

  useEffect(() => {
    if (isLoading || !projectId || !project?._id) return
    queryClient.setQueryData<ProjectDetailSnapshot>(["project-detail-snapshot", projectId], {
      project,
      matchedLeads,
      documentsCount,
    })
  }, [isLoading, projectId, project, matchedLeads, documentsCount, queryClient])

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
      setProject((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
              units: prev.units,
              site_visits: prev.site_visits,
              documents: prev.documents,
            }
          : updated,
      )
      toast({
        title: "Updated",
        description: `${field.replace(/_/g, " ")} saved successfully.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to update project."),
        variant: "destructive",
      })
    }
  }

  const handleTitleSave = (value: string) => {
    handleFieldUpdate("name", value.toUpperCase())
  }

  const handleUnitStatusFilter = (filter: UnitStatusFilter) => {
    setUnitStatusFilter((current) => (current === filter ? null : filter))
    setActiveTab("units")
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className={leadDetailBodyMutedClassName}>Loading project details...</p>
      </div>
    )
  }

  if (error && !project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4">
        <p className="text-center text-sm text-destructive">{error}</p>
        <Button
          variant="outline"
          onClick={() => {
            setIsLoading(true)
            setError(null)
            void loadProject()
          }}
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

  const propertyTypeLabels = project.property_types
    .map((type) => PROPERTY_TYPE_LABELS[type])
    .join(", ")

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/40">
      <div className="shrink-0 border-b border-slate-200/80 bg-white px-4 py-4 lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <EditableTitle
                value={project.name}
                onSave={handleTitleSave}
                className={leadDetailPageTitleClassName}
              />
              <Badge variant="outline" className="font-mono text-xs">
                {project.project_no}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  project.status === "active" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                )}
              >
                {PROJECT_STATUS_LABELS[project.status]}
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

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[420px]">
            <button
              type="button"
              onClick={() => handleUnitStatusFilter("available")}
              className={cn(
                "rounded-lg border px-3 py-2 text-left transition-colors",
                unitStatusFilter === "available"
                  ? "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200"
                  : "border-slate-200/80 bg-slate-50/80 hover:bg-slate-100/80",
              )}
            >
              <p className={leadDetailMetaLabelClassName}>Available</p>
              <p className={cn(leadDetailMetaTextClassName, "text-emerald-600")}>
                {project.available_units}
              </p>
            </button>
            <button
              type="button"
              onClick={() => handleUnitStatusFilter("on_hold")}
              className={cn(
                "rounded-lg border px-3 py-2 text-left transition-colors",
                unitStatusFilter === "on_hold"
                  ? "border-amber-300 bg-amber-50 ring-1 ring-amber-200"
                  : "border-slate-200/80 bg-slate-50/80 hover:bg-slate-100/80",
              )}
            >
              <p className={leadDetailMetaLabelClassName}>On Hold</p>
              <p className={leadDetailMetaTextClassName}>{project.blocked_units}</p>
            </button>
            <button
              type="button"
              onClick={() => handleUnitStatusFilter("booked")}
              className={cn(
                "rounded-lg border px-3 py-2 text-left transition-colors",
                unitStatusFilter === "booked"
                  ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200"
                  : "border-slate-200/80 bg-slate-50/80 hover:bg-slate-100/80",
              )}
            >
              <p className={leadDetailMetaLabelClassName}>Booked</p>
              <p className={leadDetailMetaTextClassName}>{project.sold_units}</p>
            </button>
            <button
              type="button"
              onClick={() => handleUnitStatusFilter("owner_site")}
              className={cn(
                "rounded-lg border px-3 py-2 text-left transition-colors",
                unitStatusFilter === "owner_site"
                  ? "border-violet-300 bg-violet-50 ring-1 ring-violet-200"
                  : "border-slate-200/80 bg-slate-50/80 hover:bg-slate-100/80",
              )}
            >
              <p className={leadDetailMetaLabelClassName}>Owner Site</p>
              <p className={leadDetailMetaTextClassName}>{ownerSiteUnits}</p>
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4 lg:flex-row lg:p-6">
        <div className="w-full shrink-0 space-y-4 lg:w-[320px] xl:w-[340px]">
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
                  onSave={handleFieldUpdate}
                />
                <EditableField
                  variant="detail"
                  icon={IndianRupee}
                  field="price_range_min"
                  value={String(project.price_range_min)}
                  label="Min Price (₹)"
                  type="number"
                  onSave={handleFieldUpdate}
                />
                <EditableField
                  variant="detail"
                  icon={IndianRupee}
                  field="price_range_max"
                  value={String(project.price_range_max)}
                  label="Max Price (₹)"
                  type="number"
                  onSave={handleFieldUpdate}
                />
                <div className="flex items-start gap-3 border-b border-slate-100 py-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                    <Building className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Property Types
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900">{propertyTypeLabels}</p>
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
                  onSave={handleFieldUpdate}
                />
                <EditableField
                  variant="detail"
                  icon={Hash}
                  field="rera_number"
                  value={project.rera_number ?? ""}
                  label="RERA Number"
                  onSave={handleFieldUpdate}
                />
                <EditableField
                  variant="detail"
                  icon={FileText}
                  field="dtcp_status"
                  value={project.dtcp_status ?? ""}
                  label="DTCP Status"
                  onSave={handleFieldUpdate}
                />
                <EditableField
                  variant="detail"
                  icon={Hash}
                  field="dtcp_number"
                  value={project.dtcp_number ?? ""}
                  label="DTCP Number"
                  onSave={handleFieldUpdate}
                />
                <EditableField
                  variant="detail"
                  icon={MapPin}
                  field="area_locality"
                  value={project.area_locality}
                  label="Locality"
                  onSave={handleFieldUpdate}
                />
                <EditableField
                  variant="detail"
                  icon={MapPin}
                  field="location"
                  value={project.location}
                  label="City / District"
                  onSave={handleFieldUpdate}
                />
                <EditableField
                  variant="detail"
                  icon={Building}
                  field="status"
                  value={project.status}
                  label="Project Status"
                  options={PROJECT_STATUS_OPTIONS}
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
                    <li key={highlight} className="flex items-start gap-2 text-sm text-slate-700">
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
        </div>

        <div className="min-w-0 flex-1">
          <Card className={cn(leadDetailCardClassName, "h-full overflow-hidden")}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b border-slate-100 bg-white px-2">
                <div className="px-4">
                  <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto border-b-0 bg-transparent p-0">
                    <TabsTrigger
                      value="units"
                      className="rounded-none border-b-2 border-transparent px-4 py-3.5 text-sm font-medium text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
                    >
                      Units ({coerceProjectUnits(project.units).length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="site-visits"
                      className="rounded-none border-b-2 border-transparent px-4 py-3.5 text-sm font-medium text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
                    >
                      Site Visits ({project.site_visits.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="matched-leads"
                      className="rounded-none border-b-2 border-transparent px-4 py-3.5 text-sm font-medium text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
                    >
                      <Target className="mr-1.5 inline h-3.5 w-3.5" />
                      Matched Leads ({matchedLeads.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="documents"
                      className="rounded-none border-b-2 border-transparent px-4 py-3.5 text-sm font-medium text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
                    >
                      Documents ({documentsCount})
                    </TabsTrigger>
                    <TabsTrigger
                      value="overview"
                      className="rounded-none border-b-2 border-transparent px-4 py-3.5 text-sm font-medium text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
                    >
                      Overview
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <div className="p-5 lg:p-6">
                <TabsContent value="units" forceMount className="m-0 data-[state=inactive]:hidden">
                  <UnitsPanel
                    projectId={project._id}
                    units={project.units}
                    statusFilter={unitStatusFilter}
                    onRefresh={() => loadProject({ silent: true })}
                  />
                </TabsContent>

                <TabsContent value="site-visits" forceMount className="m-0 data-[state=inactive]:hidden">
                  <SiteVisitsPanel
                    projectId={project._id}
                    siteVisits={project.site_visits}
                    onRefresh={() => loadProject({ silent: true })}
                  />
                </TabsContent>

                <TabsContent value="matched-leads" forceMount className="m-0 data-[state=inactive]:hidden">
                  <MatchedLeadsPanel leads={matchedLeads} />
                </TabsContent>

                <TabsContent value="documents" forceMount className="m-0 data-[state=inactive]:hidden">
                  <ProjectDocumentsPanel
                    projectId={projectId}
                    documents={project.documents}
                    onDocumentsCountChange={setDocumentsCount}
                    onRefresh={() => loadProject({ silent: true })}
                  />
                </TabsContent>

                <TabsContent value="overview" forceMount className="m-0 space-y-4 data-[state=inactive]:hidden">
                  <div>
                    <h3 className={cn(leadDetailSectionTitleClassName, "mb-2")}>Description</h3>
                    <EditableField
                      field="description"
                      value={project.description ?? ""}
                      label="Project Description"
                      isTextarea
                      onSave={handleFieldUpdate}
                    />
                  </div>
                  <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-slate-500" />
                      <h3 className={leadDetailSectionTitleClassName}>Lead Matching Band</h3>
                    </div>
                    <p className="text-sm text-slate-600">
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
  )
}
