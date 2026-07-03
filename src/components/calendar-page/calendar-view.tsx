"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"

import { AddTaskSheet } from "@/components/calendar-page/add-task-sheet"
import { TaskDrawer } from "@/components/calendar-page/task-drawer"
import { TaskItem } from "@/components/calendar-page/task-item"
import { Button } from "@/components/ui/button"
import { fetchCalendarTasks, getCalendarMonthKey } from "@/lib/calendar/calendar-api"
import { cn } from "@/lib/utils"

type CalendarView = "day" | "week" | "month"

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem("map_user") ?? "{}"
    const parsed = JSON.parse(stored)
    return parsed?.access_token ?? null
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
  const [hasToken, setHasToken] = useState(false)
  const router = useRouter()
  const queryClient = useQueryClient()

  const monthKey = getCalendarMonthKey(selectedDate)

  useEffect(() => {
    if (!getAuthToken()) {
      router.push("/login")
    } else {
      setHasToken(true)
    }
  }, [router])

  const {
    data: tasks = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["calendar-tasks", monthKey],
    enabled: hasToken,
    queryFn: ({ signal }) => {
      const token = getAuthToken()
      if (!token) return Promise.resolve([])
      return fetchCalendarTasks(token, selectedDate, signal)
    },
    placeholderData: keepPreviousData,
  })

  const refreshTasks = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["calendar-tasks"] })
  }, [queryClient])

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

  const days = useMemo(() => {
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
  }, [currentView, selectedDate])

  const getActiveTasksForDay = useCallback(
    (day: Date) =>
      tasks.filter((task) => {
        const taskDate = new Date(task.date)
        return isSameDay(taskDate, day) && !task.completed
      }),
    [tasks],
  )

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

  const showInitialLoading = isLoading && tasks.length === 0

  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
        <div
          key={day}
          className="sticky top-0 z-10 bg-background py-1 text-center text-[10px] font-medium sm:py-2 sm:text-sm"
        >
          <span className="sm:hidden">{day.charAt(0)}</span>
          <span className="hidden sm:inline">{day}</span>
        </div>
      ))}
      {days.map((day, dayIdx) => {
        const dayTasks = getActiveTasksForDay(day)
        return (
          <div
            key={dayIdx}
            className={cn(
              "min-h-[72px] cursor-pointer rounded-md border p-1 hover:border-primary/50 sm:min-h-[100px] sm:p-2",
              !isSameMonth(day, selectedDate) && "bg-muted/50 text-muted-foreground",
              isToday(day) && "border-2 border-blue-500",
              isSameDay(day, selectedDate) && "ring-2 ring-primary ring-offset-2",
              showInitialLoading && "animate-pulse",
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
  )

  const renderWeekView = () => (
    <div className="space-y-2">
      {days.map((day, dayIdx) => {
        const dayTasks = getActiveTasksForDay(day)
        return (
          <div
            key={dayIdx}
            className={cn(
              "cursor-pointer rounded-md border p-3 hover:border-primary/50",
              isToday(day) && "border-2 border-blue-500",
              isSameDay(day, selectedDate) && "ring-2 ring-primary ring-offset-2",
              showInitialLoading && "animate-pulse",
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
  )

  const renderDayView = () => {
    const dayTasks = getActiveTasksForDay(selectedDate)

    return (
      <div
        className={cn(
          "rounded-md border p-4",
          showInitialLoading && "animate-pulse",
        )}
        onClick={() => setSelectedDate(selectedDate)}
      >
        <div className="mb-4 text-lg font-medium">
          {format(selectedDate, "EEEE, MMMM d")}
        </div>
        <div className="space-y-3">
          {dayTasks.length > 0 ? (
            dayTasks.map((task) => <TaskItem key={task.id} task={task} showTime />)
          ) : (
            <p className="text-muted-foreground">No tasks scheduled for today</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 transition-all duration-300 ease-in-out">
        <div className="sticky top-0 z-10 border-b bg-background p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h1 className="text-xl font-bold sm:text-2xl">Calendar</h1>

            <div className="flex items-center justify-between gap-1 sm:justify-center sm:gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={prevDate}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="flex min-w-0 flex-1 items-center justify-center gap-2 text-center text-sm font-semibold sm:min-w-[180px] sm:flex-none sm:text-xl">
                {getHeaderText()}
                {isFetching && !isLoading && (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-label="Updating tasks" />
                )}
              </h2>
              <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={nextDate}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={() => openAddTask()} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
              <div className="grid grid-cols-3 gap-1 sm:flex sm:gap-2">
                <Button
                  variant={currentView === "day" ? "default" : "outline"}
                  className="px-2 text-xs sm:px-4 sm:text-sm"
                  onClick={() => changeView("day")}
                >
                  Day
                </Button>
                <Button
                  variant={currentView === "week" ? "default" : "outline"}
                  className="px-2 text-xs sm:px-4 sm:text-sm"
                  onClick={() => changeView("week")}
                >
                  Week
                </Button>
                <Button
                  variant={currentView === "month" ? "default" : "outline"}
                  className="px-2 text-xs sm:px-4 sm:text-sm"
                  onClick={() => changeView("month")}
                >
                  Month
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "h-[calc(100dvh-12rem)] overflow-auto p-2 transition-opacity duration-200 sm:h-[calc(100vh-10rem)] sm:p-4",
            isFetching && !isLoading && "opacity-70",
          )}
        >
          {currentView === "month"
            ? renderMonthView()
            : currentView === "week"
              ? renderWeekView()
              : renderDayView()}
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
        onTaskAdded={refreshTasks}
      />
    </>
  )
}
