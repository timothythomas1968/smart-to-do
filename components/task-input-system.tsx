"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Plus, Calendar, User, Tag, AlertTriangle, Sparkles, Mail } from "lucide-react"
import { parseTaskFromNaturalLanguage, isWeekend, moveToNextMonday } from "@/lib/nlp-parser"
import { supabase } from "@/lib/supabase/client"
import type { ParsedTask, FileAttachment, Project, Task } from "@/lib/types"
import FileAttachmentZone from "@/components/file-attachment-zone"
import EmailSendDialog from "@/components/email-send-dialog"

interface TaskInputSystemProps {
  userId?: string
  onTaskAdded?: () => void
  hasBackground?: boolean
  opacity?: number
  currentProject?: Project | null
}

export default function TaskInputSystem({
  userId,
  onTaskAdded,
  hasBackground,
  opacity = 50,
  currentProject,
}: TaskInputSystemProps) {
  const [input, setInput] = useState("")
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [createdTask, setCreatedTask] = useState<Task | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [weekendWarning, setWeekendWarning] = useState<string | null>(null)

  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode")
    if (savedDarkMode) {
      setIsDarkMode(JSON.parse(savedDarkMode))
    }
  }, [])

  useEffect(() => {
    if (input.trim()) {
      const parsed = parseTaskFromNaturalLanguage(input, userId)
      setParsedTask(parsed)

      if (parsed.due_date && isWeekend(parsed.due_date)) {
        const dayName = parsed.due_date.getDay() === 0 ? "Sunday" : "Saturday"
        setWeekendWarning(
          `Warning: You've selected ${dayName}, ${parsed.due_date.toLocaleDateString()}. This is a weekend day.`,
        )
      } else {
        setWeekendWarning(null)
      }
    } else {
      setParsedTask(null)
      setWeekendWarning(null)
    }
  }, [input, userId])

  const handleSubmit = async () => {
    if (!parsedTask || !input.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      let finalDueDate = parsedTask.due_date
      if (!finalDueDate) {
        const defaultDays = Number.parseInt(localStorage.getItem("defaultDueDays") || "5")
        finalDueDate = new Date()
        finalDueDate.setDate(finalDueDate.getDate() + defaultDays)

        if (isWeekend(finalDueDate)) {
          finalDueDate = moveToNextMonday(finalDueDate)
          console.log("[v0] Default due date was weekend, moved to Monday:", finalDueDate.toLocaleDateString())
        }
      }

      const taskData = {
        title: parsedTask.title,
        description: parsedTask.description,
        owner: parsedTask.owner,
        subject: parsedTask.subject,
        due_date: finalDueDate?.toISOString(),
        priority: parsedTask.priority,
        is_urgent: parsedTask.is_urgent,
        is_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        project_id: currentProject?.id || "default",
        attachments: attachments,
      }

      let newTask: Task

      if (!userId) {
        console.log("[v0] Guest mode: storing task locally")
        const guestTasks = JSON.parse(localStorage.getItem("guestTasks") || "[]")
        newTask = {
          id: Date.now().toString(),
          user_id: null,
          ...taskData,
        }
        guestTasks.push(newTask)
        localStorage.setItem("guestTasks", JSON.stringify(guestTasks))
        console.log("[v0] Task stored locally:", newTask)
      } else {
        const { data, error } = await supabase
          .from("tasks")
          .insert({
            ...taskData,
            user_id: userId,
            attachments: JSON.stringify(attachments),
          })
          .select()
          .single()

        if (error) throw error
        newTask = data as Task
        console.log("[v0] Task stored in database")
      }

      setCreatedTask(newTask)
      setIsSuccess(true)
      setInput("")
      setParsedTask(null)
      setAttachments([])
      onTaskAdded?.()

      setTimeout(() => setIsSuccess(false), 2000)
    } catch (error) {
      console.error("[v0] Error creating task:", error)
      setError(error instanceof Error ? error.message : "Failed to create task")
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (parsedTask && input.trim() && !isLoading) {
        handleSubmit()
      }
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

  const getOpacityStyle = () => {
    if (!hasBackground) return {}
    const normalizedOpacity = Math.max(0.05, Math.min(0.95, opacity / 100))
    return {
      backgroundColor: isDarkMode
        ? `rgba(45, 45, 45, ${normalizedOpacity})`
        : `rgba(255, 255, 255, ${normalizedOpacity})`,
      backdropFilter: "blur(8px)",
      border: isDarkMode
        ? `1px solid rgba(255, 255, 255, ${normalizedOpacity * 0.2})`
        : `1px solid rgba(255, 255, 255, ${normalizedOpacity * 0.3})`,
    }
  }

  return (
    <div className="space-y-6">
      <Card
        className="border-2 border-dashed border-border hover:border-primary/50 transition-colors"
        style={hasBackground ? getOpacityStyle() : {}}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle
              className={`flex items-center gap-2 ${isDarkMode && hasBackground ? "text-gray-100" : "text-card-foreground"}`}
            >
              <Sparkles className="h-5 w-5" />
              Add New Task
              {currentProject && (
                <div className="flex items-center gap-2 ml-4">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentProject.color }} />
                  <span
                    className={`text-sm ${isDarkMode && hasBackground ? "text-gray-300" : "text-muted-foreground"}`}
                  >
                    to {currentProject.name}
                  </span>
                </div>
              )}
              {!userId && (
                <Badge variant="secondary" className="ml-2">
                  Guest Mode
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Textarea
                placeholder="Try: 'Review project proposal for John by tomorrow P1' or 'Schedule team meeting end of week about quarterly planning' (Press Enter to add)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className={`min-h-[100px] resize-none ${
                  isDarkMode && hasBackground
                    ? "bg-gray-800/50 border-gray-600 text-gray-100 placeholder:text-gray-400"
                    : "bg-input border-border focus:border-primary focus:ring-ring"
                }`}
                disabled={isLoading}
              />
            </div>

            <div className="w-48">
              <FileAttachmentZone attachments={attachments} onAttachmentsChange={setAttachments} />
            </div>
          </div>

          {error && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>}

          {weekendWarning && (
            <div className="text-sm text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400 p-2 rounded flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {weekendWarning}
            </div>
          )}

          <div className="flex justify-between items-center">
            <div className={`text-sm ${isDarkMode && hasBackground ? "text-gray-300" : "text-muted-foreground"}`}>
              {input.length > 0 && (
                <span>
                  {input.length} characters • AI parsing {parsedTask ? "active" : "ready"} • Press Enter to add task
                </span>
              )}
            </div>

            <div className="flex gap-2">
              {isSuccess && createdTask && (
                <Button onClick={() => setShowEmailDialog(true)} variant="outline" size="sm" className="bg-transparent">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!parsedTask || isLoading || !input.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                    Adding...
                  </>
                ) : isSuccess ? (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Added!
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {parsedTask && (
        <Card className="border-primary/20 shadow-lg" style={hasBackground ? getOpacityStyle() : {}}>
          <CardHeader>
            <CardTitle
              className={`flex items-center gap-2 ${isDarkMode && hasBackground ? "text-gray-100" : "text-card-foreground"}`}
            >
              <Sparkles className="h-5 w-5" />
              AI Parsed Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3
                className={`font-semibold text-lg mb-2 ${isDarkMode && hasBackground ? "text-gray-100" : "text-foreground"}`}
              >
                {parsedTask.title}
              </h3>
              {parsedTask.description && parsedTask.description !== parsedTask.title && (
                <p className={`text-sm ${isDarkMode && hasBackground ? "text-gray-300" : "text-muted-foreground"}`}>
                  {parsedTask.description}
                </p>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Badge className={getPriorityColor(parsedTask.priority)}>{parsedTask.priority}</Badge>
                {parsedTask.is_urgent && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Urgent
                  </Badge>
                )}
              </div>

              {parsedTask.due_date && (
                <div
                  className={`flex items-center gap-2 text-sm ${isDarkMode && hasBackground ? "text-gray-300" : ""}`}
                >
                  <Calendar
                    className={`h-4 w-4 ${isDarkMode && hasBackground ? "text-gray-400" : "text-muted-foreground"}`}
                  />
                  <span>{parsedTask.due_date.toLocaleDateString()}</span>
                </div>
              )}

              {parsedTask.owner && (
                <div
                  className={`flex items-center gap-2 text-sm ${isDarkMode && hasBackground ? "text-gray-300" : ""}`}
                >
                  <User
                    className={`h-4 w-4 ${isDarkMode && hasBackground ? "text-gray-400" : "text-muted-foreground"}`}
                  />
                  <span>{parsedTask.owner}</span>
                </div>
              )}

              {parsedTask.subject && (
                <div
                  className={`flex items-center gap-2 text-sm ${isDarkMode && hasBackground ? "text-gray-300" : ""}`}
                >
                  <Tag
                    className={`h-4 w-4 ${isDarkMode && hasBackground ? "text-gray-400" : "text-muted-foreground"}`}
                  />
                  <span>{parsedTask.subject}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <EmailSendDialog task={createdTask} isOpen={showEmailDialog} onClose={() => setShowEmailDialog(false)} />
    </div>
  )
}
