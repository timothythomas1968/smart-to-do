"use client"

import type React from "react"

import { useState } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Task } from "@/lib/types"
import { TaskEditDialog } from "./task-edit-dialog"

interface CalendarViewProps {
  tasks: Task[]
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void
  onTaskDelete: (taskId: string) => void
  hasBackground: boolean
  isDarkMode: boolean
}

export function CalendarView({ tasks, onTaskUpdate, onTaskDelete, hasBackground, isDarkMode }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [dragKey, setDragKey] = useState(0)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)

  const calendarStart = new Date(monthStart)
  calendarStart.setDate(calendarStart.getDate() - monthStart.getDay()) // Go back to Sunday

  const calendarEnd = new Date(monthEnd)
  calendarEnd.setDate(calendarEnd.getDate() + (6 - monthEnd.getDay())) // Go forward to Saturday

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd }).map((day) => {
    // Create a clean local date for each calendar day to avoid timezone offset issues
    return new Date(day.getFullYear(), day.getMonth(), day.getDate())
  })

  const getTasksForDay = (day: Date) => {
    return tasks.filter((task) => {
      if (task.is_completed) return false
      if (!task.due_date) return false

      const dateParts = task.due_date.split("-")
      if (dateParts.length !== 3) return false

      const year = Number.parseInt(dateParts[0], 10)
      const month = Number.parseInt(dateParts[1], 10) - 1 // Month is 0-indexed
      const dayOfMonth = Number.parseInt(dateParts[2], 10)

      const cleanTaskDate = new Date(year, month, dayOfMonth)

      return isSameDay(cleanTaskDate, day)
    })
  }

  const handleTaskClick = (task: Task, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingTask(task)
  }

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", task.id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault()

    if (draggedTask) {
      const newDueDate = format(targetDate, "yyyy-MM-dd")

      console.log("[v0] Dropping task", draggedTask.id, "on calendar day:", format(targetDate, "yyyy-MM-dd"))
      console.log("[v0] Setting due_date to:", newDueDate)

      onTaskUpdate(draggedTask.id, { due_date: newDueDate })
      setDraggedTask(null)
      setDragKey((prev) => prev + 1)
    }
  }

  const handleDragEnd = () => {
    setDraggedTask(null)
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => (direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1)))
  }

  return (
    <div
      key={dragKey}
      className={cn(
        "p-4 rounded-lg",
        hasBackground && !isDarkMode && "bg-white/50 backdrop-blur-sm",
        hasBackground && isDarkMode && "bg-gray-800/80 backdrop-blur-sm",
        !hasBackground && isDarkMode && "bg-gray-800",
        !hasBackground && !isDarkMode && "bg-white",
      )}
    >
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className={cn("text-xl font-semibold", isDarkMode ? "text-gray-100" : "text-gray-900")}>
          {format(currentDate, "MMMM yyyy")}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth("prev")}
            className={isDarkMode ? "border-gray-600 hover:bg-gray-700" : ""}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className={isDarkMode ? "border-gray-600 hover:bg-gray-700" : ""}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth("next")}
            className={isDarkMode ? "border-gray-600 hover:bg-gray-700" : ""}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className={cn("p-2 text-center text-sm font-medium", isDarkMode ? "text-gray-400" : "text-gray-600")}
          >
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {calendarDays.map((day) => {
          const dayTasks = getTasksForDay(day)
          const isCurrentDay = isToday(day)
          const isDragTarget = draggedTask && !isSameDay(new Date(draggedTask.due_date || new Date()), day)
          const isCurrentMonth = day.getMonth() === currentDate.getMonth()

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[120px] p-2 border rounded-lg transition-colors",
                isCurrentDay && "ring-2 ring-blue-500",
                isDragTarget && "ring-2 ring-green-400 bg-green-50/20",
                !isCurrentMonth && "opacity-40",
                isDarkMode
                  ? "border-gray-600 bg-gray-700/30 hover:bg-gray-700/50"
                  : "border-gray-200 bg-gray-50/50 hover:bg-gray-100/50",
                "relative",
              )}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
            >
              {/* Day Number */}
              <div
                className={cn(
                  "text-sm font-medium mb-2",
                  isCurrentDay ? "text-blue-600 font-bold" : isDarkMode ? "text-gray-300" : "text-gray-700",
                  !isCurrentMonth && "opacity-60",
                )}
              >
                {format(day, "d")}
              </div>

              {/* Tasks for this day */}
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map((task) => (
                  <div
                    key={`${task.id}-${dragKey}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => handleTaskClick(task, e)}
                    className={cn(
                      "p-1 rounded text-xs cursor-pointer transition-all duration-200",
                      "hover:shadow-md hover:scale-105",
                      task.priority === "high"
                        ? "bg-red-100 text-red-800 border border-red-200"
                        : task.priority === "medium"
                          ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                          : isDarkMode
                            ? "bg-blue-900/50 text-blue-200 border border-blue-700"
                            : "bg-blue-100 text-blue-800 border border-blue-200",
                      draggedTask?.id === task.id && "opacity-30 scale-95 rotate-2",
                    )}
                  >
                    <div className="truncate font-medium">
                      {task.title || task.subject || task.original_text || "No subject"}
                    </div>
                    {task.priority && (
                      <Badge variant={task.priority === "high" ? "destructive" : "secondary"} className="text-xs mt-1">
                        {task.priority}
                      </Badge>
                    )}
                  </div>
                ))}

                {/* Show count if more tasks */}
                {dayTasks.length > 3 && (
                  <div className={cn("text-xs text-center py-1", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                    +{dayTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Task Edit Dialog */}
      {editingTask && (
        <TaskEditDialog
          task={editingTask}
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          onSave={(updates) => {
            onTaskUpdate(editingTask.id, updates)
            setEditingTask(null)
          }}
          onDelete={() => {
            onTaskDelete(editingTask.id)
            setEditingTask(null)
          }}
        />
      )}
    </div>
  )
}
