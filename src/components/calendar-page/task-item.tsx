"use client"

import { format, isFuture, isPast, isToday } from "date-fns"
import { CheckSquare, Mail, MapPin, Phone, Users } from "lucide-react"
import { useRouter } from "next/navigation"

import { WhatsAppIcon } from "@/components/ui/whatsapp-icon"
import { cn } from "@/lib/utils"
import type { CalendarTask } from "./types"

interface TaskItemProps {
  task: CalendarTask
  showTime?: boolean
}

const TASK_TYPE_ICON_CLASS = "h-3.5 w-3.5 shrink-0"

function resolveTaskTypeFromTitle(title: string): string | null {
  const normalized = title.toLowerCase()

  if (normalized.includes("whatsapp")) return "WhatsApp"
  if (normalized.includes("email")) return "Email"
  if (normalized.includes("call")) return "Call"
  if (normalized.includes("meeting")) return "Meeting"
  if (normalized.includes("visit")) return "Visit"

  return null
}

function normalizeTaskType(type: string): string {
  const normalized = type.trim().toLowerCase()

  switch (normalized) {
    case "email":
      return "Email"
    case "call":
      return "Call"
    case "whatsapp":
      return "WhatsApp"
    case "meeting":
      return "Meeting"
    case "visit":
      return "Visit"
    default:
      return type.trim()
  }
}

function getTaskIcon(type: string | null | undefined, title: string) {
  const resolvedType = type?.trim()
    ? normalizeTaskType(type)
    : resolveTaskTypeFromTitle(title) || ""

  switch (resolvedType) {
    case "Email":
      return <Mail className={cn(TASK_TYPE_ICON_CLASS, "text-blue-600")} />
    case "Call":
      return <Phone className={cn(TASK_TYPE_ICON_CLASS, "text-green-600")} />
    case "WhatsApp":
      return <WhatsAppIcon className={TASK_TYPE_ICON_CLASS} />
    case "Meeting":
      return <Users className={cn(TASK_TYPE_ICON_CLASS, "text-purple-600")} />
    case "Visit":
      return <MapPin className={cn(TASK_TYPE_ICON_CLASS, "text-orange-600")} />
    default:
      return <CheckSquare className={cn(TASK_TYPE_ICON_CLASS, "text-muted-foreground")} />
  }
}

export function TaskItem({ task, showTime = false }: TaskItemProps) {
  const router = useRouter()
  const taskDate = new Date(task.date)

  const formatTime = () => {
    if (task.time) {
      const timeStr = task.time.trim()

      if (/^\d{1,2}:\d{2}\s*(AM|PM|am|pm)$/i.test(timeStr)) {
        return timeStr
      }

      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeStr)) {
        const [hours, minutes] = timeStr.split(":")
        const hourNum = parseInt(hours, 10)
        const period = hourNum >= 12 ? "PM" : "AM"
        const hour12 = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum
        return `${hour12}:${minutes} ${period}`
      }

      return timeStr
    }

    return format(taskDate, "h:mm a")
  }

  const getTaskStatusColor = () => {
    if (isPast(taskDate) && !isToday(taskDate) && !task.completed) {
      return "bg-red-100 border-red-300 text-red-800"
    }
    if (isToday(taskDate)) {
      return "bg-blue-100 border-blue-300 text-blue-800"
    }
    if (isFuture(taskDate)) {
      return "bg-gray-100 border-gray-300 text-gray-800"
    }
    return ""
  }

  const getCategoryColor = () => {
    switch (task.category) {
      case "Companies":
      case "company":
        return "bg-purple-500"
      case "Leads":
      case "lead":
        return "bg-yellow-500"
      case "Opportunities":
      case "opportunity":
        return "bg-green-500"
      case "Projects":
      case "project":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  const resolveTaskUrl = () => {
    const module = task.module?.toLowerCase() || ""
    const associateId = task.associateId || task.companyId

    switch (module) {
      case "opportunity":
        return associateId ? `/opportunity/detail/${associateId}` : "/opportunity"
      case "lead":
        return associateId ? `/lead/detail/${associateId}` : "/lead"
      case "partner_request":
        return associateId ? `/partner-request/detail/${associateId}` : "/partner-request"
      case "onboarding":
        return associateId ? `/partner-onboarding/detail/${associateId}` : "/partner-onboarding"
      case "partner":
        return associateId ? `/partners/detail/${associateId}` : "/partners"
      case "company":
        return associateId ? `/company/detail/${associateId}` : "/company"
      default:
        return `/taskdetail/${task.id}`
    }
  }

  return (
    <div
      className={cn(
        "group relative rounded border p-1.5 text-xs",
        getTaskStatusColor(),
        task.completed && "opacity-60"
      )}
    >
      <div className="pointer-events-none absolute -top-10 left-0 z-50 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
        {task.title}
      </div>

      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className={cn("h-2 w-2 rounded-full", getCategoryColor())} />
          {task.category && (
            <span className="text-[10px] text-muted-foreground capitalize">{task.category}</span>
          )}
        </div>
        {(showTime || task.time) && (
          <div className="shrink-0 text-[10px] whitespace-nowrap text-muted-foreground">
            {formatTime()}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex shrink-0 items-center justify-center">
          {getTaskIcon(task.type, task.title)}
        </div>
        <button
          type="button"
          className="flex-1 cursor-pointer truncate text-left hover:underline"
          onClick={() => router.push(resolveTaskUrl())}
        >
          <div className={cn("truncate font-medium", task.completed && "line-through")}>
            {task.title}
          </div>
        </button>
      </div>
    </div>
  )
}
