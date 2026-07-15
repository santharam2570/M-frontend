"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  ExternalLink,
  FileText,
  IdCard,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Power,
  Trash2,
} from "lucide-react"

import { AssignedProjectsSection } from "@/components/agent-detail-page/assigned-projects-section"
import { DashboardPageLayout } from "@/components/layout/dashboard-page-layout"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DeleteItemAlert } from "@/components/ui/delete-item-alert"
import { useToast } from "@/hooks/use-toast"
import { useAgentPermissions } from "@/hooks/useAgentPermissions"
import { useUserData } from "@/hooks/useUserData"
import { getApiErrorMessage } from "@/lib/api"
import {
  deleteAgentApi,
  fetchAgentDetail,
  toggleAgentStatusApi,
} from "@/lib/agents/agent-api"
import {
  AGENT_STATUS_LABELS,
  AGENT_TYPE_LABELS,
  type Agent,
} from "@/lib/agents/types"
import {
  leadDetailCardClassName,
  leadDetailContentAreaClassName,
  leadDetailDashedEmptyClassName,
  leadDetailFieldLabelClassName,
  leadDetailFieldValueClassName,
  leadDetailHeaderClassName,
  leadDetailMetaTextClassName,
  leadDetailPageTitleClassName,
  themePrimaryBadgeClassName,
} from "@/lib/form-field-styles"
import { cn } from "@/lib/utils"
import { formatDateForAgeing } from "@/lib/date-ageing"
import URLS from "@/config/urls"

const AgentFormDrawer = dynamic(
  () =>
    import("@/components/agent-list-page/agent-form-drawer").then(
      (module) => module.AgentFormDrawer,
    ),
  { ssr: false },
)

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function getProDetailsStorageKey(agentId: string): string {
  return `map-agent-pro-details-open:${agentId}`
}

function readProDetailsOpen(agentId: string): boolean {
  if (typeof window === "undefined" || !agentId) return true

  try {
    const stored = sessionStorage.getItem(getProDetailsStorageKey(agentId))
    if (stored === "true") return true
    if (stored === "false") return false
  } catch {
    // Ignore storage read errors.
  }

  return true
}

function writeProDetailsOpen(agentId: string, open: boolean): void {
  if (!agentId) return

  try {
    sessionStorage.setItem(getProDetailsStorageKey(agentId), String(open))
  } catch {
    // Ignore storage write errors.
  }
}

function findAgentInListCache(
  queryClient: ReturnType<typeof useQueryClient>,
  agentId: string,
): Agent | undefined {
  const cachedQueries = queryClient.getQueriesData<{ agents: Agent[] }>({
    queryKey: ["agent-list"],
  })

  for (const [, data] of cachedQueries) {
    const match = data?.agents?.find((item) => item._id === agentId)
    if (match) return match
  }

  return undefined
}

function DetailField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="space-y-1">
      <p className={leadDetailFieldLabelClassName}>{label}</p>
      <p className={leadDetailFieldValueClassName}>{value || "—"}</p>
    </div>
  )
}

function resolveDocumentUrl(document?: string | null): string {
  if (!document) return ""
  if (document.startsWith("http")) return document

  const baseUrl = URLS.DOCUMENT_BASE_URL || ""
  if (!baseUrl) return document
  if (document.startsWith("/")) return `${baseUrl}${document}`
  return `${baseUrl}/uploads/${document}`
}

function DocumentLinkField({ label, document }: { label: string; document?: string }) {
  const url = resolveDocumentUrl(document)

  return (
    <div className="space-y-1">
      <p className={leadDetailFieldLabelClassName}>{label}</p>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            leadDetailFieldValueClassName,
            "inline-flex items-center gap-1.5 text-primary hover:underline",
          )}
        >
          <FileText className="h-3.5 w-3.5" />
          View document
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <p className={leadDetailFieldValueClassName}>—</p>
      )}
    </div>
  )
}

