/*
  # Phase 4: Update handle_new_user function for complete user initialization

  1. Updates
    - Ensure handle_new_user function correctly initializes user_progress_flags with all flags
    - Add comprehensive comments for better documentation
    - Improve error handling and conflict resolution

  2. Purpose
    - Ensure new users have all necessary database records created
    - Maintain data integrity with proper default values
    - Support all features including job publishing and applications
*/

-- Start transaction for atomicity
BEGIN;

-- Update handle_new_user function to ensure it correctly initializes all flags
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create user profile with metadata from auth
  INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    avatar_url, 
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = NOW();
  
  -- Create user preferences with defaults
  INSERT INTO public.user_preferences (
    user_id, 
    theme,
    language,
    notifications_enabled,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id, 
    'light',
    'en',
    true,
    NOW(), 
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create user progress flags with ALL flags set to false
  INSERT INTO public.user_progress_flags (
    user_id, 
    -- CV and job search flags
    has_uploaded_cv, 
    has_analyzed_cv, 
    has_selected_job, 
    has_written_cover_letter,
    -- JD generation flags
    has_started_jd,
    has_submitted_jd_inputs,
    has_generated_jd,
    jd_generation_failed,
    -- Publishing and application flags
    has_published_job,
    has_applied_to_job,
    -- Timestamps
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
    false, -- has_submitted_jd_inputs
    false, -- has_generated_jd
    false, -- jd_generation_failed
    false, -- has_published_job
    false, -- has_applied_to_job
    NOW(), -- created_at
    NOW()  -- updated_at
  )
  ON CONFLICT (user_id) DO UPDATE SET
    -- Only update if values are NULL (don't overwrite existing progress)
    has_uploaded_cv = COALESCE(user_progress_flags.has_uploaded_cv, false),
    has_analyzed_cv = COALESCE(user_progress_flags.has_analyzed_cv, false),
    has_selected_job = COALESCE(user_progress_flags.has_selected_job, false),
    has_written_cover_letter = COALESCE(user_progress_flags.has_written_cover_letter, false),
    has_started_jd = COALESCE(user_progress_flags.has_started_jd, false),
    has_submitted_jd_inputs = COALESCE(user_progress_flags.has_submitted_jd_inputs, false),
    has_generated_jd = COALESCE(user_progress_flags.has_generated_jd, false),
    jd_generation_failed = COALESCE(user_progress_flags.jd_generation_failed, false),
    has_published_job = COALESCE(user_progress_flags.has_published_job, false),
    has_applied_to_job = COALESCE(user_progress_flags.has_applied_to_job, false),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add comprehensive comments
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user profile, preferences, and progress flags when a new auth user is created';

-- Commit the transaction
COMMIT;