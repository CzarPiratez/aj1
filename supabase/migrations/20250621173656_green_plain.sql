/*
  # Add JD Generation Failed Flag

  1. Changes
    - Add `jd_generation_failed` column to `user_progress_flags` table
    - This flag tracks when JD generation fails so we can offer retry options
    - Default value is false
    - Includes proper indexing for performance

  2. Security
    - No changes to RLS policies needed
    - Uses existing table structure and permissions
*/

-- Add jd_generation_failed flag to user_progress_flags table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_progress_flags' AND column_name = 'jd_generation_failed'
  ) THEN
    ALTER TABLE user_progress_flags 
    ADD COLUMN jd_generation_failed boolean DEFAULT false NOT NULL;
  END IF;
END $$;