export default function AgentDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { userData, isAuthLoading, getBranchName } = useUserData()
  const {
    canViewAgents,
    canEditAgent,
    canDeleteAgent,
    isLoading: isPermissionsLoading,
  } = useAgentPermissions()
  const token = userData?.access_token ?? null
  const agentId = params?.id ?? ""

  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [proDetailsOpen, setProDetailsOpen] = useState(true)

  useEffect(() => {
    setProDetailsOpen(readProDetailsOpen(agentId))
  }, [agentId])

  const handleProDetailsOpenChange = (open: boolean) => {
    setProDetailsOpen(open)
    writeProDetailsOpen(agentId, open)
  }

  useEffect(() => {
    if (isAuthLoading) return
    if (!userData) router.push("/login")
  }, [isAuthLoading, userData, router])

  const placeholderAgent = useMemo(
    () => findAgentInListCache(queryClient, agentId),
    [queryClient, agentId],
  )

  const {
    data: agent,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["agent-detail", agentId],
    enabled: !!token && !!agentId,
    queryFn: () => fetchAgentDetail(agentId),
    placeholderData: placeholderAgent,
  })

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to load agent details."),
        variant: "destructive",
      })
    }
  }, [error, toast])

  const refreshAgent = (options?: { list?: boolean; metrics?: boolean }) => {
    void queryClient.invalidateQueries({ queryKey: ["agent-detail", agentId] })
    if (options?.list !== false) {
      void queryClient.invalidateQueries({ queryKey: ["agent-list"] })
    }
    if (options?.metrics !== false) {
      void queryClient.invalidateQueries({ queryKey: ["agent-metrics"] })
    }
  }

  const handleToggleStatus = async () => {
    if (!agent) return

    const nextStatus = agent.status === "active" ? "inactive" : "active"
    try {
      await toggleAgentStatusApi(agent._id, nextStatus)
      toast({
        title: "Status updated",
        description: `${agent.name} is now ${nextStatus}.`,
      })
      refreshAgent()
    } catch (toggleError) {
      toast({
        title: "Error",
        description: getApiErrorMessage(toggleError, "Failed to update status."),
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!agent) return

    try {
      await deleteAgentApi(agent._id)
      toast({ title: "Agent deleted", description: `${agent.name} has been removed.` })
      router.push("/agents")
    } catch (deleteError) {
      toast({
        title: "Error",
        description: getApiErrorMessage(deleteError, "Failed to delete agent."),
        variant: "destructive",
      })
    }
  }

  if (isLoading && !agent) {
    return (
      <DashboardPageLayout className="flex min-h-0 w-full flex-1 items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading agent details...
        </div>
      </DashboardPageLayout>
    )
  }

  if (!isPermissionsLoading && !canViewAgents) {
    return (
      <DashboardPageLayout className="flex min-h-0 w-full flex-1 flex-col px-4 py-6 sm:px-6">
        <Button variant="ghost" size="sm" className="mb-4 w-fit gap-1" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className={cn(leadDetailDashedEmptyClassName, "py-16")}>
          You don&apos;t have permission to view agents.
        </div>
      </DashboardPageLayout>
    )
  }

  if (!agent) {
    return (
      <DashboardPageLayout className="flex min-h-0 w-full flex-1 flex-col px-4 py-6 sm:px-6">
        <Button variant="ghost" size="sm" className="mb-4 w-fit gap-1" asChild>
          <Link href="/agents">
            <ArrowLeft className="h-4 w-4" />
            Back to Agents
          </Link>
        </Button>
        <div className={cn(leadDetailDashedEmptyClassName, "py-16")}>Agent not found.</div>
      </DashboardPageLayout>
    )
  }

  return (
    <DashboardPageLayout className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-2 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" asChild>
            <Link href="/agents">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Agents
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            {canEditAgent ? (
              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => setFormOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            ) : null}
            {canEditAgent ? (
              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleToggleStatus}>
                <Power className="h-3.5 w-3.5" />
                {agent.status === "active" ? "Deactivate" : "Activate"}
              </Button>
            ) : null}
            {canDeleteAgent ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className={cn(leadDetailHeaderClassName, "shrink-0 px-4 py-5 sm:px-6")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar className="h-16 w-16 shrink-0 border border-border">
            <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
              {getInitials(agent.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className={leadDetailPageTitleClassName}>{agent.name}</h1>
                <Badge variant="outline" className={themePrimaryBadgeClassName}>
                  {AGENT_TYPE_LABELS[agent.agent_type]}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    agent.status === "active"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-600",
                  )}
                >
                  {AGENT_STATUS_LABELS[agent.status]}
                </Badge>
              </div>
              {agent.role_name ? (
                <p className={leadDetailMetaTextClassName}>{agent.role_name}</p>
              ) : null}
              {agent.agency_name && agent.agency_name !== agent.role_name ? (
                <p className={leadDetailMetaTextClassName}>{agent.agency_name}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
              <span className={cn(leadDetailMetaTextClassName, "inline-flex items-center gap-1.5")}>
                <Mail className="h-4 w-4 shrink-0" />
                {agent.email}
              </span>
              <span className={cn(leadDetailMetaTextClassName, "inline-flex items-center gap-1.5")}>
                <Phone className="h-4 w-4 shrink-0" />
                {agent.phone}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-4 pt-5 pb-6 sm:px-6 sm:pt-6",
          leadDetailContentAreaClassName,
        )}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Collapsible
          open={proDetailsOpen}
          onOpenChange={handleProDetailsOpenChange}
          className="group/pro-details lg:col-span-2"
        >
          <Card className={leadDetailCardClassName}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer pb-3 transition-colors hover:bg-muted/30">
                <CardTitle className="flex w-full items-center justify-between gap-2 text-base">
                  <span className="flex items-center gap-2">
                    <IdCard className="h-4 w-4 text-primary" />
                    Professional Details
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-in-out group-data-[state=open]/pro-details:rotate-90" />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent className="grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out data-[state=closed]:grid-rows-[0fr] data-[state=open]:grid-rows-[1fr]">
              <div className="min-h-0 overflow-hidden">
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <DetailField label="Role" value={agent.role_name} />
                    <DetailField
                      label="Branch"
                      value={agent.branch_name ?? (agent.branch_id ? getBranchName(agent.branch_id) : undefined)}
                    />
                    <DetailField label="PAN Number" value={agent.pan_number} />
                    <DetailField label="Aadhaar Number" value={agent.aadhaar_number} />
                    <DetailField label="Passport Number" value={agent.passport_number} />
                    <DetailField label="Source" value={agent.source} />
                    <DetailField label="Referred By" value={agent.referred_by} />
                    <DetailField label="Reference Contact" value={agent.reference_contact_number} />
                    <DetailField
                      label="Member Since"
                      value={agent.create_date ? formatDateForAgeing(agent.create_date) : undefined}
                    />
                    <DetailField label="Address" value={agent.address} />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <DocumentLinkField label="PAN Document" document={agent.pan_document} />
                    <DocumentLinkField label="Aadhaar Document" document={agent.aadhaar_document} />
                  </div>
                </CardContent>
              </div>
            </CollapsibleContent>
          </Card>
          </Collapsible>

          <Card className={cn(leadDetailCardClassName, "lg:col-span-2")}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              Assigned Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AssignedProjectsSection
              agent={agent}
              onUpdated={() => refreshAgent({ list: false, metrics: false })}
            />
          </CardContent>
        </Card>

        {agent.notes ? (
          <Card className={cn(leadDetailCardClassName, "lg:col-span-2")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-foreground/90">{agent.notes}</p>
            </CardContent>
          </Card>
        ) : null}
        </div>
      </div>

      {formOpen ? (
        <AgentFormDrawer
          open={formOpen}
          onOpenChange={setFormOpen}
          agent={agent}
          onSuccess={refreshAgent}
        />
      ) : null}

      <DeleteItemAlert
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDelete={handleDelete}
        itemName={agent.name}
        itemType="Agent"
      />
    </DashboardPageLayout>
  )
}
