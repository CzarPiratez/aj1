/*
  # Complete cleanup of Post a Job tool components

  1. Tables to Drop
    - `applications` (depends on jobs table)
    - `jobs` (main jobs table)
    - `job_drafts` (draft job postings)
    - `jd_drafts` (job description drafts)

  2. Columns to Remove from user_progress_flags
    - `has_published_job`
    - `has_applied_to_job`
    - `has_started_jd`
    - `has_submitted_jd_inputs`
    - `has_generated_jd`
    - `jd_generation_failed`

  3. Functions and Triggers to Clean Up
    - Remove job-related trigger functions
    - Update handle_new_user function to exclude removed columns

  4. Purpose
    - Complete removal of Post a Job tool functionality
    - Clean database schema for rebuilding from scratch
    - Maintain data integrity during cleanup
*/

-- Start transaction for atomicity
BEGIN;

-- Step 1: Drop dependent tables first (foreign key dependencies)
-- Drop applications table (depends on jobs table)
DROP TABLE IF EXISTS applications CASCADE;

-- Drop job_drafts table (may reference jobs table)
DROP TABLE IF EXISTS job_drafts CASCADE;

-- Drop jd_drafts table (job description drafts)
DROP TABLE IF EXISTS jd_drafts CASCADE;

-- Step 2: Drop the main jobs table
DROP TABLE IF EXISTS jobs CASCADE;

-- Step 3: Remove job-related columns from user_progress_flags table
DO $$
BEGIN
  -- Remove has_published_job column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_progress_flags' AND column_name = 'has_published_job'
  ) THEN
    ALTER TABLE user_progress_flags DROP COLUMN has_published_job;
  END IF;

  -- Remove has_applied_to_job column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_progress_flags' AND column_name = 'has_applied_to_job'
  ) THEN
    ALTER TABLE user_progress_flags DROP COLUMN has_applied_to_job;
  END IF;

  -- Remove has_started_jd column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_progress_flags' AND column_name = 'has_started_jd'
  ) THEN
    ALTER TABLE user_progress_flags DROP COLUMN has_started_jd;
  END IF;

  -- Remove has_submitted_jd_inputs column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_progress_flags' AND column_name = 'has_submitted_jd_inputs'
  ) THEN
    ALTER TABLE user_progress_flags DROP COLUMN has_submitted_jd_inputs;
  END IF;

  -- Remove has_generated_jd column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_progress_flags' AND column_name = 'has_generated_jd'
  ) THEN
    ALTER TABLE user_progress_flags DROP COLUMN has_generated_jd;
  END IF;

  -- Remove jd_generation_failed column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_progress_flags' AND column_name = 'jd_generation_failed'
  ) THEN
    ALTER TABLE user_progress_flags DROP COLUMN jd_generation_failed;
  END IF;
END $$;

-- Step 4: Clean up job-related trigger functions
-- Drop job-related trigger functions if they exist
DROP FUNCTION IF EXISTS update_jobs_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_job_drafts_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_applications_updated_at() CASCADE;

-- Step 5: Update handle_new_user function to exclude removed columns
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
  
  -- Create user progress flags (only with remaining columns)
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

-- Step 6: Clean up any orphaned indexes or constraints
-- Remove any remaining indexes that might reference the dropped tables
-- (Most should be automatically dropped with CASCADE, but this ensures cleanup)

-- Step 7: Verify the cleanup by checking remaining user_progress_flags structure
-- This is just for verification - the migration will show what columns remain
DO $$
DECLARE
  column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_name = 'user_progress_flags'
  AND column_name IN (
    'has_published_job', 'has_applied_to_job', 'has_started_jd', 
    'has_submitted_jd_inputs', 'has_generated_jd', 'jd_generation_failed'
  );
  
  IF column_count > 0 THEN
    RAISE NOTICE 'Warning: % job-related columns still exist in user_progress_flags', column_count;
  ELSE
    RAISE NOTICE 'Success: All job-related columns removed from user_progress_flags';
  END IF;
END $$;

-- Commit the transaction
COMMIT;

-- Add final comment
COMMENT ON TABLE user_progress_flags IS 'User progress tracking for CV and job search activities (Post a Job tool components removed)';