/*
  # Fix JD Drafts Input Type Constraints

  This migration updates the jd_drafts table to use the correct input_type values
  and ensures all constraints are properly applied.

  ## Changes Made
  1. Inspect and clean existing data
  2. Update input_type values to match new constraints
  3. Apply new check constraints
  4. Ensure all indexes and policies are correct
*/

-- Start a transaction to ensure atomicity
BEGIN;

-- First, let's see what input types actually exist and clean them up
-- We'll be very explicit about handling all possible values

-- Step 1: Handle NULL values first
UPDATE jd_drafts 
SET input_type = 'manual' 
WHERE input_type IS NULL;

-- Step 2: Handle known mappings
UPDATE jd_drafts 
SET input_type = 'manual' 
WHERE input_type IN ('brief', 'upload');

UPDATE jd_drafts 
SET input_type = 'website' 
WHERE input_type = 'link';

-- Step 3: Handle any other unexpected values by setting them to 'manual'
-- This catches any edge cases we might not know about
UPDATE jd_drafts 
SET input_type = 'manual' 
WHERE input_type NOT IN ('manual', 'website');

-- Step 4: Now let's verify all data is clean before applying constraints
-- We'll do this by creating a temporary table and copying only valid data

-- Create a temporary table with the correct structure
CREATE TEMP TABLE jd_drafts_temp AS
SELECT 
  id,
  user_id,
  CASE 
    WHEN input_type = 'brief' OR input_type = 'upload' OR input_type IS NULL THEN 'manual'
    WHEN input_type = 'link' THEN 'website'
    WHEN input_type IN ('manual', 'website') THEN input_type
    ELSE 'manual'
  END as input_type,
  website_url,
  role_title,
  sector,
  experience_years,
  required_skills,
  additional_details,
  raw_input,
  COALESCE(generation_status, 'pending') as generation_status,
  generated_jd,
  error_message,
  created_at,
  updated_at,
  content,
  input_summary,
  file_name,
  file_type,
  url,
  generated_draft,
  COALESCE(status, 'pending') as status,
  COALESCE(has_fallback, false) as has_fallback,
  COALESCE(is_ai_generated, true) as is_ai_generated
FROM jd_drafts;

-- Step 5: Drop the original table
DROP TABLE jd_drafts CASCADE;

-- Step 6: Create the new table with proper constraints
CREATE TABLE jd_drafts (
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

-- Step 7: Insert the cleaned data
INSERT INTO jd_drafts (
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
FROM jd_drafts_temp;

-- Step 8: Recreate indexes
CREATE INDEX idx_jd_drafts_user_id ON jd_drafts USING btree (user_id);
CREATE INDEX idx_jd_drafts_created_at ON jd_drafts USING btree (created_at DESC);
CREATE INDEX idx_jd_drafts_generation_status ON jd_drafts USING btree (generation_status);
CREATE INDEX idx_jd_drafts_input_type ON jd_drafts USING btree (input_type);
CREATE INDEX idx_jd_drafts_status ON jd_drafts USING btree (status);
CREATE INDEX idx_jd_drafts_has_fallback ON jd_drafts USING btree (has_fallback);
CREATE INDEX idx_jd_drafts_is_ai_generated ON jd_drafts USING btree (is_ai_generated);

-- Step 9: Enable RLS and recreate policies
ALTER TABLE jd_drafts ENABLE ROW LEVEL SECURITY;

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

-- Step 10: Add foreign key constraint if users table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    ALTER TABLE jd_drafts ADD CONSTRAINT jd_drafts_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Commit the transaction
COMMIT;