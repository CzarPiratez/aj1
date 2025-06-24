/*
  # Phase 1: Database Schema Refinement and Cleanup

  1. Schema Updates
    - Refine user_progress_flags table structure (user_id as primary key)
    - Ensure error_logs table has NOT NULL details column
    - Add JD-related progress flags
    - Standardize job_drafts table with draft_status

  2. Security
    - Maintain existing RLS policies
    - Update triggers and functions accordingly

  3. Performance
    - Optimize indexes for new structure
*/

-- Start transaction for atomicity
BEGIN;

-- Step 1: Refine user_progress_flags table structure
-- Create a temporary table with the refined structure including JD flags
CREATE TABLE user_progress_flags_new (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  has_uploaded_cv boolean NOT NULL DEFAULT false,
  has_analyzed_cv boolean NOT NULL DEFAULT false,
  has_selected_job boolean NOT NULL DEFAULT false,
  has_written_cover_letter boolean NOT NULL DEFAULT false,
  has_started_jd boolean NOT NULL DEFAULT false,
  has_submitted_jd_inputs boolean NOT NULL DEFAULT false,
  has_generated_jd boolean NOT NULL DEFAULT false,
  jd_generation_failed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Copy existing data from the old table to the new table
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

-- Drop the old table
DROP TABLE user_progress_flags CASCADE;

-- Rename the new table
ALTER TABLE user_progress_flags_new RENAME TO user_progress_flags;

-- Step 2: Ensure error_logs table has NOT NULL details column
-- Update any NULL details to empty string
UPDATE error_logs SET details = '' WHERE details IS NULL;

-- Make details column NOT NULL
ALTER TABLE error_logs ALTER COLUMN details SET NOT NULL;

-- Step 3: Ensure job_drafts table is properly structured
-- The table already exists with the correct structure from previous migrations
-- Just ensure draft_status is the primary workflow status column

-- Add comments for clarity
COMMENT ON TABLE job_drafts IS 'Draft job postings that users can work on before publishing to the jobs table';
COMMENT ON COLUMN job_drafts.draft_status IS 'Current status of the draft: draft, review, ready, archived';
COMMENT ON COLUMN job_drafts.ai_generated IS 'Whether AI assistance was used in creating this draft';
COMMENT ON COLUMN job_drafts.generation_metadata IS 'Metadata about AI generation process and parameters used';
COMMENT ON COLUMN job_drafts.last_edited_at IS 'Timestamp of when the draft was last modified by the user';

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_progress_flags_user_id ON user_progress_flags USING btree (user_id);

-- Step 5: Enable Row Level Security and recreate policies
ALTER TABLE user_progress_flags ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies for user_progress_flags
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

-- Step 6: Recreate trigger for updated_at
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

-- Step 7: Update handle_new_user function to work with refined table
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
  
  -- Create user progress flags with all JD-related flags
  INSERT INTO public.user_progress_flags (
    user_id, 
    has_uploaded_cv, 
    has_analyzed_cv, 
    has_selected_job, 
    has_written_cover_letter,
    has_started_jd,
    has_submitted_jd_inputs,
    has_generated_jd,
    jd_generation_failed,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id, 
    false, 
    false, 
    false, 
    false,
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

-- Add helpful comments
COMMENT ON TABLE user_progress_flags IS 'User progress tracking for CV and job search activities (refined structure with JD generation flags)';
COMMENT ON COLUMN user_progress_flags.user_id IS 'Primary key - references users table';
COMMENT ON COLUMN user_progress_flags.has_uploaded_cv IS 'Whether user has uploaded their CV';
COMMENT ON COLUMN user_progress_flags.has_analyzed_cv IS 'Whether user has analyzed their CV with AI';
COMMENT ON COLUMN user_progress_flags.has_selected_job IS 'Whether user has selected a job to apply for';
COMMENT ON COLUMN user_progress_flags.has_written_cover_letter IS 'Whether user has written a cover letter';
COMMENT ON COLUMN user_progress_flags.has_started_jd IS 'Whether user has started job description creation process';
COMMENT ON COLUMN user_progress_flags.has_submitted_jd_inputs IS 'Whether user has provided input for JD generation';
COMMENT ON COLUMN user_progress_flags.has_generated_jd IS 'Whether user has successfully generated a job description';
COMMENT ON COLUMN user_progress_flags.jd_generation_failed IS 'Whether JD generation has failed for retry functionality';

-- Commit the transaction
COMMIT;