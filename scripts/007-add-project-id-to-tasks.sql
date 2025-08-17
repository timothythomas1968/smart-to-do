-- Add project_id column to tasks table for multi-project support
-- Adding missing project_id column to tasks table

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS project_id TEXT DEFAULT 'default';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_project ON tasks(user_id, project_id);

-- Update existing tasks to have default project
UPDATE tasks 
SET project_id = 'default' 
WHERE project_id IS NULL;
