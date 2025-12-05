-- Migration: Add profile_complete column to users table
-- This column tracks whether a user has completed their profile setup (first_name, last_name)

-- Add profile_complete column if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN DEFAULT false;

-- Update existing users: mark as complete if they have both first_name and last_name
UPDATE users
SET profile_complete = true
WHERE first_name IS NOT NULL
  AND first_name != ''
  AND last_name IS NOT NULL
  AND last_name != '';

-- Add an index for faster lookups on profile_complete status
CREATE INDEX IF NOT EXISTS idx_users_profile_complete ON users(profile_complete);

-- Optional: Add a comment to the column for documentation
COMMENT ON COLUMN users.profile_complete IS 'Indicates whether the user has completed profile setup with first and last name';
