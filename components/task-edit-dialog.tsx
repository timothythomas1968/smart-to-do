"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Mail } from "lucide-react"
import { format } from "date-fns"
import type { Task, FileAttachment } from "@/lib/types"
import { parseTask } from "@/lib/nlp-parser"
import FileAttachmentZone from "@/components/file-attachment-zone"
import EmailSendDialog from "@/components/email-send-dialog"

interface TaskEditDialogProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedTask: Task) => void
}

export default function TaskEditDialog({ task, isOpen, onClose, onSave }: TaskEditDialogProps) {
  const [editedTask, setEditedTask] = useState<Task | null>(null)
  const [isNLPMode, setIsNLPMode] = useState(false)
  const [nlpInput, setNlpInput] = useState("")
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [showEmailDialog, setShowEmailDialog] = useState(false)

  useEffect(() => {
    if (task) {
      setEditedTask({ ...task })
      setNlpInput(task.description || task.title)
      setIsNLPMode(false)
      setAttachments(task.attachments || [])
    }
  }, [task])

  const handleSave = () => {
    if (!editedTask) return
    onSave({ ...editedTask, attachments })
    onClose()
  }

  const handleNLPParse = () => {
    if (!nlpInput.trim() || !editedTask) return

    const parsed = parseTask(nlpInput, editedTask.user_id || undefined)
    setEditedTask({
      ...editedTask,
      title: parsed.title,
      description: parsed.description,
      due_date: parsed.due_date,
      priority: parsed.priority,
      is_urgent: parsed.is_urgent,
      owner: parsed.owner,
      subject: parsed.subject,
    })
  }

  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return ""
    return format(new Date(dateString), "yyyy-MM-dd")
  }

  const handleDateChange = (dateString: string) => {
    if (!editedTask) return
    const date = dateString ? new Date(dateString + "T12:00:00.000Z") : null
    setEditedTask({
      ...editedTask,
      due_date: date ? date.toISOString() : null,
    })
  }

  if (!editedTask) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* NLP Mode Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="nlp-mode"
                checked={isNLPMode}
                onCheckedChange={(checked) => setIsNLPMode(checked as boolean)}
              />
              <Label htmlFor="nlp-mode" className="text-sm font-medium">
                Smart parsing mode (automatically extract details from description)
              </Label>
            </div>

            {isNLPMode ? (
              /* NLP Mode */
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nlp-input">Task Description (Natural Language)</Label>
                  <Textarea
                    id="nlp-input"
                    value={nlpInput}
                    onChange={(e) => setNlpInput(e.target.value)}
                    placeholder="e.g., 'Ask Emily to review the report by Friday P1 - urgent'"
                    className="min-h-[100px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleNLPParse}
                    className="mt-2 bg-transparent"
                  >
                    Parse & Extract Details
                  </Button>
                </div>
              </div>
            ) : (
              /* Manual Mode */
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={editedTask.title}
                    onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                    placeholder="Task title"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editedTask.description || ""}
                    onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                    placeholder="Task description"
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            )}

            {/* Common Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={editedTask.priority}
                  onValueChange={(value) => setEditedTask({ ...editedTask, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P1">P1 (Highest)</SelectItem>
                    <SelectItem value="P2">P2 (High)</SelectItem>
                    <SelectItem value="P3">P3 (Medium)</SelectItem>
                    <SelectItem value="P4">P4 (Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={formatDateForInput(editedTask.due_date)}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="owner">Owner</Label>
                <Input
                  id="owner"
                  value={editedTask.owner || ""}
                  onChange={(e) => setEditedTask({ ...editedTask, owner: e.target.value })}
                  placeholder="Who is responsible?"
                />
              </div>

              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={editedTask.subject || ""}
                  onChange={(e) => setEditedTask({ ...editedTask, subject: e.target.value })}
                  placeholder="Who/what is this about?"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="urgent"
                checked={editedTask.is_urgent}
                onCheckedChange={(checked) => setEditedTask({ ...editedTask, is_urgent: checked as boolean })}
              />
              <Label htmlFor="urgent" className="text-sm font-medium">
                Mark as urgent
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="completed"
                checked={editedTask.is_completed}
                onCheckedChange={(checked) => setEditedTask({ ...editedTask, is_completed: checked as boolean })}
              />
              <Label htmlFor="completed" className="text-sm font-medium">
                Mark as completed
              </Label>
            </div>

            {/* File Attachment Zone */}
            <div>
              <Label className="text-sm font-medium mb-3 block">File Attachments</Label>
              <FileAttachmentZone attachments={attachments} onAttachmentsChange={setAttachments} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(true)} className="bg-transparent">
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmailSendDialog task={editedTask} isOpen={showEmailDialog} onClose={() => setShowEmailDialog(false)} />
    </>
  )
}

export { TaskEditDialog }
