"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Upload, FileText, CheckCircle2, AlertTriangle, X, Download } from "lucide-react"
import { parseTaskFromNaturalLanguage } from "@/lib/nlp-parser"
import { supabase } from "@/lib/supabase/client"
import type { ParsedTask } from "@/lib/types"

interface CSVImportProps {
  userId: string
  onImportComplete: () => void
}

interface CSVTask {
  originalText: string
  parsed: ParsedTask
  isValid: boolean
  error?: string
}

export default function CSVImport({ userId, onImportComplete }: CSVImportProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [csvTasks, setCsvTasks] = useState<CSVTask[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    console.log("[v0] CSV file upload started:", file.name, "Size:", file.size)

    if (!file.name.toLowerCase().endsWith(".csv")) {
      console.log("[v0] CSV upload failed: Invalid file type")
      alert("Please select a CSV file")
      return
    }

    console.log("[v0] CSV file type validation passed")
    setIsProcessing(true)
    try {
      console.log("[v0] Starting CSV text parsing")
      const text = await file.text()
      const lines = text.split("\n").filter((line) => line.trim())
      console.log("[v0] CSV parsed into", lines.length, "lines")

      // Skip header if it looks like one
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

        // Handle CSV parsing (simple comma-separated or quoted values)
        const taskText = line.includes(",")
          ? line.split(",")[0].replace(/^"(.*)"$/, "$1")
          : // Take first column, remove quotes
            line

        if (taskText && taskText.length > 2) {
          try {
            const parsed = parseTaskFromNaturalLanguage(taskText)
            tasks.push({
              originalText: taskText,
              parsed,
              isValid: true,
            })
          } catch (error) {
            console.log("[v0] Failed to parse task:", taskText, error)
            tasks.push({
              originalText: taskText,
              parsed: {} as ParsedTask,
              isValid: false,
              error: "Failed to parse task",
            })
          }
        }
      }

      console.log(
        "[v0] CSV processing complete. Valid tasks:",
        tasks.filter((t) => t.isValid).length,
        "Invalid tasks:",
        tasks.filter((t) => !t.isValid).length,
      )
      setCsvTasks(tasks)
      setIsOpen(true)
    } catch (error) {
      console.error("[v0] Error processing CSV:", error)
      alert("Error processing CSV file. Please check the format.")
    } finally {
      setIsProcessing(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleImport = async () => {
    const validTasks = csvTasks.filter((task) => task.isValid)
    if (validTasks.length === 0) return

    console.log("[v0] Starting CSV import for", validTasks.length, "tasks")
    setIsImporting(true)
    try {
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

      console.log("[v0] Inserting tasks into database:", tasksToInsert.length)
      const { error } = await supabase.from("tasks").insert(tasksToInsert)

      if (error) {
        console.log("[v0] Database insert error:", error)
        throw error
      }

      console.log("[v0] CSV import successful")
      // Success
      setIsOpen(false)
      setCsvTasks([])
      onImportComplete()
    } catch (error) {
      console.error("[v0] Error importing tasks:", error)
      alert("Error importing tasks. Please try again.")
    } finally {
      setIsImporting(false)
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

  const validTasksCount = csvTasks.filter((task) => task.isValid).length
  const invalidTasksCount = csvTasks.length - validTasksCount

  return (
    <>
      <div className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="flex items-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Import CSV
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={downloadSampleCSV}
          className="flex items-center gap-2 text-muted-foreground"
        >
          <Download className="h-4 w-4" />
          Sample CSV
        </Button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  CSV Import Preview
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} disabled={isImporting}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>{validTasksCount} valid tasks</span>
                </div>
                {invalidTasksCount > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
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
                  <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isImporting}>
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
