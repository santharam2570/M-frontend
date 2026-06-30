"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { format, isValid, startOfToday } from "date-fns"
import { CalendarIcon, Mail, MapPin, Phone, Users } from "lucide-react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
  formModalHeaderClassName,
  formModalFooterClassName,
  formModalFooterButtonClassName,
  formModalFieldGroupClassName,
  formModalRequiredClassName,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon"
import { useToast } from "@/hooks/use-toast"
import { useTimeline } from "@/hooks/use-timeline"
import URLS from "@/config/urls"
import { cn } from "@/lib/utils"
import { formatFollowupDateDisplay, type FollowupDateEntry } from "@/lib/followup-date"
import {
  formDatePickerButtonClassName,
  formInputClassName,
  formSelectTriggerClassName,
} from "@/lib/form-field-styles"

import {
  DEFAULT_SETTINGS,
  fetchActiveTaskUsers,
  fetchModuleTaskSettings,
  FollowUpTaskFormValues,
  FollowUpTaskModule,
  MODULE_CONFIGS,
  ModuleContext,
  TIME_OPTIONS,
  type FollowUpTaskMutationResult,
  type TaskUserOption,
} from "./config"

type AddTaskSheetListProps = {
  module: FollowUpTaskModule
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddTask: (task: FollowUpTaskMutationResult) => void
  associateId: string
  entityName?: string
  moduleContext?: ModuleContext
  nextFollowup?: FollowupDateEntry | null
}

type UserOption = TaskUserOption

const TASK_TYPES = [
  { label: "Call" as const, icon: Phone, color: "text-green-500", active: "bg-green-50 ring-2 ring-green-500 dark:bg-green-950/40" },
  { label: "WhatsApp" as const, icon: WhatsAppIcon, color: "", active: "bg-emerald-50 ring-2 ring-emerald-500 dark:bg-emerald-950/40" },
  { label: "Meeting" as const, icon: Users, color: "text-purple-500", active: "bg-purple-50 ring-2 ring-purple-500 dark:bg-purple-950/40" },
  { label: "Visit" as const, icon: MapPin, color: "text-orange-500", active: "bg-orange-50 ring-2 ring-orange-500 dark:bg-orange-950/40" },
  { label: "Email" as const, icon: Mail, color: "text-blue-500", active: "bg-blue-50 ring-2 ring-blue-500 dark:bg-blue-950/40" },
]

const TITLE_PREFIX_MAP: Record<string, string> = {
  Email: "Email to",
  Call: "Call with",
  WhatsApp: "WhatsApp to",
  Meeting: "Meeting with",
  Visit: "Visit to",
}

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

function UserAvatar({ user, size = "sm" }: { user: UserOption; size?: "sm" | "default" }) {
  return (
    <Avatar size={size}>
      {user.profile_image ? <AvatarImage src={user.profile_image} alt={user.name} /> : null}
      <AvatarFallback className="text-[10px] font-medium">{getInitials(user.name)}</AvatarFallback>
    </Avatar>
  )
}

