import type { EmailRequest, EmailResponse, Task } from "./types"

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
  ]
}
