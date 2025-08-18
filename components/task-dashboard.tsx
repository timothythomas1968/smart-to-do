"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  CheckCircle2,
  Circle,
  Calendar,
  User,
  Tag,
  AlertTriangle,
  List,
  TableIcon,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  CheckSquare,
  Edit,
  Mail,
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import type { Task, TaskView } from "@/lib/types"
import TaskEditDialog from "./task-edit-dialog"
import TaskViewSelector from "./task-view-selector"
import EmailSendDialog from "./email-send-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MeetingAgendaView } from "./meeting-agenda-view"

interface TaskDashboardProps {
  tasks: Task[]
  setTasks: any
  userId?: string
  currentProject?: { id: string; name: string; color: string } | null
  opacity?: number
  hasBackground?: boolean
  onRefresh?: () => void
}

export default function TaskDashboard({
  tasks: initialTasks,
  setTasks: setInitialTasks,
  userId,
  currentProject,
  opacity = 80,
  hasBackground = false,
  onRefresh,
}: TaskDashboardProps) {
  const [viewMode, setViewMode] = useState<"list" | "table" | "calendar">("list")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"title" | "priority" | "due_date" | "created_at">("created_at")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentView, setCurrentView] = useState<TaskView>("all")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [showIncompleteConfirm, setShowIncompleteConfirm] = useState(false)
  const [emailTask, setEmailTask] = useState<Task | null>(null)
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState<"all" | "P1" | "P2" | "P3" | "P4">("all")
  const [sortField, setSortField] = useState<"title" | "due_date" | "priority" | "created_at">("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isPerformingBulkAction, setIsPerformingBulkAction] = useState(false)
  const [pendingBulkAction, setPendingBulkAction] = useState<"complete" | "pending" | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [taskView, setTaskView] = useState<TaskView>("all")
  const [tasks, setTasks] = useState<Task[]>([]) // Ensure tasks is always initialized as empty array

  useEffect(() => {
    fetchTasks()
  }, [userId, currentProject])

  const fetchTasks = async () => {
    try {
      if (!userId || userId === "guest") {
        console.log("[v0] No userId provided, running in guest mode")
        const storedTasks = localStorage.getItem("guestTasks")
        if (storedTasks) {
          const parsedTasks = JSON.parse(storedTasks)
          console.log("[v0] Loaded tasks from localStorage:", parsedTasks)

          let filteredTasks = parsedTasks
          if (currentProject) {
            // Filter tasks that belong to the current project
            filteredTasks = parsedTasks.filter((task: Task) => task.project_id === currentProject.id)
            console.log(`[v0] Filtered tasks for project ${currentProject.name}:`, filteredTasks)
          } else {
            // If no project selected, show tasks without project_id (legacy tasks) or default project
            filteredTasks = parsedTasks.filter((task: Task) => !task.project_id || task.project_id === "default")
          }

          setTasks(filteredTasks)
        } else {
          console.log("[v0] No tasks found in localStorage")
          setTasks([])
        }
        return
      }

      let query = supabase.from("tasks").select("*").eq("user_id", userId)

      if (currentProject) {
        query = query.eq("project_id", currentProject.id)
      }

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error("Error fetching tasks:", error)
      setTasks([])
    } finally {
      setIsLoading(false)
    }
  }

  const getTasksByView = (allTasks: Task[], view: TaskView) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    switch (view) {
      case "today":
        return allTasks.filter((task) => {
          if (!task.due_date) return false
          const dueDate = new Date(task.due_date)
          return dueDate >= today && dueDate < tomorrow
        })

      case "upcoming":
        return allTasks.filter((task) => {
          if (!task.due_date || task.is_completed) return false
          const dueDate = new Date(task.due_date)
          return dueDate >= tomorrow
        })

      case "week":
        return allTasks.filter((task) => {
          if (!task.due_date) return false
          const dueDate = new Date(task.due_date)
          return dueDate >= startOfWeek && dueDate <= endOfWeek
        })

      case "overdue":
        return allTasks.filter((task) => {
          if (!task.due_date || task.is_completed) return false
          const dueDate = new Date(task.due_date)
          return dueDate < today
        })

      case "pending":
        return allTasks.filter((task) => !task.is_completed)

      case "completed":
        return allTasks.filter((task) => task.is_completed)

      case "meeting-agenda":
        return allTasks // Return all tasks for meeting agenda view to enable search functionality

      case "all":
      default:
        return allTasks
    }
  }

  const taskCounts = useMemo(() => {
    const safeTasks = tasks || []
    return {
      all: safeTasks.length,
      today: getTasksByView(safeTasks, "today").length,
      upcoming: getTasksByView(safeTasks, "upcoming").length,
      week: getTasksByView(safeTasks, "week").length,
      overdue: getTasksByView(safeTasks, "overdue").length,
      pending: getTasksByView(safeTasks, "pending").length,
      completed: getTasksByView(safeTasks, "completed").length,
    }
  }, [tasks])

  const refreshTasks = () => {
    console.log("[v0] Refreshing tasks...")
    fetchTasks()
  }

  useEffect(() => {
    if (onRefresh) {
      // Store the refresh function reference so parent can call it
      ;(window as any).refreshTaskDashboard = refreshTasks
    }
  }, [onRefresh])

  const toggleTaskComplete = async (taskId: string, isCompleted: boolean) => {
    if (!userId) {
      console.log("[v0] Guest mode - updating task locally only")
      const updatedTasks = tasks.map((task) => (task.id === taskId ? { ...task, is_completed: !isCompleted } : task))
      setTasks(updatedTasks)
      localStorage.setItem("guestTasks", JSON.stringify(updatedTasks))
      return
    }

    try {
      const { error } = await supabase.from("tasks").update({ is_completed: !isCompleted }).eq("id", taskId)

      if (error) throw error

      // Update local state
      setTasks(tasks.map((task) => (task.id === taskId ? { ...task, is_completed: !isCompleted } : task)))
    } catch (error) {
      console.error("Error updating task:", error)
    }
  }

  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId)
    } else {
      newSelected.add(taskId)
    }
    setSelectedTasks(newSelected)
  }

  const selectAllTasks = (taskList: Task[]) => {
    const allIds = new Set(taskList.map((task) => task.id))
    setSelectedTasks(allIds)
  }

  const clearSelection = () => {
    setSelectedTasks(new Set())
  }

  const bulkMarkComplete = async (complete: boolean) => {
    if (selectedTasks.size === 0) return

    setIsPerformingBulkAction(true)
    try {
      if (!userId) {
        console.log("[v0] Guest mode - updating tasks locally only")
        const updatedTasks = tasks.map((task) =>
          selectedTasks.has(task.id) ? { ...task, is_completed: complete } : task,
        )
        setTasks(updatedTasks)
        localStorage.setItem("guestTasks", JSON.stringify(updatedTasks))
        clearSelection()
        return
      }

      const { error } = await supabase
        .from("tasks")
        .update({ is_completed: complete })
        .in("id", Array.from(selectedTasks))

      if (error) throw error

      // Update local state
      setTasks(tasks.map((task) => (selectedTasks.has(task.id) ? { ...task, is_completed: complete } : task)))

      clearSelection()
    } catch (error) {
      console.error("Error updating tasks:", error)
    } finally {
      setIsPerformingBulkAction(false)
    }
  }

  const bulkDeleteTasks = async () => {
    if (selectedTasks.size === 0) return

    setIsPerformingBulkAction(true)
    try {
      if (!userId) {
        console.log("[v0] Guest mode - deleting tasks locally only")
        const updatedTasks = tasks.filter((task) => !selectedTasks.has(task.id))
        setTasks(updatedTasks)
        localStorage.setItem("guestTasks", JSON.stringify(updatedTasks))
        clearSelection()
        return
      }

      const { error } = await supabase.from("tasks").delete().in("id", Array.from(selectedTasks))

      if (error) throw error

      // Update local state
      setTasks(tasks.filter((task) => !selectedTasks.has(task.id)))
      clearSelection()
    } catch (error) {
      console.error("Error deleting tasks:", error)
    } finally {
      setIsPerformingBulkAction(false)
      setShowDeleteConfirm(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "P1":
        return "bg-destructive text-destructive-foreground"
      case "P2":
        return "bg-orange-500 text-white"
      case "P3":
        return "bg-secondary text-secondary-foreground"
      case "P4":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const filteredAndSortedTasks = useMemo(() => {
    const safeTasks = tasks || []
    let filtered = getTasksByView(safeTasks, taskView)

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.owner?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.subject?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Apply priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter((task) => task.priority === priorityFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case "title":
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case "due_date":
          aValue = a.due_date ? new Date(a.due_date).getTime() : 0
          bValue = b.due_date ? new Date(b.due_date).getTime() : 0
          break
        case "priority":
          const priorityOrder = { P1: 4, P2: 3, P3: 2, P4: 1 }
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder]
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder]
          break
        case "created_at":
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        default:
          return 0
      }

      if (sortDirection === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return filtered
  }, [tasks, taskView, searchQuery, priorityFilter, sortField, sortDirection])

  const pendingTasks =
    taskView === "completed" ? [] : (filteredAndSortedTasks || []).filter((task) => !task.is_completed)
  const completedTasks =
    taskView === "pending" ? [] : (filteredAndSortedTasks || []).filter((task) => task.is_completed)

  const handleSort = (field: "title" | "due_date" | "priority" | "created_at") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (field: "title" | "due_date" | "priority" | "created_at") => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const handleEditTask = (task: Task) => {
    console.log("[v0] Edit button clicked for task:", task.id, task.title)
    setEditingTask(task)
    setIsEditDialogOpen(true)
    console.log("[v0] Edit dialog state set:", { editingTask: task.id, isEditDialogOpen: true })
  }

  const handleEmailTask = (task: Task) => {
    setEmailTask(task)
    setIsEmailDialogOpen(true)
  }

  const handleSaveTask = async (updatedTask: Task) => {
    try {
      if (!userId) {
        console.log("[v0] Guest mode - updating task locally only")
        const updatedTasks = tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
        setTasks(updatedTasks)
        localStorage.setItem("guestTasks", JSON.stringify(updatedTasks))
        return
      }

      const { error } = await supabase
        .from("tasks")
        .update({
          title: updatedTask.title,
          description: updatedTask.description,
          due_date: updatedTask.due_date,
          priority: updatedTask.priority,
          is_urgent: updatedTask.is_urgent,
          is_completed: updatedTask.is_completed,
          owner: updatedTask.owner,
          subject: updatedTask.subject,
        })
        .eq("id", updatedTask.id)

      if (error) throw error

      // Update local state
      setTasks(tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task)))
    } catch (error) {
      console.error("Error updating task:", error)
    }
  }

  const TaskCard = ({ task }: { task: Task }) => (
    <Card
      className={`hover:shadow-md transition-shadow ${selectedTasks.has(task.id) ? "ring-2 ring-primary" : ""} ${
        hasBackground ? `bg-white/${opacity} backdrop-blur-sm` : ""
      }`}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <Checkbox
            checked={selectedTasks.has(task.id)}
            onCheckedChange={() => toggleTaskSelection(task.id)}
            className="mt-0.5 h-5 w-5 border-2 border-primary/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-sm"
          />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleTaskComplete(task.id, task.is_completed)}
            className="p-0 h-auto hover:bg-transparent"
          >
            {task.is_completed ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
            )}
          </Button>

          <div className="flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={`font-medium text-sm ${task.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}
              >
                {task.title}
              </h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEmailTask(task)}
                  className="p-0.5 h-auto hover:bg-muted"
                  title="Send task via email"
                >
                  <Mail className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditTask(task)}
                  className="p-0.5 h-auto hover:bg-muted"
                  title="Edit task"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Badge className={`${getPriorityColor(task.priority)} text-xs px-1.5 py-0.5`}>{task.priority}</Badge>
                {task.is_urgent && (
                  <Badge variant="destructive" className="flex items-center gap-1 text-xs px-1.5 py-0.5">
                    <AlertTriangle className="h-3 w-3" />
                  </Badge>
                )}
              </div>
            </div>

            {task.description && task.description !== task.title && (
              <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
            )}

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {task.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(task.due_date).toLocaleDateString()}</span>
                </div>
              )}
              {task.owner && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{task.owner}</span>
                </div>
              )}
              {task.subject && (
                <div className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  <span>{task.subject}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const TaskTable = ({ tasks }: { tasks: Task[] }) => {
    const safeTasks = tasks || []

    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 w-12">
                  <Checkbox
                    checked={safeTasks.length > 0 && safeTasks.every((task) => selectedTasks.has(task.id))}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        selectAllTasks(safeTasks)
                      } else {
                        clearSelection()
                      }
                    }}
                    className="h-5 w-5 border-2 border-primary/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-sm"
                  />
                </th>
                <th className="text-left p-3 w-12"></th>
                <th className="text-left p-3 w-12"></th>
                <th className="text-left p-3 w-12"></th>
                <th className="text-left p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("title")}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Task {getSortIcon("title")}
                  </Button>
                </th>
                <th className="text-left p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("priority")}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Priority {getSortIcon("priority")}
                  </Button>
                </th>
                <th className="text-left p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("due_date")}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Due Date {getSortIcon("due_date")}
                  </Button>
                </th>
                <th className="text-left p-3">Owner</th>
                <th className="text-left p-3">Subject</th>
                <th className="text-left p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("created_at")}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Created {getSortIcon("created_at")}
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {safeTasks.map((task) => (
                <tr
                  key={task.id}
                  className={`border-t hover:bg-muted/50 ${selectedTasks.has(task.id) ? "bg-primary/5" : ""}`}
                >
                  <td className="p-3">
                    <Checkbox
                      checked={selectedTasks.has(task.id)}
                      onCheckedChange={() => toggleTaskSelection(task.id)}
                      className="h-5 w-5 border-2 border-primary/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-sm"
                    />
                  </td>
                  <td className="p-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleTaskComplete(task.id, task.is_completed)}
                      className="p-0 h-auto hover:bg-transparent"
                    >
                      {task.is_completed ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                      )}
                    </Button>
                  </td>
                  <td className="p-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEmailTask(task)}
                      className="p-1 h-auto hover:bg-muted"
                      title="Send task via email"
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                  </td>
                  <td className="p-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditTask(task)}
                      className="p-1 h-auto hover:bg-muted"
                      title="Edit task"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </td>
                  <td className="p-3">
                    <div className="space-y-1">
                      <div
                        className={`font-medium ${task.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}
                      >
                        {task.title}
                      </div>
                      {task.description && task.description !== task.title && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">{task.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                      {task.is_urgent && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-sm">{task.due_date ? new Date(task.due_date).toLocaleDateString() : "-"}</td>
                  <td className="p-3 text-sm">{task.owner || "-"}</td>
                  <td className="p-3 text-sm">{task.subject || "-"}</td>
                  <td className="p-3 text-sm">{new Date(task.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const getCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const current = new Date(startDate)

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const getTasksForDate = (date: Date) => {
    const dateStr = date.toDateString()
    return pendingTasks.filter((task) => {
      if (!task.due_date) return false
      return new Date(task.due_date).toDateString() === dateStr
    })
  }

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const TaskCalendar = () => {
    const days = getCalendarDays()
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    return (
      <div className="space-y-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="border rounded-lg overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 bg-muted">
            {dayNames.map((day) => (
              <div key={day} className="p-3 text-center text-sm font-medium">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const dayTasks = getTasksForDate(day)
              const isCurrentMonthDay = isCurrentMonth(day)
              const isTodayDay = isToday(day)

              return (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 border-r border-b ${
                    !isCurrentMonthDay ? "bg-muted/30 text-muted-foreground" : "bg-background"
                  } ${isTodayDay ? "bg-primary/5 border-primary/20" : ""}`}
                >
                  <div className={`text-sm font-medium mb-2 ${isTodayDay ? "text-primary" : ""}`}>{day.getDate()}</div>

                  <div className="space-y-0.5 overflow-hidden">
                    {dayTasks.slice(0, 2).map((task, taskIndex) => (
                      <div
                        key={task.id}
                        className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 flex items-center gap-1 ${
                          task.is_completed ? "opacity-60 line-through" : ""
                        } ${selectedTasks.has(task.id) ? "ring-1 ring-white" : ""}`}
                        style={{
                          backgroundColor:
                            task.priority === "P1"
                              ? "#ef4444"
                              : task.priority === "P2"
                                ? "#f97316"
                                : task.priority === "P3"
                                  ? "#10b981"
                                  : "#6b7280",
                          color: "white",
                          minHeight: "20px",
                        }}
                        title={`${task.title}${task.owner ? ` (${task.owner})` : ""}${task.is_urgent ? " - URGENT" : ""}`}
                      >
                        <Checkbox
                          checked={selectedTasks.has(task.id)}
                          onCheckedChange={() => toggleTaskSelection(task.id)}
                          className="h-4 w-4 border-2 border-white bg-white/90 data-[state=checked]:bg-white data-[state=checked]:text-black data-[state=checked]:border-white flex-shrink-0 shadow-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div
                          className="flex items-center gap-1 flex-1 min-w-0"
                          onClick={() => toggleTaskComplete(task.id, task.is_completed)}
                        >
                          {task.is_urgent && <AlertTriangle className="h-2 w-2 flex-shrink-0" />}
                          <span className="truncate text-xs leading-tight">{task.title}</span>
                        </div>
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded px-1 py-0.5 text-center">
                        +{dayTasks.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tasks without due dates */}
        {pendingTasks.filter((task) => !task.due_date).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pending tasks without due dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingTasks
                .filter((task) => !task.due_date)
                .map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-2 p-2 bg-muted rounded ${selectedTasks.has(task.id) ? "ring-2 ring-primary" : ""}`}
                  >
                    <Checkbox
                      checked={selectedTasks.has(task.id)}
                      onCheckedChange={() => toggleTaskSelection(task.id)}
                      className="h-5 w-5 border-2 border-primary/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleTaskComplete(task.id, task.is_completed)}
                      className="p-0 h-auto hover:bg-transparent"
                    >
                      {task.is_completed ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      )}
                    </Button>
                    <span className={`text-sm flex-1 ${task.is_completed ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </span>
                    <Badge className={getPriorityColor(task.priority)} size="sm">
                      {task.priority}
                    </Badge>
                    {task.is_urgent && (
                      <Badge variant="destructive" size="sm">
                        <AlertTriangle className="h-3 w-3" />
                      </Badge>
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <Card className={hasBackground ? `bg-white/${opacity} backdrop-blur-sm` : ""}>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading tasks...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className={`space-y-6 ${hasBackground ? `bg-white/${opacity} backdrop-blur-sm` : ""} rounded-lg p-6 border`}>
        <Card className={hasBackground ? `bg-white/${opacity} backdrop-blur-sm` : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-card-foreground">
                  {currentProject ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentProject.color }} />
                      {currentProject.name}
                    </div>
                  ) : (
                    "Your Tasks"
                  )}
                </CardTitle>
                <TaskViewSelector currentView={taskView} onViewChange={setTaskView} taskCounts={taskCounts} />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="flex items-center gap-2"
                >
                  <List className="h-4 w-4" />
                  List
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="flex items-center gap-2"
                >
                  <TableIcon className="h-4 w-4" />
                  Table
                </Button>
                <Button
                  variant={viewMode === "calendar" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("calendar")}
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Calendar
                </Button>
              </div>
            </div>

            {selectedTasks.size > 0 && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      {selectedTasks.size} task{selectedTasks.size !== 1 ? "s" : ""} selected
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => bulkMarkComplete(true)}
                      disabled={isPerformingBulkAction}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark Complete
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => bulkMarkComplete(false)}
                      disabled={isPerformingBulkAction}
                      className="flex items-center gap-2"
                    >
                      <Circle className="h-4 w-4" />
                      Mark Pending
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={bulkDeleteTasks}
                      disabled={isPerformingBulkAction}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearSelection} disabled={isPerformingBulkAction}>
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {viewMode !== "calendar" && (
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="P1">P1 Only</SelectItem>
                      <SelectItem value="P2">P2 Only</SelectItem>
                      <SelectItem value="P3">P3 Only</SelectItem>
                      <SelectItem value="P4">P4 Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent>
            {viewMode === "calendar" ? (
              <TaskCalendar />
            ) : taskView === "meeting-agenda" ? (
              <MeetingAgendaView tasks={tasks || []} currentProject={currentProject} hasBackground={hasBackground} />
            ) : taskView === "completed" ? (
              <div className="space-y-4">
                {completedTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No completed tasks</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchQuery || priorityFilter !== "all"
                        ? "Try adjusting your search or filters"
                        : "Complete some tasks to see them here!"}
                    </p>
                  </div>
                ) : viewMode === "list" ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                      <Checkbox
                        checked={
                          completedTasks.length > 0 && completedTasks.every((task) => selectedTasks.has(task.id))
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            selectAllTasks(completedTasks)
                          } else {
                            clearSelection()
                          }
                        }}
                        className="h-5 w-5 border-2 border-primary/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-sm"
                      />
                      <span className="text-sm text-muted-foreground">Select all ({completedTasks.length} tasks)</span>
                    </div>
                    {completedTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                ) : (
                  <TaskTable tasks={completedTasks} />
                )}
              </div>
            ) : taskView === "pending" ? (
              <div className="space-y-4">
                {pendingTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No pending tasks</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchQuery || priorityFilter !== "all"
                        ? "Try adjusting your search or filters"
                        : "Add a task above to get started!"}
                    </p>
                  </div>
                ) : viewMode === "list" ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                      <Checkbox
                        checked={pendingTasks.length > 0 && pendingTasks.every((task) => selectedTasks.has(task.id))}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            selectAllTasks(pendingTasks)
                          } else {
                            clearSelection()
                          }
                        }}
                        className="h-5 w-5 border-2 border-primary/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-sm"
                      />
                      <span className="text-sm text-muted-foreground">Select all ({pendingTasks.length} tasks)</span>
                    </div>
                    {pendingTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                ) : (
                  <TaskTable tasks={pendingTasks} />
                )}
              </div>
            ) : taskView === "upcoming" ? (
              <div className="space-y-4">
                {pendingTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No upcoming tasks</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchQuery || priorityFilter !== "all"
                        ? "Try adjusting your search or filters"
                        : "Add a task above to get started!"}
                    </p>
                  </div>
                ) : viewMode === "list" ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                      <Checkbox
                        checked={pendingTasks.length > 0 && pendingTasks.every((task) => selectedTasks.has(task.id))}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            selectAllTasks(pendingTasks)
                          } else {
                            clearSelection()
                          }
                        }}
                        className="h-5 w-5 border-2 border-primary/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-sm"
                      />
                      <span className="text-sm text-muted-foreground">Select all ({pendingTasks.length} tasks)</span>
                    </div>
                    {pendingTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                ) : (
                  <TaskTable tasks={pendingTasks} />
                )}
              </div>
            ) : (
              // Show all tasks with tabs for other views
              <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="pending">Pending ({pendingTasks.length})</TabsTrigger>
                  <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
                  <TabsTrigger value="upcoming">Upcoming ({getTasksByView(tasks, "upcoming").length})</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-4 mt-6">
                  {pendingTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No pending tasks</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {searchQuery || priorityFilter !== "all"
                          ? "Try adjusting your search or filters"
                          : "Add a task above to get started!"}
                      </p>
                    </div>
                  ) : viewMode === "list" ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                        <Checkbox
                          checked={pendingTasks.length > 0 && pendingTasks.every((task) => selectedTasks.has(task.id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              selectAllTasks(pendingTasks)
                            } else {
                              clearSelection()
                            }
                          }}
                          className="h-5 w-5 border-2 border-primary/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-sm"
                        />
                        <span className="text-sm text-muted-foreground">Select all ({pendingTasks.length} tasks)</span>
                      </div>
                      {pendingTasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                    </div>
                  ) : (
                    <TaskTable tasks={pendingTasks} />
                  )}
                </TabsContent>

                <TabsContent value="completed" className="space-y-4 mt-6">
                  {completedTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No completed tasks</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {searchQuery || priorityFilter !== "all"
                          ? "Try adjusting your search or filters"
                          : "Complete some tasks to see them here!"}
                      </p>
                    </div>
                  ) : viewMode === "list" ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                        <Checkbox
                          checked={
                            completedTasks.length > 0 && completedTasks.every((task) => selectedTasks.has(task.id))
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              selectAllTasks(completedTasks)
                            } else {
                              clearSelection()
                            }
                          }}
                          className="h-5 w-5 border-2 border-primary/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-sm"
                        />
                        <span className="text-sm text-muted-foreground">
                          Select all ({completedTasks.length} tasks)
                        </span>
                      </div>
                      {completedTasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                    </div>
                  ) : (
                    <TaskTable tasks={completedTasks} />
                  )}
                </TabsContent>

                <TabsContent value="upcoming" className="space-y-4 mt-6">
                  {getTasksByView(tasks, "upcoming").length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No upcoming tasks</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {searchQuery || priorityFilter !== "all"
                          ? "Try adjusting your search or filters"
                          : "Add a task above to get started!"}
                      </p>
                    </div>
                  ) : viewMode === "list" ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                        <Checkbox
                          checked={
                            getTasksByView(tasks, "upcoming").length > 0 &&
                            getTasksByView(tasks, "upcoming").every((task) => selectedTasks.has(task.id))
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              selectAllTasks(getTasksByView(tasks, "upcoming"))
                            } else {
                              clearSelection()
                            }
                          }}
                          className="h-5 w-5 border-2 border-primary/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-sm"
                        />
                        <span className="text-sm text-muted-foreground">
                          Select all ({getTasksByView(tasks, "upcoming").length} tasks)
                        </span>
                      </div>
                      {getTasksByView(tasks, "upcoming").map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                    </div>
                  ) : (
                    <TaskTable tasks={getTasksByView(tasks, "upcoming")} />
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      <TaskEditDialog
        task={editingTask}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setEditingTask(null)
          setIsEditDialogOpen(false)
        }}
        onSave={handleSaveTask}
      />

      <EmailSendDialog
        task={emailTask}
        isOpen={isEmailDialogOpen}
        onClose={() => {
          setEmailTask(null)
          setIsEmailDialogOpen(false)
        }}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Tasks
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedTasks.size} selected task{selectedTasks.size !== 1 ? "s" : ""}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteTasks()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Tasks
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCompleteConfirm} onOpenChange={setShowCompleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingBulkAction === "complete" ? "Mark Tasks Complete" : "Mark Tasks Pending"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark {selectedTasks.size} selected task{selectedTasks.size !== 1 ? "s" : ""} as{" "}
              {pendingBulkAction === "complete" ? "complete" : "pending"}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingBulkAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmBulkComplete(
                  selectedTasks,
                  setTasks,
                  setPendingBulkAction,
                  setShowCompleteConfirm,
                  pendingBulkAction,
                )
              }
            >
              {pendingBulkAction === "complete" ? "Mark Complete" : "Mark Pending"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

const confirmBulkComplete = async (
  selectedTasks: Set<string>,
  setTasks: any,
  setPendingBulkAction: any,
  setShowCompleteConfirm: any,
  pendingBulkAction: any,
) => {
  if (pendingBulkAction === null) return
  const complete = pendingBulkAction === "complete"
  const tasksToUpdate = Array.from(selectedTasks)
  const updatedTasks = tasksToUpdate.map((taskId: any) => {
    const task = setTasks.find((task: any) => task.id === taskId)
    if (task) {
      return { ...task, is_completed: complete }
    }
    return task
  })
  setTasks(updatedTasks)
  setPendingBulkAction(null)
  setShowCompleteConfirm(false)
}

const handleBulkDelete = (setShowDeleteConfirm: any) => {
  setShowDeleteConfirm(true)
}

const handleBulkComplete = (setPendingBulkAction: any, setShowCompleteConfirm: any, complete: boolean) => {
  setPendingBulkAction(complete ? "complete" : "pending")
  setShowCompleteConfirm(true)
}