export function AddTaskSheetList({
  module,
  open,
  onOpenChange,
  onAddTask,
  associateId,
  entityName,
  moduleContext,
  nextFollowup,
}: AddTaskSheetListProps) {
  const { toast } = useToast()
  const { addTimelineActivity } = useTimeline()
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState("")
  const hasInitialized = useRef(false)

  const config = useMemo(() => MODULE_CONFIGS[module], [module])

  const getDefaultTitle = (type: string) => {
    if (!entityName) return ""
    const prefix = TITLE_PREFIX_MAP[type] ?? ""
    return prefix ? `${prefix} ${entityName}` : entityName
  }

  const form = useForm<FollowUpTaskFormValues>({
    defaultValues: {
      type: "Email",
      description: getDefaultTitle("Email"),
      date: new Date(),
      time: "10:00",
      assigned_to: "",
      visitPurpose: undefined,
      visitType: undefined,
    },
  })

  const taskType = form.watch("type")
  const visitType = form.watch("visitType")

  const showVisitType = taskType === "Visit"
  const showVisitPurpose = showVisitType && !!visitType

  useEffect(() => {
    if (typeof window === "undefined" || !open) return
    try {
      const storedData = localStorage.getItem("map_user")
      if (!storedData) return
      const userDetails = JSON.parse(storedData)
      setCurrentUserId(
        String(
          userDetails.result?.id ??
            userDetails.result?._id ??
            userDetails.id ??
            "",
        ),
      )
    } catch {
      setCurrentUserId("")
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      hasInitialized.current = false
      return
    }
    if (!config) return
    hasInitialized.current = false
    void fetchSettings()
  }, [open, config])

  useEffect(() => {
    if (!open || !currentUserId || settings.users.length === 0 || hasInitialized.current) return

    const currentUserExists = settings.users.some((user: UserOption) => user._id === currentUserId)
    if (currentUserExists) {
      form.setValue("assigned_to", currentUserId)
      hasInitialized.current = true
    }
  }, [open, currentUserId, settings.users, form])

  useEffect(() => {
    form.setValue("description", getDefaultTitle(taskType))
  }, [taskType, entityName, form])

  const getUserData = () => {
    const storedData = localStorage.getItem("map_user")
    if (!storedData) {
      throw new Error("User not authenticated")
    }
    return JSON.parse(storedData)
  }

  const fetchSettings = async () => {
    if (!config) return

    setIsLoadingUsers(true)
    try {
      const userData = getUserData()
      const token = userData.access_token as string

      const [users, moduleSettings] = await Promise.all([
        fetchActiveTaskUsers(token),
        fetchModuleTaskSettings(token, config.settingsUrl),
      ])

      setSettings({
        users,
        followp_task_type: moduleSettings.followp_task_type,
        visit_purpose: moduleSettings.visit_purpose,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch settings"
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const onSubmit = async (data: FollowUpTaskFormValues) => {
    if (!config) return
    try {
      if (isSubmitting) return
      setIsSubmitting(true)

      const userData = getUserData()

      if (config.duplicateUrl) {
        const duplicateUrl = config.duplicateUrl({ associateId, moduleContext })
        if (duplicateUrl) {
          const duplicateResponse = await fetch(duplicateUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${userData.access_token}`,
              "Content-Type": "application/json",
            },
          })

          const existingTasks = await duplicateResponse.json()
          const formattedDate = data.date
            ? format(data.date, config.duplicateDateFormat ?? "dd/MM/yyyy")
            : ""
          const isDuplicate = existingTasks.data?.task?.some((task: { description?: string; date?: string; time?: string; status?: string }) => {
            return (
              task?.description?.toLowerCase() === data.description?.toLowerCase() &&
              task?.date === formattedDate &&
              task?.time === data.time &&
              task?.status !== "Completed"
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
      }

      const payload = {
        associate_id: associateId,
        associate_to: config.associateTo,
        assigned_to: data.assigned_to,
        description: data.description,
        time: data.time,
        date: data.date ? format(data.date, "yyyy-MM-dd") : null,
        visit_purpose: data.visitPurpose,
        task_type: data.visitType,
        new_task_type: data.type,
        ...(config.additionalPayload
          ? config.additionalPayload({ data, associateId, moduleContext })
          : {}),
      }

      const response = await fetch(URLS.CRM_TASKS, {
        method: "POST",
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
          action: "create",
          text_info: config.timelineTextAdd
            ? config.timelineTextAdd({ entityName })
            : entityName
              ? `Created task for ${entityName}`
              : "Created task",
          associate_id: config.timelineAssociateId
            ? config.timelineAssociateId({ associateId, moduleContext })
            : associateId,
          associate_to: config.timelineAssociateTo ?? config.associateTo,
        })

        toast({
          title: "Success",
          description: "Task has been added successfully",
        })

        const createdTaskId = String(
          result.data?._id ??
            result.data?.id ??
            result.data?.task_id ??
            result.task_id ??
            "",
        )

        onAddTask({
          ...data,
          taskId: createdTaskId || undefined,
        })
        form.reset({
          type: "Email",
          description: getDefaultTitle("Email"),
          time: "10:00",
          date: new Date(),
          assigned_to: currentUserId,
          visitType: undefined,
          visitPurpose: undefined,
        })
        onOpenChange(false)
      } else {
        throw new Error(result.msg || "Failed to add task")
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to add task"
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!config) {
    console.error(`Invalid module: ${module}. Available modules: ${Object.keys(MODULE_CONFIGS).join(", ")}`)
    return null
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={sheetFormContentClassName}>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SheetHeader className={formModalHeaderClassName}>
            <SheetTitle className="text-lg font-semibold tracking-tight">Add New Task</SheetTitle>
            <SheetDescription>
              {entityName
                ? `Schedule a follow-up task for ${entityName}`
                : "Schedule a new follow-up task"}
            </SheetDescription>
          </SheetHeader>

          <div className="px-6 py-6">
            {nextFollowup?.date ? (
              <div className="mb-5 flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
                <CalendarIcon className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">Current next follow-up:</span>
                <span className="font-medium text-foreground">
                  {formatFollowupDateDisplay(nextFollowup.date)}
                </span>
              </div>
            ) : null}

            <Form {...form}>
              <form id="task-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className={formModalFieldGroupClassName}>
                      <FormLabel className="text-sm font-medium text-foreground">Task Type</FormLabel>
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
                                {field.value && isValid(field.value) ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
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
                          {settings.users.map((user: UserOption) => (
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
                  <FormField
                    control={form.control}
                    name="visitType"
                    rules={{ required: "Visit type is required for Visit tasks" }}
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
                            {settings.followp_task_type.map((type: { _id: string; name: string }) => (
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
                )}

                {showVisitPurpose && (
                  <FormField
                    control={form.control}
                    name="visitPurpose"
                    rules={{ required: "Visit purpose is required for Visit tasks" }}
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
                            {settings.visit_purpose.map((purpose: { _id: string; name: string }) => (
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
            form="task-form"
            className={formModalFooterButtonClassName}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
