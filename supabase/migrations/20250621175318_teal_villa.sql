/*
  # Add status column to jd_drafts table

  1. Changes
    - Add status column to jd_drafts table with proper constraints
    - Add index for better performance
    - Update existing records to have 'pending' status

  2. Security
    - No changes to RLS policies needed
*/

-- Add status column to jd_drafts table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jd_drafts' AND column_name = 'status'
  ) THEN
    ALTER TABLE jd_drafts ADD COLUMN status text DEFAULT 'pending' NOT NULL;
  END IF;
END $$;

-- Add check constraint for status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'jd_drafts_status_check'
  ) THEN
    ALTER TABLE jd_drafts ADD CONSTRAINT jd_drafts_status_check 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed'));
  END IF;
END $$;

-- Create index for status column if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_jd_drafts_status ON jd_drafts USING btree (status);

-- Update any existing records without status to have 'pending' status
UPDATE jd_drafts SET status = 'pending' WHERE status IS NULL;