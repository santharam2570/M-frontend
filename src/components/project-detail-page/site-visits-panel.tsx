"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { format, isValid, parseISO } from "date-fns"
import { Calendar, Loader2, User, Users } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  FormSelectContent,
  FormSelectItem,
  Select,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import URLS from "@/config/urls"
import { useToast } from "@/hooks/use-toast"
import { getApiErrorMessage, parseJsonResponse } from "@/lib/api"
import type { SiteVisit } from "@/lib/projects/types"
import { cn } from "@/lib/utils"
import {
  formInputClassName,
  formSelectTriggerClassName,
  formTextareaClassName,
} from "@/lib/form-field-styles"

interface SiteVisitsPanelProps {
  projectId: string
  onRefresh?: () => void
}

type RawRecord = Record<string, unknown>

interface ApiEnvelope<T> {
  code?: number
  msg?: string
  data?: T
}

interface LeadOption {
  _id: string
  name: string
}

interface UserOption {
  _id: string
  name: string
  profile_image?: string
}

type ScheduleVisitFormErrors = {
  lead?: string
  visitDate?: string
  visitTime?: string
  assignedTo?: string
  attachingPerson?: string
}

const EMPTY_FORM_ERRORS: ScheduleVisitFormErrors = {}

function validateScheduleVisitForm(values: {
  selectedLeadId: string
  visitDate: string
  visitTime: string
  selectedAgentId: string
  attachingPerson: string
}): ScheduleVisitFormErrors {
  const errors: ScheduleVisitFormErrors = {}

  if (!values.selectedLeadId) {
    errors.lead = "Lead is required."
  }
  if (!values.visitDate.trim()) {
    errors.visitDate = "Visit date is required."
  }
  if (!values.visitTime.trim()) {
    errors.visitTime = "Time is required."
  }
  if (!values.selectedAgentId) {
    errors.assignedTo = "Assigned to is required."
  }
  if (!values.attachingPerson.trim()) {
    errors.attachingPerson = "Attaching person is required."
  }

  return errors
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null

  return <p className="text-xs text-destructive">{message}</p>
}

function resolveId(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (typeof value === "object" && value !== null) {
    if ("$oid" in value) return String((value as { $oid: string }).$oid)
    if ("_id" in value) return resolveId((value as { _id: unknown })._id)
  }
  return ""
}

function normalizeSiteVisit(raw: RawRecord, projectId: string): SiteVisit {
  return {
    _id: resolveId(raw._id ?? raw.id),
    project_id: resolveId(raw.project_id) || projectId,
    lead_id: raw.lead_id ? resolveId(raw.lead_id) : undefined,
    lead_name: String(raw.lead_name ?? raw.name ?? ""),
    visit_date: String(raw.visit_date ?? ""),
    visit_time: String(raw.visit_time ?? ""),
    agent_name: String(raw.agent_name ?? raw.agent ?? ""),
    attaching_person: raw.attaching_person
      ? String(raw.attaching_person)
      : undefined,
    family_attended: Boolean(raw.family_attended),
    feedback: raw.feedback ? String(raw.feedback) : undefined,
    follow_up_scheduled: Boolean(raw.follow_up_scheduled),
    next_follow_up_date: raw.next_follow_up_date
      ? String(raw.next_follow_up_date)
      : undefined,
    status: (raw.status as SiteVisit["status"]) ?? "scheduled",
  }
}

function getAuthHeaders(): HeadersInit {
  const userData = JSON.parse(localStorage.getItem("map_user") || "{}")
  if (!userData.access_token) {
    throw new Error("You are not logged in. Please sign in again.")
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${userData.access_token}`,
  }
}

async function fetchProjectSiteVisits(projectId: string): Promise<SiteVisit[]> {
  const response = await fetch(
    `${URLS.PROJECT_SITE_VISITS}?project_id=${encodeURIComponent(projectId)}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    },
  )

  const result = await parseJsonResponse<ApiEnvelope<RawRecord[]>>(response)

  if (result.code !== 200) {
    throw new Error(result.msg || "Failed to load site visits.")
  }

  const items = Array.isArray(result.data) ? result.data : []
  return items.map((item) => normalizeSiteVisit(item, projectId))
}

