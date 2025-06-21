/*
  # Add status column to jd_drafts table

  1. Changes
    - Add `status` column to `jd_drafts` table with default value 'pending'
    - Add check constraint to ensure valid status values
    - Add index on status column for better query performance

  2. Security
    - No RLS changes needed as table already has RLS enabled
*/

-- Add status column to jd_drafts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jd_drafts' AND column_name = 'status'
  ) THEN
    ALTER TABLE jd_drafts ADD COLUMN status text DEFAULT 'pending'::text NOT NULL;
  END IF;
END $$;

-- Add check constraint for valid status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'jd_drafts_status_check'
  ) THEN
    ALTER TABLE jd_drafts ADD CONSTRAINT jd_drafts_status_check 
    CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text]));
  END IF;
END $$;

-- Add index on status column for better query performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'jd_drafts' AND indexname = 'idx_jd_drafts_status'
  ) THEN
    CREATE INDEX idx_jd_drafts_status ON jd_drafts USING btree (status);
  END IF;
END $$;