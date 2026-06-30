import { addMonths, format, subMonths } from "date-fns"

import URLS from "@/config/urls"
import { parseJsonResponse } from "@/lib/api"
import {
  hasFollowupDate,
  parseFollowupDate,
  type FollowupDateEntry,
} from "@/lib/followup-date"

type LeadWithFollowup = {
  _id: string
  next_followup_dates: FollowupDateEntry[]
}

const TASKS_CACHE_TTL_MS = 60_000
const ASSOCIATES_FALLBACK_LIMIT = 5

let cachedOpenTasks: {
  fetchedAt: number
  followupByLeadId: Map<string, FollowupDateEntry>
} | null = null

function pickEarlierFollowup(
  current: FollowupDateEntry | undefined,
  candidate: FollowupDateEntry,
): FollowupDateEntry {
  if (!current) return candidate

  const currentDate = parseFollowupDate(current.date)
  const candidateDate = parseFollowupDate(candidate.date)

  if (!currentDate) return candidate
  if (!candidateDate) return current

  return candidateDate < currentDate ? candidate : current
}

function buildFollowupEntry(task: Record<string, unknown>): FollowupDateEntry | null {
  const status = String(task.status ?? "").toLowerCase()
  if (status === "completed") return null

  const parsedDate = parseFollowupDate(
    String(task.date ?? task.due_date ?? task.followup_date ?? task.target_date ?? ""),
  )
  if (!parsedDate) return null

  return {
    id: String(task._id ?? task.id ?? task.task_id ?? ""),
    date: format(parsedDate, "yyyy-MM-dd"),
  }
}

function isOpenLeadTask(task: Record<string, unknown>): boolean {
  if (String(task.associate_to ?? "").toLowerCase() !== "lead") return false
  return String(task.status ?? "").toLowerCase() !== "completed"
}

async function fetchOpenLeadTasks(
  token: string,
  dateFrom: Date,
  dateTo: Date,
): Promise<Record<string, unknown>[]> {
  const response = await fetch(
    `${URLS.TASK_CALENDER}?date_from=${format(dateFrom, "dd/MM/yyyy")}&date_to=${format(dateTo, "dd/MM/yyyy")}&owner=&status=Open`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  )

  if (!response.ok) return []

  const result = await parseJsonResponse<{
    code?: number
    data?: Record<string, unknown>[]
  }>(response)

  if (Number(result.code) !== 200 || !Array.isArray(result.data)) return []

  return result.data.filter(isOpenLeadTask)
}

async function fetchOpenTasksByLeadId(token: string): Promise<Map<string, FollowupDateEntry>> {
  const now = Date.now()
  if (cachedOpenTasks && now - cachedOpenTasks.fetchedAt < TASKS_CACHE_TTL_MS) {
    return cachedOpenTasks.followupByLeadId
  }

  const today = new Date()
  const tasks = await fetchOpenLeadTasks(token, subMonths(today, 3), addMonths(today, 6))

  const followupByLeadId = new Map<string, FollowupDateEntry>()

  for (const task of tasks) {
    const leadId = String(task.associate_id ?? "").trim()
    if (!leadId) continue

    const entry = buildFollowupEntry(task)
    if (!entry) continue

    followupByLeadId.set(leadId, pickEarlierFollowup(followupByLeadId.get(leadId), entry))
  }

  cachedOpenTasks = { fetchedAt: now, followupByLeadId }
  return followupByLeadId
}

async function fetchFollowupFromAssociates(
  leadId: string,
  token: string,
): Promise<FollowupDateEntry | null> {
  const response = await fetch(`${URLS.LEAD_ASSOCIATES}/${leadId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) return null

  const result = await parseJsonResponse<{
    code?: number
    data?: { task?: Record<string, unknown>[] }
  }>(response)

  if (Number(result.code) !== 200 || !Array.isArray(result.data?.task)) return null

  let followup: FollowupDateEntry | null = null

  for (const task of result.data.task) {
    const entry = buildFollowupEntry(task)
    if (!entry) continue
    followup = pickEarlierFollowup(followup ?? undefined, entry)
  }

  return followup
}

export async function enrichLeadsWithOpenTasks<T extends LeadWithFollowup>(
  leads: T[],
  token: string,
): Promise<T[]> {
  if (leads.length === 0) return leads

  const followupByLeadId = await fetchOpenTasksByLeadId(token)

  const enriched = leads.map((lead) => {
    if (hasFollowupDate(lead.next_followup_dates?.[0])) return lead

    const followup = followupByLeadId.get(lead._id)
    if (!followup) return lead

    return {
      ...lead,
      next_followup_dates: [followup],
    }
  })

  const stillMissing = enriched.filter(
    (lead) => !hasFollowupDate(lead.next_followup_dates?.[0]),
  )

  if (stillMissing.length === 0) return enriched

  const associatesResults = await Promise.all(
    stillMissing.slice(0, ASSOCIATES_FALLBACK_LIMIT).map(async (lead) => {
      const followup = await fetchFollowupFromAssociates(lead._id, token)
      return { leadId: lead._id, followup }
    }),
  )

  const associatesFollowupByLeadId = new Map(
    associatesResults
      .filter((item): item is { leadId: string; followup: FollowupDateEntry } =>
        Boolean(item.followup),
      )
      .map((item) => [item.leadId, item.followup] as const),
  )

  if (associatesFollowupByLeadId.size === 0) return enriched

  return enriched.map((lead) => {
    if (hasFollowupDate(lead.next_followup_dates?.[0])) return lead

    const followup = associatesFollowupByLeadId.get(lead._id)
    if (!followup) return lead

    return {
      ...lead,
      next_followup_dates: [followup],
    }
  })
}

/** Clears the in-memory open-tasks cache (e.g. after task create/update). */
export function invalidateOpenTasksFollowupCache(): void {
  cachedOpenTasks = null
}
