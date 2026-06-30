"use client"

import { useEffect, useState } from "react"
import { Mail, Phone, Users, CalendarIcon, MapPin, Loader2 } from "lucide-react"
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon"
import { format, isValid, startOfToday } from "date-fns"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  FormSelectContent,
  FormSelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  sheetFormContentClassName,
  formModalFieldGroupClassName,
  formModalFooterClassName,
  formModalFooterButtonClassName,
} from "@/components/ui/sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import URLS from "@/config/urls"
import {
  formDatePickerButtonClassName,
  formInputClassName,
  formSelectTriggerClassName,
  formModalRequiredClassName,
} from "@/lib/form-field-styles"
import { useTimeline } from "@/hooks/use-timeline"
import { parseJsonResponse } from "@/lib/api"
import { parseDateString } from "@/lib/date-ageing"
import { cn } from "@/lib/utils"
import { TIME_OPTIONS, fetchActiveTaskUsers, fetchModuleTaskSettings } from "@/components/all-lists-followup-tasks/config"

type TaskFormValues = {
  type: string
  assigned_to: string
  description: string
  time: string
  date?: Date
  visitType?: string
  visitPurpose?: string
}

type UserOption = {
  _id: string
  name: string
  profile_image?: string
}

type EditTaskSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEditTask: (task: TaskFormValues) => void
  taskId?: string
  associateTo: string
  associateId: string
  companyId?: string
}

const TASK_TYPES = [
  { label: "Call" as const, icon: Phone, color: "text-green-500", active: "bg-green-50 ring-2 ring-green-500 dark:bg-green-950/40" },
  { label: "WhatsApp" as const, icon: WhatsAppIcon, color: "", active: "bg-emerald-50 ring-2 ring-emerald-500 dark:bg-emerald-950/40" },
  { label: "Meeting" as const, icon: Users, color: "text-purple-500", active: "bg-purple-50 ring-2 ring-purple-500 dark:bg-purple-950/40" },
  { label: "Visit" as const, icon: MapPin, color: "text-orange-500", active: "bg-orange-50 ring-2 ring-orange-500 dark:bg-orange-950/40" },
  { label: "Email" as const, icon: Mail, color: "text-blue-500", active: "bg-blue-50 ring-2 ring-blue-500 dark:bg-blue-950/40" },
]

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <FormLabel className="text-sm font-medium text-foreground">
      {children} <span className={formModalRequiredClassName}>*</span>
    </FormLabel>
  )
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

const normalizeApiTime = (time?: string) => {
  if (!time) return "10:00"
  const trimmed = time.trim()
  const match = trimmed.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
  if (!match) return "10:00"

  let hour = parseInt(match[1], 10)
  const minute = match[2]
  const period = match[3]?.toUpperCase()

  if (period) {
    if (period === "PM" && hour !== 12) hour += 12
    if (period === "AM" && hour === 12) hour = 0
  }

  return `${hour.toString().padStart(2, "0")}:${minute}`
}

const parseTaskDate = (date?: string): Date | undefined => {
  if (!date) return undefined
  const parsed = parseDateString(String(date))
  return parsed ?? undefined
}

function UserAvatar({ user, size = "sm" }: { user: UserOption; size?: "sm" | "default" }) {
  return (
    <Avatar size={size}>
      {user.profile_image ? <AvatarImage src={user.profile_image} alt={user.name} /> : null}
      <AvatarFallback className="text-[10px] font-medium">{getInitials(user.name)}</AvatarFallback>
    </Avatar>
  )
}

function EditTaskFormSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

