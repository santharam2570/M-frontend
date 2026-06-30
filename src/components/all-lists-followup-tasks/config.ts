import URLS from "@/config/urls"

export type FollowUpTaskModule =
  | "lead"
  | "company"
  | "opportunity"
  | "ticket"
  | "installation"
  | "partner"
  | "onboarding"
  | "new_request"
  | "partner_new_request"

export type FollowUpTaskFormValues = {
  type: string
  assigned_to: string
  description: string
  time: string
  date?: Date
  visitType?: string
  visitPurpose?: string
}

export type FollowUpTaskMutationResult = FollowUpTaskFormValues & {
  taskId?: string
}

export type ModuleContext = Record<string, unknown>

type ModuleArgs = {
  associateId: string
  moduleContext?: ModuleContext
}

type ModulePayloadArgs = ModuleArgs & {
  data: FollowUpTaskFormValues
}

type ModuleTimelineAddArgs = {
  entityName?: string
}

type ModuleTimelineEditArgs = {
  entityName?: string
  data: FollowUpTaskFormValues
}

type ModuleConfig = {
  settingsUrl: string
  associateTo: string
  duplicateUrl?: (args: ModuleArgs) => string | undefined
  duplicateDateFormat?: string
  additionalPayload?: (args: ModulePayloadArgs) => Record<string, unknown>
  timelineAssociateId?: (args: ModuleArgs) => string
  timelineAssociateTo?: string
  timelineTextAdd?: (args: ModuleTimelineAddArgs) => string
  timelineTextEdit?: (args: ModuleTimelineEditArgs) => string
}

export const MODULE_CONFIGS: Record<FollowUpTaskModule, ModuleConfig> = {
  lead: {
    settingsUrl: URLS.LEAD_SETTINGS_DETAIL,
    associateTo: "lead",
    duplicateUrl: ({ associateId }) => `${URLS.LEAD_ASSOCIATES}/${associateId}`,
    duplicateDateFormat: "dd/MM/yyyy",
  },
  company: {
    settingsUrl: URLS.COMPANY_SETTINGS_DETAIL,
    associateTo: "company",
    duplicateUrl: ({ associateId }) => `${URLS.COMPANY_ASSOCIATES}/${associateId}`,
    duplicateDateFormat: "dd/MM/yyyy",
    additionalPayload: ({ associateId }) => ({
      company_id: associateId,
    }),
  },
  opportunity: {
    settingsUrl: URLS.COMPANY_SETTINGS_DETAIL,
    associateTo: "opportunity",
    duplicateUrl: ({ associateId }) => `${URLS.OPPORTUNITY_ASSOCIATES}/${associateId}`,
    duplicateDateFormat: "dd/MM/yyyy",
    additionalPayload: ({ moduleContext }) => {
      const companyId = moduleContext?.companyId as string | undefined
      return companyId ? { company_id: companyId } : {}
    },
  },
  ticket: {
    settingsUrl: URLS.COMPANY_SETTINGS_DETAIL,
    associateTo: "ticket",
    duplicateUrl: ({ associateId }) => `${URLS.TICKET_ASSOCIATES}/${associateId}`,
    duplicateDateFormat: "dd/MM/yyyy",
    additionalPayload: ({ associateId, moduleContext }) => {
      const companyId = (moduleContext?.companyId as string | undefined) ?? associateId
      return { company_id: companyId }
    },
  },
  installation: {
    settingsUrl: URLS.COMPANY_SETTINGS_DETAIL,
    associateTo: "installation",
    duplicateUrl: ({ associateId }) => `${URLS.INSTALLATION_ASSOCIATES}/${associateId}`,
    duplicateDateFormat: "dd/MM/yyyy",
    additionalPayload: ({ associateId, moduleContext }) => {
      const companyId = (moduleContext?.companyId as string | undefined) ?? associateId
      return { company_id: companyId }
    },
  },
  partner: {
    settingsUrl: URLS.COMPANY_SETTINGS_DETAIL,
    associateTo: "partner",
  },
  onboarding: {
    settingsUrl: URLS.COMPANY_SETTINGS_DETAIL,
    associateTo: "onboarding",
  },
  new_request: {
    settingsUrl: URLS.COMPANY_SETTINGS_DETAIL,
    associateTo: "new_request",
  },
  partner_new_request: {
    settingsUrl: URLS.COMPANY_SETTINGS_DETAIL,
    associateTo: "new_request",
  },
}

