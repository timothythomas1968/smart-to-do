-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);

-- Insert default projects for existing users
INSERT INTO public.projects (id, name, user_id)
SELECT 'default', 'Default List', id
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM public.projects WHERE user_id = auth.users.id AND id = 'default'
);

-- Insert common projects for existing users
INSERT INTO public.projects (id, name, user_id)
SELECT unnest(ARRAY['personal', 'work', 'shopping', 'health']), 
       unnest(ARRAY['Personal', 'Work', 'Shopping', 'Health & Fitness']),
       id
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM public.projects WHERE user_id = auth.users.id
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own projects" ON public.projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON public.projects
    FOR DELETE USING (auth.uid() = user_id);
