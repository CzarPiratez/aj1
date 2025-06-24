/*
  # Refine user_progress_flags table structure

  1. Table Structure Changes
    - Remove redundant `id` column from `user_progress_flags` table
    - Ensure `user_id` serves as the sole primary key
    - Maintain all existing functionality and data integrity

  2. Data Preservation
    - Preserve all existing user progress data during migration
    - Ensure no data loss during the structural changes

  3. Constraints and Indexes
    - Update primary key constraint to use `user_id` only
    - Maintain foreign key relationship to users table
    - Preserve all existing indexes and RLS policies

  4. Security
    - Maintain existing RLS policies
    - Ensure data access patterns remain unchanged
*/

-- Start transaction for atomicity
BEGIN;

-- Step 1: Create a temporary table with the refined structure
CREATE TABLE user_progress_flags_new (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  has_uploaded_cv boolean NOT NULL DEFAULT false,
  has_analyzed_cv boolean NOT NULL DEFAULT false,
  has_selected_job boolean NOT NULL DEFAULT false,
  has_written_cover_letter boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Step 2: Copy all existing data from the old table to the new table
INSERT INTO user_progress_flags_new (
  user_id,
  has_uploaded_cv,
  has_analyzed_cv,
  has_selected_job,
  has_written_cover_letter,
  created_at,
  updated_at
)
SELECT 
  user_id,
  has_uploaded_cv,
  has_analyzed_cv,
  has_selected_job,
  has_written_cover_letter,
  created_at,
  updated_at
FROM user_progress_flags;

-- Step 3: Drop the old table (this will also drop all associated policies and triggers)
DROP TABLE user_progress_flags CASCADE;

-- Step 4: Rename the new table to the original name
ALTER TABLE user_progress_flags_new RENAME TO user_progress_flags;

-- Step 5: Create index for performance
CREATE INDEX idx_user_progress_flags_user_id ON user_progress_flags USING btree (user_id);

-- Step 6: Enable Row Level Security
ALTER TABLE user_progress_flags ENABLE ROW LEVEL SECURITY;

-- Step 7: Recreate RLS policies
CREATE POLICY "Users can insert own progress flags"
  ON user_progress_flags
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own progress flags"
  ON user_progress_flags
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own progress flags"
  ON user_progress_flags
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Step 8: Recreate the trigger function and trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_progress_flags_updated_at
  BEFORE UPDATE ON user_progress_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Update the handle_new_user function to work with the refined table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = NOW();
  
  -- Create user preferences
  INSERT INTO public.user_preferences (user_id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create user progress flags (using refined structure)
  INSERT INTO public.user_progress_flags (
    user_id, 
    has_uploaded_cv, 
    has_analyzed_cv, 
    has_selected_job, 
    has_written_cover_letter,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id, 
    false, 
    false, 
    false, 
    false,
    NOW(), 
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Add helpful comments
COMMENT ON TABLE user_progress_flags IS 'User progress tracking for CV and job search activities (refined structure with user_id as primary key)';
COMMENT ON COLUMN user_progress_flags.user_id IS 'Primary key - references users table';
COMMENT ON COLUMN user_progress_flags.has_uploaded_cv IS 'Whether user has uploaded their CV';
COMMENT ON COLUMN user_progress_flags.has_analyzed_cv IS 'Whether user has analyzed their CV with AI';
COMMENT ON COLUMN user_progress_flags.has_selected_job IS 'Whether user has selected a job to apply for';
COMMENT ON COLUMN user_progress_flags.has_written_cover_letter IS 'Whether user has written a cover letter';

-- Commit the transaction
COMMIT;