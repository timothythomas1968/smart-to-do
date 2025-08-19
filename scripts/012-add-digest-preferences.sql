-- Add digest preferences to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS digest_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS digest_time TEXT DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS digest_timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS digest_days_ahead INTEGER DEFAULT 5;

-- Update existing users to have digest disabled by default
UPDATE user_settings 
SET digest_enabled = false 
WHERE digest_enabled IS NULL;
