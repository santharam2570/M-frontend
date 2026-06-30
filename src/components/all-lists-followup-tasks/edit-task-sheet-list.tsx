"use client"

import { useEffect, useMemo, useState } from "react"
import { format, isValid, startOfToday } from "date-fns"
import { CalendarIcon, Mail, Phone, Users } from "lucide-react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, sheetFormContentClassName } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useTimeline } from "@/hooks/use-timeline"
import URLS from "@/config/urls"
import { cn } from "@/lib/utils"
import { parseFollowupDate } from "@/lib/followup-date"
import { formDatePickerButtonClassName, formInputClassName, formSelectTriggerClassName, formTextareaClassName } from "@/lib/form-field-styles"

import {
  DEFAULT_SETTINGS,
  fetchActiveTaskUsers,
  fetchModuleTaskSettings,
  FollowUpTaskFormValues,
  FollowUpTaskModule,
  MODULE_CONFIGS,
  ModuleContext,
  TIME_OPTIONS,
} from "./config"

const VISIT_TIME_OPTIONS = Array.from({ length: 24 * 4 }).map((_, index) => {
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

type EditTaskSheetListProps = {
  module: FollowUpTaskModule
  open: boolean
  onOpenChange: (open: boolean) => void
  onEditTask: (task: FollowUpTaskFormValues) => void
  taskId?: string
  associateId?: string
  entityName?: string
  moduleContext?: ModuleContext
  initialTab?: "edit" | "complete"
  onCompleteTask?: () => void
}

const TITLE_PREFIX_MAP: Record<string, string> = {
  Email: "Email to",
  Call: "Call with",
  Meeting: "Meeting with",
  Visit: "Visit to",
}

export function EditTaskSheetList({
  module,
  open,
  onOpenChange,
  onEditTask,
  taskId,
  associateId,
  entityName,
  moduleContext,
  initialTab = "edit",
  onCompleteTask,
}: EditTaskSheetListProps) {
  const { toast } = useToast()
  const { addTimelineActivity } = useTimeline()
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const config = useMemo(() => MODULE_CONFIGS[module], [module])

  if (!config) {
    console.error(`Invalid module: ${module}. Available modules: ${Object.keys(MODULE_CONFIGS).join(", ")}`)
    return null
  }

  const form = useForm<FollowUpTaskFormValues>({
    defaultValues: {
      type: "",
      description: "",
      date: undefined,
      time: "",
      assigned_to: "",
      visitType: undefined,
      visitPurpose: undefined,
    },
  })

  const taskType = form.watch("type")
  const visitType = form.watch("visitType")

  const [activeTab, setActiveTab] = useState<"edit" | "complete">(initialTab)
  const [completionNote, setCompletionNote] = useState("")
  const [inTime, setInTime] = useState("")
  const [outTime, setOutTime] = useState("")
  const [isCompleting, setIsCompleting] = useState(false)

  const showVisitType = taskType === "Visit"
  const showVisitPurpose = showVisitType && !!visitType
  const isVisitTask = taskType === "Visit"

  const headerContent = activeTab === "edit"
    ? {
        title: "Edit Task",
        description: "Update task details and assignments",
      }
    : {
        title: "Complete Task",
        description: "Add notes before completing this task",
      }

  useEffect(() => {
    if (!open) return
    const initialize = async () => {
      await fetchSettings()
      if (taskId) {
        await fetchTaskDetails(taskId)
      }
    }
    initialize()
  }, [open, taskId, config.settingsUrl])

  useEffect(() => {
    form.setValue("description", getDefaultTitle(taskType))
  }, [taskType, form, entityName])

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab)
    }
  }, [open, initialTab])

  useEffect(() => {
    if (!open) {
      setCompletionNote("")
      setInTime("")
      setOutTime("")
      setIsCompleting(false)
    }
  }, [open])

  const getDefaultTitle = (type: string) => {
    if (!entityName) return ""
    const prefix = TITLE_PREFIX_MAP[type] ?? ""
    return prefix ? `${prefix} ${entityName}` : entityName
  }

  const getUserData = () => {
    const storedData = localStorage.getItem("map_user")
    if (!storedData) {
      throw new Error("User not authenticated")
    }
    return JSON.parse(storedData)
  }

  const fetchSettings = async () => {
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

  const fetchTaskDetails = async (id: string) => {
    try {
      const userData = getUserData()
      const response = await fetch(`${URLS.CRM_TASKS}/${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userData.access_token}`,
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()
      if (result.code === 200 && result.data) {
        const taskData = result.data
        form.reset({
          type: taskData.new_task_type || "Email",
          description: taskData.description || "",
          date: parseFollowupDate(taskData.date) ?? undefined,
          time: normalizeApiTime(taskData.time),
          assigned_to: taskData.assigned_to || "",
          visitPurpose: taskData.visit_purpose || undefined,
          visitType: taskData.task_type || undefined,
        })
      }
    } catch (error: any) {
      console.error("Failed to fetch task details:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch task details",
        variant: "destructive",
      })
    }
  }

  const onSubmit = async (data: FollowUpTaskFormValues) => {
    try {
      if (!taskId) {
        toast({
          title: "Error",
          description: "Missing task identifier. Please try again.",
          variant: "destructive",
        })
        return
      }

      if (isSubmitting) return
      setIsSubmitting(true)

      const userData = getUserData()

      if (config.duplicateUrl && associateId) {
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
          const isDuplicate = existingTasks.data?.task?.some((task: any) => {
            if (task?._id === taskId) {
              return false
            }
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

      const payload: Record<string, unknown> = {
        assigned_to: data.assigned_to,
        description: data.description,
        time: data.time,
        date: data.date ? format(data.date, "yyyy-MM-dd") : null,
        visit_purpose: data.visitPurpose,
        task_type: data.visitType,
        new_task_type: data.type,
      }

      if (associateId) {
        payload.associate_id = associateId
        payload.associate_to = config.associateTo
      }

      if (config.additionalPayload) {
        Object.assign(payload, config.additionalPayload({ data, associateId: associateId ?? "", moduleContext }))
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
          text_info: config.timelineTextEdit
            ? config.timelineTextEdit({ entityName, data })
            : `Task Updated for ${data.description}`,
          associate_id: config.timelineAssociateId
            ? config.timelineAssociateId({ associateId: associateId ?? "", moduleContext })
            : associateId ?? "",
          associate_to: config.timelineAssociateTo ?? config.associateTo,
        })

        toast({
          title: "Success",
          description: "Task has been updated successfully",
          variant: "default",
        })

        onEditTask(data)
        onOpenChange(false)
      } else {
        throw new Error(result.msg || "Failed to update task")
      }
    } catch (error: any) {
      console.error("Failed to update task:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCompleteTask = async () => {
    if (!taskId) {
      toast({
        title: "Error",
        description: "Missing task identifier. Please try again.",
        variant: "destructive",
      })
      return
    }

    try {
      if (isCompleting) return
      setIsCompleting(true)

      const userData = getUserData()
      const token = userData.access_token
      if (!token) {
        throw new Error("User not authenticated")
      }

      const payload: Record<string, unknown> = {
        note: completionNote,
        associate_to: config.associateTo,
      }

      if (associateId) {
        payload.associate_id = associateId
      }

      if (isVisitTask) {
        payload.in_time = inTime
        payload.out_time = outTime
      }

      const response = await fetch(`${URLS.TASKS_COMPLETED}/${taskId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.code === 200) {
        addTimelineActivity({
          category_name: "task",
          action: "update",
          text_info: entityName ? `Completed task for ${entityName}` : "Task Completed",
          associate_id: associateId ?? "",
          associate_to: config.associateTo,
        })

        toast({
          title: "Success",
          description: "Task completed successfully",
          variant: "default",
        })

        setCompletionNote("")
        setInTime("")
        setOutTime("")
        onCompleteTask?.()
        onOpenChange(false)
      } else {
        throw new Error(result.msg || "Failed to complete task")
      }
    } catch (error: any) {
      console.error("Failed to complete task:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to complete task",
        variant: "destructive",
      })
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={sheetFormContentClassName}>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <SheetHeader className="px-6 pt-6 pb-0 space-y-1.5 text-left">
            <SheetTitle>{headerContent.title}</SheetTitle>
            <SheetDescription>{headerContent.description}</SheetDescription>
          </SheetHeader>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "edit" | "complete")}>
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-2 rounded-lg bg-muted/40 p-1">
                <TabsTrigger className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm" value="edit">
                  Edit Task
                </TabsTrigger>
                <TabsTrigger className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm" value="complete">
                  Complete Task
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="edit">
              <div className="p-6">
                <Form {...form}>
                  <form id="edit-task-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormControl>
                            <div className="flex justify-between">
                              <TypePill label="Email" icon={Mail} currentValue={field.value} onChange={field.onChange} />
                              <TypePill label="Call" icon={Phone} currentValue={field.value} onChange={field.onChange} />
                              <TypePill
                                label="Meeting"
                                icon={Users}
                                currentValue={field.value}
                                onChange={field.onChange}
                              />
                              <TypePill label="Visit" icon={Users} currentValue={field.value} onChange={field.onChange} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      rules={{ required: "Task title is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Task Title</FormLabel>
                          <FormControl>
                            <Input {...field} className={formInputClassName} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className={cn(
                                      formDatePickerButtonClassName,
                                      !field.value && "text-muted-foreground",
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
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
                                  selected={
                                    field.value && isValid(field.value) ? field.value : undefined
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
                          <FormItem>
                            <FormLabel>Time</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger size="form" className={formSelectTriggerClassName}>
                                  <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                                <SelectContent>
                                  {TIME_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="assigned_to"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign to</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isLoadingUsers || settings.users.length === 0}
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
                            <SelectContent>
                              {settings.users.map((user) => (
                                <SelectItem key={user._id} value={user._id}>
                                  {user.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
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
                          <FormItem>
                            <FormLabel>Visit Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger size="form" className={formSelectTriggerClassName}>
                                  <SelectValue placeholder="Select visit type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {settings.followp_task_type.map((type: any) => (
                                  <SelectItem key={type._id} value={type._id}>
                                    {type.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
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
                          <FormItem>
                            <FormLabel>Visit Purpose</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger size="form" className={formSelectTriggerClassName}>
                                  <SelectValue placeholder="Select visit purpose" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {settings.visit_purpose.map((purpose: any) => (
                                  <SelectItem key={purpose._id} value={purpose._id}>
                                    {purpose.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </form>
                </Form>
              </div>
            </TabsContent>

            <TabsContent value="complete">
              <div className="p-6 space-y-4">
                {isVisitTask && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="complete-in-time">In Time</Label>
                      <Select value={inTime} onValueChange={setInTime}>
                        <SelectTrigger id="complete-in-time" size="form" className={formSelectTriggerClassName}>
                          <SelectValue placeholder="Select in time" />
                        </SelectTrigger>
                        <SelectContent>
                          {VISIT_TIME_OPTIONS.map((option) => (
                            <SelectItem key={`visit-in-${option.value}`} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="complete-out-time">Out Time</Label>
                      <Select value={outTime} onValueChange={setOutTime}>
                        <SelectTrigger id="complete-out-time" size="form" className={formSelectTriggerClassName}>
                          <SelectValue placeholder="Select out time" />
                        </SelectTrigger>
                        <SelectContent>
                          {VISIT_TIME_OPTIONS.map((option) => (
                            <SelectItem key={`visit-out-${option.value}`} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="completion-note">Completion Notes</Label>
                  <Textarea
                    id="completion-note"
                    placeholder="Add notes about this task completion"
                    value={completionNote}
                    onChange={(event) => setCompletionNote(event.target.value)}
                    className={cn(formTextareaClassName, "min-h-[120px]")}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="border-t p-4 bg-background flex justify-end gap-2 sticky bottom-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {activeTab === "edit" ? (
            <Button type="submit" form="edit-task-form" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleCompleteTask}
              disabled={isCompleting || (isVisitTask && (!inTime || !outTime))}
            >
              {isCompleting ? "Completing..." : "Complete Task"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

type TypePillProps = {
  label: "Email" | "Call" | "Meeting" | "Visit"
  icon: typeof Mail
  currentValue: string
  onChange: (value: string) => void
}

const TypePill = ({ label, icon: Icon, currentValue, onChange }: TypePillProps) => {
  const isActive = currentValue === label
  const styles: Record<TypePillProps["label"], string> = {
    Email: "bg-blue-100 ring-2 ring-blue-500",
    Call: "bg-green-100 ring-2 ring-green-500",
    Meeting: "bg-purple-100 ring-2 ring-purple-500",
    Visit: "bg-orange-100 ring-2 ring-orange-500",
  }
  const colorStyles: Record<TypePillProps["label"], string> = {
    Email: "text-blue-500",
    Call: "text-green-500",
    Meeting: "text-purple-500",
    Visit: "text-orange-500",
  }

  return (
    <button
      type="button"
      onClick={() => onChange(label)}
      className={`flex flex-col items-center gap-1 cursor-pointer p-2 rounded-md transition ${
        isActive ? styles[label] : "hover:bg-slate-100"
      }`}
    >
      <Icon className={`h-6 w-6 ${colorStyles[label]}`} />
      <span className="text-xs">{label}</span>
    </button>
  )
}

const normalizeApiTime = (time?: string) => {
  if (!time) {
    return "10:00"
  }
  return time.replace(/\s*[AP]M$/i, "")
}

