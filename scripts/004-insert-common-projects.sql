-- Insert common project types for new users
-- This will be used as templates when users create accounts

-- Function to create default projects for a user
CREATE OR REPLACE FUNCTION create_default_projects_for_user(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert Default List (already handled in previous script)
  INSERT INTO projects (name, description, color, is_default, user_id)
  VALUES ('Default List', 'General tasks and reminders', '#10b981', true, user_uuid)
  ON CONFLICT DO NOTHING;
  
  -- Insert Personal List
  INSERT INTO projects (name, description, color, is_default, user_id)
  VALUES ('Personal', 'Personal tasks and goals', '#3b82f6', false, user_uuid)
  ON CONFLICT DO NOTHING;
  
  -- Insert Work List
  INSERT INTO projects (name, description, color, is_default, user_id)
  VALUES ('Work', 'Professional tasks and projects', '#f59e0b', false, user_uuid)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;
