"use client"

import { format } from "date-fns"
import { Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { TaskItem } from "./task-item"
import type { CalendarTask } from "./types"

interface TaskDrawerProps {
  isOpen: boolean
  onClose: () => void
  date: Date | null
  tasks: CalendarTask[]
  onAddTask?: () => void
}

export function TaskDrawer({ isOpen, onClose, date, tasks, onAddTask }: TaskDrawerProps) {
  if (!date) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-opacity duration-300",
        isOpen ? "opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      <div
        className={cn(
          "fixed top-0 right-0 flex h-full w-full max-w-md flex-col border-l bg-background shadow-lg transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-4">
          <h2 className="font-semibold">All Tasks</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="border-b p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-medium">{format(date, "MMMM d, yyyy")}</h3>
              <p className="text-sm text-muted-foreground">{format(date, "EEEE")}</p>
            </div>
            {onAddTask && (
              <Button variant="outline" size="sm" onClick={onAddTask}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add Task
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map((task) => (
                <TaskItem key={task.id} task={task} showTime />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No tasks for this day</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
