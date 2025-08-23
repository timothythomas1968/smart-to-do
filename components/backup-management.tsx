"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Shield,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Database,
} from "lucide-react"
import { createBackupService } from "@/lib/backup-service"

interface BackupManagementProps {
  userId?: string
  onDataRestored?: () => void
}

export default function BackupManagement({ userId, onDataRestored }: BackupManagementProps) {
  const [backupService] = useState(() => createBackupService(userId))
  const [backupSettings, setBackupSettings] = useState(backupService.getBackupSettings())
  const [storedBackups, setStoredBackups] = useState(backupService.getStoredBackups())
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Initialize automatic backup system
    backupService.initializeAutoBackup()

    // Load initial data
    refreshBackupData()
  }, [backupService])

  const refreshBackupData = () => {
    setBackupSettings(backupService.getBackupSettings())
    setStoredBackups(backupService.getStoredBackups())
  }

  const handleSettingsChange = (key: string, value: any) => {
    const newSettings = { ...backupSettings, [key]: value }
    setBackupSettings(newSettings)
    backupService.saveBackupSettings(newSettings)
  }

  const createManualBackup = async () => {
    setIsCreatingBackup(true)
    try {
      await backupService.createBackup()
      refreshBackupData()
    } catch (error) {
      console.error("[v0] Error creating manual backup:", error)
    } finally {
      setIsCreatingBackup(false)
    }
  }

  const restoreFromBackup = async (backup: any) => {
    if (
      !confirm(
        `Are you sure you want to restore from backup created on ${new Date(backup.timestamp).toLocaleString()}? This will overwrite your current data.`,
      )
    ) {
      return
    }

    setIsRestoring(true)
    try {
      const success = await backupService.restoreFromBackup(backup)
      if (success) {
        onDataRestored?.()
        alert("Backup restored successfully! Please refresh the page to see changes.")
      } else {
        alert("Failed to restore backup. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error restoring backup:", error)
      alert("Error restoring backup. Please try again.")
    } finally {
      setIsRestoring(false)
    }
  }

  const exportBackup = (backup: any) => {
    backupService.exportBackup(backup)
  }

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const backup = await backupService.importBackup(file)
      if (backup) {
        await restoreFromBackup(backup)
      } else {
        alert("Invalid backup file format.")
      }
    } catch (error) {
      console.error("[v0] Error importing backup:", error)
      alert("Error importing backup file.")
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const deleteBackup = (index: number) => {
    if (!confirm("Are you sure you want to delete this backup?")) {
      return
    }

    const updatedBackups = storedBackups.filter((_, i) => i !== index)
    localStorage.setItem(userId ? `backups_${userId}` : "backups_guest", JSON.stringify(updatedBackups))
    refreshBackupData()
  }

  const getBackupStatusColor = () => {
    if (!backupSettings.enabled) return "text-muted-foreground"
    if (!backupSettings.lastBackup) return "text-orange-500"

    const lastBackup = new Date(backupSettings.lastBackup)
    const now = new Date()
    const hoursSince = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60)

    if (backupSettings.frequency === "daily" && hoursSince < 24) return "text-green-500"
    if (backupSettings.frequency === "weekly" && hoursSince < 168) return "text-green-500"

    return "text-orange-500"
  }

  const getBackupStatusText = () => {
    if (!backupSettings.enabled) return "Disabled"
    if (!backupSettings.lastBackup) return "No backups yet"

    const lastBackup = new Date(backupSettings.lastBackup)
    return `Last: ${lastBackup.toLocaleDateString()} ${lastBackup.toLocaleTimeString()}`
  }

  return (
    <div className="space-y-6">
      {/* Backup Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Automatic Backup Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Enable Automatic Backups</Label>
              <p className="text-xs text-muted-foreground">Automatically create backups of your tasks and settings</p>
            </div>
            <Switch
              checked={backupSettings.enabled}
              onCheckedChange={(checked) => handleSettingsChange("enabled", checked)}
            />
          </div>

          {backupSettings.enabled && (
            <>
              <div>
                <Label className="text-sm font-medium mb-2 block">Backup Frequency</Label>
                <Select
                  value={backupSettings.frequency}
                  onValueChange={(value) => handleSettingsChange("frequency", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="manual">Manual Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Maximum Stored Backups: {backupSettings.maxBackups}
                </Label>
                <Slider
                  value={[backupSettings.maxBackups]}
                  onValueChange={(value) => handleSettingsChange("maxBackups", value[0])}
                  max={30}
                  min={3}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Older backups will be automatically deleted when this limit is reached
                </p>
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <p className="text-sm font-medium">Backup Status</p>
              <p className={`text-xs ${getBackupStatusColor()}`}>{getBackupStatusText()}</p>
            </div>
            <Button onClick={createManualBackup} disabled={isCreatingBackup} size="sm" variant="outline">
              {isCreatingBackup ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Create Backup Now
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Backup History ({storedBackups.length})
            </CardTitle>
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileImport} className="hidden" />
              <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {storedBackups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No backups available</p>
              <p className="text-sm">Create your first backup to get started</p>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-3">
                {storedBackups.map((backup, index) => (
                  <Card key={index} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="font-medium text-sm">
                              {new Date(backup.timestamp).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(backup.timestamp).toLocaleTimeString()}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {backup.tasks?.length || 0} tasks
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {backup.projects?.length || 0} projects
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {backup.customNames?.length || 0} names
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {backup.emailTemplates?.length || 0} templates
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            onClick={() => exportBackup(backup)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            title="Export backup file"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => restoreFromBackup(backup)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            disabled={isRestoring}
                            title="Restore from this backup"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => deleteBackup(index)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            title="Delete backup"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Backup Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            About Backups
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <p>Backups include all your tasks, projects, settings, custom names, and email templates</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <p>Automatic backups run in the background based on your frequency setting</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <p>Export backups as JSON files for external storage or sharing between devices</p>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <p>Restoring a backup will overwrite your current data - use with caution</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
