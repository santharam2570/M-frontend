"use client"
import { useEffect, useRef, useState } from "react"
import { Mail, Phone, Users, CalendarIcon, MapPin } from "lucide-react"
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon"
import { format, isValid, startOfToday } from "date-fns"

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
  formModalHeaderClassName,
  formModalFooterClassName,
  formModalFooterButtonClassName,
  formModalFieldGroupClassName,
  formModalRequiredClassName,
} from "@/components/ui/sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useForm } from "react-hook-form"
import URLS from "@/config/urls"
import { useTimeline } from "@/hooks/use-timeline"
import {
  formDatePickerButtonClassName,
  formInputClassName,
  formSelectTriggerClassName,
} from "@/lib/form-field-styles"
import { cn } from "@/lib/utils"
import { TIME_OPTIONS, fetchActiveTaskUsers } from "@/components/all-lists-followup-tasks/config"

type TaskFormValues = {
  type: string
  assigned_to: string
  description: string
  time: string
  date?: Date
}

type UserOption = {
  _id: string
  name: string
  profile_image?: string
}

type AddTaskSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddTask: (task: TaskFormValues) => void
  associateTo: string
  associateId: string
  entityName?: string
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

function UserAvatar({ user, size = "sm" }: { user: UserOption; size?: "sm" | "default" }) {
  return (
    <Avatar size={size}>
      {user.profile_image ? <AvatarImage src={user.profile_image} alt={user.name} /> : null}
      <AvatarFallback className="text-[10px] font-medium">{getInitials(user.name)}</AvatarFallback>
    </Avatar>
  )
}

export function AddTaskSheet({
  open,
  onOpenChange,
  onAddTask,
  associateTo,
  associateId,
  entityName,
  companyId
}: AddTaskSheetProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const { addTimelineActivity } = useTimeline()
  const [settings, setSettings] = useState<{
    users: UserOption[]
  }>({
    users: [],
  })

  const [currentUserId, setCurrentUserId] = useState("")
  const hasInitializedAssignee = useRef(false)

  const getDefaultTitle = (type: string) => {
    const titlePrefix: Record<string, string> = {
      Email: "Email to",
      Call: "Call with",
      WhatsApp: "WhatsApp to",
      Meeting: "Meeting with",
      Visit: "Visit to"
    }
    return entityName ? `${titlePrefix[type]} ${entityName}` : ""
  }

  const form = useForm<TaskFormValues>({
    defaultValues: {
      description: getDefaultTitle("Email"),
      type: "Email",
      date: new Date(),
      time: "10:00",
      assigned_to: ""
    }
  })

  const taskType = form.watch("type")

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
      hasInitializedAssignee.current = false
      return
    }
    fetchSettings()
  }, [open])

  useEffect(() => {
    if (!open || !currentUserId || settings.users.length === 0 || hasInitializedAssignee.current) {
      return
    }

    const currentUserExists = settings.users.some(
      (user) => user._id === currentUserId,
    )
    if (currentUserExists) {
      form.setValue("assigned_to", currentUserId)
      hasInitializedAssignee.current = true
    }
  }, [open, currentUserId, settings.users, form])

  useEffect(() => {
    form.setValue("description", getDefaultTitle(taskType))
  }, [taskType, entityName, form])

  const fetchSettings = async () => {
    setIsLoadingUsers(true)
    try {
      const storedData = localStorage.getItem("map_user")
      if (!storedData) {
        throw new Error("User not authenticated")
      }
      const userData = JSON.parse(storedData)
      const users = await fetchActiveTaskUsers(userData.access_token)
      setSettings({ users })
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch settings",
        variant: "destructive"
      })
    } finally {
      setIsLoadingUsers(false)
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
            "Content-Type": "application/json"
          }
        })
        const existingTasks = await checkDuplicateResponse.json()
        const formattedDate = format(data.date as Date, "dd/MM/yyyy")
        const isDuplicate = existingTasks.data?.task?.some((task: any) => {
          return (
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
            variant: "destructive"
          })
          setIsSubmitting(false)
          return
        }
      }

      const payload: any = {
        associate_id: associateId,
        associate_to: associateTo,
        assigned_to: data.assigned_to,
        description: data.description,
        time: data.time,
        date: format(data.date as Date, "yyyy-MM-dd"),
        new_task_type: data.type
      }
      if (companyId) {
        payload.company_id = companyId
      }

      const response = await fetch(URLS.CRM_TASKS, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userData.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      if (result.code === 200) {
        addTimelineActivity({
          category_name: "task",
          action: "create",
          text_info: `Created task for ${entityName || ""}`,
          associate_id: associateId,
          associate_to: associateTo
        })

        toast({
          title: "Success",
          description: "Task has been added successfully"
        })

        onAddTask(data)
        form.reset({
          ...form.getValues(),
          description: getDefaultTitle("Email"),
          type: "Email",
          time: "10:00"
        })
        onOpenChange(false)
      } else {
        throw new Error(result.msg || "Failed to add task")
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to add task",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={sheetFormContentClassName}>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <SheetHeader className={formModalHeaderClassName}>
            <SheetTitle className="text-lg font-semibold tracking-tight">Add New Task</SheetTitle>
            <SheetDescription>
              {entityName
                ? `Schedule a follow-up task for ${entityName}`
                : "Schedule a new follow-up task"}
            </SheetDescription>
          </SheetHeader>

          <div className="px-6 py-6">
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
                              selected={field.value as Date}
                              onSelect={field.onChange}
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
