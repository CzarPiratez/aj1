/*
  # Add missing columns to user_progress_flags table
  
  1. Changes
     - Add `has_generated_jd` column to track when a job description has been successfully generated
     - Add `jd_generation_failed` column to track when JD generation has failed for retry functionality
  
  2. Purpose
     - Fix errors in the application related to missing columns
     - Enable proper tracking of JD generation status
*/

-- Add has_generated_jd column to user_progress_flags table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress_flags' 
    AND column_name = 'has_generated_jd'
  ) THEN
    ALTER TABLE public.user_progress_flags 
    ADD COLUMN has_generated_jd boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add jd_generation_failed column to user_progress_flags table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress_flags' 
    AND column_name = 'jd_generation_failed'
  ) THEN
    ALTER TABLE public.user_progress_flags 
    ADD COLUMN jd_generation_failed boolean NOT NULL DEFAULT false;
    
    -- Add comment to the column
    COMMENT ON COLUMN public.user_progress_flags.jd_generation_failed IS 'Flag to track if JD generation has failed for retry functionality';
  END IF;
END $$;