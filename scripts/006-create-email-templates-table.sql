-- Create email_templates table for user-specific email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_default ON email_templates(is_default);

-- Create updated_at trigger for email_templates
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default email templates for existing users
INSERT INTO email_templates (name, subject, body, is_default, user_id)
SELECT 'Task Assignment', 'Task Assignment: {{task_title}}', 
'Hello {{recipient_name}},

You have been assigned a new task:

**{{task_title}}**

{{task_description}}

Due Date: {{due_date}}
Priority: {{priority}}
Assigned by: {{owner}}

Please review and complete this task by the due date.

Best regards,
{{sender_name}}', true, id
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates WHERE user_id = auth.users.id AND name = 'Task Assignment'
);

INSERT INTO email_templates (name, subject, body, is_default, user_id)
SELECT 'Task Reminder', 'Reminder: {{task_title}}', 
'Hello {{recipient_name}},

This is a reminder about the following task:

**{{task_title}}**

{{task_description}}

Due Date: {{due_date}}
Priority: {{priority}}

Please ensure this task is completed on time.

Best regards,
{{sender_name}}', true, id
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates WHERE user_id = auth.users.id AND name = 'Task Reminder'
);

INSERT INTO email_templates (name, subject, body, is_default, user_id)
SELECT 'Task Update', 'Task Update: {{task_title}}', 
'Hello {{recipient_name}},

There has been an update to the following task:

**{{task_title}}**

{{task_description}}

Due Date: {{due_date}}
Priority: {{priority}}
Status: {{status}}

Please review the updated information.

Best regards,
{{sender_name}}', true, id
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates WHERE user_id = auth.users.id AND name = 'Task Update'
);
