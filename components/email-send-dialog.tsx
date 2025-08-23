"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Send, AlertCircle, CheckCircle2, Users, X } from "lucide-react"
import type { Task, EmailTemplate } from "@/lib/types"
import {
  sendTaskEmail,
  sendTaskEmailToMultiple,
  getDefaultEmailTemplates,
  extractEmailsFromSubject,
  hasEmailsInSubject,
  getSubjectWithoutEmails,
} from "@/lib/email-service"

interface EmailSendDialogProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
}

export default function EmailSendDialog({ task, isOpen, onClose }: EmailSendDialogProps) {
  const [recipientEmail, setRecipientEmail] = useState("")
  const [additionalRecipients, setAdditionalRecipients] = useState<string[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [personalMessage, setPersonalMessage] = useState("")
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null)
  const [newRecipientEmail, setNewRecipientEmail] = useState("")

  useEffect(() => {
    if (isOpen && task) {
      loadEmailTemplates()
      setSendResult(null)
      setRecipientEmail("")
      setAdditionalRecipients([])
      setNewRecipientEmail("")
      setPersonalMessage("")

      const subjectEmails = extractEmailsFromSubject(task.subject)
      if (subjectEmails.length > 0) {
        setRecipientEmail(subjectEmails[0])
        setAdditionalRecipients(subjectEmails.slice(1))

        // Auto-select delegation template if Subject has emails
        const templates = getDefaultEmailTemplates()
        const delegationTemplate = templates.find((t) => t.id === "template-delegation")
        if (delegationTemplate) {
          setSelectedTemplateId(delegationTemplate.id)
        }
      }
    }
  }, [isOpen, task])

  const loadEmailTemplates = () => {
    try {
      const savedTemplates = localStorage.getItem("emailTemplates")
      if (savedTemplates) {
        setEmailTemplates(JSON.parse(savedTemplates))
        // Auto-select first template if no delegation template was set
        const templates = JSON.parse(savedTemplates)
        if (templates.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(templates[0].id)
        }
      } else {
        const defaultTemplates = getDefaultEmailTemplates().map((template, index) => ({
          ...template,
          is_default: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: "guest",
        }))
        setEmailTemplates(defaultTemplates)
        if (defaultTemplates.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(defaultTemplates[0].id)
        }
      }
    } catch (error) {
      console.error("Error loading email templates:", error)
      setEmailTemplates([])
    }
  }

  const addRecipient = () => {
    if (
      newRecipientEmail &&
      !additionalRecipients.includes(newRecipientEmail) &&
      newRecipientEmail !== recipientEmail
    ) {
      setAdditionalRecipients([...additionalRecipients, newRecipientEmail])
      setNewRecipientEmail("")
    }
  }

  const removeRecipient = (email: string) => {
    setAdditionalRecipients(additionalRecipients.filter((r) => r !== email))
  }

  const handleSendEmail = async () => {
    if (!task || !recipientEmail || !selectedTemplateId) return

    setIsSending(true)
    setSendResult(null)

    try {
      const allRecipients = [recipientEmail, ...additionalRecipients].filter(Boolean)

      let result: any
      if (allRecipients.length === 1) {
        result = await sendTaskEmail(allRecipients[0], selectedTemplateId, task, personalMessage)
      } else {
        result = await sendTaskEmailToMultiple(allRecipients, selectedTemplateId, task, personalMessage)
      }

      setSendResult(result)

      if (result.success) {
        setTimeout(() => {
          onClose()
        }, 2000)
      }
    } catch (error) {
      setSendResult({
        success: false,
        message: "Failed to send email. Please try again.",
      })
    } finally {
      setIsSending(false)
    }
  }

  const selectedTemplate = emailTemplates.find((t) => t.id === selectedTemplateId)
  const allRecipients = [recipientEmail, ...additionalRecipients].filter(Boolean)

  if (!task) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Task via Email
            {allRecipients.length > 1 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {allRecipients.length} recipients
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Preview */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="space-y-2">
                <h4 className="font-medium">{task.title}</h4>
                {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">{task.priority}</Badge>
                  {task.due_date && (
                    <Badge variant="outline">Due: {new Date(task.due_date).toLocaleDateString()}</Badge>
                  )}
                  {task.owner && <Badge variant="outline">Owner: {task.owner}</Badge>}
                  {task.subject && (
                    <Badge variant="outline">
                      Subject:{" "}
                      {hasEmailsInSubject(task.subject)
                        ? getSubjectWithoutEmails(task.subject) || "Email Recipients"
                        : task.subject}
                    </Badge>
                  )}
                  {hasEmailsInSubject(task.subject) &&
                    extractEmailsFromSubject(task.subject).map((email) => (
                      <Badge key={email} variant="secondary" className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {email}
                      </Badge>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="recipient">Primary Recipient Email</Label>
              <Input
                id="recipient"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="Enter recipient's email address"
                required
              />
            </div>

            <div>
              <Label>Additional Recipients</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={newRecipientEmail}
                    onChange={(e) => setNewRecipientEmail(e.target.value)}
                    placeholder="Add another recipient..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addRecipient()
                      }
                    }}
                  />
                  <Button type="button" onClick={addRecipient} variant="outline" size="sm">
                    Add
                  </Button>
                </div>

                {additionalRecipients.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {additionalRecipients.map((email) => (
                      <Badge key={email} variant="secondary" className="flex items-center gap-1">
                        {email}
                        <button
                          type="button"
                          onClick={() => removeRecipient(email)}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="template">Email Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an email template" />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        {template.name}
                        {template.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <Card className="bg-muted/30">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Subject: </span>
                      <span className="text-muted-foreground">{selectedTemplate.subject}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Preview of email template (variables will be replaced with actual task data)
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div>
              <Label htmlFor="personal-message">Personal Message (Optional)</Label>
              <Textarea
                id="personal-message"
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                placeholder="Add a personal message that will be included in the email..."
                rows={3}
              />
            </div>
          </div>

          {/* Send Result */}
          {sendResult && (
            <Card className={sendResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  {sendResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={sendResult.success ? "text-green-800" : "text-red-800"}>{sendResult.message}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={!recipientEmail || !selectedTemplateId || isSending}
            className="bg-primary hover:bg-primary/90"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send to {allRecipients.length} recipient{allRecipients.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { EmailSendDialog }
