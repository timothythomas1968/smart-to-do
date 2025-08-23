"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { UserCheck, Send, AlertCircle, CheckCircle2 } from "lucide-react"
import type { Task } from "@/lib/types"
import { delegateTask } from "@/lib/delegation-service"
import { extractEmailsFromSubject } from "@/lib/email-service"

interface TaskDelegationDialogProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  userId?: string
  onDelegationComplete?: () => void
}

export default function TaskDelegationDialog({
  task,
  isOpen,
  onClose,
  userId,
  onDelegationComplete,
}: TaskDelegationDialogProps) {
  const [delegateToEmail, setDelegateToEmail] = useState("")
  const [delegationMessage, setDelegationMessage] = useState("")
  const [isDelegating, setIsDelegating] = useState(false)
  const [delegationResult, setDelegationResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleDelegate = async () => {
    if (!task || !delegateToEmail || !userId) return

    setIsDelegating(true)
    setDelegationResult(null)

    try {
      const result = await delegateTask(task.id, delegateToEmail, delegationMessage, userId)
      setDelegationResult(result)

      if (result.success) {
        onDelegationComplete?.()
        setTimeout(() => {
          onClose()
        }, 2000)
      }
    } catch (error) {
      setDelegationResult({
        success: false,
        message: "Failed to delegate task. Please try again.",
      })
    } finally {
      setIsDelegating(false)
    }
  }

  const handleDialogClose = () => {
    setDelegateToEmail("")
    setDelegationMessage("")
    setDelegationResult(null)
    onClose()
  }

  // Pre-fill email if Subject or Title contains email addresses
  const handleDialogOpen = () => {
    if (task?.subject || task?.title) {
      const textToCheck = task.subject || task.title || ""
      const emails = extractEmailsFromSubject(textToCheck)
      if (emails.length > 0) {
        setDelegateToEmail(emails[0])
      }
    }
  }

  if (!task) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose} onOpenAutoFocus={handleDialogOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Delegate Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Preview */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="space-y-2">
                <h4 className="font-medium">{task.title || task.subject || task.original_text || "No subject"}</h4>
                {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">{task.priority}</Badge>
                  {task.due_date && (
                    <Badge variant="outline">Due: {new Date(task.due_date).toLocaleDateString()}</Badge>
                  )}
                  {task.owner && <Badge variant="outline">Owner: {task.owner}</Badge>}
                  {task.subject && <Badge variant="outline">Subject: {task.subject}</Badge>}
                  {task.delegation_status && task.delegation_status !== "none" && (
                    <Badge variant="secondary">Status: {task.delegation_status}</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delegation Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="delegate-email">Delegate To (Email)</Label>
              <Input
                id="delegate-email"
                type="email"
                value={delegateToEmail}
                onChange={(e) => setDelegateToEmail(e.target.value)}
                placeholder="Enter email address of person to delegate to"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                The person will receive an email notification about the delegated task
              </p>
            </div>

            <div>
              <Label htmlFor="delegation-message">Delegation Message (Optional)</Label>
              <Textarea
                id="delegation-message"
                value={delegationMessage}
                onChange={(e) => setDelegationMessage(e.target.value)}
                placeholder="Add a message explaining the delegation, context, or special instructions..."
                rows={3}
              />
            </div>
          </div>

          {/* Delegation Result */}
          {delegationResult && (
            <Card className={delegationResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  {delegationResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={delegationResult.success ? "text-green-800" : "text-red-800"}>
                    {delegationResult.message}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleDialogClose} disabled={isDelegating}>
            Cancel
          </Button>
          <Button
            onClick={handleDelegate}
            disabled={!delegateToEmail || isDelegating}
            className="bg-primary hover:bg-primary/90"
          >
            {isDelegating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                Delegating...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Delegate Task
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { TaskDelegationDialog }
