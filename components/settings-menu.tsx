"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Settings,
  Palette,
  CloudOffIcon as Opacity,
  Upload,
  Download,
  Users,
  Plus,
  Trash2,
  Edit,
  Mail,
  Moon,
  Sun,
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { parseTask } from "@/lib/nlp-parser"
import type { ParsedTask, Project, ProjectSettings, EmailTemplate } from "@/lib/types"
import { getDefaultEmailTemplates } from "@/lib/email-service"
import ProjectManagement from "@/components/project-management"

interface CSVTask {
  originalText: string
  parsed: ParsedTask
  isValid: boolean
  error?: string
}

interface SettingsMenuProps {
  onBackgroundChange?: (backgroundUrl: string | null) => void
  onOpacityChange?: (opacity: number) => void
  currentOpacity: number
  userId?: string
  onTasksChange?: () => void
  onProjectsChange?: () => void
  currentProject?: Project | null
}

export default function SettingsMenu({
  onBackgroundChange,
  onOpacityChange,
  currentOpacity = 50,
  userId,
  onTasksChange,
  onProjectsChange,
  currentProject,
}: SettingsMenuProps) {
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const [opacity, setOpacity] = useState(currentOpacity)
  const [customNames, setCustomNames] = useState<string[]>([])
  const [newName, setNewName] = useState("")
  const [defaultDueDays, setDefaultDueDays] = useState(5)
  const [isDarkMode, setIsDarkMode] = useState(false)

  const [digestEnabled, setDigestEnabled] = useState(false)
  const [digestTime, setDigestTime] = useState("09:00")
  const [digestDaysAhead, setDigestDaysAhead] = useState(5)

  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [templateName, setTemplateName] = useState("")
  const [templateSubject, setTemplateSubject] = useState("")
  const [templateBody, setTemplateBody] = useState("")

  const [csvTasks, setCsvTasks] = useState<CSVTask[]>([])
  const [showCsvDialog, setShowCsvDialog] = useState(false)
  const [csvContent, setCsvContent] = useState("")
  const [isImporting, setIsImporting] = useState(false)

  const predefinedBackgrounds = [
    "/serene-mountain-morning.png",
    "/green-fields-countryside.png",
    "/mountain-lake-sunset.png",
    "/peaceful-forest-path.png",
    "/rolling-hills-dawn.png",
    "/coastal-cliff-view.png",
    "/autumn-forest-trail.png",
    "/alpine-meadow-spring.png",
    "/desert-canyon-vista.png",
    "/misty-lake-reflection.png",
  ]

  const solidColors = [
    { name: "White", value: "#ffffff" },
    { name: "Light Gray", value: "#f8f9fa" },
    { name: "Soft Blue", value: "#e3f2fd" },
    { name: "Mint Green", value: "#e8f5e8" },
    { name: "Warm Beige", value: "#faf7f0" },
    { name: "Lavender", value: "#f3e5f5" },
    { name: "Charcoal", value: "#2d3748" },
    { name: "Dark Navy", value: "#1a202c" },
  ]

  useEffect(() => {
    loadSettings()
    loadEmailTemplates()
  }, [userId, currentProject])

  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode")
    if (savedDarkMode) {
      setIsDarkMode(JSON.parse(savedDarkMode))
    }
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    localStorage.setItem("darkMode", JSON.stringify(newDarkMode))

    if (newDarkMode) {
      document.documentElement.classList.add("dark")
      // Auto-switch to solid black background when enabling dark mode
      handleSolidColorSelect("#000000")
    } else {
      document.documentElement.classList.remove("dark")
      // Restore previous background when disabling dark mode
      const savedBackground = localStorage.getItem("previousBackground")
      if (savedBackground && savedBackground !== "#000000") {
        if (savedBackground.startsWith("#")) {
          handleSolidColorSelect(savedBackground)
        } else {
          handleBackgroundSelect(savedBackground)
        }
      }
    }
  }

  const loadEmailTemplates = () => {
    try {
      const savedTemplates = localStorage.getItem("emailTemplates")
      if (savedTemplates) {
        setEmailTemplates(JSON.parse(savedTemplates))
      } else {
        // Initialize with default templates
        const defaultTemplates = getDefaultEmailTemplates().map((template, index) => ({
          ...template,
          is_default: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: userId || "guest",
        }))
        setEmailTemplates(defaultTemplates)
        localStorage.setItem("emailTemplates", JSON.stringify(defaultTemplates))
      }
    } catch (error) {
      console.error("Error loading email templates:", error)
      setEmailTemplates([])
    }
  }

  const saveEmailTemplates = (templates: EmailTemplate[]) => {
    try {
      localStorage.setItem("emailTemplates", JSON.stringify(templates))
      setEmailTemplates(templates)
    } catch (error) {
      console.error("Error saving email templates:", error)
    }
  }

  const openTemplateDialog = (template?: EmailTemplate) => {
    if (template) {
      setEditingTemplate(template)
      setTemplateName(template.name)
      setTemplateSubject(template.subject)
      setTemplateBody(template.body)
    } else {
      setEditingTemplate(null)
      setTemplateName("")
      setTemplateSubject("")
      setTemplateBody("")
    }
    setShowTemplateDialog(true)
  }

  const saveTemplate = () => {
    if (!templateName.trim() || !templateSubject.trim() || !templateBody.trim()) {
      return
    }

    const now = new Date().toISOString()
    let updatedTemplates: EmailTemplate[]

    if (editingTemplate) {
      // Update existing template
      updatedTemplates = emailTemplates.map((template) =>
        template.id === editingTemplate.id
          ? {
              ...template,
              name: templateName.trim(),
              subject: templateSubject.trim(),
              body: templateBody.trim(),
              updated_at: now,
            }
          : template,
      )
    } else {
      // Create new template
      const newTemplate: EmailTemplate = {
        id: `template-${Date.now()}`,
        name: templateName.trim(),
        subject: templateSubject.trim(),
        body: templateBody.trim(),
        is_default: false,
        created_at: now,
        updated_at: now,
        user_id: userId || "guest",
      }
      updatedTemplates = [...emailTemplates, newTemplate]
    }

    saveEmailTemplates(updatedTemplates)
    setShowTemplateDialog(false)
  }

  const deleteTemplate = (templateId: string) => {
    const updatedTemplates = emailTemplates.filter((template) => template.id !== templateId)
    saveEmailTemplates(updatedTemplates)
  }

  const loadSettings = () => {
    try {
      const savedNames = localStorage.getItem("customNames")
      if (savedNames) {
        setCustomNames(JSON.parse(savedNames))
      }

      const savedDigestEnabled = localStorage.getItem("digestEnabled")
      const savedDigestTime = localStorage.getItem("digestTime")
      const savedDigestDaysAhead = localStorage.getItem("digestDaysAhead")

      if (savedDigestEnabled) setDigestEnabled(JSON.parse(savedDigestEnabled))
      if (savedDigestTime) setDigestTime(savedDigestTime)
      if (savedDigestDaysAhead) setDigestDaysAhead(Number.parseInt(savedDigestDaysAhead))

      loadProjectSettings()
    } catch (error) {
      console.error("Error loading settings:", error)
    }
  }

  const loadProjectSettings = async () => {
    if (!currentProject) return

    try {
      if (!userId) {
        const projectSettingsKey = `projectSettings_${currentProject.id}`
        const savedSettings = localStorage.getItem(projectSettingsKey)

        if (savedSettings) {
          const settings: ProjectSettings = JSON.parse(savedSettings)
          setBackgroundUrl(settings.background_image_url || null)
          setOpacity(settings.background_opacity)
          setDefaultDueDays(settings.default_due_days || 5)
          onBackgroundChange?.(settings.background_image_url || null)
          onOpacityChange?.(settings.background_opacity)
        } else {
          setBackgroundUrl(null)
          setOpacity(50)
          setDefaultDueDays(5)
          onBackgroundChange?.(null)
          onOpacityChange?.(50)
        }
      } else {
        try {
          // Use user_settings table instead of projects table
          const { data, error } = await supabase
            .from("user_settings")
            .select("background_image_url, background_opacity, digest_enabled, digest_time, digest_days_ahead")
            .eq("user_id", userId)
            .single()

          if (error && error.code !== "PGRST116") throw error

          if (data) {
            setBackgroundUrl(data.background_image_url || null)
            const opacityPercentage = data.background_opacity ? Math.round(data.background_opacity * 100) : 50
            setOpacity(opacityPercentage)
            setDefaultDueDays(5) // Default value since not stored in user_settings

            setDigestEnabled(data.digest_enabled || false)
            setDigestTime(data.digest_time || "09:00")
            setDigestDaysAhead(data.digest_days_ahead || 5)

            onBackgroundChange?.(data.background_image_url || null)
            onOpacityChange?.(opacityPercentage)
          } else {
            // No user settings found, use defaults
            setBackgroundUrl(null)
            setOpacity(50)
            setDefaultDueDays(5)
            setDigestEnabled(false)
            setDigestTime("09:00")
            setDigestDaysAhead(5)
            onBackgroundChange?.(null)
            onOpacityChange?.(50)
          }
        } catch (dbError: any) {
          console.log("[v0] User settings table not available, using defaults:", dbError.message)
          setBackgroundUrl(null)
          setOpacity(50)
          setDefaultDueDays(5)
          setDigestEnabled(false)
          setDigestTime("09:00")
          setDigestDaysAhead(5)
          onBackgroundChange?.(null)
          onOpacityChange?.(50)
        }
      }
    } catch (error) {
      console.error("Error loading project settings:", error)
      setBackgroundUrl(null)
      setOpacity(50)
      setDefaultDueDays(5)
      setDigestEnabled(false)
      setDigestTime("09:00")
      setDigestDaysAhead(5)
      onBackgroundChange?.(null)
      onOpacityChange?.(50)
    }
  }

  const saveProjectSettings = async (newBackgroundUrl: string | null, newOpacity: number) => {
    if (!currentProject) return

    const settings: ProjectSettings = {
      background_image_url: newBackgroundUrl,
      background_opacity: newOpacity,
      task_view: "all",
      default_due_days: defaultDueDays,
    }

    try {
      if (!userId) {
        const projectSettingsKey = `projectSettings_${currentProject.id}`
        localStorage.setItem(projectSettingsKey, JSON.stringify(settings))
      } else {
        const { error } = await supabase.from("user_settings").upsert(
          {
            user_id: userId,
            background_image_url: newBackgroundUrl,
            background_opacity: newOpacity / 100, // Convert percentage to decimal
            digest_enabled: digestEnabled,
            digest_time: digestTime,
            digest_days_ahead: digestDaysAhead,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          },
        )

        if (error) {
          console.log("[v0] Error saving to user_settings, using localStorage fallback:", error.message)
          const projectSettingsKey = `projectSettings_${currentProject.id}`
          localStorage.setItem(projectSettingsKey, JSON.stringify(settings))

          localStorage.setItem("digestEnabled", JSON.stringify(digestEnabled))
          localStorage.setItem("digestTime", digestTime)
          localStorage.setItem("digestDaysAhead", digestDaysAhead.toString())
          return
        }

        console.log("[v0] Background settings and digest preferences saved to user_settings table")
      }
    } catch (error) {
      console.error("Error saving project settings:", error)
    }
  }

  const saveDigestPreferences = async () => {
    try {
      if (!userId) {
        localStorage.setItem("digestEnabled", JSON.stringify(digestEnabled))
        localStorage.setItem("digestTime", digestTime)
        localStorage.setItem("digestDaysAhead", digestDaysAhead.toString())
      } else {
        const { error } = await supabase.from("user_settings").upsert(
          {
            user_id: userId,
            digest_enabled: digestEnabled,
            digest_time: digestTime,
            digest_days_ahead: digestDaysAhead,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          },
        )

        if (error) {
          console.log("[v0] Error saving digest preferences to database, using localStorage fallback")
          localStorage.setItem("digestEnabled", JSON.stringify(digestEnabled))
          localStorage.setItem("digestTime", digestTime)
          localStorage.setItem("digestDaysAhead", digestDaysAhead.toString())
        }
      }
    } catch (error) {
      console.error("Error saving digest preferences:", error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = (e: any) => {
      setCsvContent(e.target.result)
      setShowCsvDialog(true)
    }

    reader.readAsText(file)
  }

  const handleImport = async () => {
    setIsImporting(true)

    try {
      const lines = csvContent.split("\n").map((line) => line.trim())
      const header = lines[0]?.split(",")
      const data = lines.slice(1).map((line) => {
        const values = line.split(",")
        return header?.reduce((obj: any, header: any, index: any) => {
          obj[header.trim()] = values[index]?.trim()
          return obj
        }, {})
      })

      const parsedTasks: any[] = []

      for (const item of data) {
        if (item && item["Task Description"]) {
          try {
            const parsed = parseTask(item["Task Description"])
            parsedTasks.push({ ...parsed, ...item })
          } catch (error) {
            console.error("Error parsing task:", error)
          }
        }
      }

      if (!userId) {
        let guestTasks = JSON.parse(localStorage.getItem("guestTasks") || "[]")
        guestTasks = guestTasks.concat(parsedTasks)
        localStorage.setItem("guestTasks", JSON.stringify(guestTasks))
      } else {
        const { data: existingTasks, error: selectError } = await supabase
          .from("tasks")
          .select("title")
          .eq("user_id", userId)

        if (selectError) {
          console.error("Error fetching existing tasks:", selectError)
          return
        }

        const existingTaskTitles = existingTasks?.map((task) => task.title) || []

        const newTasks = parsedTasks.filter((task) => !existingTaskTitles.includes(task.title))

        if (newTasks.length > 0) {
          const { error } = await supabase.from("tasks").insert(
            newTasks.map((task) => ({
              title: task.title,
              description: task.description,
              owner: task.owner,
              subject: task.subject,
              due_date: task.due_date,
              priority: task.priority,
              is_urgent: task.is_urgent,
              is_completed: false,
              user_id: userId,
            })),
          )

          if (error) {
            console.error("Error inserting tasks:", error)
            return
          }
        }
      }

      onTasksChange?.()
    } catch (error) {
      console.error("Error importing data:", error)
    } finally {
      setIsImporting(false)
      setShowCsvDialog(false)
    }
  }

  const exportTasks = async () => {
    try {
      let tasks = []

      if (!userId) {
        tasks = JSON.parse(localStorage.getItem("guestTasks") || "[]")
      } else {
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })

        if (error) throw error
        tasks = data || []
      }

      if (tasks.length === 0) {
        alert("No tasks to export")
        return
      }

      const headers = ["Task Description", "Owner", "Subject", "Priority", "Due Date", "Status", "Urgent"]
      const csvRows = [headers.join(",")]

      tasks.forEach((task: any) => {
        const row = [
          `"${task.title || task.description || ""}"`,
          `"${task.owner || ""}"`,
          `"${task.subject || ""}"`,
          `"${task.priority || ""}"`,
          task.due_date ? `"${new Date(task.due_date).toLocaleDateString()}"` : '""',
          `"${task.is_completed ? "Completed" : "Pending"}"`,
          `"${task.is_urgent ? "Yes" : "No"}"`,
        ]
        csvRows.push(row.join(","))
      })

      const csvContent = csvRows.join("\n")
      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `tasks-export-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting tasks:", error)
      alert("Error exporting tasks. Please try again.")
    }
  }

  const downloadSampleCSV = () => {
    const sampleData = [
      "Task Description",
      "Review project proposal for John by tomorrow P1",
      "Schedule team meeting end of week about quarterly planning",
      "Call client about urgent issue P2",
      "Prepare presentation for Sarah by Friday",
      "Update documentation P3",
      "Fix bug in authentication system by mid August P1",
    ]

    const csvContent = sampleData.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "sample-tasks.csv"
    a.click()
    window.URL.revokeObjectURL(url)
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

  const removeBackground = () => {
    setBackgroundUrl(null)
    saveProjectSettings(null, opacity)
    onBackgroundChange?.(null)
  }

  const handleOpacityChange = (value: number[]) => {
    const newOpacity = value[0]
    setOpacity(newOpacity)
    saveProjectSettings(backgroundUrl, newOpacity)
    onOpacityChange?.(newOpacity)
  }

  const handleBackgroundSelect = (url: string) => {
    if (!isDarkMode) {
      localStorage.setItem("previousBackground", url)
    }
    setBackgroundUrl(url)
    saveProjectSettings(url, opacity)
    onBackgroundChange?.(url)
  }

  const handleSolidColorSelect = (color: string) => {
    if (!isDarkMode && color !== "#000000") {
      localStorage.setItem("previousBackground", color)
    }
    setBackgroundUrl(color)
    saveProjectSettings(color, opacity)
    onBackgroundChange?.(color)
  }

  const addCustomName = () => {
    if (newName.trim() && !customNames.includes(newName.trim())) {
      const updatedNames = [...customNames, newName.trim()]
      setCustomNames(updatedNames)
      localStorage.setItem("customNames", JSON.stringify(updatedNames))
      setNewName("")
    }
  }

  const removeCustomName = (nameToRemove: string) => {
    const updatedNames = customNames.filter((name) => name !== nameToRemove)
    setCustomNames(updatedNames)
    localStorage.setItem("customNames", JSON.stringify(updatedNames))
  }

  const handleDefaultDueDaysChange = (days: number) => {
    setDefaultDueDays(days)
    localStorage.setItem("defaultDueDays", days.toString())
    if (currentProject) {
      saveProjectSettings(backgroundUrl, opacity)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>View Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="px-2 py-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <Label className="text-sm">Dark Mode</Label>
            </div>
            <Switch
              checked={isDarkMode}
              onCheckedChange={(checked) => {
                toggleDarkMode()
              }}
              className="data-[state=checked]:bg-gray-600 data-[state=unchecked]:bg-gray-300"
            />
          </div>
        </div>

        <DropdownMenuSeparator />

        <div className="px-2 py-1.5">
          <Label htmlFor="default-due-days" className="text-sm font-medium block">
            Default Due Date
          </Label>
          <p className="text-xs text-muted-foreground mb-3">
            Tasks without a due date will automatically be set to this many days from now
          </p>
          <div className="flex items-center gap-2">
            <Slider
              id="default-due-days"
              value={[defaultDueDays]}
              onValueChange={(value) => handleDefaultDueDaysChange(value[0])}
              max={30}
              min={1}
              step={1}
              className="flex-1"
            />
            <span className="text-sm font-medium w-12 text-center">{defaultDueDays} days</span>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette className="h-4 w-4 mr-2" />
            Appearance
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="w-96 max-h-[80vh] overflow-hidden" side="top" align="start">
              <ScrollArea className="h-[70vh]">
                <div className="grid gap-4 p-4">
                  <div>
                    <Label className="text-sm font-medium block">Background Image</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Set a background image to personalize your workspace
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {predefinedBackgrounds.map((bg, i) => (
                        <Button
                          key={i}
                          variant="ghost"
                          className="aspect-video rounded-md overflow-hidden h-20"
                          onClick={() => handleBackgroundSelect(bg)}
                        >
                          <img
                            src={bg || "/placeholder.svg"}
                            alt={`Background ${i + 1}`}
                            className="object-cover w-full h-full"
                          />
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium block">Solid Colors</Label>
                    <p className="text-xs text-muted-foreground mb-3">Choose a solid color background</p>
                    <div className="grid grid-cols-4 gap-2">
                      {solidColors.map((color) => (
                        <Button
                          key={color.value}
                          variant="ghost"
                          className="aspect-square rounded-md border-2"
                          style={{ backgroundColor: color.value }}
                          onClick={() => handleBackgroundSelect(color.value)}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium block">Window Transparency</Label>
                    <p className="text-xs text-muted-foreground mb-3">Adjust the transparency of the main window</p>
                    <div className="flex items-center gap-2">
                      <Opacity className="h-4 w-4" />
                      <Slider
                        value={[Math.max(5, Math.min(90, opacity))]}
                        onValueChange={(value) => handleOpacityChange(value)}
                        max={90}
                        min={5}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12 text-center">
                        {Math.max(5, Math.min(90, opacity))}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium block">Daily Email Digest</Label>
                    <p className="text-xs text-muted-foreground mb-3">Get a daily summary of upcoming tasks</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Enable Daily Digest</Label>
                        <Switch checked={digestEnabled} onCheckedChange={setDigestEnabled} />
                      </div>
                      {digestEnabled && (
                        <>
                          <div>
                            <Label className="text-sm">Send Time</Label>
                            <Input
                              type="time"
                              value={digestTime}
                              onChange={(e) => setDigestTime(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Days Ahead</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Slider
                                value={[digestDaysAhead]}
                                onValueChange={(value) => setDigestDaysAhead(value[0])}
                                max={14}
                                min={1}
                                step={1}
                                className="flex-1"
                              />
                              <span className="text-sm font-medium w-8 text-center">{digestDaysAhead}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <ProjectManagement userId={userId} onProjectsChange={onProjectsChange} />

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
            <Mail className="h-4 w-4 mr-2" />
            Email Templates
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="w-96">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Manage Email Templates</Label>
                  <Button onClick={() => openTemplateDialog()} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    New
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Create and customize email templates for sending tasks to recipients
                </p>

                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {emailTemplates.map((template) => (
                      <Card key={template.id} className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm truncate">{template.name}</h4>
                              {template.is_default && (
                                <Badge variant="secondary" className="text-xs">
                                  Default
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-1">{template.subject}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              onClick={() => openTemplateDialog(template)}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            {!template.is_default && (
                              <Button
                                onClick={() => deleteTemplate(template.id)}
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>

                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Available variables:</p>
                  <p>task_title, task_description, due_date, priority, owner, personal_message</p>
                </div>
              </div>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
            <Users className="h-4 w-4 mr-2" />
            Subject Names
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="w-80">
              <div className="p-4 space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Add Custom Names</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Add names that the app should recognize for task assignment
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter a name..."
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustomName()}
                      className="flex-1"
                    />
                    <Button onClick={addCustomName} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {customNames.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Recognized Names</Label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {customNames.map((name) => (
                        <Badge key={name} variant="secondary" className="flex items-center gap-1">
                          {name}
                          <button onClick={() => removeCustomName(name)} className="ml-1 hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
            <Upload className="h-4 w-4 mr-2" />
            Data Management
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="w-80">
              <div className="p-4 space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Import & Export</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Import tasks from CSV or export your current tasks
                  </p>

                  <div className="space-y-2">
                    <Input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csv-upload" />
                    <Button variant="outline" htmlFor="csv-upload" asChild>
                      <Label htmlFor="csv-upload" className="w-full justify-center cursor-pointer">
                        Import CSV
                      </Label>
                    </Button>

                    <Button variant="outline" onClick={exportTasks} className="w-full justify-start bg-transparent">
                      <Download className="h-4 w-4 mr-2" />
                      Export Tasks
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={downloadSampleCSV}
                      className="w-full justify-start text-muted-foreground"
                    >
                      Download Sample CSV
                    </Button>
                  </div>
                </div>
              </div>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
