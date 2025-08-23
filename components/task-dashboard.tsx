"use client"

import { useState, useEffect } from "react"
import { format, isToday, isPast, isWithinInterval, addDays } from "date-fns"
import { Check, Edit, Mail, UserPlus, Calendar, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Task, TaskView, Project } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { TaskEditDialog } from "./task-edit-dialog"
import { EmailSendDialog } from "./email-send-dialog"
import { TaskDelegationDialog } from "./task-delegation-dialog"
import { CalendarView } from "./calendar-view"
import TaskViewSelector from "./task-view-selector"

interface TaskDashboardProps {
  userId?: string | null
  hasBackground: boolean
  isDarkMode: boolean
  opacity?: number
  currentProject?: Project | null
}

export function TaskDashboard({ userId, hasBackground, isDarkMode, opacity, currentProject }: TaskDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set())
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [emailingTask, setEmailingTask] = useState<Task | null>(null)
  const [delegatingTask, setDelegatingTask] = useState<Task | null>(null)
  const [activeView, setActiveView] = useState<TaskView>("all")
  const [previousView, setPreviousView] = useState<TaskView>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const fetchTasks = async () => {
    console.log("[v0] fetchTasks called with user ID:", userId)
    setIsLoading(true)

    try {
      if (!userId) {
        // Guest mode - load from localStorage
        const guestTasks = JSON.parse(localStorage.getItem("guestTasks") || "[]")
        console.log("[v0] Found", guestTasks.length, "guest tasks")
        setTasks(guestTasks)
        setIsLoading(false)
        return
      }

      // Authenticated user - load from database
      const supabaseClient = createClient()
      if (!supabaseClient) {
        console.log("[v0] Supabase client not available")
        setTasks([])
        setIsLoading(false)
        return
      }

      const { data, error } = await supabaseClient
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[v0] Error fetching tasks:", error)
        setTasks([])
      } else {
        console.log("[v0] Found", data?.length || 0, "tasks")
        setTasks(data || [])
      }
    } catch (error) {
      console.error("[v0] Error in fetchTasks:", error)
      setTasks([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [userId])

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    console.log("[v0] Updating task:", taskId, "with updates:", updates)
    try {
      if (!userId) {
        // Guest mode - update localStorage
        const guestTasks = JSON.parse(localStorage.getItem("guestTasks") || "[]")
        const updatedTasks = guestTasks.map((task: Task) => (task.id === taskId ? { ...task, ...updates } : task))
        localStorage.setItem("guestTasks", JSON.stringify(updatedTasks))
        setTasks(updatedTasks)
        console.log("[v0] Task updated in localStorage")
        return
      }

      // Authenticated user - update database
      const supabaseClient = createClient()
      if (!supabaseClient) return

      const { error } = await supabaseClient.from("tasks").update(updates).eq("id", taskId).eq("user_id", userId)

      if (error) {
        console.error("[v0] Error updating task:", error)
        return
      }

      // Update local state
      setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task)))
      console.log("[v0] Task updated in database and local state")
    } catch (error) {
      console.error("[v0] Error in handleTaskUpdate:", error)
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      if (!userId) {
        // Guest mode - remove from localStorage
        const guestTasks = JSON.parse(localStorage.getItem("guestTasks") || "[]")
        const filteredTasks = guestTasks.filter((task: Task) => task.id !== taskId)
        localStorage.setItem("guestTasks", JSON.stringify(filteredTasks))
        setTasks(filteredTasks)
        return
      }

      // Authenticated user - delete from database
      const supabaseClient = createClient()
      if (!supabaseClient) return

      const { error } = await supabaseClient.from("tasks").delete().eq("id", taskId).eq("user_id", userId)

      if (error) {
        console.error("[v0] Error deleting task:", error)
        return
      }

      // Update local state
      setTasks((prev) => prev.filter((task) => task.id !== taskId))
    } catch (error) {
      console.error("[v0] Error in handleTaskDelete:", error)
    }
  }

  const safeTasks = tasks || []

  const searchFilteredTasks = safeTasks.filter((task) => {
    if (!searchQuery.trim()) return true

    const query = searchQuery.toLowerCase()
    const searchableText = [task.title, task.subject, task.original_text, task.description, task.owner]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return searchableText.includes(query)
  })

  const parseTaskDate = (dateString: string | null): Date | null => {
    if (!dateString) return null

    const dateParts = dateString.split("-")
    if (dateParts.length !== 3) return null

    const year = Number.parseInt(dateParts[0], 10)
    const month = Number.parseInt(dateParts[1], 10) - 1 // Month is 0-indexed
    const dayOfMonth = Number.parseInt(dateParts[2], 10)

    return new Date(year, month, dayOfMonth)
  }

  const filteredTasks = searchFilteredTasks.filter((task) => {
    if (activeView === "today") {
      const taskDate = parseTaskDate(task.due_date)
      return taskDate && isToday(taskDate)
    } else if (activeView === "upcoming") {
      const taskDate = parseTaskDate(task.due_date)
      if (!taskDate) return false
      const today = new Date()
      const nextWeek = addDays(today, 7)
      return isWithinInterval(taskDate, { start: today, end: nextWeek })
    }
    return true
  })

  const sortTasksChronologically = (tasks: Task[]) => {
    return [...tasks].sort((a, b) => {
      // Tasks without due dates go to the bottom
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1

      const dateA = parseTaskDate(a.due_date)
      const dateB = parseTaskDate(b.due_date)
      if (!dateA || !dateB) return 0

      const now = new Date()

      // Check if tasks are overdue
      const aOverdue = isPast(dateA) && !isToday(dateA)
      const bOverdue = isPast(dateB) && !isToday(dateB)

      // Overdue tasks come first
      if (aOverdue && !bOverdue) return -1
      if (!aOverdue && bOverdue) return 1

      // Both overdue or both not overdue - sort by date
      return dateA.getTime() - dateB.getTime()
    })
  }

  const toggleTaskComplete = async (taskId: string, isCompleted: boolean) => {
    if (!isCompleted) {
      // Add completion animation
      setCompletingTasks((prev) => new Set([...prev, taskId]))

      // Show tick animation for 500ms
      setTimeout(() => {
        setCompletingTasks((prev) => {
          const newSet = new Set(prev)
          newSet.delete(taskId)
          return newSet
        })
        handleTaskUpdate(taskId, { is_completed: true })
      }, 500)
    } else {
      handleTaskUpdate(taskId, { is_completed: false })
    }
  }

  const getDueDateStyling = (dueDate: string | null) => {
    if (!dueDate) return ""

    const due = parseTaskDate(dueDate)
    if (!due) return ""

    const today = new Date()

    if (isPast(due) && !isToday(due)) {
      return "text-red-600 bg-red-50 border-red-200" // Overdue
    } else if (isToday(due)) {
      return "text-orange-600 bg-orange-50 border-orange-200" // Due today
    } else if (isWithinInterval(due, { start: today, end: addDays(today, 2) })) {
      return "text-yellow-600 bg-yellow-50 border-yellow-200" // Due soon
    }
    return ""
  }

  const handleBulkComplete = async () => {
    const updates = Array.from(selectedTasks).map((taskId) => handleTaskUpdate(taskId, { is_completed: true }))
    await Promise.all(updates)
    setSelectedTasks(new Set())
  }

  const handleBulkDelete = async () => {
    const deletions = Array.from(selectedTasks).map((taskId) => handleTaskDelete(taskId))
    await Promise.all(deletions)
    setSelectedTasks(new Set())
  }

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  const selectAllTasks = () => {
    const allIncompleteIds = safeTasks.filter((task) => !task.is_completed).map((task) => task.id)
    setSelectedTasks(new Set(allIncompleteIds))
  }

  const clearSelection = () => {
    setSelectedTasks(new Set())
  }

  const handleViewChange = (newView: TaskView) => {
    if (activeView !== "calendar" && newView === "calendar") {
      setPreviousView(activeView)
    }
    setActiveView(newView)
  }

  const toggleCalendarView = () => {
    if (activeView === "calendar") {
      setActiveView(previousView)
    } else {
      setPreviousView(activeView)
      setActiveView("calendar")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (activeView === "calendar") {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <TaskViewSelector
            currentView={activeView}
            onViewChange={handleViewChange}
            taskCounts={{
              all: safeTasks.length,
              today: safeTasks.filter((t) => {
                const taskDate = parseTaskDate(t.due_date)
                return taskDate && isToday(taskDate)
              }).length,
              upcoming: safeTasks.filter((t) => {
                const taskDate = parseTaskDate(t.due_date)
                if (!taskDate) return false
                const today = new Date()
                const nextWeek = addDays(today, 7)
                return isWithinInterval(taskDate, { start: today, end: nextWeek })
              }).length,
              week: safeTasks.filter((t) => {
                const taskDate = parseTaskDate(t.due_date)
                if (!taskDate) return false
                const today = new Date()
                const nextWeek = addDays(today, 7)
                return isWithinInterval(taskDate, { start: today, end: nextWeek })
              }).length,
              calendar: safeTasks.filter((t) => t.due_date).length,
              overdue: safeTasks.filter((t) => {
                const taskDate = parseTaskDate(t.due_date)
                return taskDate && isPast(taskDate) && !isToday(taskDate)
              }).length,
              pending: safeTasks.filter((t) => !t.is_completed).length,
              completed: safeTasks.filter((t) => t.is_completed).length,
            }}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={toggleCalendarView}
            className={cn(
              "flex items-center gap-2",
              isDarkMode
                ? "bg-gray-700 border-gray-600 text-gray-100 hover:bg-gray-600"
                : "bg-white border-gray-300 hover:bg-gray-50",
            )}
          >
            <Edit className="h-4 w-4" />
            List
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "pl-10 pr-10",
              isDarkMode ? "bg-gray-700 border-gray-600 text-gray-100" : "bg-white border-gray-300",
            )}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <CalendarView
          tasks={searchFilteredTasks}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          hasBackground={hasBackground}
          isDarkMode={isDarkMode}
        />
      </div>
    )
  }

  const completedTasks = filteredTasks.filter((task) => task.is_completed)
  const incompleteTasks = sortTasksChronologically(filteredTasks.filter((task) => !task.is_completed))

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <TaskViewSelector
          currentView={activeView}
          onViewChange={handleViewChange}
          taskCounts={{
            all: safeTasks.length,
            today: safeTasks.filter((t) => {
              const taskDate = parseTaskDate(t.due_date)
              return taskDate && isToday(taskDate)
            }).length,
            upcoming: safeTasks.filter((t) => {
              const taskDate = parseTaskDate(t.due_date)
              if (!taskDate) return false
              const today = new Date()
              const nextWeek = addDays(today, 7)
              return isWithinInterval(taskDate, { start: today, end: nextWeek })
            }).length,
            week: safeTasks.filter((t) => {
              const taskDate = parseTaskDate(t.due_date)
              if (!taskDate) return false
              const today = new Date()
              const nextWeek = addDays(today, 7)
              return isWithinInterval(taskDate, { start: today, end: nextWeek })
            }).length,
            calendar: safeTasks.filter((t) => t.due_date).length,
            overdue: safeTasks.filter((t) => {
              const taskDate = parseTaskDate(t.due_date)
              return taskDate && isPast(taskDate) && !isToday(taskDate)
            }).length,
            pending: safeTasks.filter((t) => !t.is_completed).length,
            completed: safeTasks.filter((t) => t.is_completed).length,
          }}
        />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleCalendarView}
            className={cn(
              "flex items-center gap-2",
              isDarkMode
                ? "bg-gray-700 border-gray-600 text-gray-100 hover:bg-gray-600"
                : "bg-white border-gray-300 hover:bg-gray-50",
            )}
          >
            {activeView === "calendar" ? (
              <>
                <Edit className="h-4 w-4" />
                List
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4" />
                Calendar
              </>
            )}
          </Button>

          {selectedTasks.size > 0 && (
            <div
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg border",
                isDarkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-200",
              )}
            >
              <span className={cn("text-sm", isDarkMode ? "text-gray-300" : "text-gray-600")}>
                {selectedTasks.size} selected
              </span>
              <Button size="sm" variant="outline" onClick={handleBulkComplete}>
                <Check className="h-4 w-4 mr-1" />
                Complete
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkDelete}>
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn(
            "pl-10 pr-10",
            isDarkMode ? "bg-gray-700 border-gray-600 text-gray-100" : "bg-white border-gray-300",
          )}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => setSearchQuery("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div
        className={cn(
          "space-y-4 p-4 rounded-lg",
          hasBackground && !isDarkMode && "bg-white/50 backdrop-blur-sm",
          hasBackground && isDarkMode && "bg-gray-800/80 backdrop-blur-sm",
          !hasBackground && isDarkMode && "bg-gray-800",
          !hasBackground && !isDarkMode && "bg-white",
        )}
      >
        {safeTasks.length === 0 && (
          <div className="text-center py-8">
            <p className={cn("text-muted-foreground", isDarkMode ? "text-gray-400" : "text-gray-500")}>
              No tasks yet. Add your first task above!
            </p>
          </div>
        )}

        {safeTasks.length > 0 && filteredTasks.length === 0 && searchQuery && (
          <div className="text-center py-8">
            <p className={cn("text-muted-foreground", isDarkMode ? "text-gray-400" : "text-gray-500")}>
              No tasks found matching "{searchQuery}"
            </p>
          </div>
        )}

        <div className="space-y-2">
          {incompleteTasks.length > 0 && (
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-600">
              <Checkbox
                checked={selectedTasks.size === incompleteTasks.length && incompleteTasks.length > 0}
                onCheckedChange={(checked) => (checked ? selectAllTasks() : clearSelection())}
              />
              <span className={cn("text-sm", isDarkMode ? "text-gray-300" : "text-gray-600")}>
                Select all ({incompleteTasks.length})
              </span>
            </div>
          )}

          {incompleteTasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all duration-200",
                isDarkMode ? "bg-gray-700/50 border-gray-600" : "bg-white border-gray-200",
                completingTasks.has(task.id) && "scale-105 shadow-lg",
                task.due_date && getDueDateStyling(task.due_date),
                selectedTasks.has(task.id) && "ring-2 ring-blue-500 ring-opacity-50",
              )}
            >
              <Checkbox checked={selectedTasks.has(task.id)} onCheckedChange={() => toggleTaskSelection(task.id)} />

              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-8 h-8 p-0 rounded-full transition-all duration-200",
                    completingTasks.has(task.id) && "bg-green-500 text-white border-green-500",
                    !completingTasks.has(task.id) && "hover:bg-green-50 hover:border-green-300",
                  )}
                  onClick={() => toggleTaskComplete(task.id, task.is_completed)}
                >
                  {completingTasks.has(task.id) ? (
                    <Check className="h-4 w-4 animate-in zoom-in duration-200" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border-2 border-gray-400" />
                  )}
                </Button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("font-medium", isDarkMode ? "text-gray-100" : "text-gray-900")}>
                    {task.title || task.subject || task.original_text || "No subject"}
                  </span>
                  {task.priority && (
                    <Badge
                      variant={
                        task.priority === "high" ? "destructive" : task.priority === "medium" ? "default" : "secondary"
                      }
                    >
                      {task.priority}
                    </Badge>
                  )}
                </div>

                <p className={cn("text-sm mt-1", isDarkMode ? "text-gray-300" : "text-gray-600")}>{task.description}</p>

                {task.due_date && (
                  <div className="flex items-center gap-1 mt-2">
                    <Calendar className="h-3 w-3" />
                    <span className="text-xs">{format(parseTaskDate(task.due_date) || new Date(), "MMM d, yyyy")}</span>
                    {(() => {
                      const taskDate = parseTaskDate(task.due_date)
                      return (
                        taskDate &&
                        isToday(taskDate) && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Due Today
                          </Badge>
                        )
                      )
                    })()}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditingTask(task)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEmailingTask(task)}>
                  <Mail className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDelegatingTask(task)}>
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {completedTasks.length > 0 && (
          <div className="space-y-2">
            <h3 className={cn("text-sm font-medium", isDarkMode ? "text-gray-300" : "text-gray-600")}>
              Completed ({completedTasks.length})
            </h3>
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border opacity-60",
                  isDarkMode ? "bg-gray-700/30 border-gray-600" : "bg-gray-50 border-gray-200",
                )}
              >
                <Checkbox checked={true} onCheckedChange={() => toggleTaskComplete(task.id, task.is_completed)} />
                <div className="flex-1 min-w-0">
                  <span className={cn("line-through text-sm", isDarkMode ? "text-gray-400" : "text-gray-500")}>
                    {task.title || task.subject || task.original_text || "No subject"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {editingTask && (
          <TaskEditDialog
            task={editingTask}
            isOpen={!!editingTask}
            onClose={() => setEditingTask(null)}
            onSave={(updates) => {
              handleTaskUpdate(editingTask.id, updates)
              setEditingTask(null)
            }}
          />
        )}

        {emailingTask && (
          <EmailSendDialog task={emailingTask} isOpen={!!emailingTask} onClose={() => setEmailingTask(null)} />
        )}

        {delegatingTask && (
          <TaskDelegationDialog
            task={delegatingTask}
            isOpen={!!delegatingTask}
            onClose={() => setDelegatingTask(null)}
            userId={userId}
            onDelegationComplete={() => {
              fetchTasks() // Refresh tasks after delegation
              setDelegatingTask(null)
            }}
          />
        )}
      </div>
    </div>
  )
}
