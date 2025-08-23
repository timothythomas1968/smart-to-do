"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import TaskInputSystem from "@/components/task-input-system"
import { TaskDashboard } from "@/components/task-dashboard"
import SettingsMenu from "@/components/settings-menu"
import ProjectSelector from "@/components/project-selector"
import HelpMenu from "@/components/help-menu"
import AuthMenu from "@/components/auth-menu"
import LoginForm from "@/components/login-form"
import type { Project } from "@/lib/types"
import { toast } from "@/hooks/use-toast"
import WelcomeScreen from "./welcome-screen"

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
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [authScreen, setAuthScreen] = useState<"welcome" | "signin" | "signup">("welcome")
  const [isGuestModeActive, setIsGuestModeActive] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  const handleProjectsChange = () => {
    console.log("Projects have changed")
  }

  useEffect(() => {
    const supabaseClient = createClient()

    const getUser = async () => {
      try {
        if (!supabaseClient) {
          console.log("[v0] Supabase not available, showing welcome screen")
          setUser(null)
          setIsAuthLoading(false)
          return
        }

        const {
          data: { session },
          error,
        } = await supabaseClient.auth.getSession()

        if (error) {
          console.log("[v0] Session error:", error.message)
          if (error.message.includes("Invalid Refresh Token") || error.message.includes("refresh_token_not_found")) {
            console.log("[v0] Clearing session due to invalid refresh token")
            setUser(null)
          }
        } else if (session?.user) {
          console.log("[v0] User loaded: authenticated -", session.user.email)
          console.log("[v0] User ID:", session.user.id)
          setUser(session.user)
        } else {
          console.log("[v0] No session found, showing welcome screen")
          setUser(null)
        }

        setIsAuthLoading(false)

        const {
          data: { subscription },
        } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
          try {
            console.log(
              "[v0] Auth state changed:",
              event,
              session?.user ? `authenticated - ${session.user.email}` : "guest",
            )

            if (event === "SIGNED_IN" && session?.user) {
              console.log("[v0] User successfully signed in:", session.user.email)
              setUser(session.user)
              setRefreshKey((prev) => prev + 1)
              setIsAuthLoading(false)
              return
            }

            if (event === "TOKEN_REFRESHED" && session?.user) {
              console.log("[v0] Token refreshed successfully")
              setUser(session.user)
              return
            }

            if (event === "SIGNED_OUT") {
              console.log("[v0] User explicitly signed out")
              setUser(null)
              setIsAuthLoading(false)
              return
            }

            if (event === "TOKEN_REFRESH_FAILED") {
              console.log("[v0] Token refresh failed, attempting to clear session gracefully")
              try {
                await supabaseClient.auth.signOut()
              } catch (signOutError) {
                console.log("[v0] Error during graceful sign out:", signOutError)
              }
              setUser(null)
              setIsAuthLoading(false)
              return
            }

            if (event === "INITIAL_SESSION") {
              if (session?.user) {
                console.log("[v0] Initial session found:", session.user.email)
                setUser(session.user)
              } else {
                console.log("[v0] No initial session")
                // Don't clear user here if we already have one from getSession
                if (!user) {
                  setUser(null)
                }
              }
              setIsAuthLoading(false)
              return
            }
          } catch (authError: any) {
            console.error("[v0] Auth state change error:", authError?.message || authError)
            if (
              authError?.message?.includes("Invalid Refresh Token") ||
              authError?.message?.includes("refresh_token_not_found")
            ) {
              setUser(null)
              setIsAuthLoading(false)
            }
          }
        })

        return () => subscription.unsubscribe()
      } catch (error: any) {
        console.log("[v0] Authentication initialization error:", error)
        if (error?.message?.includes("Invalid Refresh Token") || error?.message?.includes("refresh_token_not_found")) {
          setUser(null)
        }
        setIsAuthLoading(false)
      }
    }

    getUser()

    const savedDarkMode = localStorage.getItem("darkMode")
    if (savedDarkMode) {
      const darkModeEnabled = JSON.parse(savedDarkMode)
      setIsDarkMode(darkModeEnabled)
      if (darkModeEnabled) {
        document.documentElement.classList.add("dark")
        setBackgroundUrl("#000000")
      }
    }

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
            .from("user_settings")
            .select("background_image_url, background_opacity")
            .eq("user_id", user.id)
            .single()

          if (error && error.code !== "PGRST116") throw error

          if (data) {
            console.log("[v0] Loaded background settings from user_settings table")
            setBackgroundUrl(data.background_image_url || null)
            const opacityPercentage = data.background_opacity ? Math.round(data.background_opacity * 100) : 50
            setForegroundOpacity(opacityPercentage)
          } else {
            console.log("[v0] No user settings found, using defaults")
            setBackgroundUrl(null)
            setForegroundOpacity(50)
          }
        } catch (dbError: any) {
          console.log(
            "[v0] User settings table not available for background settings, using defaults:",
            dbError.message,
          )
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

  const handleGuestMode = () => {
    console.log("[v0] Guest mode button clicked")
    try {
      setIsGuestModeActive(true)
      setUser({ id: null, email: "guest" })
      setIsAuthLoading(false)
      setTimeout(() => {
        toast({
          title: "Guest Mode Active",
          description: "Your tasks and settings will be stored locally on this device only.",
        })
        console.log("[v0] Guest mode toast triggered")
        setIsGuestModeActive(false)
      }, 100)
    } catch (error) {
      console.log("[v0] Error in handleGuestMode:", error)
      setIsGuestModeActive(false)
    }
  }

  const getOpacityStyle = (opacity: number) => {
    const normalizedOpacity = Math.max(0.05, Math.min(0.95, opacity / 100))

    if (isDarkMode) {
      return {
        backgroundColor: `rgba(45, 45, 45, ${Math.max(0.9, normalizedOpacity)})`,
        backdropFilter: "blur(8px)",
        border: `1px solid rgba(255, 255, 255, 0.1)`,
        color: "#e5e7eb",
      }
    }

    return {
      backgroundColor: `rgba(255, 255, 255, ${normalizedOpacity})`,
      backdropFilter: "blur(8px)",
      border: `1px solid rgba(255, 255, 255, ${normalizedOpacity * 0.3})`,
    }
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    if (authScreen === "signin") {
      return (
        <div
          className="min-h-screen w-full flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
          style={{
            backgroundImage: `url('/green-fields-countryside.png')`,
          }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="relative z-10 w-full max-w-md">
            <LoginForm onBack={() => setAuthScreen("welcome")} />
          </div>
        </div>
      )
    }

    if (authScreen === "signup") {
      return (
        <div
          className="min-h-screen w-full flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
          style={{
            backgroundImage: `url('/green-fields-countryside.png')`,
          }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="relative z-10 w-full max-w-md">
            <LoginForm isSignUp={true} onBack={() => setAuthScreen("welcome")} />
          </div>
        </div>
      )
    }

    return (
      <WelcomeScreen
        onGuestMode={handleGuestMode}
        onSignIn={() => setAuthScreen("signin")}
        onSignUp={() => setAuthScreen("signup")}
      />
    )
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
                backgroundAttachment: "fixed",
              }
          : {}),
      }}
    >
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto mb-6">
          <header className="text-center">
            <div
              className={`${backgroundUrl ? "rounded-lg p-4" : ""} ${isDarkMode ? "bg-gray-800/90 border border-gray-700" : ""}`}
              style={
                backgroundUrl
                  ? getOpacityStyle(foregroundOpacity)
                  : isDarkMode
                    ? {
                        backgroundColor: "rgba(45, 45, 45, 0.95)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "0.5rem",
                        padding: "1rem",
                      }
                    : {}
              }
            >
              <h1 className={`text-3xl font-bold mb-0.5 ${isDarkMode ? "text-gray-100" : "text-foreground"}`}>
                Smart Tasks
              </h1>
              <p className={`text-sm mb-1 ${isDarkMode ? "text-gray-300" : "text-muted-foreground/70"}`}>
                an application from Theo Labs
              </p>
              <p className={isDarkMode ? "text-gray-200" : "text-muted-foreground"}>
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
            isDarkMode={isDarkMode}
          />
          <TaskDashboard
            userId={user?.id}
            key={refreshKey}
            hasBackground={!!backgroundUrl}
            opacity={foregroundOpacity}
            currentProject={currentProject}
            isDarkMode={isDarkMode}
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