async function createProjectSiteVisit(
  projectId: string,
  payload: Omit<SiteVisit, "_id" | "project_id">,
): Promise<SiteVisit> {
  const response = await fetch(URLS.PROJECT_SITE_VISITS, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      project_id: projectId,
      ...payload,
    }),
  })

  const result = await parseJsonResponse<ApiEnvelope<RawRecord>>(response)

  if (result.code !== 200 || !result.data) {
    throw new Error(result.msg || "Failed to schedule site visit.")
  }

  return normalizeSiteVisit(result.data, projectId)
}

async function fetchLeadOptions(): Promise<LeadOption[]> {
  const response = await fetch(`${URLS.LEAD_LIST}?page=1&length=100`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      draw: 1,
      search: { value: "", regex: false },
      filter: [],
    }),
  })

  const result = await parseJsonResponse<ApiEnvelope<RawRecord[]>>(response)

  if (result.code !== 200) {
    throw new Error(result.msg || "Failed to load leads.")
  }

  const items = Array.isArray(result.data) ? result.data : []
  return items
    .map((lead) => ({
      _id: resolveId(lead._id ?? lead.id),
      name: String(lead.name ?? lead.company_name ?? "Unnamed lead"),
    }))
    .filter((lead) => lead._id)
}

async function fetchAssignableUsers(): Promise<UserOption[]> {
  const response = await fetch(URLS.USERS_LIST, {
    method: "GET",
    headers: getAuthHeaders(),
  })

  const result = await parseJsonResponse<ApiEnvelope<RawRecord[]>>(response)

  if (!Array.isArray(result.data)) {
    throw new Error(result.msg || "Failed to load users.")
  }

  return result.data
    .filter((user) => user.status === "active")
    .map((user) => ({
      _id: resolveId(user._id ?? user.id),
      name: String(user.name ?? ""),
      profile_image: user.profile_image ? String(user.profile_image) : undefined,
    }))
    .filter((user) => user._id)
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function UserAvatar({ user }: { user: UserOption }) {
  return (
    <Avatar size="sm">
      {user.profile_image ? <AvatarImage src={user.profile_image} alt={user.name} /> : null}
      <AvatarFallback className="text-[10px] font-medium">{getInitials(user.name)}</AvatarFallback>
    </Avatar>
  )
}

function formatVisitDate(value: string): string {
  if (!value) return "—"

  const parsed = parseISO(value.includes("T") ? value : `${value}T00:00:00`)
  return isValid(parsed) ? format(parsed, "dd MMM yyyy") : value
}

function VisitStatusBadge({ status }: { status: SiteVisit["status"] }) {
  const config: Record<SiteVisit["status"], { label: string; className: string }> = {
    scheduled: { label: "Scheduled", className: "bg-blue-50 text-blue-700 border-blue-200" },
    completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-600 border-slate-200" },
    no_show: { label: "No Show", className: "bg-red-50 text-red-700 border-red-200" },
  }

  const item = config[status] ?? config.scheduled

  return (
    <Badge variant="outline" className={cn("text-xs font-medium", item.className)}>
      {item.label}
    </Badge>
  )
}

export function SiteVisitsPanel({ projectId, onRefresh }: SiteVisitsPanelProps) {
  const { toast } = useToast()
  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [leads, setLeads] = useState<LeadOption[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [isLoadingLeads, setIsLoadingLeads] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState("")
  const [selectedAgentId, setSelectedAgentId] = useState("")
  const [visitDate, setVisitDate] = useState("")
  const [visitTime, setVisitTime] = useState("10:00")
  const [attachingPerson, setAttachingPerson] = useState("")
  const [feedback, setFeedback] = useState("")
  const [formErrors, setFormErrors] = useState<ScheduleVisitFormErrors>(EMPTY_FORM_ERRORS)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasInitializedAssignee = useRef(false)

  const loadSiteVisits = useCallback(async () => {
    if (!projectId) {
      setSiteVisits([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const visits = await fetchProjectSiteVisits(projectId)
      setSiteVisits(visits)
    } catch (error) {
      setSiteVisits([])
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to load site visits."),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [projectId, toast])

  useEffect(() => {
    loadSiteVisits()
  }, [loadSiteVisits])

  useEffect(() => {
    if (!dialogOpen) {
      hasInitializedAssignee.current = false
      return
    }

    let cancelled = false

    const loadFormOptions = async () => {
      setIsLoadingLeads(true)
      setIsLoadingUsers(true)

      try {
        const [leadOptions, userOptions] = await Promise.all([
          fetchLeadOptions(),
          fetchAssignableUsers(),
        ])

        if (cancelled) return

        setLeads(leadOptions)
        setUsers(userOptions)

        try {
          const storedData = localStorage.getItem("map_user")
          if (!storedData || hasInitializedAssignee.current) return

          const userDetails = JSON.parse(storedData)
          const currentUserId = String(userDetails.result?.id ?? "")
          const currentUserExists = userOptions.some((user) => user._id === currentUserId)

          if (currentUserExists) {
            setSelectedAgentId(currentUserId)
            hasInitializedAssignee.current = true
          }
        } catch {
          // Ignore localStorage parse errors
        }
      } catch (error) {
        if (!cancelled) {
          setLeads([])
          setUsers([])
          toast({
            title: "Error",
            description: getApiErrorMessage(error, "Failed to load form options."),
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) {
          setIsLoadingLeads(false)
          setIsLoadingUsers(false)
        }
      }
    }

    loadFormOptions()

    return () => {
      cancelled = true
    }
  }, [dialogOpen, toast])

  const selectedLead = leads.find((lead) => lead._id === selectedLeadId)
  const selectedAgent = users.find((user) => user._id === selectedAgentId)

  const handleScheduleVisit = async () => {
    const errors = validateScheduleVisitForm({
      selectedLeadId,
      visitDate,
      visitTime,
      selectedAgentId,
      attachingPerson,
    })

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields before scheduling.",
        variant: "destructive",
      })
      return
    }

    setFormErrors(EMPTY_FORM_ERRORS)
    setIsSubmitting(true)

    try {
      const created = await createProjectSiteVisit(projectId, {
        lead_id: selectedLeadId,
        lead_name: selectedLead?.name ?? "",
        visit_date: visitDate,
        visit_time: visitTime,
        agent_name: selectedAgent?.name ?? "",
        attaching_person: attachingPerson.trim(),
        family_attended: false,
        feedback: feedback.trim() || undefined,
        follow_up_scheduled: true,
        next_follow_up_date: visitDate,
        status: "scheduled",
      })

      setSiteVisits((current) => [...current, created])

      toast({
        title: "Site visit scheduled",
        description: "Site visit successfully created.",
      })

      setDialogOpen(false)
      setSelectedLeadId("")
      setSelectedAgentId("")
      setVisitDate("")
      setAttachingPerson("")
      setFeedback("")
      setFormErrors(EMPTY_FORM_ERRORS)
      onRefresh?.()
    } catch (error) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to schedule site visit."),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Track site visits, attaching persons, and post-visit follow-ups.
        </p>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          Schedule Visit
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading site visits...
        </div>
      ) : siteVisits.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-muted-foreground">
          No site visits recorded for this project yet.
        </div>
      ) : (
        <div className="space-y-3">
          {siteVisits.map((visit) => (
            <Card key={visit._id} className="border-slate-200/80 shadow-none">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{visit.lead_name}</p>
                      <VisitStatusBadge status={visit.status} />
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatVisitDate(visit.visit_date)} · {visit.visit_time}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {visit.agent_name}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        Attaching Person: {visit.attaching_person || "—"}
                      </span>
                    </div>
                    {visit.feedback ? (
                      <p className="text-sm text-slate-600">{visit.feedback}</p>
                    ) : null}
                  </div>
                  {visit.follow_up_scheduled && visit.next_follow_up_date ? (
                    <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Next follow-up: {formatVisitDate(visit.next_follow_up_date)}
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setSelectedLeadId("")
            setSelectedAgentId("")
            setVisitDate("")
            setAttachingPerson("")
            setFeedback("")
            setFormErrors(EMPTY_FORM_ERRORS)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Site Visit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Lead Name</Label>
              <Select
                value={selectedLeadId}
                onValueChange={(value) => {
                  setSelectedLeadId(value)
                  setFormErrors((current) => ({ ...current, lead: undefined }))
                }}
                disabled={isSubmitting || isLoadingLeads || leads.length === 0}
              >
                <SelectTrigger
                  size="form"
                  aria-invalid={Boolean(formErrors.lead)}
                  className={cn(formSelectTriggerClassName, formErrors.lead && "border-destructive")}
                >
                  <SelectValue
                    placeholder={
                      isLoadingLeads
                        ? "Loading leads..."
                        : leads.length === 0
                          ? "No leads available"
                          : "Select lead"
                    }
                  />
                </SelectTrigger>
                <FormSelectContent>
                  {leads.map((lead) => (
                    <FormSelectItem key={lead._id} value={lead._id}>
                      {lead.name}
                    </FormSelectItem>
                  ))}
                </FormSelectContent>
              </Select>
              <FieldError message={formErrors.lead} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Visit Date</Label>
                <Input
                  type="date"
                  aria-invalid={Boolean(formErrors.visitDate)}
                  className={cn(formInputClassName, formErrors.visitDate && "border-destructive")}
                  value={visitDate}
                  onChange={(e) => {
                    setVisitDate(e.target.value)
                    setFormErrors((current) => ({ ...current, visitDate: undefined }))
                  }}
                  disabled={isSubmitting}
                />
                <FieldError message={formErrors.visitDate} />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  aria-invalid={Boolean(formErrors.visitTime)}
                  className={cn(formInputClassName, formErrors.visitTime && "border-destructive")}
                  value={visitTime}
                  onChange={(e) => {
                    setVisitTime(e.target.value)
                    setFormErrors((current) => ({ ...current, visitTime: undefined }))
                  }}
                  disabled={isSubmitting}
                />
                <FieldError message={formErrors.visitTime} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select
                value={selectedAgentId}
                onValueChange={(value) => {
                  setSelectedAgentId(value)
                  setFormErrors((current) => ({ ...current, assignedTo: undefined }))
                }}
                disabled={isSubmitting || isLoadingUsers || users.length === 0}
              >
                <SelectTrigger
                  size="form"
                  aria-invalid={Boolean(formErrors.assignedTo)}
                  className={cn(formSelectTriggerClassName, formErrors.assignedTo && "border-destructive")}
                >
                  <SelectValue
                    placeholder={
                      isLoadingUsers
                        ? "Loading users..."
                        : users.length === 0
                          ? "No users available"
                          : "Select user"
                    }
                  />
                </SelectTrigger>
                <FormSelectContent>
                  {users.map((user) => (
                    <FormSelectItem key={user._id} value={user._id}>
                      <span className="flex items-center gap-2">
                        <UserAvatar user={user} />
                        <span>{user.name}</span>
                      </span>
                    </FormSelectItem>
                  ))}
                </FormSelectContent>
              </Select>
              <FieldError message={formErrors.assignedTo} />
            </div>
            <div className="space-y-2">
              <Label>Attaching Person</Label>
              <Input
                aria-invalid={Boolean(formErrors.attachingPerson)}
                className={cn(formInputClassName, formErrors.attachingPerson && "border-destructive")}
                value={attachingPerson}
                onChange={(e) => {
                  setAttachingPerson(e.target.value)
                  setFormErrors((current) => ({ ...current, attachingPerson: undefined }))
                }}
                placeholder="Enter attaching person name"
                disabled={isSubmitting}
              />
              <FieldError message={formErrors.attachingPerson} />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                className={formTextareaClassName}
                rows={2}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleScheduleVisit} disabled={isSubmitting}>
              {isSubmitting ? "Scheduling..." : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
