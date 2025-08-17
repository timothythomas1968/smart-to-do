-- Add project-specific settings to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Create index for project settings
CREATE INDEX IF NOT EXISTS idx_projects_settings ON projects USING GIN (settings);

-- Update existing projects with default settings
UPDATE projects 
SET settings = '{
  "background_image_url": null,
  "background_opacity": 50,
  "task_view": "all"
}'::jsonb
WHERE settings = '{}'::jsonb OR settings IS NULL;
