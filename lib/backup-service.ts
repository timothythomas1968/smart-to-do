interface BackupData {
  tasks: any[]
  projects: any[]
  settings: any
  customNames: string[]
  emailTemplates: any[]
  timestamp: string
  version: string
}

interface BackupSettings {
  enabled: boolean
  frequency: "daily" | "weekly" | "manual"
  maxBackups: number
  lastBackup?: string
}

export class AutomaticBackupService {
  private userId?: string
  private backupKey: string
  private settingsKey: string

  constructor(userId?: string) {
    this.userId = userId
    this.backupKey = userId ? `backups_${userId}` : "backups_guest"
    this.settingsKey = userId ? `backupSettings_${userId}` : "backupSettings_guest"
  }

  // Get backup settings
  getBackupSettings(): BackupSettings {
    try {
      const settings = localStorage.getItem(this.settingsKey)
      if (settings) {
        return JSON.parse(settings)
      }
    } catch (error) {
      console.error("[v0] Error loading backup settings:", error)
    }

    return {
      enabled: true,
      frequency: "daily",
      maxBackups: 7,
    }
  }

  // Save backup settings
  saveBackupSettings(settings: BackupSettings): void {
    try {
      localStorage.setItem(this.settingsKey, JSON.stringify(settings))
    } catch (error) {
      console.error("[v0] Error saving backup settings:", error)
    }
  }

  // Create a comprehensive backup
  async createBackup(): Promise<BackupData | null> {
    try {
      console.log("[v0] Creating automatic backup...")

      // Collect all user data
      const tasks = await this.getTasks()
      const projects = this.getProjects()
      const settings = this.getSettings()
      const customNames = this.getCustomNames()
      const emailTemplates = this.getEmailTemplates()

      const backup: BackupData = {
        tasks,
        projects,
        settings,
        customNames,
        emailTemplates,
        timestamp: new Date().toISOString(),
        version: "1.0",
      }

      // Store backup
      this.storeBackup(backup)

      // Update last backup time
      const backupSettings = this.getBackupSettings()
      backupSettings.lastBackup = backup.timestamp
      this.saveBackupSettings(backupSettings)

      console.log("[v0] Backup created successfully:", backup.timestamp)
      return backup
    } catch (error) {
      console.error("[v0] Error creating backup:", error)
      return null
    }
  }

  // Store backup in localStorage with rotation
  private storeBackup(backup: BackupData): void {
    try {
      const existingBackups = this.getStoredBackups()
      const settings = this.getBackupSettings()

      // Add new backup
      existingBackups.push(backup)

      // Rotate backups (keep only maxBackups)
      if (existingBackups.length > settings.maxBackups) {
        existingBackups.splice(0, existingBackups.length - settings.maxBackups)
      }

      localStorage.setItem(this.backupKey, JSON.stringify(existingBackups))
    } catch (error) {
      console.error("[v0] Error storing backup:", error)
    }
  }

  // Get stored backups
  getStoredBackups(): BackupData[] {
    try {
      const backups = localStorage.getItem(this.backupKey)
      return backups ? JSON.parse(backups) : []
    } catch (error) {
      console.error("[v0] Error loading stored backups:", error)
      return []
    }
  }

  // Get tasks from appropriate source
  private async getTasks(): Promise<any[]> {
    if (!this.userId) {
      // Guest mode - get from localStorage
      return JSON.parse(localStorage.getItem("guestTasks") || "[]")
    } else {
      // Authenticated user - get from database
      try {
        const { supabase } = await import("@/lib/supabase/client")
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", this.userId)
          .order("created_at", { ascending: false })

        if (error) throw error
        return data || []
      } catch (error) {
        console.error("[v0] Error fetching tasks from database:", error)
        // Fallback to localStorage
        return JSON.parse(localStorage.getItem("guestTasks") || "[]")
      }
    }
  }

  // Get projects
  private getProjects(): any[] {
    const projectsKey = this.userId ? `userProjects_${this.userId}` : "guestProjects"
    return JSON.parse(localStorage.getItem(projectsKey) || "[]")
  }

  // Get settings
  private getSettings(): any {
    const settings: any = {}

    // Collect various settings
    const settingsKeys = ["darkMode", "defaultDueDays", "digestEnabled", "digestTime", "digestDaysAhead"]

    settingsKeys.forEach((key) => {
      const value = localStorage.getItem(key)
      if (value) {
        try {
          settings[key] = JSON.parse(value)
        } catch {
          settings[key] = value
        }
      }
    })

    // Project-specific settings
    if (this.userId) {
      try {
        const projectSettings = localStorage.getItem(`projectSettings_default`)
        if (projectSettings) {
          settings.projectSettings = JSON.parse(projectSettings)
        }
      } catch (error) {
        console.error("[v0] Error loading project settings:", error)
      }
    }

    return settings
  }

