/*
  # Fix JD Drafts Input Type Constraints

  1. Updates existing data to use correct input types
  2. Safely updates table constraints without validation errors
  3. Ensures all constraints are properly set

  This migration handles the constraint validation issue by:
  - Using a transaction to ensure atomicity
  - Temporarily working around constraint validation
  - Properly updating all existing data first
*/

-- Start a transaction to ensure atomicity
BEGIN;

-- First, let's check and update all existing data
-- Update any existing data to use the new input types
UPDATE jd_drafts 
SET input_type = 'manual' 
WHERE input_type IN ('brief', 'upload') OR input_type IS NULL;

UPDATE jd_drafts 
SET input_type = 'website' 
WHERE input_type = 'link';

-- Handle any other potential values by setting them to 'manual' as default
UPDATE jd_drafts 
SET input_type = 'manual' 
WHERE input_type NOT IN ('manual', 'website');

-- Now let's recreate the table with the correct constraints
-- This approach avoids constraint validation issues

-- Create a new table with the correct structure
CREATE TABLE jd_drafts_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  input_type text NOT NULL CHECK (input_type = ANY (ARRAY['manual'::text, 'website'::text])),
  website_url text,
  role_title text,
  sector text,
  experience_years text,
  required_skills text,
  additional_details text,
  raw_input text NOT NULL,
  generation_status text NOT NULL DEFAULT 'pending'::text CHECK (generation_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])),
  generated_jd text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  content text,
  input_summary text NOT NULL,
  file_name text,
  file_type text,
  url text,
  generated_draft text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])),
  has_fallback boolean DEFAULT false,
  is_ai_generated boolean DEFAULT true
);

-- Copy all data from the old table to the new table
INSERT INTO jd_drafts_new (
  id, user_id, input_type, website_url, role_title, sector, experience_years,
  required_skills, additional_details, raw_input, generation_status, generated_jd,
  error_message, created_at, updated_at, content, input_summary, file_name,
  file_type, url, generated_draft, status, has_fallback, is_ai_generated
)
SELECT 
  id, user_id, input_type, website_url, role_title, sector, experience_years,
  required_skills, additional_details, raw_input, generation_status, generated_jd,
  error_message, created_at, updated_at, content, input_summary, file_name,
  file_type, url, generated_draft, status, has_fallback, is_ai_generated
FROM jd_drafts;

-- Drop the old table
DROP TABLE jd_drafts;

-- Rename the new table to the original name
ALTER TABLE jd_drafts_new RENAME TO jd_drafts;

-- Recreate any indexes that existed
CREATE INDEX IF NOT EXISTS idx_jd_drafts_user_id ON jd_drafts USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_jd_drafts_created_at ON jd_drafts USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jd_drafts_generation_status ON jd_drafts USING btree (generation_status);
CREATE INDEX IF NOT EXISTS idx_jd_drafts_input_type ON jd_drafts USING btree (input_type);
CREATE INDEX IF NOT EXISTS idx_jd_drafts_status ON jd_drafts USING btree (generation_status);
CREATE INDEX IF NOT EXISTS idx_jd_drafts_has_fallback ON jd_drafts USING btree (has_fallback);
CREATE INDEX IF NOT EXISTS idx_jd_drafts_is_ai_generated ON jd_drafts USING btree (is_ai_generated);

-- Recreate RLS policies if they existed
ALTER TABLE jd_drafts ENABLE ROW LEVEL SECURITY;

-- Recreate the policies
CREATE POLICY "Users can insert own JD drafts" ON jd_drafts
  FOR INSERT TO authenticated
  WITH CHECK (uid() = user_id);

CREATE POLICY "Users can read own JD drafts" ON jd_drafts
  FOR SELECT TO authenticated
  USING (uid() = user_id);

CREATE POLICY "Users can update own JD drafts" ON jd_drafts
  FOR UPDATE TO authenticated
  USING (uid() = user_id)
  WITH CHECK (uid() = user_id);

CREATE POLICY "Users can delete own JD drafts" ON jd_drafts
  FOR DELETE TO authenticated
  USING (uid() = user_id);

-- Commit the transaction
COMMIT;