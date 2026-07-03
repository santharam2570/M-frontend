import { addMonths, endOfWeek, format, startOfDay, startOfWeek, subDays, subMonths } from "date-fns"

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

export type EnrichLeadsOptions = {
  skipAssociatesFallback?: boolean
  followupMap?: Map<string, FollowupDateEntry>
}

const TASKS_CACHE_TTL_MS = 60_000
const RANGE_TASKS_CACHE_TTL_MS = 30_000
const ASSOCIATES_FALLBACK_LIMIT = 5

let cachedOpenTasks: {
  fetchedAt: number
  followupByLeadId: Map<string, FollowupDateEntry>
} | null = null

const rangeTasksCache = new Map<
  string,
  { fetchedAt: number; followupByLeadId: Map<string, FollowupDateEntry> }
>()

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

function buildFollowupMapFromTasks(
  tasks: Record<string, unknown>[],
): Map<string, FollowupDateEntry> {
  const followupByLeadId = new Map<string, FollowupDateEntry>()

  for (const task of tasks) {
    const leadId = String(task.associate_id ?? "").trim()
    if (!leadId) continue

    const entry = buildFollowupEntry(task)
    if (!entry) continue

    followupByLeadId.set(leadId, pickEarlierFollowup(followupByLeadId.get(leadId), entry))
  }

  return followupByLeadId
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

function getRangeCacheKey(dateFrom: Date, dateTo: Date): string {
  return `${format(dateFrom, "yyyy-MM-dd")}:${format(dateTo, "yyyy-MM-dd")}`
}

async function fetchOpenLeadTasks(
  token: string,
  dateFrom: Date,
  dateTo: Date,
  signal?: AbortSignal,
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
      signal,
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

export async function fetchFollowupMapForDateRange(
  token: string,
  dateFrom: Date,
  dateTo: Date,
  signal?: AbortSignal,
): Promise<Map<string, FollowupDateEntry>> {
  const cacheKey = getRangeCacheKey(dateFrom, dateTo)
  const cached = rangeTasksCache.get(cacheKey)
  const now = Date.now()

  if (cached && now - cached.fetchedAt < RANGE_TASKS_CACHE_TTL_MS) {
    return cached.followupByLeadId
  }

  const tasks = await fetchOpenLeadTasks(token, dateFrom, dateTo, signal)
  const followupByLeadId = buildFollowupMapFromTasks(tasks)

  rangeTasksCache.set(cacheKey, { fetchedAt: now, followupByLeadId })
  return followupByLeadId
}

export async function fetchTodayFollowupMap(
  token: string,
  signal?: AbortSignal,
): Promise<Map<string, FollowupDateEntry>> {
  const today = startOfDay(new Date())
  return fetchFollowupMapForDateRange(token, today, today, signal)
}

export async function fetchThisWeekFollowupMap(
  token: string,
  signal?: AbortSignal,
): Promise<Map<string, FollowupDateEntry>> {
  const now = new Date()
  return fetchFollowupMapForDateRange(
    token,
    startOfWeek(now, { weekStartsOn: 1 }),
    endOfWeek(now, { weekStartsOn: 1 }),
    signal,
  )
}

export async function fetchOverdueFollowupMap(
  token: string,
  signal?: AbortSignal,
): Promise<Map<string, FollowupDateEntry>> {
  const today = startOfDay(new Date())
  return fetchFollowupMapForDateRange(token, subMonths(today, 1), subDays(today, 1), signal)
}

async function fetchOpenTasksByLeadId(
  token: string,
  signal?: AbortSignal,
): Promise<Map<string, FollowupDateEntry>> {
  const now = Date.now()
  if (cachedOpenTasks && now - cachedOpenTasks.fetchedAt < TASKS_CACHE_TTL_MS) {
    return cachedOpenTasks.followupByLeadId
  }

  const today = new Date()
  const tasks = await fetchOpenLeadTasks(token, subMonths(today, 1), addMonths(today, 2), signal)
  const followupByLeadId = buildFollowupMapFromTasks(tasks)

  cachedOpenTasks = { fetchedAt: now, followupByLeadId }
  return followupByLeadId
}

async function fetchFollowupFromAssociates(
  leadId: string,
  token: string,
  signal?: AbortSignal,
): Promise<FollowupDateEntry | null> {
  const response = await fetch(`${URLS.LEAD_ASSOCIATES}/${leadId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    signal,
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

export function enrichLeadsWithFollowupMap<T extends LeadWithFollowup>(
  leads: T[],
  followupMap: Map<string, FollowupDateEntry>,
): T[] {
  if (leads.length === 0 || followupMap.size === 0) return leads

  return leads.map((lead) => {
    if (hasFollowupDate(lead.next_followup_dates?.[0])) return lead

    const followup = followupMap.get(lead._id)
    if (!followup) return lead

    return {
      ...lead,
      next_followup_dates: [followup],
    }
  })
}

export async function enrichLeadsWithOpenTasks<T extends LeadWithFollowup>(
  leads: T[],
  token: string,
  options: EnrichLeadsOptions = {},
): Promise<T[]> {
  if (leads.length === 0) return leads

  const leadsNeedingEnrichment = leads.filter(
    (lead) => !hasFollowupDate(lead.next_followup_dates?.[0]),
  )
  if (leadsNeedingEnrichment.length === 0) return leads

  const followupByLeadId =
    options.followupMap ?? (await fetchOpenTasksByLeadId(token))

  const enriched = enrichLeadsWithFollowupMap(leads, followupByLeadId)

  if (options.skipAssociatesFallback) return enriched

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

  return enrichLeadsWithFollowupMap(enriched, associatesFollowupByLeadId)
}

/** Clears the in-memory open-tasks cache (e.g. after task create/update). */
export function invalidateOpenTasksFollowupCache(): void {
  cachedOpenTasks = null
  rangeTasksCache.clear()
}
