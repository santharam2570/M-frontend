import { format, isValid, parse } from "date-fns"

export interface FollowupDateEntry {
  id: string
  date: string
}

const FOLLOWUP_DATE_FORMATS = [
  "dd/MM/yyyy",
  "yyyy-MM-dd",
  "dd-MM-yyyy",
  "dd MMM yyyy",
  "MMM dd, yyyy",
  "dd MMM",
] as const

function extractDateString(value: unknown): string | null {
  if (value == null) return null

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null

    if (
      (trimmed.startsWith("[") || trimmed.startsWith("{")) &&
      (trimmed.includes("date") || trimmed.includes("due_date"))
    ) {
      try {
        return extractDateString(JSON.parse(trimmed))
      } catch {
        // Fall through to treat as a plain date string.
      }
    }

    return trimmed
  }

  if (typeof value === "number") {
    const parsed = new Date(value)
    return isValid(parsed) ? format(parsed, "yyyy-MM-dd") : null
  }

  if (value instanceof Date) {
    return isValid(value) ? format(value, "yyyy-MM-dd") : null
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    if (record.$date != null) {
      return extractDateString(record.$date)
    }

    return extractDateString(
      record.date ??
        record.due_date ??
        record.followup_date ??
        record.target_date ??
        record.next_followup,
    )
  }

  return null
}

export function parseFollowupDate(dateStr: string | null | undefined): Date | null {
  const normalized = extractDateString(dateStr)
  if (!normalized) return null

  for (const pattern of FOLLOWUP_DATE_FORMATS) {
    const parsed = parse(normalized, pattern, new Date())
    if (isValid(parsed)) return parsed
  }

  const fallback = new Date(normalized)
  return isValid(fallback) ? fallback : null
}

export function formatFollowupDateDisplay(dateStr: string | null | undefined): string {
  const parsed = parseFollowupDate(dateStr)
  if (!parsed) return dateStr?.trim() || "-"
  return format(parsed, "dd MMM yyyy")
}

function toFollowupEntry(id: unknown, date: unknown): FollowupDateEntry | null {
  const normalizedDate = extractDateString(date)
  if (!normalizedDate) return null

  return {
    id: String(id ?? "").trim(),
    date: normalizedDate,
  }
}

function entryFromTaskRecord(record: Record<string, unknown>): FollowupDateEntry | null {
  if (record.status === "Completed") return null

  return toFollowupEntry(
    record.id ?? record._id ?? record.task_id,
    record.date ?? record.due_date ?? record.followup_date ?? record.target_date,
  )
}

function getTaskId(raw: Record<string, unknown>): unknown {
  return (
    raw.next_followup_task_id ??
    raw.task_id ??
    raw.next_task_id ??
    raw.followup_task_id
  )
}

function normalizeFollowupArray(
  items: unknown[],
  taskId: unknown,
): FollowupDateEntry[] {
  return items
    .flatMap((item) => {
      if (typeof item === "string") {
        const entry = toFollowupEntry(taskId, item)
        return entry ? [entry] : []
      }

      if (!item || typeof item !== "object") return []

      const record = item as Record<string, unknown>
      const entry =
        entryFromTaskRecord(record) ??
        toFollowupEntry(
          record.id ?? record._id ?? record.task_id ?? taskId,
          record.date ?? record.followup_date ?? record.target_date,
        )

      return entry ? [entry] : []
    })
    .filter((item): item is FollowupDateEntry => item !== null)
}

export function normalizeNextFollowupDates(
  raw: Record<string, unknown>,
): FollowupDateEntry[] {
  const taskId = getTaskId(raw)
  const fromNextFollowupDates = raw.next_followup_dates

  if (fromNextFollowupDates != null && fromNextFollowupDates !== "") {
    if (Array.isArray(fromNextFollowupDates)) {
      const entries = normalizeFollowupArray(fromNextFollowupDates, taskId)
      if (entries.length > 0) return entries
    }

    if (typeof fromNextFollowupDates === "object") {
      const entry =
        entryFromTaskRecord(fromNextFollowupDates as Record<string, unknown>) ??
        toFollowupEntry(taskId, fromNextFollowupDates)

      if (entry) return [entry]
    }

    if (typeof fromNextFollowupDates === "string") {
      const trimmed = fromNextFollowupDates.trim()

      if (trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed)
          if (Array.isArray(parsed)) {
            const entries = normalizeFollowupArray(parsed, taskId)
            if (entries.length > 0) return entries
          }
        } catch {
          // Fall through to plain string parsing.
        }
      }

      const entry = toFollowupEntry(taskId, trimmed)
      if (entry) return [entry]
    }
  }

  const singleTask = raw.task ?? raw.next_task ?? raw.pending_task
  if (singleTask && typeof singleTask === "object" && !Array.isArray(singleTask)) {
    const entry = entryFromTaskRecord(singleTask as Record<string, unknown>)
    if (entry) return [entry]
  }

  const candidateDate =
    raw.next_followup ??
    raw.nextFollowup ??
    raw.target_date ??
    raw.next_followup_date ??
    raw.due_date

  const directEntry = toFollowupEntry(taskId, candidateDate)
  if (directEntry) return [directEntry]

  const tasks = raw.tasks ?? raw.pending_tasks ?? raw.followup_tasks
  if (Array.isArray(tasks)) {
    return tasks
      .map((item) =>
        item && typeof item === "object"
          ? entryFromTaskRecord(item as Record<string, unknown>)
          : null,
      )
      .filter((item): item is FollowupDateEntry => item !== null)
  }

  return []
}

export function getPrimaryFollowupDate(
  raw: Record<string, unknown>,
): FollowupDateEntry | null {
  const dates = normalizeNextFollowupDates(raw)
  return dates.find((entry) => Boolean(entry.date)) ?? null
}

export function hasFollowupDate(entry: FollowupDateEntry | null | undefined): boolean {
  return Boolean(entry?.date && parseFollowupDate(entry.date))
}
