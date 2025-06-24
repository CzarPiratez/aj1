/*
  # Update Job Schema for Post a Job Module

  1. Schema Updates
    - Remove outdated `jd_drafts` table
    - Update `job_drafts` table with new fields for AI-powered workflows
    - Update `jobs` table with new fields for publishing
    - Refine `user_progress_flags` to include only necessary flags
    - Add proper constraints and relationships

  2. Security
    - Ensure RLS policies are properly configured
    - Maintain data access security

  3. Performance
    - Add appropriate indexes for common query patterns
    - Optimize for AI-powered workflows
*/

-- Start transaction for atomicity
BEGIN;

-- ============================================================================
-- STEP 1: Drop outdated jd_drafts table
-- ============================================================================
DROP TABLE IF EXISTS jd_drafts CASCADE;

-- ============================================================================
-- STEP 2: Update job_drafts table with new fields
-- ============================================================================

-- Add new columns to job_drafts table
DO $$
BEGIN
  -- Add sections column (JSONB) to store structured JD content
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'job_drafts' AND column_name = 'sections'
  ) THEN
    ALTER TABLE job_drafts ADD COLUMN sections jsonb DEFAULT '{}';
    COMMENT ON COLUMN job_drafts.sections IS 'Structured job description sections in JSON format';
  END IF;

  -- Add section_order column (text[]) to maintain section display order
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'job_drafts' AND column_name = 'section_order'
  ) THEN
    ALTER TABLE job_drafts ADD COLUMN section_order text[] DEFAULT '{}';
    COMMENT ON COLUMN job_drafts.section_order IS 'Order of sections for display';
  END IF;

  -- Add metadata column (JSONB) for additional structured data
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'job_drafts' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE job_drafts ADD COLUMN metadata jsonb DEFAULT '{}';
    COMMENT ON COLUMN job_drafts.metadata IS 'Additional metadata for the job draft';
  END IF;

  -- Add ai_generation_method column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'job_drafts' AND column_name = 'ai_generation_method'
  ) THEN
    ALTER TABLE job_drafts ADD COLUMN ai_generation_method text;
    COMMENT ON COLUMN job_drafts.ai_generation_method IS 'Method used for AI generation: brief, upload, link';
  END IF;

  -- Add error_log column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'job_drafts' AND column_name = 'error_log'
  ) THEN
    ALTER TABLE job_drafts ADD COLUMN error_log text;
    COMMENT ON COLUMN job_drafts.error_log IS 'Error log for failed generation attempts';
  END IF;

  -- Add is_locked column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'job_drafts' AND column_name = 'is_locked'
  ) THEN
    ALTER TABLE job_drafts ADD COLUMN is_locked boolean DEFAULT false;
    COMMENT ON COLUMN job_drafts.is_locked IS 'Whether the draft is locked for editing';
  END IF;
END $$;

-- Create index for new columns
CREATE INDEX IF NOT EXISTS idx_job_drafts_is_locked ON job_drafts(is_locked);
CREATE INDEX IF NOT EXISTS idx_job_drafts_ai_generation_method ON job_drafts(ai_generation_method);

-- ============================================================================
-- STEP 3: Update jobs table with new fields
-- ============================================================================

-- Add new columns to jobs table
DO $$
BEGIN
  -- Add sections column (JSONB) to store structured JD content
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'sections'
  ) THEN
    ALTER TABLE jobs ADD COLUMN sections jsonb DEFAULT '{}';
    COMMENT ON COLUMN jobs.sections IS 'Structured job description sections in JSON format';
  END IF;

  -- Add section_order column (text[]) to maintain section display order
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'section_order'
  ) THEN
    ALTER TABLE jobs ADD COLUMN section_order text[] DEFAULT '{}';
    COMMENT ON COLUMN jobs.section_order IS 'Order of sections for display';
  END IF;

  -- Add public_token column for shareable links
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'public_token'
  ) THEN
    ALTER TABLE jobs ADD COLUMN public_token text;
    COMMENT ON COLUMN jobs.public_token IS 'Public token for shareable job links';
  END IF;

  -- Add application_method column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'application_method'
  ) THEN
    ALTER TABLE jobs ADD COLUMN application_method text DEFAULT 'external';
    COMMENT ON COLUMN jobs.application_method IS 'How to apply: external, email, platform';
  END IF;

  -- Add org_profile column (JSONB) for organization profile data
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'org_profile'
  ) THEN
    ALTER TABLE jobs ADD COLUMN org_profile jsonb DEFAULT '{}';
    COMMENT ON COLUMN jobs.org_profile IS 'Organization profile data in JSON format';
  END IF;
