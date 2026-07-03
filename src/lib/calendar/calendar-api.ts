import { endOfMonth, format, isValid, startOfMonth } from "date-fns"

import type { CalendarTask } from "@/components/calendar-page/types"
import URLS from "@/config/urls"
import { parseJsonResponse } from "@/lib/api"

const isObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value)

const resolveTaskType = (newTaskType: unknown, taskType: unknown): string | null => {
  const primary = typeof newTaskType === "string" ? newTaskType.trim() : ""
  if (primary) return primary

  const secondary = typeof taskType === "string" ? taskType.trim() : ""
  if (secondary && !isObjectId(secondary)) return secondary

  return null
}

export const parseApiDate = (dateValue: unknown): Date | null => {
  if (!dateValue) return null

  try {
    let date: Date | null = null

    if (typeof dateValue === "number") {
      date = new Date(dateValue)
    } else if (
      typeof dateValue === "string" &&
      !Number.isNaN(Number(dateValue)) &&
      dateValue.length > 10
    ) {
      date = new Date(parseInt(dateValue, 10))
    } else if (
      typeof dateValue === "object" &&
      dateValue !== null &&
      "$date" in dateValue
    ) {
      const mongoDate = (dateValue as { $date: string | number }).$date
      const dateStr = typeof mongoDate === "string" ? mongoDate : String(mongoDate)
      date = new Date(dateStr)
    } else if (typeof dateValue === "string" && dateValue.includes("/")) {
      const parts = dateValue.split("/")
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1
        const year = parseInt(parts[2], 10)
        date = new Date(year, month, day)
      }
    } else if (
      typeof dateValue === "string" &&
      /^\d{2}-\d{2}-\d{4}$/.test(dateValue)
    ) {
      const [day, month, year] = dateValue.split("-")
      date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10))
    } else if (typeof dateValue === "string") {
      date = new Date(dateValue)
    }

    return date && isValid(date) ? date : null
  } catch {
    return null
  }
}

function mapTaskRecord(task: Record<string, unknown>): CalendarTask | null {
  const parsedDate = parseApiDate(task.date)
  if (!parsedDate) return null

  return {
    id: String(task._id),
    title: String(task.description ?? task.task_name ?? "Untitled task"),
    date: parsedDate.toISOString(),
    time: (task.time || task.due_time || null) as string | null,
    completed: task.status !== "Open",
    module: (task.associate_to as string) || null,
    type: resolveTaskType(task.new_task_type, task.task_type),
    category: (task.associate_to as string) || null,
    associateId: (task.associate_id as string) || null,
    companyId: (task.company_id as string) || null,
  }
}

export function getCalendarMonthKey(date: Date): string {
  return format(startOfMonth(date), "yyyy-MM")
}

export async function fetchCalendarTasks(
  token: string,
  monthDate: Date,
  signal?: AbortSignal,
): Promise<CalendarTask[]> {
  const dateFrom = format(startOfMonth(monthDate), "dd/MM/yyyy")
  const dateTo = format(endOfMonth(monthDate), "dd/MM/yyyy")

  const response = await fetch(
    `${URLS.TASK_CALENDER}?date_from=${dateFrom}&date_to=${dateTo}&owner=&status=Open`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal,
    },
  )

  const data = await parseJsonResponse<{
    code?: number
    data?: Record<string, unknown>[]
  }>(response)

  if (data.code !== 200 || !Array.isArray(data.data)) return []

  return data.data
    .map(mapTaskRecord)
    .filter((task): task is CalendarTask => task !== null)
}
