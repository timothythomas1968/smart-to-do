export interface Task {
  id: string
  title: string
  description?: string
  owner?: string
  subject?: string
  due_date?: string
  priority: "P1" | "P2" | "P3" | "P4"
  is_urgent: boolean
  is_completed: boolean
  created_at: string
  updated_at: string
  user_id: string
  project_id?: string
  attachments?: FileAttachment[]
  delegated_to_email?: string
  delegated_by_user_id?: string
  delegation_status?: "none" | "pending" | "accepted" | "declined"
  delegation_message?: string
  delegated_at?: string
}

export interface DelegatedTask {
  id: string
  original_task_id: string
  delegated_to_email: string
  delegated_by_user_id: string
  delegated_to_user_id?: string
  delegation_status: "pending" | "accepted" | "declined"
  delegation_message?: string
  delegated_at: string
  responded_at?: string
  created_at: string
  updated_at: string
  task?: Task // Populated when joining with tasks table
}

export interface UserSettings {
  id: string
  user_id: string
  background_image_url?: string
  background_opacity: number
  created_at: string
  updated_at: string
}

export interface ParsedTask {
  title: string
  description?: string
  owner?: string
  subject?: string
  due_date?: Date
  priority: "P1" | "P2" | "P3" | "P4"
  is_urgent: boolean
}

export interface FileAttachment {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadedAt: string
}

export interface ProjectSettings {
  background_image_url?: string
  background_opacity: number
  task_view: TaskView
  default_due_days?: number // Added configurable default due date setting
}

export interface Project {
  id: string
  name: string
  description?: string
  color: string
  is_default: boolean
  created_at: string
  updated_at: string
  user_id: string
  settings?: ProjectSettings
}

export type TaskView =
  | "all"
  | "today"
  | "upcoming"
  | "week"
  | "calendar" // Added calendar view option
  | "overdue"
  | "pending"
  | "completed"
  | "meeting-agenda"
  | "delegated"

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  is_default: boolean
  created_at: string
  updated_at: string
  user_id: string
}

export interface EmailRequest {
  to: string
  template_id: string
  task: Task
  personal_message?: string
}

export interface EmailResponse {
  success: boolean
  message: string
  email_id?: string
}

export interface DelegationRequest {
  task_id: string
  delegated_to_email: string
  delegation_message?: string
}

export interface DelegationResponse {
  delegation_id: string
  response: "accepted" | "declined"
  response_message?: string
}

export const DEFAULT_EMAIL_TEMPLATES = [
  {
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
{{sender_name}}`,
  },
  {
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
{{sender_name}}`,
  },
  {
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
{{sender_name}}`,
  },
] as const

export const COMMON_PROJECT_TYPES = [
  { name: "Default List", description: "General tasks and reminders", color: "#10b981" },
  { name: "Personal", description: "Personal tasks and goals", color: "#3b82f6" },
  { name: "Work", description: "Professional tasks and projects", color: "#f59e0b" },
  { name: "Shopping", description: "Shopping lists and errands", color: "#8b5cf6" },
  { name: "Health", description: "Health and fitness goals", color: "#ef4444" },
  { name: "Learning", description: "Educational and skill development", color: "#06b6d4" },
] as const

export interface MeetingAgenda {
  id: string
  meeting_date: string
  attendees: string[]
  search_query: string
  filtered_tasks: Task[]
  created_at: string
  updated_at: string
}
