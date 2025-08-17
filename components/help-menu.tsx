"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HelpCircle, Book, Zap, Settings, Calendar, FileText, Users, Palette, Mail, Clipboard } from "lucide-react"

export default function HelpMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const helpSections = [
    {
      id: "getting-started",
      title: "Getting Started Guide",
      icon: Book,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Welcome to Smart Tasks!</h3>
            <p className="text-muted-foreground mb-4">
              Smart Tasks is an intelligent to-do list application that understands natural language and helps you
              organize your work across multiple projects.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Quick Start Steps:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Create your first project or use the default "Default List"</li>
              <li>Type a task naturally: "Meet with John tomorrow at 2pm"</li>
              <li>Press Enter to add the task - Smart Tasks will automatically parse dates, people, and priorities</li>
              <li>Use the view selector to see tasks by Today, Upcoming, or Calendar view</li>
              <li>Customize your workspace with backgrounds and transparency in Settings</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Natural Language Examples:</h4>
            <div className="bg-muted p-3 rounded-md text-sm space-y-1">
              <div>"Call Sarah about the project by Friday" → Assigns to Sarah, due Friday</div>
              <div>"I need to review the budget tomorrow" → Assigns to you, due tomorrow</div>
              <div>"Team meeting next Monday at 10am" → Scheduled for next Monday</div>
              <div>"High priority: Fix the server issue" → Marked as high priority</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "features",
      title: "Feature Overview",
      icon: Zap,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-500" />
                <h4 className="font-semibold">Smart Assignment</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Automatically detects who should do what from natural language descriptions.
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-green-500" />
                <h4 className="font-semibold">Date Recognition</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Understands dates like "tomorrow", "next Friday", "in 2 weeks".
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-purple-500" />
                <h4 className="font-semibold">File Attachments</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Drag and drop files directly into tasks for easy reference.
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="h-4 w-4 text-orange-500" />
                <h4 className="font-semibold">Project Customization</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Each project can have its own background and visual settings.
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-red-500" />
                <h4 className="font-semibold">Email Integration</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Send tasks via email with customizable templates and automatic formatting.
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clipboard className="h-4 w-4 text-teal-500" />
                <h4 className="font-semibold">Meeting Agendas</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Generate professional meeting agendas with task search and clipboard copy functionality.
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">View Modes:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Today</span>
                <span className="text-muted-foreground">Tasks due today</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Upcoming</span>
                <span className="text-muted-foreground">Future tasks and deadlines</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Calendar</span>
                <span className="text-muted-foreground">Monthly calendar view</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Table</span>
                <span className="text-muted-foreground">Detailed spreadsheet-like view</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">List</span>
                <span className="text-muted-foreground">Simple task list view</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Meeting Agenda</span>
                <span className="text-muted-foreground">Generate professional meeting agendas</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "meeting-agenda",
      title: "Meeting Agenda Guide",
      icon: Clipboard,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Meeting Agenda Feature</h3>
            <p className="text-muted-foreground mb-4">
              Create professional meeting agendas by searching your tasks and generating formatted agendas that can be
              copied to your clipboard for easy sharing via email or other platforms.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-3">How to Access Meeting Agenda:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Select the view dropdown in the main task dashboard</li>
              <li>Choose "Meeting Agenda" from the list of available views</li>
              <li>The Meeting Agenda interface will load with search and agenda generation tools</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Setting Up Your Meeting:</h4>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h5 className="font-medium">Meeting Date</h5>
                <p className="text-sm text-muted-foreground mt-1">
                  Use the date picker to select when your meeting will take place. This appears in the generated agenda
                  header.
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h5 className="font-medium">Attendees</h5>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter attendee names separated by commas (e.g., "John Doe, Jane Smith, Mike Johnson"). These will be
                  listed in the agenda.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Task Search Functionality:</h4>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                The search feature allows you to find relevant tasks for your meeting agenda by searching across all
                task fields:
              </p>
              <div className="bg-muted p-3 rounded-md text-sm space-y-2">
                <div>
                  <strong>Search Examples:</strong>
                </div>
                <div>• "Mala" - Finds all tasks mentioning Mala in title, description, owner, or subject</div>
                <div>• "budget" - Finds tasks related to budget planning or review</div>
                <div>• "client" - Shows all client-related tasks and communications</div>
                <div>• "design" - Displays design tasks, reviews, and deliverables</div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Generated Agenda Format:</h4>
            <p className="text-sm text-muted-foreground mb-3">
              The agenda automatically organizes your search results into a professional format:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Header Section</span>
                <span className="text-muted-foreground">Meeting date, project name, attendees</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Pending Items</span>
                <span className="text-muted-foreground">Incomplete tasks with details and priorities</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Completed Items</span>
                <span className="text-muted-foreground">Finished tasks for status updates</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Task Details</span>
                <span className="text-muted-foreground">Description, owner, due date, priority level</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Copying to Clipboard:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Enter your search criteria to find relevant tasks</li>
              <li>Review the agenda preview to ensure it includes the right information</li>
              <li>Click the "Copy Agenda" button to copy the formatted text to your clipboard</li>
              <li>Paste the agenda into your email, document, or meeting platform</li>
              <li>The button will show "Copied!" confirmation for 2 seconds</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Best Practices:</h4>
            <div className="bg-blue-50 p-4 rounded-lg">
              <ul className="text-sm text-blue-800 space-y-1">
                <li>Use specific search terms to find the most relevant tasks</li>
                <li>Include both pending and completed items for comprehensive status updates</li>
                <li>Add attendee names to ensure everyone knows who should be present</li>
                <li>Set the correct meeting date for proper agenda formatting</li>
                <li>Review the preview before copying to ensure all important items are included</li>
                <li>Search by person names (e.g., "Sarah") to create person-specific agenda items</li>
              </ul>
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <h4 className="font-semibold text-amber-900 mb-2">Pro Tip:</h4>
            <p className="text-sm text-amber-800">
              The Meeting Agenda view searches across your current project's tasks. Switch projects first if you need to
              create an agenda for a different project's tasks.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "email-features",
      title: "Email Features Guide",
      icon: Mail,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Email Integration</h3>
            <p className="text-muted-foreground mb-4">
              Smart Tasks includes powerful email functionality to send task assignments and notifications to team
              members using customizable templates.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-3">How to Send Task Emails:</h4>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h5 className="font-medium">During Task Creation</h5>
                <p className="text-sm text-muted-foreground mt-1">
                  After creating a task, click the "Send Email" button that appears to immediately notify someone about
                  the new task.
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h5 className="font-medium">From Task Editing</h5>
                <p className="text-sm text-muted-foreground mt-1">
                  When editing any task, click the "Send Email" button in the dialog footer to send updates or
                  reminders.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Email Templates:</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Smart Tasks comes with three built-in templates that you can customize or create new ones:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Task Assignment</span>
                <span className="text-muted-foreground">For assigning new tasks to team members</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Task Reminder</span>
                <span className="text-muted-foreground">For sending deadline reminders</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Task Update</span>
                <span className="text-muted-foreground">For notifying about task changes</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Managing Email Templates:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Go to Settings → Email Templates</li>
              <li>Click "New" to create a custom template</li>
              <li>Use variables like task_title, due_date, priority in your templates</li>
              <li>Edit existing templates by clicking the edit icon</li>
              <li>Default templates cannot be deleted but can be modified</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Template Variables:</h4>
            <div className="bg-muted p-3 rounded-md text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <code>task_title</code> - Task name
                </div>
                <div>
                  <code>task_description</code> - Task details
                </div>
                <div>
                  <code>due_date</code> - Formatted due date
                </div>
                <div>
                  <code>priority</code> - Task priority (P1-P4)
                </div>
                <div>
                  <code>owner</code> - Task assignee
                </div>
                <div>
                  <code>personal_message</code> - Your custom message
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <h4 className="font-semibold text-amber-900 mb-2">Setup Required:</h4>
            <p className="text-sm text-amber-800">
              To use email features, you need to add RESEND_API_KEY to your environment variables. Resend offers 3,000
              free emails per month, making it perfect for task notifications.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "tutorial",
      title: "Step-by-Step Tutorial",
      icon: Settings,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Complete Tutorial</h3>
          </div>

          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold">Step 1: Create a Project</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Click the project selector dropdown and choose "Create New Project". Give it a name like "Work Tasks" or
                "Personal".
              </p>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold">Step 2: Add Your First Task</h4>
              <p className="text-sm text-muted-foreground mt-1">
                In the task input box, type something like "Call the dentist tomorrow at 2pm" and press Enter.
              </p>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-semibold">Step 3: Try Natural Language</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Add tasks like "Sarah should review the proposal by Friday" or "High priority: Fix the bug".
              </p>
            </div>

            <div className="border-l-4 border-orange-500 pl-4">
              <h4 className="font-semibold">Step 4: Explore Views</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Use the view selector to switch between Today, Upcoming, Calendar, Table, List, and Meeting Agenda
                views.
              </p>
            </div>

            <div className="border-l-4 border-red-500 pl-4">
              <h4 className="font-semibold">Step 5: Customize Your Workspace</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Open Settings → View Settings to choose backgrounds, adjust transparency, and personalize your
                experience.
              </p>
            </div>

            <div className="border-l-4 border-teal-500 pl-4">
              <h4 className="font-semibold">Step 6: Manage People</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Go to Settings → Subject Names to add custom names that the app will recognize for task assignment.
              </p>
            </div>

            <div className="border-l-4 border-pink-500 pl-4">
              <h4 className="font-semibold">Step 7: Set Up Email Templates</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Visit Settings → Email Templates to customize how task notifications are sent to team members.
              </p>
            </div>

            <div className="border-l-4 border-indigo-500 pl-4">
              <h4 className="font-semibold">Step 8: Send Your First Task Email</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Create a task, then click "Send Email" to notify someone. Choose a template, enter their email, and add
                a personal message.
              </p>
            </div>

            <div className="border-l-4 border-cyan-500 pl-4">
              <h4 className="font-semibold">Step 9: Create a Meeting Agenda</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Switch to Meeting Agenda view, set a meeting date, add attendees, search for relevant tasks, and copy
                the formatted agenda to your clipboard.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Pro Tips:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>Use "I" in task descriptions - it automatically becomes "Me"</li>
              <li>Tasks without due dates get a default 5-day deadline (configurable)</li>
              <li>Drag files directly into the task input area to attach them</li>
              <li>Each project can have its own background and settings</li>
              <li>Email templates support variables for dynamic content</li>
              <li>Personal messages in emails are optional but add a human touch</li>
              <li>Meeting agendas search across your current project's tasks</li>
              <li>Use specific search terms in Meeting Agenda for better results</li>
            </ul>
          </div>
        </div>
      ),
    },
  ]

  const activeHelpSection = activeSection ? helpSections.find((s) => s.id === activeSection) : null
  const IconComponent = activeHelpSection?.icon

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="bg-white/80 backdrop-blur-sm border-white/20">
            <HelpCircle className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 z-[100]" sideOffset={5} style={{ zIndex: 100 }}>
          {helpSections.map((section) => (
            <DropdownMenuItem
              key={section.id}
              onClick={() => {
                setActiveSection(section.id)
                setIsOpen(true)
              }}
              className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
            >
              <section.icon className="h-4 w-4" />
              {section.title}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeHelpSection && (
                <>
                  {IconComponent && <IconComponent className="h-5 w-5" />}
                  {activeHelpSection.title}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="pr-4">{activeHelpSection?.content}</div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
