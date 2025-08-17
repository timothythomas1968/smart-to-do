"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, File, X, Paperclip } from "lucide-react"
import type { FileAttachment } from "@/lib/types"

interface FileAttachmentZoneProps {
  attachments: FileAttachment[]
  onAttachmentsChange: (attachments: FileAttachment[]) => void
  className?: string
}

export default function FileAttachmentZone({
  attachments,
  onAttachmentsChange,
  className = "",
}: FileAttachmentZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }, [])

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return

    setIsUploading(true)

    try {
      const newAttachments: FileAttachment[] = []

      for (const file of files) {
        // Create a blob URL for the file (in a real app, you'd upload to a server)
        const url = URL.createObjectURL(file)

        const attachment: FileAttachment = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: url,
          uploadedAt: new Date().toISOString(),
        }

        newAttachments.push(attachment)
      }

      onAttachmentsChange([...attachments, ...newAttachments])
    } catch (error) {
      console.error("[v0] Error handling files:", error)
    } finally {
      setIsUploading(false)
    }
  }

  const removeAttachment = (id: string) => {
    const updatedAttachments = attachments.filter((att) => att.id !== id)
    onAttachmentsChange(updatedAttachments)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Drop Zone */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <div className="p-2 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="p-1.5 rounded-full bg-muted">
              {isUploading ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
              ) : (
                <Upload className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
            <div className="text-left">
              <p className="text-xs font-medium">{isUploading ? "Uploading..." : "Drop files"}</p>
              <p className="text-xs text-muted-foreground">or click</p>
            </div>
          </div>
        </div>
      </Card>

      <input id="file-input" type="file" multiple className="hidden" onChange={handleFileSelect} accept="*/*" />

      {/* Attached Files */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Paperclip className="h-4 w-4" />
            Attachments ({attachments.length})
          </div>

          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attachment.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.size)} • {new Date(attachment.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {attachment.type.split("/")[0] || "file"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeAttachment(attachment.id)
                    }}
                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