END $$;

-- Create index for new columns
CREATE INDEX IF NOT EXISTS idx_jobs_public_token ON jobs(public_token);
CREATE INDEX IF NOT EXISTS idx_jobs_application_method ON jobs(application_method);

-- ============================================================================
-- STEP 4: Ensure user_progress_flags has only necessary flags
-- ============================================================================

-- Ensure user_progress_flags has the necessary JD-related flags
DO $$
BEGIN
  -- Add has_started_jd column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress_flags' AND column_name = 'has_started_jd'
  ) THEN
    ALTER TABLE user_progress_flags ADD COLUMN has_started_jd boolean DEFAULT false NOT NULL;
    COMMENT ON COLUMN user_progress_flags.has_started_jd IS 'Whether user has started job description creation process';
  END IF;

  -- Add has_generated_jd column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress_flags' AND column_name = 'has_generated_jd'
  ) THEN
    ALTER TABLE user_progress_flags ADD COLUMN has_generated_jd boolean DEFAULT false NOT NULL;
    COMMENT ON COLUMN user_progress_flags.has_generated_jd IS 'Whether user has successfully generated a job description';
  END IF;

  -- Add has_published_job column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress_flags' AND column_name = 'has_published_job'
  ) THEN
    ALTER TABLE user_progress_flags ADD COLUMN has_published_job boolean DEFAULT false NOT NULL;
    COMMENT ON COLUMN user_progress_flags.has_published_job IS 'Whether user has published a job posting';
  END IF;

  -- Add jd_generation_failed column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress_flags' AND column_name = 'jd_generation_failed'
  ) THEN
    ALTER TABLE user_progress_flags ADD COLUMN jd_generation_failed boolean DEFAULT false NOT NULL;
    COMMENT ON COLUMN user_progress_flags.jd_generation_failed IS 'Whether JD generation has failed for retry functionality';
  END IF;

  -- Remove has_submitted_jd_inputs column if it exists (no longer needed)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress_flags' AND column_name = 'has_submitted_jd_inputs'
  ) THEN
    ALTER TABLE user_progress_flags DROP COLUMN has_submitted_jd_inputs;
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Update handle_new_user function to include new progress flags
-- ============================================================================

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
  
  -- Create user progress flags with updated flags
  INSERT INTO public.user_progress_flags (
    user_id, 
    has_uploaded_cv, 
    has_analyzed_cv, 
    has_selected_job, 
    has_written_cover_letter,
    has_started_jd,
    has_generated_jd,
    jd_generation_failed,
    has_published_job,
    has_applied_to_job,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id, 
    false, -- has_uploaded_cv
    false, -- has_analyzed_cv
    false, -- has_selected_job
    false, -- has_written_cover_letter
    false, -- has_started_jd
    false, -- has_generated_jd
    false, -- jd_generation_failed
    false, -- has_published_job
    false, -- has_applied_to_job
    NOW(), -- created_at
    NOW()  -- updated_at
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: Add helpful comments for documentation
-- ============================================================================

-- Update table comments
COMMENT ON TABLE job_drafts IS 'Draft job postings that users can work on before publishing to the jobs table';
COMMENT ON TABLE jobs IS 'Published job postings that are live and accepting applications';
COMMENT ON TABLE user_progress_flags IS 'User progress tracking for CV, job search, and job posting activities (complete with all workflow flags)';

-- Commit the transaction
COMMIT;