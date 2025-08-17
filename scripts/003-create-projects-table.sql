-- Create projects table for organizing tasks
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#10b981', -- emerald-500 as default
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_is_default ON projects(is_default);

-- Create updated_at trigger for projects
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default projects for existing users
INSERT INTO projects (name, description, is_default, user_id)
SELECT 'Default List', 'General tasks and reminders', true, id
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM projects WHERE user_id = auth.users.id AND is_default = true
);

-- Add project_id to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Create index for project_id
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);

-- Update existing tasks to use default project
UPDATE tasks 
SET project_id = (
  SELECT id FROM projects 
  WHERE user_id = tasks.user_id AND is_default = true 
  LIMIT 1
)
WHERE project_id IS NULL;
