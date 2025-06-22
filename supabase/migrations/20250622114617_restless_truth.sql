/*
  # Clean up JD generation module

  1. Truncate jd_drafts table
     - Remove all existing draft data while keeping the table structure
  
  2. Reset user progress flags
     - Reset JD-related flags for all users
*/

-- Truncate jd_drafts table to remove all existing data
TRUNCATE TABLE public.jd_drafts;

-- Reset JD-related progress flags for all users
UPDATE public.user_progress_flags
SET 
  has_started_jd = false,
  has_submitted_jd_inputs = false,
  has_generated_jd = false,
  jd_generation_failed = false;

-- Add comment to explain the purpose of this migration
COMMENT ON TABLE public.jd_drafts IS 'Job description drafts and generation requests with multiple input modes - cleaned up for new implementation';