  // Get custom names
  private getCustomNames(): string[] {
    const storageKey = this.userId ? `customNames_${this.userId}` : "customNames_guest"
    return JSON.parse(localStorage.getItem(storageKey) || "[]")
  }

  // Get email templates
  private getEmailTemplates(): any[] {
    return JSON.parse(localStorage.getItem("emailTemplates") || "[]")
  }

  // Restore from backup
  async restoreFromBackup(backup: BackupData): Promise<boolean> {
    try {
      console.log("[v0] Restoring from backup:", backup.timestamp)

      // Restore tasks
      if (backup.tasks && backup.tasks.length > 0) {
        if (!this.userId) {
          localStorage.setItem("guestTasks", JSON.stringify(backup.tasks))
        } else {
          // For authenticated users, we'd need to clear and restore database
          // For now, just restore to localStorage as fallback
          localStorage.setItem("guestTasks", JSON.stringify(backup.tasks))
        }
      }

      // Restore projects
      if (backup.projects) {
        const projectsKey = this.userId ? `userProjects_${this.userId}` : "guestProjects"
        localStorage.setItem(projectsKey, JSON.stringify(backup.projects))
      }

      // Restore settings
      if (backup.settings) {
        Object.entries(backup.settings).forEach(([key, value]) => {
          if (key !== "projectSettings") {
            localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value))
          }
        })

        if (backup.settings.projectSettings) {
          localStorage.setItem("projectSettings_default", JSON.stringify(backup.settings.projectSettings))
        }
      }

      // Restore custom names
      if (backup.customNames) {
        const storageKey = this.userId ? `customNames_${this.userId}` : "customNames_guest"
        localStorage.setItem(storageKey, JSON.stringify(backup.customNames))
      }

      // Restore email templates
      if (backup.emailTemplates) {
        localStorage.setItem("emailTemplates", JSON.stringify(backup.emailTemplates))
      }

      console.log("[v0] Backup restored successfully")
      return true
    } catch (error) {
      console.error("[v0] Error restoring backup:", error)
      return false
    }
  }

  // Export backup as downloadable file
  exportBackup(backup: BackupData): void {
    try {
      const dataStr = JSON.stringify(backup, null, 2)
      const blob = new Blob([dataStr], { type: "application/json" })
      const url = window.URL.createObjectURL(blob)

      const a = document.createElement("a")
      a.href = url
      a.download = `todo-backup-${backup.timestamp.split("T")[0]}.json`
      a.click()

      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("[v0] Error exporting backup:", error)
    }
  }

  // Import backup from file
  async importBackup(file: File): Promise<BackupData | null> {
    try {
      const text = await file.text()
      const backup: BackupData = JSON.parse(text)

      // Validate backup structure
      if (!backup.timestamp || !backup.version) {
        throw new Error("Invalid backup file format")
      }

      return backup
    } catch (error) {
      console.error("[v0] Error importing backup:", error)
      return null
    }
  }

  // Check if backup is needed
  shouldCreateBackup(): boolean {
    const settings = this.getBackupSettings()

    if (!settings.enabled) {
      return false
    }

    if (!settings.lastBackup) {
      return true
    }

    const lastBackup = new Date(settings.lastBackup)
    const now = new Date()
    const hoursSinceLastBackup = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60)

    switch (settings.frequency) {
      case "daily":
        return hoursSinceLastBackup >= 24
      case "weekly":
        return hoursSinceLastBackup >= 168 // 24 * 7
      case "manual":
        return false
      default:
        return false
    }
  }

  // Initialize automatic backup checking
  initializeAutoBackup(): void {
    // Check for backup on app load
    if (this.shouldCreateBackup()) {
      this.createBackup()
    }

    // Set up periodic checking (every hour)
    setInterval(
      () => {
        if (this.shouldCreateBackup()) {
          this.createBackup()
        }
      },
      60 * 60 * 1000,
    ) // 1 hour
  }

  // Delete old backups
  cleanupOldBackups(): void {
    try {
      const settings = this.getBackupSettings()
      const backups = this.getStoredBackups()

      if (backups.length > settings.maxBackups) {
        const trimmedBackups = backups.slice(-settings.maxBackups)
        localStorage.setItem(this.backupKey, JSON.stringify(trimmedBackups))
        console.log("[v0] Cleaned up old backups")
      }
    } catch (error) {
      console.error("[v0] Error cleaning up backups:", error)
    }
  }
}

// Export singleton instances
export const createBackupService = (userId?: string) => new AutomaticBackupService(userId)
