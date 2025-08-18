-- Create projects table for user-specific project management
CREATE TABLE IF NOT EXISTS public.projects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text,
    is_default boolean DEFAULT false,
    settings jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create email_templates table for user-specific email templates
CREATE TABLE IF NOT EXISTS public.email_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user_custom_names table for user-specific subject names
CREATE TABLE IF NOT EXISTS public.user_custom_names (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    original_name text NOT NULL,
    custom_name text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, original_name)
);

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_names ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for projects
CREATE POLICY "Users can view their own projects" ON public.projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON public.projects
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for email_templates
CREATE POLICY "Users can view their own email templates" ON public.email_templates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email templates" ON public.email_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email templates" ON public.email_templates
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email templates" ON public.email_templates
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for user_custom_names
CREATE POLICY "Users can view their own custom names" ON public.user_custom_names
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom names" ON public.user_custom_names
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom names" ON public.user_custom_names
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom names" ON public.user_custom_names
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON public.email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_names_user_id ON public.user_custom_names(user_id);

-- Insert default projects for existing users
INSERT INTO public.projects (user_id, name, description, is_default, settings)
SELECT DISTINCT user_id, 'Default List', 'Default project for organizing tasks', true, '{}'
FROM public.tasks 
WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Insert default email templates for existing users
INSERT INTO public.email_templates (user_id, name, subject, body, is_default)
SELECT DISTINCT user_id, 'Task Assignment', 'Task Assignment: {{title}}', 'Hi,\n\nYou have been assigned a new task:\n\nTitle: {{title}}\nDescription: {{description}}\nDue Date: {{due_date}}\nPriority: {{priority}}\n\nBest regards', true
FROM public.tasks 
WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.email_templates (user_id, name, subject, body, is_default)
SELECT DISTINCT user_id, 'Task Reminder', 'Reminder: {{title}}', 'Hi,\n\nThis is a reminder about your task:\n\nTitle: {{title}}\nDescription: {{description}}\nDue Date: {{due_date}}\n\nPlease complete it at your earliest convenience.\n\nBest regards', true
FROM public.tasks 
WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.email_templates (user_id, name, subject, body, is_default)
SELECT DISTINCT user_id, 'Task Update', 'Task Update: {{title}}', 'Hi,\n\nThere has been an update to your task:\n\nTitle: {{title}}\nDescription: {{description}}\nStatus: {{status}}\n\nPlease review the changes.\n\nBest regards', true
FROM public.tasks 
WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;
