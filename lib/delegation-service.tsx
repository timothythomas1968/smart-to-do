import { supabase } from "./supabase/client"
import type { DelegatedTask, Task } from "./types"
import { sendEmail } from "./email-service"

export async function delegateTask(
  taskId: string,
  delegatedToEmail: string,
  delegationMessage?: string,
  userId?: string,
): Promise<{ success: boolean; message: string; delegation_id?: string }> {
  try {
    if (!userId) {
      return { success: false, message: "User authentication required for delegation" }
    }

    // Get the original task details
    const { data: originalTask, error: taskFetchError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", userId)
      .single()

    if (taskFetchError || !originalTask) {
      console.error("Error fetching original task:", taskFetchError)
      return { success: false, message: "Task not found or access denied" }
    }

    // Check if the delegated_to_email belongs to an existing Smart Tasks user
    const { data: recipientUser, error: userError } = await supabase
      .from("auth.users")
      .select("id, email")
      .eq("email", delegatedToEmail)
      .single()

    let recipientUserId = null
    let taskCopyId = null

    // If recipient is an existing user, create a copy of the task in their board
    if (!userError && recipientUser) {
      recipientUserId = recipientUser.id

      // Create a copy of the task for the recipient
      const { data: taskCopy, error: taskCopyError } = await supabase
        .from("tasks")
        .insert({
          user_id: recipientUserId,
          project_id: "default", // Add to their default project
          title: originalTask.title,
          description: originalTask.description,
          due_date: originalTask.due_date,
          priority: originalTask.priority,
          urgency: originalTask.urgency,
          subject: originalTask.subject,
          owner: originalTask.owner,
          status: "pending",
          original_text: `[Delegated from ${originalTask.owner || "someone"}] ${originalTask.original_text}`,
          attachments: originalTask.attachments,
          delegated_from_task_id: taskId,
          delegated_from_user_id: userId,
          delegation_message: delegationMessage,
        })
        .select()
        .single()

      if (taskCopyError) {
        console.error("Error creating task copy:", taskCopyError)
        return { success: false, message: "Failed to create task copy for recipient" }
      }

      taskCopyId = taskCopy.id
    }

    // Update the original task with delegation info
    const { error: taskUpdateError } = await supabase
      .from("tasks")
      .update({
        delegated_to_email: delegatedToEmail,
        delegated_by_user_id: userId,
        delegation_status: recipientUserId ? "delegated" : "pending",
        delegation_message: delegationMessage,
        delegated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .eq("user_id", userId)

    if (taskUpdateError) {
      console.error("Error updating task for delegation:", taskUpdateError)
      return { success: false, message: "Failed to update task for delegation" }
    }

    // Create delegation record
    const { data: delegation, error: delegationError } = await supabase
      .from("delegated_tasks")
      .insert({
        task_id: taskId,
        delegated_to_email: delegatedToEmail,
        delegated_to_user_id: recipientUserId,
        delegated_by_user_id: userId,
        message: delegationMessage,
      })
      .select()
      .single()

    if (delegationError) {
      console.error("Error creating delegation record:", delegationError)
      return { success: false, message: "Failed to create delegation record" }
    }

    // Send notification email
    try {
      const emailSubject = `Task Delegated: ${originalTask.title}`
      const emailBody = `
        <h2>You have been delegated a new task</h2>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${originalTask.title}</h3>
          ${originalTask.description ? `<p><strong>Description:</strong> ${originalTask.description}</p>` : ""}
          ${originalTask.due_date ? `<p><strong>Due Date:</strong> ${new Date(originalTask.due_date).toLocaleDateString()}</p>` : ""}
          ${originalTask.priority ? `<p><strong>Priority:</strong> ${originalTask.priority}</p>` : ""}
          ${originalTask.subject ? `<p><strong>Subject/Context:</strong> ${originalTask.subject}</p>` : ""}
          ${originalTask.owner ? `<p><strong>Delegated by:</strong> ${originalTask.owner}</p>` : ""}
        </div>
        
        ${delegationMessage ? `<p><strong>Message:</strong> ${delegationMessage}</p>` : ""}
        
        ${
          recipientUserId
            ? '<p>This task has been added to your Smart Tasks board. <a href="' +
              (process.env.NEXT_PUBLIC_SITE_URL || "https://your-app.vercel.app") +
              '">Sign in to view it</a>.</p>'
            : '<p>To manage this task, consider signing up for Smart Tasks at <a href="' +
              (process.env.NEXT_PUBLIC_SITE_URL || "https://your-app.vercel.app") +
              '">our platform</a>.</p>'
        }
        
        <p>Best regards,<br>Smart Tasks</p>
      `

      await sendEmail({
        to: delegatedToEmail,
        subject: emailSubject,
        html: emailBody,
      })
    } catch (emailError) {
      console.error("Error sending delegation email:", emailError)
      // Don't fail the delegation if email fails
    }

    const successMessage = recipientUserId
      ? `Task successfully delegated to ${delegatedToEmail} and added to their Smart Tasks board`
      : `Task successfully delegated to ${delegatedToEmail} via email`

    return {
      success: true,
      message: successMessage,
      delegation_id: delegation.id,
    }
  } catch (error) {
    console.error("Delegation service error:", error)
    return { success: false, message: "Failed to delegate task" }
  }
}

export async function respondToDelegation(
  delegationId: string,
  response: "accepted" | "declined",
  responseMessage?: string,
  userId?: string,
): Promise<{ success: boolean; message: string }> {
  try {
    if (!userId) {
      return { success: false, message: "User authentication required" }
    }

    // Update delegation record
    const { error: delegationError } = await supabase
      .from("delegated_tasks")
      .update({
        delegation_status: response,
        responded_at: new Date().toISOString(),
      })
      .eq("id", delegationId)
      .or(
        `delegated_to_user_id.eq.${userId},delegated_to_email.eq.(SELECT email FROM auth.users WHERE id = '${userId}')`,
      )

    if (delegationError) {
      console.error("Error updating delegation response:", delegationError)
      return { success: false, message: "Failed to update delegation response" }
    }

    // Update original task status
    const { error: taskError } = await supabase
      .from("tasks")
      .update({
        delegation_status: response,
      })
      .eq(
        "id",
        (await supabase.from("delegated_tasks").select("original_task_id").eq("id", delegationId).single()).data
          ?.original_task_id,
      )

    if (taskError) {
      console.error("Error updating task delegation status:", taskError)
    }

    return {
      success: true,
      message: `Delegation ${response} successfully`,
    }
  } catch (error) {
    console.error("Delegation response error:", error)
    return { success: false, message: "Failed to respond to delegation" }
  }
}

export async function getDelegatedTasks(userId: string): Promise<DelegatedTask[]> {
  try {
    const { data, error } = await supabase
      .from("delegated_tasks")
      .select(`
        *,
        task:original_task_id (*)
      `)
      .or(`delegated_by_user_id.eq.${userId},delegated_to_user_id.eq.${userId}`)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching delegated tasks:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Get delegated tasks error:", error)
    return []
  }
}

export async function getTasksDelegatedToMe(userEmail: string, userId?: string): Promise<Task[]> {
  try {
    // Get tasks delegated to this user's email
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("delegated_to_email", userEmail)
      .eq("delegation_status", "pending")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching tasks delegated to me:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Get tasks delegated to me error:", error)
    return []
  }
}

export async function getTasksDelegatedByMe(userId: string): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("delegated_by_user_id", userId)
      .neq("delegation_status", "none")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching tasks delegated by me:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Get tasks delegated by me error:", error)
    return []
  }
}
