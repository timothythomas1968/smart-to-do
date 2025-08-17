"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import TaskInputSystem from "@/components/task-input-system"
import TaskDashboard from "@/components/task-dashboard"
import SettingsMenu from "@/components/settings-menu"
import ProjectSelector from "@/components/project-selector"
import HelpMenu from "@/components/help-menu"
import AuthMenu from "@/components/auth-menu"
import type { Project } from "@/lib/types"

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const [foregroundOpacity, setForegroundOpacity] = useState(50)
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [projectFormData, setProjectFormData] = useState({
    name: "",
    description: "",
    color: "#10b981",
  })

  const handleProjectsChange = () => {
    // Placeholder for handleProjectsChange logic
    console.log("Projects have changed")
  }

  useEffect(() => {
    const supabaseClient = createClient()

    const getUser = async () => {
      try {
        if (!supabaseClient) {
          console.log("[v0] Supabase not available, using guest mode")
          setUser(null)
          return
        }

        const {
          data: { session },
          error,
        } = await supabaseClient.auth.getSession()
        if (error) {
          console.log("[v0] Session error:", error.message)
          setUser(null)
        } else if (session?.user) {
          console.log("[v0] User loaded: authenticated -", session.user.email)
          console.log("[v0] User ID:", session.user.id)
          setUser(session.user)
        } else {
          console.log("[v0] No userId provided, running in guest mode")
          setUser(null)
        }

        const {
          data: { subscription },
        } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
          console.log(
            "[v0] Auth state changed:",
            event,
            session?.user ? `authenticated - ${session.user.email}` : "guest",
          )
          if (session?.user) {
            console.log("[v0] Auth state user ID:", session.user.id)
            setUser(session.user)
            // Force refresh of projects and tasks when user signs in
            setRefreshKey((prev) => prev + 1)
          } else {
            console.log("[v0] User signed out or session ended")
            setUser(null)
          }
        })

        return () => subscription.unsubscribe()
      } catch (error) {
        console.log("[v0] Authentication initialization error:", error)
        setUser(null)
      }
    }

    getUser()

    const savedOpacity = localStorage.getItem("foregroundOpacity")
    if (savedOpacity) {
      setForegroundOpacity(Number.parseInt(savedOpacity))
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [user])

  const loadProjects = async () => {
    setIsLoadingProjects(true)
    try {
      if (!user?.id) {
        const guestProjects = JSON.parse(localStorage.getItem("guestProjects") || "[]")
        if (guestProjects.length === 0) {
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
          setCurrentProject(defaultProject)
        } else {
          setProjects(guestProjects)
          const defaultProj = guestProjects.find((p: Project) => p.is_default) || guestProjects[0]
          setCurrentProject(defaultProj)
        }
        return
      }

      const supabaseClient = createClient()
      if (!supabaseClient) return

      try {
        const { data, error } = await supabaseClient
          .from("projects")
          .select("*")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: true })

        if (error) throw error

        if (data && data.length > 0) {
          setProjects(data)
          const defaultProject = data.find((p) => p.is_default) || data[0]
          setCurrentProject(defaultProject)
        } else {
          // No projects found, create default project
          const defaultProject = {
            id: "default",
            name: "Default List",
            description: "General tasks and reminders",
            color: "#10b981",
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: user.id,
          }
          setProjects([defaultProject])
          setCurrentProject(defaultProject)
        }
      } catch (dbError: any) {
        console.log("[v0] Database table not found, using fallback projects:", dbError.message)
        const defaultProject = {
          id: "default",
          name: "Default List",
          description: "General tasks and reminders",
          color: "#10b981",
          is_default: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: user.id,
        }
        setProjects([defaultProject])
        setCurrentProject(defaultProject)
      }
    } catch (error) {
      console.error("Error loading projects:", error)
      const fallbackProject = {
        id: "fallback",
        name: "My Tasks",
        description: "Default task list",
        color: "#10b981",
        is_default: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: user?.id || "guest",
      }
      setProjects([fallbackProject])
      setCurrentProject(fallbackProject)
    } finally {
      setIsLoadingProjects(false)
    }
  }

  useEffect(() => {
    if (currentProject) {
      loadProjectBackground()
    }
  }, [currentProject])

  const loadProjectBackground = async () => {
    if (!currentProject) return

    try {
      if (!user?.id) {
        const projectSettingsKey = `projectSettings_${currentProject.id}`
        const savedSettings = localStorage.getItem(projectSettingsKey)

        if (savedSettings) {
          const settings = JSON.parse(savedSettings)
          setBackgroundUrl(settings.background_image_url || null)
          setForegroundOpacity(settings.background_opacity || 50)
        } else {
          setBackgroundUrl(null)
          setForegroundOpacity(50)
        }
      } else {
        const supabaseClient = createClient()
        if (!supabaseClient) return

        try {
          const { data, error } = await supabaseClient
            .from("projects")
            .select("settings")
            .eq("id", currentProject.id)
            .single()

          if (error) throw error

          if (data?.settings) {
            const settings = data.settings
            setBackgroundUrl(settings.background_image_url || null)
            setForegroundOpacity(settings.background_opacity || 50)
          } else {
            setBackgroundUrl(null)
            setForegroundOpacity(50)
          }
        } catch (dbError: any) {
          console.log("[v0] Projects table not available for background settings, using defaults")
          setBackgroundUrl(null)
          setForegroundOpacity(50)
        }
      }
    } catch (error) {
      console.error("Error loading project background:", error)
      setBackgroundUrl(null)
      setForegroundOpacity(50)
    }
  }

  const handleTaskAdded = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const handleBackgroundChange = (url: string | null) => {
    setBackgroundUrl(url)
  }

  const handleOpacityChange = (opacity: number) => {
    setForegroundOpacity(opacity)
  }

  const handleProjectChange = (project: Project) => {
    setCurrentProject(project)
    setRefreshKey((prev) => prev + 1)
  }

  const handleCreateProject = () => {
    setProjectFormData({ name: "", description: "", color: "#10b981" })
    setIsCreateProjectOpen(true)
  }

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!projectFormData.name.trim()) return

    try {
      if (!user?.id) {
        const guestProjects = JSON.parse(localStorage.getItem("guestProjects") || "[]")
        const newProject = {
          id: Date.now().toString(),
          name: projectFormData.name.trim(),
          description: projectFormData.description.trim(),
          color: projectFormData.color,
          is_default: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: "guest",
        }
        guestProjects.push(newProject)
        localStorage.setItem("guestProjects", JSON.stringify(guestProjects))
        setCurrentProject(newProject)
      } else {
        const supabaseClient = createClient()
        if (!supabaseClient) return

        const { data, error } = await supabaseClient
          .from("projects")
          .insert({
            name: projectFormData.name.trim(),
            description: projectFormData.description.trim(),
            color: projectFormData.color,
            user_id: user.id,
          })
          .select()
          .single()

        if (error) throw error
        if (data) setCurrentProject(data)
      }

      setProjectFormData({ name: "", description: "", color: "#10b981" })
      setIsCreateProjectOpen(false)
      loadProjects()
    } catch (error) {
      console.error("Error creating project:", error)
    }
  }

  return (
    <div
      className="min-h-screen bg-background relative"
      style={{
        ...(backgroundUrl
          ? backgroundUrl.startsWith("linear-gradient") || backgroundUrl.startsWith("radial-gradient")
            ? { background: backgroundUrl }
            : {
                backgroundImage: `url(${backgroundUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }
          : {}),
      }}
    >
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto mb-6">
          <header className="text-center">
            <div className={backgroundUrl ? "bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-white/20" : ""}>
              <h1 className="text-3xl font-bold text-foreground mb-0.5">Smart Tasks</h1>
              <p className="text-sm text-muted-foreground/70 mb-1">an application from Theo Labs</p>
              <p className="text-muted-foreground">
                Add tasks naturally - I'll understand dates, priorities, and assignments
              </p>
            </div>
          </header>
        </div>

        <div className="max-w-4xl mx-auto mb-4">
          <div className="flex justify-center items-center gap-4">
            {!isLoadingProjects && projects.length > 0 && (
              <div className="flex-shrink-0">
                <ProjectSelector
                  currentProject={currentProject}
                  projects={projects}
                  onProjectChange={handleProjectChange}
                  onCreateProject={handleCreateProject}
                />
              </div>
            )}
            <div className="flex gap-2 flex-shrink-0">
              {!isLoadingProjects && projects.length > 0 && (
                <>
                  <div className="relative">
                    <SettingsMenu
                      onBackgroundChange={handleBackgroundChange}
                      onOpacityChange={handleOpacityChange}
                      currentOpacity={foregroundOpacity}
                      userId={user?.id}
                      onTasksChange={handleTaskAdded}
                      onProjectsChange={handleProjectsChange}
                      currentProject={currentProject}
                    />
                  </div>
                  <div className="relative">
                    <HelpMenu />
                  </div>
                </>
              )}
              <div className="relative">
                <AuthMenu user={user} />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          <TaskInputSystem
            userId={user?.id}
            onTaskAdded={handleTaskAdded}
            hasBackground={!!backgroundUrl}
            opacity={foregroundOpacity}
            currentProject={currentProject}
          />
          <TaskDashboard
            userId={user?.id}
            key={refreshKey}
            hasBackground={!!backgroundUrl}
            opacity={foregroundOpacity}
            currentProject={currentProject}
          />
        </div>
      </div>

      {isCreateProjectOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Create New Project</h2>
            <form onSubmit={handleProjectSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Project Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={projectFormData.name}
                  onChange={(e) => setProjectFormData({ ...projectFormData, name: e.target.value })}
                  placeholder="Enter project name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-1">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  value={projectFormData.description}
                  onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
                  placeholder="Brief description of this project..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Color</label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    "#10b981",
                    "#3b82f6",
                    "#f59e0b",
                    "#8b5cf6",
                    "#ef4444",
                    "#06b6d4",
                    "#84cc16",
                    "#f97316",
                    "#ec4899",
                    "#6b7280",
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setProjectFormData({ ...projectFormData, color })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        projectFormData.color === color ? "border-gray-800" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateProjectOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