export function EditTaskSheet({
  open,
  onOpenChange,
  onEditTask,
  taskId,
  associateTo,
  associateId,
  companyId,
}: EditTaskSheetProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const { addTimelineActivity } = useTimeline()
  const [settings, setSettings] = useState<{
    users: UserOption[]
    followp_task_type: Array<{ _id: string; name: string }>
    visit_purpose: Array<{ _id: string; name: string }>
  }>({
    users: [],
    followp_task_type: [],
    visit_purpose: [],
  })

  const form = useForm<TaskFormValues>({
    defaultValues: {
      description: "",
      type: "",
      date: undefined,
      time: "",
      assigned_to: "",
    },
  })

  const taskType = form.watch("type")
  const visitType = form.watch("visitType")
  const showVisitType = taskType === "Visit"
  const showVisitPurpose = taskType === "Visit" && !!visitType

  useEffect(() => {
    if (!open) return

    const initializeData = async () => {
      setIsLoading(true)
      try {
        await fetchSettings()
        if (taskId) {
          await fetchTaskDetails()
        }
      } finally {
        setIsLoading(false)
      }
    }

    initializeData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, open])

  const fetchSettings = async () => {
    setIsLoadingUsers(true)
    try {
      const storedData = localStorage.getItem("map_user")
      if (!storedData) {
        throw new Error("User not authenticated")
      }
      const userData = JSON.parse(storedData)
      const token = userData.access_token as string
      const settingsUrl =
        associateTo === "lead" ? URLS.LEAD_SETTINGS_LIST : URLS.COMPANY_SETTINGS_DETAIL

      const [users, moduleSettings] = await Promise.all([
        fetchActiveTaskUsers(token),
        fetchModuleTaskSettings(token, settingsUrl),
      ])

      setSettings({
        users,
        followp_task_type: moduleSettings.followp_task_type,
        visit_purpose: moduleSettings.visit_purpose,
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch settings",
        variant: "destructive",
      })
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const fetchTaskDetails = async () => {
    try {
      const storedData = localStorage.getItem("map_user")
      if (!storedData) {
        throw new Error("User not authenticated")
      }
      const userData = JSON.parse(storedData)

      const response = await fetch(`${URLS.CRM_TASKS}/${taskId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userData.access_token}`,
          "Content-Type": "application/json",
        },
      })

      const result = await parseJsonResponse<{ code: number; data?: Record<string, unknown> }>(response)
      if (result.code === 200 && result.data) {
        const taskData = result.data
        form.reset({
          type: String(taskData.new_task_type ?? ""),
          description: String(taskData.description ?? ""),
          date: parseTaskDate(taskData.date as string | undefined),
          time: normalizeApiTime(taskData.time as string | undefined),
          assigned_to: String(taskData.assigned_to ?? ""),
          visitPurpose: taskData.visit_purpose as string | undefined,
          visitType: taskData.task_type as string | undefined,
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch task details",
        variant: "destructive",
      })
    }
  }

  const getAssociatesEndpoint = (moduleKey: string) => {
    switch (moduleKey) {
      case "lead":
        return URLS.LEAD_ASSOCIATES
      case "company":
        return URLS.COMPANY_ASSOCIATES
      case "opportunity":
        return URLS.OPPORTUNITY_ASSOCIATES
      case "partner":
      case "partner_request":
        return URLS.PARTNER_ASSOCIATES
      default:
        return null
    }
  }

  const onSubmit = async (data: TaskFormValues) => {
    try {
      if (isSubmitting) return
      setIsSubmitting(true)

      const storedData = localStorage.getItem("map_user")
      if (!storedData) {
        throw new Error("User not authenticated")
      }
      const userData = JSON.parse(storedData)

      const associatesEndpoint = getAssociatesEndpoint(associateTo)
      if (associatesEndpoint) {
        const checkDuplicateResponse = await fetch(`${associatesEndpoint}/${associateId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${userData.access_token}`,
            "Content-Type": "application/json",
          },
        })

        const existingTasks = await checkDuplicateResponse.json()
        const formattedDate = format(data.date as Date, "dd/MM/yyyy")
        const isDuplicate = existingTasks.data?.task?.some((task: { description?: string; date?: string; time?: string; status?: string; _id?: string }) => {
          return (
            task._id !== taskId &&
            task.description?.toLowerCase() === data.description.toLowerCase() &&
            task.date === formattedDate &&
            task.time === data.time &&
            task.status !== "Completed"
          )
        })
        if (isDuplicate) {
          toast({
            title: "Warning",
            description: "A similar task already exists for this title, date and time",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }
      }

      const payload: Record<string, unknown> = {
        associate_id: associateId,
        associate_to: associateTo,
        assigned_to: data.assigned_to,
        description: data.description,
        time: data.time,
        date: format(data.date as Date, "yyyy-MM-dd"),
        visit_purpose: data.visitPurpose,
        task_type: data.visitType,
        new_task_type: data.type,
      }
      if (companyId) {
        payload.company_id = companyId
      }

      const response = await fetch(`${URLS.CRM_TASKS}/${taskId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${userData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (result.code === 200) {
        addTimelineActivity({
          category_name: "task",
          action: "update",
          text_info: `Task Updated for ${data.description}`,
          associate_id: associateId,
          associate_to: associateTo,
        })

        toast({
          title: "Success",
          description: "Task has been updated successfully",
          variant: "default",
        })
        onOpenChange(false)
        onEditTask(data)
      } else {
        throw new Error(result.msg || "Failed to update task")
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update task",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={sheetFormContentClassName}>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <SheetHeader className="px-6 pt-6 pb-0 space-y-1.5 text-left">
            <SheetTitle>Edit Task</SheetTitle>
            <SheetDescription>Update task details, schedule, and assignment</SheetDescription>
          </SheetHeader>

          <div className="px-6 py-6">
            {isLoading ? (
              <EditTaskFormSkeleton />
            ) : (
              <Form {...form}>
                <form id="edit-task-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="type"
                    rules={{ required: "Task type is required" }}
                    render={({ field }) => (
                      <FormItem className={formModalFieldGroupClassName}>
                        <RequiredLabel>Task Type</RequiredLabel>
                        <FormControl>
                          <div className="grid grid-cols-5 gap-2">
                            {TASK_TYPES.map(({ label, icon: Icon, color, active }) => {
                              const isActive = field.value === label
                              return (
                                <button
                                  key={label}
                                  type="button"
                                  onClick={() => field.onChange(label)}
                                  className={cn(
                                    "flex flex-col items-center gap-1.5 rounded-lg border border-transparent p-3 transition-colors",
                                    isActive
                                      ? active
                                      : "border-border bg-muted/30 hover:bg-muted/60",
                                  )}
                                >
                                  <Icon className={cn("h-5 w-5", color)} />
                                  <span className="text-xs font-medium">{label}</span>
                                </button>
                              )
                            })}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <FormField
                    control={form.control}
                    name="description"
                    rules={{ required: "Task title is required" }}
                    render={({ field }) => (
                      <FormItem className={formModalFieldGroupClassName}>
                        <RequiredLabel>Task Title</RequiredLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter task title"
                            className={formInputClassName}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="date"
                      rules={{ required: "Due date is required" }}
                      render={({ field }) => (
                        <FormItem className={formModalFieldGroupClassName}>
                          <RequiredLabel>Due Date</RequiredLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={isSubmitting}
                                  className={cn(
                                    formDatePickerButtonClassName,
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                  {field.value && isValid(field.value as Date) ? (
                                    format(field.value as Date, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={
                                  field.value && isValid(field.value as Date)
                                    ? (field.value as Date)
                                    : undefined
                                }
                                onSelect={(date) => field.onChange(date ?? undefined)}
                                disabled={(date) => !!date && date < startOfToday()}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="time"
                      rules={{ required: "Time is required" }}
                      render={({ field }) => (
                        <FormItem className={formModalFieldGroupClassName}>
                          <RequiredLabel>Time</RequiredLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isSubmitting}
                          >
                            <FormControl>
                              <SelectTrigger size="form" className={formSelectTriggerClassName}>
                                <SelectValue placeholder="Select time" />
                              </SelectTrigger>
                            </FormControl>
                            <FormSelectContent>
                              {TIME_OPTIONS.map((option) => (
                                <FormSelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </FormSelectItem>
                              ))}
                            </FormSelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="assigned_to"
                    rules={{ required: "Assignee is required" }}
                    render={({ field }) => (
                      <FormItem className={formModalFieldGroupClassName}>
                        <RequiredLabel>Assign to</RequiredLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting || isLoadingUsers || settings.users.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger size="form" className={formSelectTriggerClassName}>
                              <SelectValue
                                placeholder={
                                  isLoadingUsers
                                    ? "Loading users..."
                                    : settings.users.length === 0
                                      ? "No users available"
                                      : "Select assignee"
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <FormSelectContent>
                            {settings.users.map((user) => (
                              <FormSelectItem key={user._id} value={user._id}>
                                <span className="flex items-center gap-2">
                                  <UserAvatar user={user} />
                                  <span>{user.name}</span>
                                </span>
                              </FormSelectItem>
                            ))}
                          </FormSelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {showVisitType && (
                    <>
                      <Separator />
                      <FormField
                        control={form.control}
                        name="visitType"
                        rules={{ required: "Visit type is required" }}
                        render={({ field }) => (
                          <FormItem className={formModalFieldGroupClassName}>
                            <RequiredLabel>Visit Type</RequiredLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={isSubmitting}
                            >
                              <FormControl>
                                <SelectTrigger size="form" className={formSelectTriggerClassName}>
                                  <SelectValue placeholder="Select visit type" />
                                </SelectTrigger>
                              </FormControl>
                              <FormSelectContent>
                                {settings.followp_task_type.map((type) => (
                                  <FormSelectItem key={type._id} value={type._id}>
                                    {type.name}
                                  </FormSelectItem>
                                ))}
                              </FormSelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {showVisitPurpose && (
                    <FormField
                      control={form.control}
                      name="visitPurpose"
                      rules={{ required: "Visit purpose is required" }}
                      render={({ field }) => (
                        <FormItem className={formModalFieldGroupClassName}>
                          <RequiredLabel>Visit Purpose</RequiredLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isSubmitting}
                          >
                            <FormControl>
                              <SelectTrigger size="form" className={formSelectTriggerClassName}>
                                <SelectValue placeholder="Select visit purpose" />
                              </SelectTrigger>
                            </FormControl>
                            <FormSelectContent>
                              {settings.visit_purpose.map((purpose) => (
                                <FormSelectItem key={purpose._id} value={purpose._id}>
                                  {purpose.name}
                                </FormSelectItem>
                              ))}
                            </FormSelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </form>
              </Form>
            )}
          </div>
        </div>

        <div className={cn(formModalFooterClassName, "flex-row justify-end")}>
          <Button
            type="button"
            variant="outline"
            className={formModalFooterButtonClassName}
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-task-form"
            className={formModalFooterButtonClassName}
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Task"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
