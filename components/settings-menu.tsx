"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Settings,
  Eye,
  Users,
  Upload,
  X,
  Plus,
  Database,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Edit,
  Trash2,
} from "lucide-react"
import { parseTaskFromNaturalLanguage } from "@/lib/nlp-parser"
import { supabase } from "@/lib/supabase/client"
import type { ParsedTask, Project, ProjectSettings, EmailTemplate } from "@/lib/types"
import { getDefaultEmailTemplates } from "@/lib/email-service"
import ProjectManagement from "@/components/project-management"

interface SettingsMenuProps {
  onBackgroundChange?: (backgroundUrl: string | null) => void
  onOpacityChange?: (opacity: number) => void
  currentOpacity?: number
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
  const [defaultDueDays, setDefaultDueDays] = useState(5) // Added default due days state

  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [templateName, setTemplateName] = useState("")
  const [templateSubject, setTemplateSubject] = useState("")
  const [templateBody, setTemplateBody] = useState("")

  const [csvTasks, setCsvTasks] = useState<CSVTask[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (currentProject) {
      loadProjectSettings()
    }

    const savedNames = localStorage.getItem("customNames")
    if (savedNames) {
      setCustomNames(JSON.parse(savedNames))
    }

    const savedDefaultDays = localStorage.getItem("defaultDueDays")
    if (savedDefaultDays) {
      setDefaultDueDays(Number.parseInt(savedDefaultDays))
    }

    loadEmailTemplates()
  }, [currentProject])

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
      alert("Please fill in all fields")
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
    const template = emailTemplates.find((t) => t.id === templateId)
    if (template?.is_default) {
      alert("Cannot delete default templates")
      return
    }

    if (confirm("Are you sure you want to delete this email template?")) {
      const updatedTemplates = emailTemplates.filter((template) => template.id !== templateId)
      saveEmailTemplates(updatedTemplates)
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
        const { data, error } = await supabase.from("projects").select("settings").eq("id", currentProject.id).single()

        if (error) throw error

        if (data?.settings) {
          const settings = data.settings as ProjectSettings
          setBackgroundUrl(settings.background_image_url || null)
          setOpacity(settings.background_opacity)
          setDefaultDueDays(settings.default_due_days || 5)
          onBackgroundChange?.(settings.background_image_url || null)
          onOpacityChange?.(settings.background_opacity)
        }
      }
    } catch (error) {
      console.error("Error loading project settings:", error)
    }
  }

  const saveProjectSettings = async (newBackgroundUrl: string | null, newOpacity: number) => {
    if (!currentProject) return

    const settings: ProjectSettings = {
      background_image_url: newBackgroundUrl,
      background_opacity: newOpacity,
      task_view: "all",
      default_due_days: defaultDueDays, // Include default due days in project settings
    }

    try {
      if (!userId) {
        const projectSettingsKey = `projectSettings_${currentProject.id}`
        localStorage.setItem(projectSettingsKey, JSON.stringify(settings))
      } else {
        const { error } = await supabase.from("projects").update({ settings }).eq("id", currentProject.id)

        if (error) throw error
      }
    } catch (error) {
      console.error("Error saving project settings:", error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".csv")) {
      alert("Please select a CSV file")
      return
    }

    setIsProcessing(true)
    try {
      const text = await file.text()
      const lines = text.split("\n").filter((line) => line.trim())

      const startIndex =
        lines[0]?.toLowerCase().includes("task") ||
        lines[0]?.toLowerCase().includes("title") ||
        lines[0]?.toLowerCase().includes("description")
          ? 1
          : 0

      const tasks: CSVTask[] = []

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const taskText = line.includes(",") ? line.split(",")[0].replace(/^"(.*)"$/, "$1") : line

        if (taskText && taskText.length > 2) {
          try {
            const parsed = parseTaskFromNaturalLanguage(taskText)
            tasks.push({
              originalText: taskText,
              parsed,
              isValid: true,
            })
          } catch (error) {
            tasks.push({
              originalText: taskText,
              parsed: {} as ParsedTask,
              isValid: false,
              error: "Failed to parse task",
            })
          }
        }
      }

      setCsvTasks(tasks)
      setShowImportDialog(true)
    } catch (error) {
      console.error("Error processing CSV:", error)
      alert("Error processing CSV file. Please check the format.")
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleImport = async () => {
    const validTasks = csvTasks.filter((task) => task.isValid)
    if (validTasks.length === 0) return

    setIsImporting(true)
    try {
      if (!userId) {
        const guestTasks = JSON.parse(localStorage.getItem("guestTasks") || "[]")
        const newTasks = validTasks.map((task) => ({
          id: Date.now().toString() + Math.random(),
          title: task.parsed.title,
          description: task.parsed.description,
          owner: task.parsed.owner,
          subject: task.parsed.subject,
          due_date: task.parsed.due_date?.toISOString(),
          priority: task.parsed.priority,
          is_urgent: task.parsed.is_urgent,
          is_completed: false,
          created_at: new Date().toISOString(),
          user_id: null,
        }))
        guestTasks.push(...newTasks)
        localStorage.setItem("guestTasks", JSON.stringify(guestTasks))
      } else {
        const tasksToInsert = validTasks.map((task) => ({
          title: task.parsed.title,
          description: task.parsed.description,
          owner: task.parsed.owner,
          subject: task.parsed.subject,
          due_date: task.parsed.due_date?.toISOString(),
          priority: task.parsed.priority,
          is_urgent: task.parsed.is_urgent,
          is_completed: false,
          user_id: userId,
        }))

        const { error } = await supabase.from("tasks").insert(tasksToInsert)
        if (error) throw error
      }

      setShowImportDialog(false)
      setCsvTasks([])
      onTasksChange?.()
    } catch (error) {
      console.error("Error importing tasks:", error)
      alert("Error importing tasks. Please try again.")
    } finally {
      setIsImporting(false)
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

  const validTasksCount = csvTasks.filter((task) => task.isValid).length
  const invalidTasksCount = csvTasks.length - validTasksCount

  const predefinedBackgrounds = [
    "/serene-mountain-morning.png",
    "/soft-pastel-geometry.png",
    "/calming-watercolor-wash.png",
    "/warm-gradient-mesh.png",
  ]

  const solidColors = [
    { name: "Ocean Blue", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    { name: "Sunset Orange", value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
    { name: "Forest Green", value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
    { name: "Purple Haze", value: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)" },
    { name: "Warm Gray", value: "linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)" },
    { name: "Deep Navy", value: "linear-gradient(135deg, #2c3e50 0%, #3498db 100%)" },
    { name: "Rose Gold", value: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)" },
    { name: "Mint Fresh", value: "linear-gradient(135deg, #a8e6cf 0%, #dcedc1 100%)" },
  ]

  const additionalBackgrounds = [
    "/mountain-lake-sunset.png",
    "/peaceful-forest-path.png",
    "/ocean-waves-beach.png",
    "/abstract-geometric-blue.png",
    "/watercolor-splash-pink.png",
    "/minimalist-lines-gray.png",
  ]

  const moreLandscapes = [
    "/golden-wheat-field.png",
    "/misty-forest-morning.png",
    "/desert-sand-dunes.png",
    "/alpine-meadow-flowers.png",
    "/coastal-cliff-waves.png",
    "/autumn-forest-path.png",
    "/tropical-beach-sunset.png",
    "/snow-capped-mountains.png",
    "/rolling-green-hills.png",
    "/cherry-blossom-trees.png",
  ]

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
    setBackgroundUrl(url)
    saveProjectSettings(url, opacity)
    onBackgroundChange?.(url)
  }

  const handleSolidColorSelect = (gradient: string) => {
    setBackgroundUrl(gradient)
    saveProjectSettings(gradient, opacity)
    onBackgroundChange?.(gradient)
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
    <>
      <div className="fixed top-4 right-4 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-accent hover:text-accent-foreground"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                <Eye className="h-4 w-4 mr-2" />
                View Settings
                {currentProject && <span className="ml-auto text-xs text-muted-foreground">{currentProject.name}</span>}
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-80">
                  <ScrollArea className="h-[70vh]">
                    <div className="p-4 space-y-4">
                      {currentProject && (
                        <div className="text-xs text-muted-foreground mb-2">
                          Settings for: <span className="font-medium">{currentProject.name}</span>
                        </div>
                      )}

                      <div>
                        <Label className="text-sm font-medium mb-2 block">Default Due Date</Label>
                        <p className="text-xs text-muted-foreground mb-3">
                          Tasks without a due date will automatically be set to this many days from now
                        </p>
                        <div className="flex items-center gap-2">
                          <Slider
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

                      <Separator />

                      <div>
                        <Label className="text-sm font-medium mb-2 block">Background Image</Label>
                        <div className="space-y-3">
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  const url = URL.createObjectURL(file)
                                  handleBackgroundSelect(url)
                                }
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Button variant="outline" size="sm" className="w-full bg-transparent">
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Image
                            </Button>
                          </div>

                          <div>
                            <Label className="text-xs font-medium mb-2 block text-muted-foreground">Solid Colors</Label>
                            <div className="grid grid-cols-4 gap-2">
                              {solidColors.map((color, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleSolidColorSelect(color.value)}
                                  className="aspect-square rounded border-2 border-transparent hover:border-primary overflow-hidden"
                                  style={{ background: color.value }}
                                  title={color.name}
                                />
                              ))}
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs font-medium mb-2 block text-muted-foreground">
                              Design Patterns
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                              {predefinedBackgrounds.map((bg, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleBackgroundSelect(bg)}
                                  className="aspect-video rounded border-2 border-transparent hover:border-primary overflow-hidden"
                                >
                                  <img
                                    src={bg || "/placeholder.svg"}
                                    alt={`Pattern ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs font-medium mb-2 block text-muted-foreground">
                              🏞️ Landscape Photos ({additionalBackgrounds.length + moreLandscapes.length} available)
                            </Label>
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded p-2">
                              {[...additionalBackgrounds, ...moreLandscapes].map((bg, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleBackgroundSelect(bg)}
                                  className="aspect-video rounded border-2 border-transparent hover:border-primary overflow-hidden"
                                >
                                  <img
                                    src={bg || "/placeholder.svg"}
                                    alt={`Landscape ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          </div>

                          {backgroundUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={removeBackground}
                              className="w-full bg-transparent"
                            >
                              Remove Background
                            </Button>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block">Window Transparency: {opacity}%</Label>
                        <Slider
                          value={[opacity]}
                          onValueChange={handleOpacityChange}
                          max={95}
                          min={10}
                          step={5}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>More transparent</span>
                          <span>More opaque</span>
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
                <span className="ml-auto text-xs text-muted-foreground">{emailTemplates.length}</span>
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
                                <X className="h-3 w-3" />
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
                <Database className="h-4 w-4 mr-2" />
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
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          onChange={handleFileUpload}
                          className="hidden"
                        />

                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isProcessing}
                          className="w-full justify-start"
                        >
                          {isProcessing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Import CSV
                            </>
                          )}
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
                          <FileText className="h-4 w-4 mr-2" />
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
      </div>

      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Email Template" : "Create Email Template"}</DialogTitle>
            <DialogDescription>
              Create customizable email templates for sending tasks to recipients. Use variables like task_title and
              personal_message for dynamic content.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Task Assignment"
              />
            </div>

            <div>
              <Label htmlFor="template-subject">Email Subject</Label>
              <Input
                id="template-subject"
                value={templateSubject}
                onChange={(e) => setTemplateSubject(e.target.value)}
                placeholder="e.g., New Task Assigned: task_title"
              />
            </div>

            <div>
              <Label htmlFor="template-body">Email Body</Label>
              <Textarea
                id="template-body"
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                placeholder="Write your email template here. Use task_title, task_description, due_date, priority, owner, and personal_message as variables."
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <div className="bg-muted p-3 rounded text-xs">
              <p className="font-medium mb-2">Available Variables:</p>
              <div className="grid grid-cols-2 gap-1">
                <span>task_title</span>
                <span>task_description</span>
                <span>due_date</span>
                <span>priority</span>
                <span>owner</span>
                <span>personal_message</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveTemplate}>{editingTemplate ? "Update Template" : "Create Template"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  CSV Import Preview
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowImportDialog(false)} disabled={isImporting}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span>{validTasksCount} valid tasks</span>
                </div>
                {invalidTasksCount > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <span>{invalidTasksCount} invalid tasks</span>
                  </div>
                )}
              </div>
            </CardHeader>

            <Separator />

            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-6">
                <div className="space-y-4">
                  {csvTasks.map((task, index) => (
                    <Card key={index} className={`${task.isValid ? "border-primary/20" : "border-destructive/20"}`}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="text-sm text-muted-foreground mb-1">Original:</div>
                              <div className="font-mono text-sm bg-muted p-2 rounded">{task.originalText}</div>
                            </div>
                            <div className="flex items-center gap-1">
                              {task.isValid ? (
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                              ) : (
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                              )}
                            </div>
                          </div>

                          {task.isValid ? (
                            <div className="space-y-2">
                              <div className="text-sm text-muted-foreground">Parsed as:</div>
                              <div className="space-y-2">
                                <div>
                                  <span className="font-medium">{task.parsed.title}</span>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <Badge className={getPriorityColor(task.parsed.priority)}>
                                    {task.parsed.priority}
                                  </Badge>

                                  {task.parsed.is_urgent && (
                                    <Badge variant="destructive" className="flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      Urgent
                                    </Badge>
                                  )}

                                  {task.parsed.due_date && (
                                    <Badge variant="outline">Due: {task.parsed.due_date.toLocaleDateString()}</Badge>
                                  )}

                                  {task.parsed.owner && <Badge variant="outline">Owner: {task.parsed.owner}</Badge>}

                                  {task.parsed.subject && (
                                    <Badge variant="outline">Subject: {task.parsed.subject}</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-destructive">
                              Error: {task.error || "Unable to parse this task"}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>

            <Separator />

            <div className="flex-shrink-0 p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {validTasksCount > 0
                    ? `Ready to import ${validTasksCount} task${validTasksCount !== 1 ? "s" : ""}`
                    : "No valid tasks to import"}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setShowImportDialog(false)} disabled={isImporting}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={validTasksCount === 0 || isImporting}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isImporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                        Importing...
                      </>
                    ) : (
                      `Import ${validTasksCount} Task${validTasksCount !== 1 ? "s" : ""}`
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}

interface CSVTask {
  originalText: string
  parsed: ParsedTask
  isValid: boolean
  error?: string
}
