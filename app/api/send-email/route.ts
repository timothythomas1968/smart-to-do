import { type NextRequest, NextResponse } from "next/server"
import type { EmailRequest, EmailResponse } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const { to, template_id, task, personal_message }: EmailRequest = await request.json()

    console.log("[v0] Email request received:", { to, template_id, task: task?.title })

    // Check if Resend API key is available
    const resendApiKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.RESEND_FROM_EMAIL

    console.log("[v0] Environment check:", {
      hasApiKey: !!resendApiKey,
      hasFromEmail: !!fromEmail,
      fromEmail: fromEmail,
    })

    if (!resendApiKey) {
      return NextResponse.json<EmailResponse>(
        {
          success: false,
          message: "Email service not configured. Please add RESEND_API_KEY to environment variables.",
        },
        { status: 500 },
      )
    }

    if (!fromEmail) {
      return NextResponse.json<EmailResponse>(
        {
          success: false,
          message: "Email service not configured. Please add RESEND_FROM_EMAIL to environment variables.",
        },
        { status: 500 },
      )
    }

    // Get email templates from localStorage or database
    const templates = getEmailTemplates()
    const template = templates.find((t) => t.id === template_id)

    console.log("[v0] Template search:", { template_id, found: !!template, availableTemplates: templates.length })

    if (!template) {
      return NextResponse.json<EmailResponse>(
        {
          success: false,
          message: `Email template not found. Available templates: ${templates.map((t) => t.id).join(", ")}`,
        },
        { status: 404 },
      )
    }

    // Replace template variables
    const emailSubject = replaceTemplateVariables(template.subject, task, personal_message)
    const emailBody = replaceTemplateVariables(template.body, task, personal_message)

    console.log("[v0] Email content prepared:", { subject: emailSubject, bodyLength: emailBody.length })

    if (!to || !to.includes("@")) {
      return NextResponse.json<EmailResponse>(
        {
          success: false,
          message: "Invalid recipient email address",
        },
        { status: 400 },
      )
    }

    // Send email via Resend
    const emailPayload = {
      from: fromEmail,
      to: [to],
      subject: emailSubject,
      html: emailBody.replace(/\n/g, "<br>"),
      text: emailBody,
    }

    console.log("[v0] Sending email to Resend API:", { from: fromEmail, to, subject: emailSubject })

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    })

    const result = await response.json()

    console.log("[v0] Resend API response:", {
      status: response.status,
      ok: response.ok,
      result,
    })

    if (!response.ok) {
      console.error("[v0] Resend API error:", result)
      return NextResponse.json<EmailResponse>(
        {
          success: false,
          message: `Resend API error: ${result.message || JSON.stringify(result)}`,
        },
        { status: response.status },
      )
    }

    console.log("[v0] Email sent successfully:", result.id)

    return NextResponse.json<EmailResponse>({
      success: true,
      message: "Email sent successfully",
      email_id: result.id,
    })
  } catch (error) {
    console.error("[v0] Email sending error:", error)
    return NextResponse.json<EmailResponse>(
      {
        success: false,
        message: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}

function getEmailTemplates() {
  // In a real app, this would fetch from database
  // For now, return default templates with generated IDs
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

function replaceTemplateVariables(template: string, task: any, personalMessage?: string): string {
  return template
    .replace(/\{\{task_title\}\}/g, task.title || "Untitled Task")
    .replace(/\{\{task_description\}\}/g, task.description || "No description provided")
    .replace(/\{\{due_date\}\}/g, task.due_date ? new Date(task.due_date).toLocaleDateString() : "No due date")
    .replace(/\{\{priority\}\}/g, task.priority || "P3")
    .replace(/\{\{owner\}\}/g, task.owner || "Unknown")
    .replace(/\{\{personal_message\}\}/g, personalMessage || "")
    .replace(/\{\{sender_name\}\}/g, "Smart Tasks")
}
