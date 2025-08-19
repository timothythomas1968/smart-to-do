-- Add delegation fields to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS delegated_to_email text,
ADD COLUMN IF NOT EXISTS delegated_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS delegated_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS delegation_status text DEFAULT 'none' CHECK (delegation_status IN ('none', 'pending', 'accepted', 'declined')),
ADD COLUMN IF NOT EXISTS delegation_message text,
ADD COLUMN IF NOT EXISTS delegated_at timestamp with time zone;

-- Create delegated_tasks table for cross-user task sharing
CREATE TABLE IF NOT EXISTS public.delegated_tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    original_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    delegated_to_email text NOT NULL,
    delegated_by_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    delegated_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    delegation_status text DEFAULT 'pending' CHECK (delegation_status IN ('pending', 'accepted', 'declined')),
    delegation_message text,
    delegated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on delegated_tasks table
ALTER TABLE public.delegated_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for delegated_tasks
CREATE POLICY "Users can view delegations they created" ON public.delegated_tasks
    FOR SELECT USING (auth.uid() = delegated_by_user_id);

CREATE POLICY "Users can view delegations sent to them" ON public.delegated_tasks
    FOR SELECT USING (
        auth.uid() = delegated_to_user_id OR 
        (SELECT email FROM auth.users WHERE id = auth.uid()) = delegated_to_email
    );

CREATE POLICY "Users can insert their own delegations" ON public.delegated_tasks
    FOR INSERT WITH CHECK (auth.uid() = delegated_by_user_id);

CREATE POLICY "Users can update delegations they created" ON public.delegated_tasks
    FOR UPDATE USING (auth.uid() = delegated_by_user_id);

CREATE POLICY "Delegated users can update delegation status" ON public.delegated_tasks
    FOR UPDATE USING (
        auth.uid() = delegated_to_user_id OR 
        (SELECT email FROM auth.users WHERE id = auth.uid()) = delegated_to_email
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_delegated_to_email ON public.tasks(delegated_to_email);
CREATE INDEX IF NOT EXISTS idx_tasks_delegated_by_user_id ON public.tasks(delegated_by_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_delegated_to_user_id ON public.tasks(delegated_to_user_id);
CREATE INDEX IF NOT EXISTS idx_delegated_tasks_original_task_id ON public.delegated_tasks(original_task_id);
CREATE INDEX IF NOT EXISTS idx_delegated_tasks_delegated_to_email ON public.delegated_tasks(delegated_to_email);
CREATE INDEX IF NOT EXISTS idx_delegated_tasks_delegated_by_user_id ON public.delegated_tasks(delegated_by_user_id);
CREATE INDEX IF NOT EXISTS idx_delegated_tasks_delegated_to_user_id ON public.delegated_tasks(delegated_to_user_id);

-- Create function to automatically link delegated tasks to users when they sign up
CREATE OR REPLACE FUNCTION link_delegated_tasks_to_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Update delegated_tasks table to link tasks to the new user
    UPDATE public.delegated_tasks 
    SET delegated_to_user_id = NEW.id
    WHERE delegated_to_email = NEW.email AND delegated_to_user_id IS NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically link delegated tasks when a user signs up
DROP TRIGGER IF EXISTS on_auth_user_created_link_delegations ON auth.users;
CREATE TRIGGER on_auth_user_created_link_delegations
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION link_delegated_tasks_to_new_user();
