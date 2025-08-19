import type { EmailRequest, EmailResponse, Task } from "./types"

export async function sendEmail(options: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  const response = await fetch("/api/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: options.to,
      subject: options.subject,
      html: options.html,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to send email: ${response.statusText}`)
  }
}

export async function sendTaskEmail(
  to: string,
  templateId: string,
  task: Task,
  personalMessage?: string,
): Promise<EmailResponse> {
  try {
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        template_id: templateId,
        task,
        personal_message: personalMessage,
      } as EmailRequest),
    })

    const result: EmailResponse = await response.json()
    return result
  } catch (error) {
    console.error("Email service error:", error)
    return {
      success: false,
      message: "Failed to send email",
    }
  }
}

export async function sendTaskEmailToMultiple(
  recipients: string[],
  templateId: string,
  task: Task,
  personalMessage?: string,
): Promise<EmailResponse> {
  try {
    const response = await fetch("/api/send-email-multiple", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipients,
        template_id: templateId,
        task,
        personal_message: personalMessage,
      }),
    })

    const result: EmailResponse = await response.json()
    return result
  } catch (error) {
    console.error("Email service error:", error)
    return {
      success: false,
      message: "Failed to send emails",
    }
  }
}

export function extractEmailsFromSubject(subject: string | null): string[] {
  if (!subject) return []

  // Regular expression to match email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  const matches = subject.match(emailRegex)

  return matches ? [...new Set(matches)] : [] // Remove duplicates
}

export function hasEmailsInSubject(subject: string | null): boolean {
  return extractEmailsFromSubject(subject).length > 0
}

export function getSubjectWithoutEmails(subject: string | null): string {
  if (!subject) return ""

  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  return subject.replace(emailRegex, "").replace(/\s+/g, " ").trim()
}

export function getDefaultEmailTemplates() {
  return [
    {
      id: "template-assignment",
      name: "Task Assignment",
      subject: "New Task Assigned: {{task_title}}",
      body: `Hi there,

You have been assigned a new task:

**Task:** {{task_title}}
**Description:** {{task_description}}
**Due Date:** {{due_date}}
**Priority:** {{priority}}
**Assigned by:** {{owner}}

{{personal_message}}

Please let me know if you have any questions.

Best regards,
Smart Tasks`,
    },
    {
      id: "template-reminder",
      name: "Task Reminder",
      subject: "Reminder: {{task_title}} - Due {{due_date}}",
      body: `Hi there,

This is a friendly reminder about the following task:

**Task:** {{task_title}}
**Description:** {{task_description}}
**Due Date:** {{due_date}}
**Priority:** {{priority}}

{{personal_message}}

Please complete this task by the due date.

Best regards,
Smart Tasks`,
    },
    {
      id: "template-update",
      name: "Task Update",
      subject: "Task Updated: {{task_title}}",
      body: `Hi there,

The following task has been updated:

**Task:** {{task_title}}
**Description:** {{task_description}}
**Due Date:** {{due_date}}
**Priority:** {{priority}}
**Updated by:** {{owner}}

{{personal_message}}

Please review the changes.

Best regards,
Smart Tasks`,
    },
    {
      id: "template-delegation",
      name: "Task Delegation",
      subject: "Task Delegated: {{task_title}}",
      body: `Hi there,

A task has been delegated to you:

**Task:** {{task_title}}
**Description:** {{task_description}}
**Due Date:** {{due_date}}
**Priority:** {{priority}}
**Delegated by:** {{owner}}
**Subject/Context:** {{subject}}

{{personal_message}}

Please confirm receipt and let me know if you need any clarification.

Best regards,
Smart Tasks`,
    },
  ]
}

export async function sendDelegationEmail(to: string, taskId: string, message?: string): Promise<EmailResponse> {
  try {
    // Get task details for the email
    const response = await fetch(`/api/tasks/${taskId}`)
    const task = await response.json()

    const delegationTemplate = getDefaultEmailTemplates().find((t) => t.id === "template-delegation")
    if (!delegationTemplate) {
      throw new Error("Delegation email template not found")
    }

    // Use the existing sendTaskEmail function with delegation template
    return await sendTaskEmail(to, "template-delegation", task, message)
  } catch (error) {
    console.error("Delegation email service error:", error)
    return {
      success: false,
      message: "Failed to send delegation email",
    }
  }
}
