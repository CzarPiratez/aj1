/*
  # Fix JD Drafts Input Type Constraints

  This migration fixes the input_type constraint issues by:
  1. Backing up existing data
  2. Completely recreating the table with correct constraints
  3. Restoring only valid, cleaned data
  4. Ensuring all constraints are properly applied
*/

-- Start transaction
BEGIN;

-- Step 1: Create a backup table with all current data
CREATE TABLE jd_drafts_backup AS 
SELECT * FROM jd_drafts;

-- Step 2: Drop the problematic table completely
DROP TABLE jd_drafts CASCADE;

-- Step 3: Create the new table with correct structure and constraints
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

-- Step 4: Insert cleaned data from backup, handling all edge cases
INSERT INTO jd_drafts (
  id, user_id, input_type, website_url, role_title, sector, experience_years,
  required_skills, additional_details, raw_input, generation_status, generated_jd,
  error_message, created_at, updated_at, content, input_summary, file_name,
  file_type, url, generated_draft, status, has_fallback, is_ai_generated
)
SELECT 
  id,
  user_id,
  -- Clean input_type: map all variations to valid values
  CASE 
    WHEN input_type IN ('brief', 'upload') OR input_type IS NULL THEN 'manual'
    WHEN input_type = 'link' THEN 'website'
    WHEN input_type = 'manual' THEN 'manual'
    WHEN input_type = 'website' THEN 'website'
    ELSE 'manual'  -- Default fallback for any unexpected values
  END as input_type,
  website_url,
  role_title,
  sector,
  experience_years,
  required_skills,
  additional_details,
  COALESCE(raw_input, 'No input provided') as raw_input,  -- Ensure NOT NULL
  -- Clean generation_status
  CASE 
    WHEN generation_status IN ('pending', 'processing', 'completed', 'failed') THEN generation_status
    ELSE 'pending'
  END as generation_status,
  generated_jd,
  error_message,
  COALESCE(created_at, now()) as created_at,
  COALESCE(updated_at, now()) as updated_at,
  content,
  COALESCE(input_summary, 'No summary provided') as input_summary,  -- Ensure NOT NULL
  file_name,
  file_type,
  url,
  generated_draft,
  -- Clean status
  CASE 
    WHEN status IN ('pending', 'processing', 'completed', 'failed') THEN status
    ELSE 'pending'
  END as status,
  COALESCE(has_fallback, false) as has_fallback,
  COALESCE(is_ai_generated, true) as is_ai_generated
FROM jd_drafts_backup
WHERE user_id IS NOT NULL;  -- Only include rows with valid user_id

-- Step 5: Create indexes
CREATE INDEX idx_jd_drafts_user_id ON jd_drafts USING btree (user_id);
CREATE INDEX idx_jd_drafts_created_at ON jd_drafts USING btree (created_at DESC);
CREATE INDEX idx_jd_drafts_generation_status ON jd_drafts USING btree (generation_status);
CREATE INDEX idx_jd_drafts_input_type ON jd_drafts USING btree (input_type);
CREATE INDEX idx_jd_drafts_status ON jd_drafts USING btree (status);
CREATE INDEX idx_jd_drafts_has_fallback ON jd_drafts USING btree (has_fallback);
CREATE INDEX idx_jd_drafts_is_ai_generated ON jd_drafts USING btree (is_ai_generated);

-- Step 6: Enable RLS
ALTER TABLE jd_drafts ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies
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

-- Step 8: Add foreign key constraint if users table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
    ALTER TABLE jd_drafts ADD CONSTRAINT jd_drafts_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 9: Clean up backup table
DROP TABLE jd_drafts_backup;

-- Commit transaction
COMMIT;