"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { Folder, Plus, Edit, Trash2, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import type { Project } from "@/lib/types"
import { COMMON_PROJECT_TYPES } from "@/lib/types"

interface ProjectManagementProps {
  userId?: string
  onProjectsChange?: () => void
}

const PROJECT_COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f97316", // orange
  "#ec4899", // pink
  "#6b7280", // gray
]

export default function ProjectManagement({ userId, onProjectsChange }: ProjectManagementProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [taskCount, setTaskCount] = useState<number>(0)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#10b981",
  })

  useEffect(() => {
    loadProjects()
  }, [userId])

  const loadProjects = async () => {
    if (!userId) {
      const guestProjects = JSON.parse(localStorage.getItem("guestProjects") || "[]")
      if (guestProjects.length === 0) {
        // Create default project for guest mode
        const defaultProject = {
          id: "default",
          name: "Default List",
          description: "General tasks and reminders",
          color: "#10b981",
          is_default: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: "guest",
        }
        localStorage.setItem("guestProjects", JSON.stringify([defaultProject]))
        setProjects([defaultProject])
      } else {
        setProjects(guestProjects)
      }
      return
    }

    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.log("[v0] Projects table not available for project management, using defaults:", error)

      // Create default project for authenticated users when database table doesn't exist
      const defaultProject = {
        id: "default",
        name: "Default List",
        description: "General tasks and reminders",
        color: "#10b981",
        is_default: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: userId,
      }
      setProjects([defaultProject])
    }
  }

  const getTaskCount = async (projectId: string): Promise<number> => {
    if (!userId) {
      const guestTasks = JSON.parse(localStorage.getItem("guestTasks") || "[]")
      return guestTasks.filter((task: any) => task.project_id === projectId).length
    }

    try {
      const { count, error } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId)

      if (error) throw error
      return count || 0
    } catch (error) {
      console.log("[v0] Tasks table not available for counting, returning 0:", error)
      return 0
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) return

    try {
      if (!userId) {
        const guestProjects = JSON.parse(localStorage.getItem("guestProjects") || "[]")
        const newProject = {
          id: Date.now().toString(),
          name: formData.name.trim(),
          description: formData.description.trim(),
          color: formData.color,
          is_default: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: "guest",
        }

        if (editingProject) {
          const updatedProjects = guestProjects.map((p: Project) =>
            p.id === editingProject.id ? { ...newProject, id: editingProject.id } : p,
          )
          localStorage.setItem("guestProjects", JSON.stringify(updatedProjects))
        } else {
          guestProjects.push(newProject)
          localStorage.setItem("guestProjects", JSON.stringify(guestProjects))
        }
      } else {
        if (editingProject) {
          const { error } = await supabase
            .from("projects")
            .update({
              name: formData.name.trim(),
              description: formData.description.trim(),
              color: formData.color,
            })
            .eq("id", editingProject.id)

          if (error) throw error
        } else {
          const { error } = await supabase.from("projects").insert({
            name: formData.name.trim(),
            description: formData.description.trim(),
            color: formData.color,
            user_id: userId,
          })

          if (error) throw error
        }
      }

      setFormData({ name: "", description: "", color: "#10b981" })
      setIsCreateDialogOpen(false)
      setEditingProject(null)
      loadProjects()
      onProjectsChange?.()
    } catch (error) {
      console.log("[v0] Error saving project (database table may not exist):", error)

      // For authenticated users, fall back to localStorage when database isn't available
      if (userId) {
        const fallbackProjects = JSON.parse(localStorage.getItem(`userProjects_${userId}`) || "[]")
        const newProject = {
          id: editingProject?.id || Date.now().toString(),
          name: formData.name.trim(),
          description: formData.description.trim(),
          color: formData.color,
          is_default: false,
          created_at: editingProject?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: userId,
        }

        if (editingProject) {
          const updatedProjects = fallbackProjects.map((p: Project) => (p.id === editingProject.id ? newProject : p))
          localStorage.setItem(`userProjects_${userId}`, JSON.stringify(updatedProjects))
        } else {
          fallbackProjects.push(newProject)
          localStorage.setItem(`userProjects_${userId}`, JSON.stringify(fallbackProjects))
        }

        setFormData({ name: "", description: "", color: "#10b981" })
        setIsCreateDialogOpen(false)
        setEditingProject(null)
        loadProjects()
        onProjectsChange?.()
      }
    }
  }

  const handleDeleteClick = async (project: Project) => {
    if (project.is_default) return // Can't delete default project

    const count = await getTaskCount(project.id)
    setProjectToDelete(project)
    setTaskCount(count)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!projectToDelete) return

    try {
      if (!userId) {
        // Delete tasks associated with the project in guest mode
        const guestTasks = JSON.parse(localStorage.getItem("guestTasks") || "[]")
        const updatedTasks = guestTasks.filter((task: any) => task.project_id !== projectToDelete.id)
        localStorage.setItem("guestTasks", JSON.stringify(updatedTasks))

        // Delete the project
        const guestProjects = JSON.parse(localStorage.getItem("guestProjects") || "[]")
        const updatedProjects = guestProjects.filter((p: Project) => p.id !== projectToDelete.id)
        localStorage.setItem("guestProjects", JSON.stringify(updatedProjects))
      } else {
        // Database will cascade delete tasks due to foreign key constraint
        const { error } = await supabase.from("projects").delete().eq("id", projectToDelete.id)

        if (error) throw error
      }

      setDeleteDialogOpen(false)
      setProjectToDelete(null)
      setTaskCount(0)
      loadProjects()
      onProjectsChange?.()
    } catch (error) {
      console.log("[v0] Error deleting project (database table may not exist):", error)

      // For authenticated users, fall back to localStorage when database isn't available
      if (userId) {
        const fallbackProjects = JSON.parse(localStorage.getItem(`userProjects_${userId}`) || "[]")
        const updatedProjects = fallbackProjects.filter((p: Project) => p.id !== projectToDelete.id)
        localStorage.setItem(`userProjects_${userId}`, JSON.stringify(updatedProjects))

        setDeleteDialogOpen(false)
        setProjectToDelete(null)
        setTaskCount(0)
        loadProjects()
        onProjectsChange?.()
      }
    }
  }

  const createFromTemplate = (template: (typeof COMMON_PROJECT_TYPES)[0]) => {
    setFormData({
      name: template.name,
      description: template.description,
      color: template.color,
    })
    setIsCreateDialogOpen(true)
  }

  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Folder className="h-4 w-4 mr-2" />
          Project Management
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent className="w-96">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Your Projects</Label>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => setEditingProject(null)}>
                      <Plus className="h-4 w-4 mr-1" />
                      New
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingProject ? "Rename Project" : "Create New Project"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Project Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Enter project name..."
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description (optional)</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Brief description of this project..."
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label>Color</Label>
                        <div className="grid grid-cols-5 gap-2 mt-2">
                          {PROJECT_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setFormData({ ...formData, color })}
                              className={`w-8 h-8 rounded-full border-2 ${
                                formData.color === color ? "border-foreground" : "border-transparent"
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsCreateDialogOpen(false)
                            setEditingProject(null)
                            setFormData({ name: "", description: "", color: "#10b981" })
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">{editingProject ? "Update" : "Create"}</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {projects.map((project) => (
                    <div key={project.id} className="flex items-center gap-2 p-2 rounded border hover:bg-muted/50">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{project.name}</div>
                        {project.description && (
                          <div className="text-xs text-muted-foreground truncate">{project.description}</div>
                        )}
                      </div>
                      {project.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingProject(project)
                            setFormData({
                              name: project.name,
                              description: project.description || "",
                              color: project.color,
                            })
                            setIsCreateDialogOpen(true)
                          }}
                          title="Rename project"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        {!project.is_default && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteClick(project)}
                            className="text-destructive hover:text-destructive"
                            title="Delete project"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Separator />

              <div>
                <Label className="text-sm font-medium mb-2 block">Quick Templates</Label>
                <div className="grid grid-cols-2 gap-2">
                  {COMMON_PROJECT_TYPES.slice(1, 5).map((template) => (
                    <Button
                      key={template.name}
                      variant="outline"
                      size="sm"
                      onClick={() => createFromTemplate(template)}
                      className="justify-start text-xs"
                    >
                      <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: template.color }} />
                      {template.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Project
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete the project <strong>"{projectToDelete?.name}"</strong>?
              </p>
              {taskCount > 0 && (
                <p className="text-destructive font-medium">
                  This will permanently delete {taskCount} task{taskCount !== 1 ? "s" : ""} associated with this
                  project.
                </p>
              )}
              <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