export const TIME_OPTIONS = Array.from({ length: 24 * 12 }).map((_, index) => {
  const hour = Math.floor(index / 12)
  const minute = (index % 12) * 5
  const formattedHour = hour.toString().padStart(2, "0")
  const formattedMinute = minute.toString().padStart(2, "0")
  const value = `${formattedHour}:${formattedMinute}`
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const period = hour >= 12 ? "PM" : "AM"
  const label = `${displayHour}:${formattedMinute} ${period}`

  return { value, label }
})

export const VISIT_TIME_OPTIONS = Array.from({ length: 24 * 4 }).map((_, index) => {
  const hour = Math.floor(index / 4)
  const minute = (index % 4) * 15
  const formattedHour = hour.toString().padStart(2, "0")
  const formattedMinute = minute.toString().padStart(2, "0")
  const value = `${formattedHour}:${formattedMinute}`
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const period = hour >= 12 ? "PM" : "AM"
  const label = `${displayHour}:${formattedMinute} ${period}`

  return { value, label }
})

export const DEFAULT_SETTINGS = {
  users: [] as TaskUserOption[],
  followp_task_type: [] as Array<{ _id: string; name: string }>,
  visit_purpose: [] as Array<{ _id: string; name: string }>,
}

export type TaskUserOption = {
  _id: string
  name: string
  profile_image?: string
}

function isActiveUserStatus(status: unknown): boolean {
  if (status === undefined || status === null || status === "") return true
  const normalized = String(status).trim().toLowerCase()
  return normalized === "active" || normalized === "1" || normalized === "true"
}

function resolveTaskUserId(user: Record<string, unknown>): string {
  for (const key of ["_id", "id", "user_id"] as const) {
    const value = user[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number") return String(value)
    if (value && typeof value === "object" && "$oid" in value) {
      const oid = (value as { $oid?: string }).$oid
      if (oid) return oid
    }
  }
  return ""
}

function extractUsersFromApiResponse(data: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>
    if (Array.isArray(record.users)) return record.users as Array<Record<string, unknown>>
    if (Array.isArray(record.data)) return record.data as Array<Record<string, unknown>>
    if (Array.isArray(record.items)) return record.items as Array<Record<string, unknown>>
  }

  return []
}

function mapUsersToTaskOptions(users: Array<Record<string, unknown>>): TaskUserOption[] {
  return users
    .filter((user) => isActiveUserStatus(user.status))
    .map((user) => ({
      _id: resolveTaskUserId(user),
      name: String(user.name ?? user.user_name ?? user.full_name ?? "").trim(),
      profile_image:
        typeof user.profile_image === "string" ? user.profile_image : undefined,
    }))
    .filter((user) => user._id && user.name)
}

export function mergeTaskUserLists(...lists: TaskUserOption[][]): TaskUserOption[] {
  const merged = new Map<string, TaskUserOption>()

  for (const list of lists) {
    for (const user of list) {
      if (user._id && user.name) {
        merged.set(user._id, user)
      }
    }
  }

  return Array.from(merged.values())
}

export function normalizeAssociatesUsers(users: unknown): TaskUserOption[] {
  if (!Array.isArray(users)) return []

  return users.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const record = item as Record<string, unknown>
    const _id = resolveTaskUserId(record)
    const name = String(record.name ?? record.user_name ?? record.full_name ?? "").trim()
    if (!_id || !name) return []
    return [
      {
        _id,
        name,
        profile_image:
          typeof record.profile_image === "string" ? record.profile_image : undefined,
      },
    ]
  })
}

export async function fetchActiveTaskUsers(token: string): Promise<TaskUserOption[]> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }

  for (const endpoint of [URLS.USERS_LIST, URLS.ACTIVE_USERS_LIST]) {
    try {
      const response = await fetch(endpoint, { method: "GET", headers })
      if (!response.ok) continue

      const result = await response.json()
      const users = extractUsersFromApiResponse(result)
      const options = mapUsersToTaskOptions(users)
      if (options.length > 0) return options
    } catch {
      // Try the next endpoint.
    }
  }

  return []
}

export async function fetchModuleTaskSettings(
  token: string,
  settingsUrl: string,
): Promise<Pick<typeof DEFAULT_SETTINGS, "followp_task_type" | "visit_purpose">> {
  try {
    const response = await fetch(settingsUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    const result = await response.json()
    if (result?.code === 200) {
      return {
        followp_task_type: result.followp_task_type || [],
        visit_purpose: result.visit_purpose || [],
      }
    }
  } catch {
    // Module-specific settings are optional for assignee loading.
  }

  return {
    followp_task_type: [],
    visit_purpose: [],
  }
}

