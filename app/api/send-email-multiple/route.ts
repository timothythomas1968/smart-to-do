import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { recipients, template_id, task, personal_message } = await request.json()

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ success: false, message: "Recipients are required" }, { status: 400 })
    }

    if (!template_id || !task) {
      return NextResponse.json({ success: false, message: "Template ID and task are required" }, { status: 400 })
    }

    // Get email template (you might want to fetch from database)
    const templates = [
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

    const template = templates.find((t) => t.id === template_id)
    if (!template) {
      return NextResponse.json({ success: false, message: "Template not found" }, { status: 404 })
    }

    // Replace template variables
    const replacements = {
      "{{task_title}}": task.title || "Untitled Task",
      "{{task_description}}": task.description || "No description provided",
      "{{due_date}}": task.due_date ? new Date(task.due_date).toLocaleDateString() : "No due date",
      "{{priority}}": task.priority || "P3",
      "{{owner}}": task.owner || "Unknown",
      "{{subject}}": task.subject || "No subject",
      "{{personal_message}}": personal_message ? `\n\n**Personal Message:**\n${personal_message}\n` : "",
    }

    let emailSubject = template.subject
    let emailBody = template.body

    Object.entries(replacements).forEach(([placeholder, value]) => {
      emailSubject = emailSubject.replace(new RegExp(placeholder, "g"), value)
      emailBody = emailBody.replace(new RegExp(placeholder, "g"), value)
    })

    // Send emails to all recipients
    const emailPromises = recipients.map(async (recipient: string) => {
      return resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "Smart Tasks <noreply@smarttasks.com>",
        to: recipient,
        subject: emailSubject,
        text: emailBody,
      })
    })

    const results = await Promise.allSettled(emailPromises)
    const successful = results.filter((result) => result.status === "fulfilled").length
    const failed = results.length - successful

    if (failed === 0) {
      return NextResponse.json({
        success: true,
        message: `Task sent successfully to ${successful} recipient${successful !== 1 ? "s" : ""}`,
      })
    } else if (successful > 0) {
      return NextResponse.json({
        success: true,
        message: `Task sent to ${successful} recipient${successful !== 1 ? "s" : ""}, ${failed} failed`,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to send task to any recipients",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Email sending error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to send emails",
      },
      { status: 500 },
    )
  }
}
