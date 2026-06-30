"use client"

import { useEffect, useRef, useState } from "react"
import { format, isValid, startOfToday } from "date-fns"
import { Clock, Mail, MapPin, Phone, Users } from "lucide-react"
import { useForm } from "react-hook-form"

import { TIME_OPTIONS } from "@/components/all-lists-followup-tasks/config"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  FormSelectContent,
  FormSelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  formModalFieldGroupClassName,
  formModalFooterButtonClassName,
  formModalFooterClassName,
  formModalHeaderClassName,
  formModalRequiredClassName,
} from "@/components/ui/sheet"
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon"
import URLS from "@/config/urls"
import { useToast } from "@/hooks/use-toast"
import {
  formInputClassName,
  formSelectTriggerClassName,
} from "@/lib/form-field-styles"
import { cn } from "@/lib/utils"

type TaskFormValues = {
  type: string
  assigned_to: string
  description: string
  time: string
  date?: Date
  associate_id: string
}

type UserOption = {
  _id: string
  name: string
  profile_image?: string
}

type LeadOption = {
  _id: string
  name: string
}

type AddTaskSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate?: Date
  onTaskAdded?: () => void
}

const TASK_TYPES = [
  {
    label: "Call" as const,
    icon: Phone,
    color: "text-green-500",
    active: "bg-green-50 ring-2 ring-green-500 dark:bg-green-950/40",
  },
  {
    label: "WhatsApp" as const,
    icon: WhatsAppIcon,
    color: "",
    active: "bg-emerald-50 ring-2 ring-emerald-500 dark:bg-emerald-950/40",
  },
  {
    label: "Meeting" as const,
    icon: Users,
    color: "text-purple-500",
    active: "bg-purple-50 ring-2 ring-purple-500 dark:bg-purple-950/40",
  },
  {
    label: "Visit" as const,
    icon: MapPin,
    color: "text-orange-500",
    active: "bg-orange-50 ring-2 ring-orange-500 dark:bg-orange-950/40",
  },
  {
    label: "Email" as const,
    icon: Mail,
    color: "text-blue-500",
    active: "bg-blue-50 ring-2 ring-blue-500 dark:bg-blue-950/40",
  },
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
  defaultDate,
  onTaskAdded,
}: AddTaskSheetProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [users, setUsers] = useState<UserOption[]>([])
  const [leads, setLeads] = useState<LeadOption[]>([])
  const [currentUserId, setCurrentUserId] = useState("")
  const hasInitializedAssignee = useRef(false)

  const form = useForm<TaskFormValues>({
    defaultValues: {
      description: "",
      type: "Email",
      date: defaultDate ?? new Date(),
      time: "10:00",
      assigned_to: "",
      associate_id: "",
    },
  })

  const taskType = form.watch("type")
  const selectedDate = form.watch("date")

  useEffect(() => {
    if (!open) {
      hasInitializedAssignee.current = false
      return
    }

    form.setValue("date", defaultDate ?? new Date())

    try {
      const storedData = localStorage.getItem("map_user")
      if (!storedData) return
      const userDetails = JSON.parse(storedData)
      setCurrentUserId(String(userDetails.result?.id ?? ""))
    } catch {
      setCurrentUserId("")
    }

    fetchSettings()
  }, [open, defaultDate, form])

  useEffect(() => {
    if (!open || !currentUserId || users.length === 0 || hasInitializedAssignee.current) {
      return
    }

    const currentUserExists = users.some((user) => user._id === currentUserId)
    if (currentUserExists) {
      form.setValue("assigned_to", currentUserId)
      hasInitializedAssignee.current = true
    }
  }, [open, currentUserId, users, form])

  useEffect(() => {
    const selectedLead = leads.find((lead) => lead._id === form.getValues("associate_id"))
    if (!selectedLead) return

    const titlePrefix: Record<string, string> = {
      Email: "Email to",
      Call: "Call with",
      WhatsApp: "WhatsApp to",
      Meeting: "Meeting with",
      Visit: "Visit to",
    }

    form.setValue("description", `${titlePrefix[taskType] ?? "Task for"} ${selectedLead.name}`)
  }, [taskType, leads, form])

  const fetchSettings = async () => {
    try {
      const storedData = localStorage.getItem("map_user")
      if (!storedData) throw new Error("User not authenticated")

      const userData = JSON.parse(storedData)
      const headers = {
        Authorization: `Bearer ${userData.access_token}`,
        "Content-Type": "application/json",
      }

      const [usersResponse, leadsResponse] = await Promise.all([
        fetch(URLS.USERS_LIST, { method: "GET", headers }),
        fetch(`${URLS.LEAD_LIST}?page=1&limit=50`, { method: "GET", headers }),
      ])

      const usersResult = await usersResponse.json()
      const leadsResult = await leadsResponse.json()

      const activeUsers = Array.isArray(usersResult?.data)
        ? usersResult.data
            .filter((user: { status?: string }) => user.status === "active")
            .map(
              (user: { _id?: string; id?: string; name?: string; profile_image?: string }) => ({
                _id: String(user._id ?? user.id ?? ""),
                name: String(user.name ?? ""),
                profile_image: user.profile_image,
              })
            )
            .filter((user: UserOption) => user._id)
        : []

      const leadOptions = Array.isArray(leadsResult?.data)
        ? leadsResult.data
            .map((lead: { _id?: string; name?: string; company_name?: string }) => ({
              _id: String(lead._id ?? ""),
              name: String(lead.name ?? lead.company_name ?? "Unnamed lead"),
            }))
            .filter((lead: LeadOption) => lead._id)
        : []

      setUsers(activeUsers)
      setLeads(leadOptions)
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch settings",
        variant: "destructive",
      })
    }
  }

  const onSubmit = async (data: TaskFormValues) => {
    try {
      if (isSubmitting) return
      setIsSubmitting(true)

      const storedData = localStorage.getItem("map_user")
      if (!storedData) throw new Error("User not authenticated")

      const userData = JSON.parse(storedData)
      const payload = {
        associate_id: data.associate_id,
        associate_to: "lead",
        assigned_to: data.assigned_to,
        description: data.description,
        time: data.time,
        date: format(data.date as Date, "yyyy-MM-dd"),
        new_task_type: data.type,
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
        toast({
          title: "Success",
          description: "Task has been added successfully",
        })
        onTaskAdded?.()
        form.reset({
          description: "",
          type: "Email",
          date: defaultDate ?? new Date(),
          time: "10:00",
          assigned_to: form.getValues("assigned_to"),
          associate_id: "",
        })
        onOpenChange(false)
      } else {
        throw new Error(result.msg || "Failed to add task")
      }
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add task",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full flex-col gap-0 p-0 data-[side=right]:sm:max-w-lg"
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SheetHeader className={formModalHeaderClassName}>
            <SheetTitle className="text-lg font-semibold tracking-tight">Add New Task</SheetTitle>
            <SheetDescription>Schedule a follow-up task on your calendar</SheetDescription>
          </SheetHeader>

          <div className="px-6 py-6">
            <Form {...form}>
              <form id="calendar-task-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                                    : "border-border bg-muted/30 hover:bg-muted/60"
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

                <FormField
                  control={form.control}
                  name="associate_id"
                  rules={{ required: "Lead is required" }}
                  render={({ field }) => (
                    <FormItem className={formModalFieldGroupClassName}>
                      <RequiredLabel>Related Lead</RequiredLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting || leads.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger size="form" className={formSelectTriggerClassName}>
                            <SelectValue
                              placeholder={leads.length === 0 ? "Loading leads..." : "Select lead"}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <FormSelectContent>
                          {leads.map((lead) => (
                            <FormSelectItem key={lead._id} value={lead._id}>
                              {lead.name}
                            </FormSelectItem>
                          ))}
                        </FormSelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <Separator />

                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Schedule
                  </div>

                  <div className="mb-4 rounded-md bg-background px-3 py-2 text-sm">
                    {selectedDate && isValid(selectedDate) ? (
                      <>
                        <p className="font-medium">{format(selectedDate, "EEEE")}</p>
                        <p className="text-muted-foreground">{format(selectedDate, "MMMM d, yyyy")}</p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">Select a date below</p>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="date"
                    rules={{ required: "Due date is required" }}
                    render={({ field }) => (
                      <FormItem className={formModalFieldGroupClassName}>
                        <FormControl>
                          <div className="flex justify-center rounded-md border bg-background p-2">
                            <Calendar
                              mode="single"
                              selected={field.value as Date}
                              onSelect={field.onChange}
                              disabled={(date) => !!date && date < startOfToday()}
                              className="p-0"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="time"
                    rules={{ required: "Time is required" }}
                    render={({ field }) => (
                      <FormItem className={cn(formModalFieldGroupClassName, "mt-4")}>
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
                        disabled={isSubmitting || users.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger size="form" className={formSelectTriggerClassName}>
                            <SelectValue
                              placeholder={
                                users.length === 0 ? "Loading users..." : "Select assignee"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
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
            form="calendar-task-form"
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
