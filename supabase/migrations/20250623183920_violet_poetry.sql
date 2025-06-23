/*
  # Complete Reset of JD Drafts Table

  This migration completely resets the jd_drafts table to provide a clean slate for the "Post a Job" tool.
  
  1. Database Changes
     - Drop and recreate jd_drafts table with correct schema
     - Update input_type constraint to only allow 'manual' and 'website'
     - Ensure all NOT NULL constraints are properly handled
     - Clean up any existing data inconsistencies
  
  2. Security
     - Enable RLS on new table
     - Recreate all necessary policies for user data access
     - Add foreign key constraint to users table
  
  3. Performance
     - Recreate all necessary indexes
     - Optimize for common query patterns
*/

-- Start transaction for atomicity
BEGIN;

-- Step 1: Safely drop the existing table and all its dependencies
DROP TABLE IF EXISTS jd_drafts CASCADE;

-- Step 2: Create the new jd_drafts table with clean schema
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

-- Step 3: Create all necessary indexes for performance
CREATE INDEX idx_jd_drafts_user_id ON jd_drafts USING btree (user_id);
CREATE INDEX idx_jd_drafts_created_at ON jd_drafts USING btree (created_at DESC);
CREATE INDEX idx_jd_drafts_generation_status ON jd_drafts USING btree (generation_status);
CREATE INDEX idx_jd_drafts_input_type ON jd_drafts USING btree (input_type);
CREATE INDEX idx_jd_drafts_status ON jd_drafts USING btree (status);
CREATE INDEX idx_jd_drafts_has_fallback ON jd_drafts USING btree (has_fallback);
CREATE INDEX idx_jd_drafts_is_ai_generated ON jd_drafts USING btree (is_ai_generated);

-- Step 4: Enable Row Level Security
ALTER TABLE jd_drafts ENABLE ROW LEVEL SECURITY;

-- Step 5: Create comprehensive RLS policies
CREATE POLICY "Users can insert own JD drafts" ON jd_drafts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own JD drafts" ON jd_drafts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own JD drafts" ON jd_drafts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own JD drafts" ON jd_drafts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Step 6: Add foreign key constraint to users table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
    ALTER TABLE jd_drafts ADD CONSTRAINT jd_drafts_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Commit the transaction
COMMIT;