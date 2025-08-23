"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { ChevronDown, Calendar, Clock, AlertTriangle, List, CheckCircle, Users } from "lucide-react"
import type { TaskView } from "@/lib/types"

interface TaskViewSelectorProps {
  currentView: TaskView
  onViewChange: (view: TaskView) => void
  taskCounts?: {
    all: number
    today: number
    upcoming: number
    week: number
    calendar: number
    overdue: number
    pending: number
    completed: number
  }
}

const VIEW_OPTIONS = [
  { value: "all" as TaskView, label: "All Tasks", icon: List },
  { value: "today" as TaskView, label: "Today", icon: Calendar },
  { value: "upcoming" as TaskView, label: "Upcoming", icon: Clock },
  { value: "week" as TaskView, label: "This Week", icon: Clock },
  { value: "calendar" as TaskView, label: "Calendar", icon: Calendar },
  { value: "overdue" as TaskView, label: "Overdue", icon: AlertTriangle },
  { value: "pending" as TaskView, label: "Pending", icon: List },
  { value: "completed" as TaskView, label: "Completed", icon: CheckCircle },
  { value: "meeting-agenda" as TaskView, label: "Meeting Agenda", icon: Users },
]

export default function TaskViewSelector({ currentView, onViewChange, taskCounts }: TaskViewSelectorProps) {
  const currentOption = VIEW_OPTIONS.find((option) => option.value === currentView)
  const Icon = currentOption?.icon || List

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 min-w-[160px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span>{currentOption?.label || "All Tasks"}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {VIEW_OPTIONS.map((option) => {
          const OptionIcon = option.icon
          const count = taskCounts?.[option.value] ?? 0

          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onViewChange(option.value)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <OptionIcon className="h-4 w-4" />
                <span>{option.label}</span>
              </div>
              {taskCounts && option.value !== "meeting-agenda" && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{count}</span>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
