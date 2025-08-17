-- Add attachments column to tasks table for file attachment support
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Add index for better performance when querying attachments
CREATE INDEX IF NOT EXISTS idx_tasks_attachments ON tasks USING gin (attachments);

-- Add comment for documentation
COMMENT ON COLUMN tasks.attachments IS 'JSON array of file attachments associated with the task';
