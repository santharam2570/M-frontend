"use client"

import { useEffect, useState } from "react"
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isValid,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useRouter } from "next/navigation"

import { AddTaskSheet } from "@/components/calendar-page/add-task-sheet"
import { TaskDrawer } from "@/components/calendar-page/task-drawer"
import { TaskItem } from "@/components/calendar-page/task-item"
import type { CalendarTask } from "@/components/calendar-page/types"
import { Button } from "@/components/ui/button"
import URLS from "@/config/urls"
import { cn } from "@/lib/utils"

type CalendarView = "day" | "week" | "month"

const isObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value)

const resolveTaskType = (newTaskType: unknown, taskType: unknown): string | null => {
  const primary = typeof newTaskType === "string" ? newTaskType.trim() : ""
  if (primary) return primary

  const secondary = typeof taskType === "string" ? taskType.trim() : ""
  if (secondary && !isObjectId(secondary)) return secondary

  return null
}

const parseApiDate = (dateValue: unknown): Date | null => {
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

export function CalendarView() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentView, setCurrentView] = useState<CalendarView>("month")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerDate, setDrawerDate] = useState<Date | null>(null)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [addTaskDate, setAddTaskDate] = useState<Date>(new Date())
  const [tasks, setTasks] = useState<CalendarTask[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const fetchTasks = async () => {
    setLoading(true)

    try {
      const storedData = localStorage.getItem("map_user")
      if (!storedData) {
        router.push("/login")
        return
      }

      const userData = JSON.parse(storedData)
      const token = userData?.access_token

      if (!token) {
        router.push("/login")
        return
      }

      const dateFrom = format(startOfMonth(selectedDate), "dd/MM/yyyy")
      const dateTo = format(endOfMonth(selectedDate), "dd/MM/yyyy")

      const response = await fetch(
        `${URLS.TASK_CALENDER}?date_from=${dateFrom}&date_to=${dateTo}&owner=&status=Open`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()
      if (data.code === 200) {
        const formattedTasks: CalendarTask[] = data.data
          .map((task: Record<string, unknown>) => {
            const parsedDate = parseApiDate(task.date)
            if (!parsedDate) return null

            return {
              id: String(task._id),
              title: String(
                task.description ?? task.task_name ?? "Untitled task"
              ),
              date: parsedDate.toISOString(),
              time: (task.time || task.due_time || null) as string | null,
              completed: task.status !== "Open",
              module: (task.associate_to as string) || null,
              type: resolveTaskType(task.new_task_type, task.task_type),
              category: (task.associate_to as string) || null,
              associateId: (task.associate_id as string) || null,
              companyId: (task.company_id as string) || null,
            }
          })
          .filter((task: CalendarTask | null): task is CalendarTask => task !== null)

        setTasks(formattedTasks)
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [selectedDate])

  const changeView = (view: CalendarView) => {
    setCurrentView(view)
    if (view === "day") {
      setSelectedDate(new Date())
    }
  }

  const nextDate = () => {
    if (currentView === "day") {
      setSelectedDate(addDays(selectedDate, 1))
    } else if (currentView === "week") {
      setSelectedDate(addDays(selectedDate, 7))
    } else {
      setSelectedDate(
        new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1)
      )
    }
  }

  const prevDate = () => {
    if (currentView === "day") {
      setSelectedDate(addDays(selectedDate, -1))
    } else if (currentView === "week") {
      setSelectedDate(addDays(selectedDate, -7))
    } else {
      setSelectedDate(
        new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1)
      )
    }
  }

  const getDaysToDisplay = () => {
    if (currentView === "day") {
      return [selectedDate]
    }
    if (currentView === "week") {
      return eachDayOfInterval({
        start: startOfWeek(selectedDate),
        end: endOfWeek(selectedDate),
      })
    }
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(selectedDate)),
      end: endOfWeek(endOfMonth(selectedDate)),
    })
  }

  const days = getDaysToDisplay()

  const getActiveTasksForDay = (day: Date) =>
    tasks.filter((task) => {
      const taskDate = new Date(task.date)
      return isSameDay(taskDate, day) && !task.completed
    })

  const getHeaderText = () => {
    if (currentView === "day") {
      return format(selectedDate, "MMMM d, yyyy")
    }
    if (currentView === "week") {
      const weekStart = startOfWeek(selectedDate)
      const weekEnd = endOfWeek(selectedDate)
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
    }
    return format(selectedDate, "MMMM yyyy")
  }

  const openDrawer = (date: Date) => {
    setDrawerDate(date)
    setDrawerOpen(true)
  }

  const openAddTask = (date?: Date) => {
    setAddTaskDate(date ?? selectedDate)
    setAddTaskOpen(true)
  }

  return (
    <>
      <div className="flex-1 transition-all duration-300 ease-in-out">
        <div className="sticky top-0 z-10 border-b bg-background p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h1 className="text-2xl font-bold">Calendar</h1>

            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" onClick={prevDate}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="min-w-[180px] text-center text-xl font-semibold">
                {getHeaderText()}
              </h2>
              <Button variant="outline" size="icon" onClick={nextDate}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex justify-center gap-2">
              <Button onClick={() => openAddTask()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
              <Button
                variant={currentView === "day" ? "default" : "outline"}
                onClick={() => changeView("day")}
              >
                Day
              </Button>
              <Button
                variant={currentView === "week" ? "default" : "outline"}
                onClick={() => changeView("week")}
              >
                Week
              </Button>
              <Button
                variant={currentView === "month" ? "default" : "outline"}
                onClick={() => changeView("month")}
              >
                Month
              </Button>
            </div>
          </div>
        </div>

        <div className="h-[calc(100vh-10rem)] overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              Loading tasks...
            </div>
          ) : currentView === "month" ? (
            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="sticky top-0 z-10 bg-background py-2 text-center font-medium"
                >
                  {day}
                </div>
              ))}
              {days.map((day, dayIdx) => {
                const dayTasks = getActiveTasksForDay(day)
                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      "min-h-[100px] cursor-pointer rounded-md border p-2 hover:border-primary/50",
                      !isSameMonth(day, selectedDate) && "bg-muted/50 text-muted-foreground",
                      isToday(day) && "border-2 border-blue-500",
                      isSameDay(day, selectedDate) && "ring-2 ring-primary ring-offset-2"
                    )}
                    onClick={() => setSelectedDate(day)}
                    onDoubleClick={() => openAddTask(day)}
                  >
                    <div className="mb-1 text-right">{format(day, "d")}</div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 2).map((task) => (
                        <TaskItem key={task.id} task={task} />
                      ))}
                      {dayTasks.length > 2 && (
                        <button
                          type="button"
                          className="mt-1 cursor-pointer text-xs font-medium text-primary hover:underline"
                          onClick={(event) => {
                            event.stopPropagation()
                            openDrawer(day)
                          }}
                        >
                          Show more ({dayTasks.length - 2})
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : currentView === "week" ? (
            <div className="space-y-2">
              {days.map((day, dayIdx) => {
                const dayTasks = getActiveTasksForDay(day)
                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      "cursor-pointer rounded-md border p-3 hover:border-primary/50",
                      isToday(day) && "border-2 border-blue-500",
                      isSameDay(day, selectedDate) && "ring-2 ring-primary ring-offset-2"
                    )}
                    onClick={() => setSelectedDate(day)}
                  >
                    <div className="mb-2 font-medium">{format(day, "EEEE, MMMM d")}</div>
                    <div className="space-y-2">
                      {dayTasks.length > 0 ? (
                        dayTasks.map((task) => <TaskItem key={task.id} task={task} showTime />)
                      ) : (
                        <p className="text-muted-foreground">No tasks scheduled for this day</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div
              className="rounded-md border p-4"
              onClick={() => setSelectedDate(selectedDate)}
            >
              <div className="mb-4 text-lg font-medium">
                {format(selectedDate, "EEEE, MMMM d")}
              </div>
              <div className="space-y-3">
                {getActiveTasksForDay(selectedDate).length > 0 ? (
                  getActiveTasksForDay(selectedDate).map((task) => (
                    <TaskItem key={task.id} task={task} showTime />
                  ))
                ) : (
                  <p className="text-muted-foreground">No tasks scheduled for today</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <TaskDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        date={drawerDate}
        tasks={drawerDate ? getActiveTasksForDay(drawerDate) : []}
        onAddTask={() => {
          if (drawerDate) {
            setDrawerOpen(false)
            openAddTask(drawerDate)
          }
        }}
      />

      <AddTaskSheet
        open={addTaskOpen}
        onOpenChange={setAddTaskOpen}
        defaultDate={addTaskDate}
        onTaskAdded={fetchTasks}
      />
    </>
  )
}
