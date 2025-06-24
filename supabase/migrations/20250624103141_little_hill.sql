/*
  # Recreate job_drafts table

  This migration recreates the `job_drafts` table with its intended schema,
  as the table was previously dropped. It includes RLS policies, indexes,
  and a trigger for `updated_at` and `last_edited_at` timestamps.
  
  Note: The foreign key to the `jobs` table (`source_job_id`) is temporarily
  removed as the `jobs` table will be re-introduced in a later phase.
  It should be re-added when the `jobs` table is created.
*/

-- Start transaction for atomicity
BEGIN;

-- Drop the table if it exists to ensure a clean recreation
DROP TABLE IF EXISTS job_drafts CASCADE;

-- Create the job_drafts table
CREATE TABLE job_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic job information
  title text,
  description text,
  
  -- Organization details (supporting both naming conventions)
  organization_name text,
  organization_url text,
  org_name text,
  org_website text,
  
  -- Job details
  responsibilities text,
  qualifications text,
  sdgs text[],
  sector text,
  contract_type text,
  location text,
  how_to_apply text,
  application_end_date date,
  
  -- Additional job information
  salary_range text,
  benefits text,
  
  -- Draft management
  draft_status text NOT NULL DEFAULT 'draft',
  is_template boolean DEFAULT false,
  template_name text,
  -- source_job_id uuid REFERENCES jobs(id) ON DELETE SET NULL, -- Temporarily removed as 'jobs' table is not yet present
  
  -- AI and metadata
  ai_generated boolean DEFAULT false,
  generation_metadata jsonb DEFAULT '{}',
  
  -- Timestamps
  last_edited_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add constraints for valid enum values
ALTER TABLE job_drafts ADD CONSTRAINT job_drafts_draft_status_check 
  CHECK (draft_status IN ('draft', 'review', 'ready', 'archived'));

ALTER TABLE job_drafts ADD CONSTRAINT job_drafts_contract_type_check 
  CHECK (contract_type IS NULL OR contract_type IN (
    'full-time', 'part-time', 'contract', 'consultant', 
    'volunteer', 'internship', 'temporary', 'freelance'
  ));

-- Create indexes for efficient queries
CREATE INDEX idx_job_drafts_user_id ON job_drafts(user_id);
CREATE INDEX idx_job_drafts_draft_status ON job_drafts(draft_status);
CREATE INDEX idx_job_drafts_is_template ON job_drafts(is_template);
CREATE INDEX idx_job_drafts_created_at ON job_drafts(created_at DESC);
CREATE INDEX idx_job_drafts_updated_at ON job_drafts(updated_at DESC);
CREATE INDEX idx_job_drafts_last_edited_at ON job_drafts(last_edited_at DESC);
CREATE INDEX idx_job_drafts_sector ON job_drafts(sector);
CREATE INDEX idx_job_drafts_contract_type ON job_drafts(contract_type);
CREATE INDEX idx_job_drafts_location ON job_drafts(location);

-- GIN index for SDGs array
CREATE INDEX idx_job_drafts_sdgs ON job_drafts USING gin(sdgs);

-- Enable Row Level Security
ALTER TABLE job_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can create their own job drafts
CREATE POLICY "Users can create own job drafts"
  ON job_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own job drafts
CREATE POLICY "Users can read own job drafts"
  ON job_drafts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own job drafts
CREATE POLICY "Users can update own job drafts"
  ON job_drafts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own job drafts
CREATE POLICY "Users can delete own job drafts"
  ON job_drafts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Public can read templates (if we want to share templates in the future)
CREATE POLICY "Public can read public templates"
  ON job_drafts
  FOR SELECT
  TO authenticated
  USING (is_template = true AND template_name IS NOT NULL);

-- Create trigger function for updated_at and last_edited_at
CREATE OR REPLACE FUNCTION update_job_drafts_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_edited_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at and last_edited_at timestamps
CREATE TRIGGER update_job_drafts_timestamps
  BEFORE UPDATE ON job_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_job_drafts_timestamps();

-- Add helpful comments
COMMENT ON TABLE job_drafts IS 'Draft job postings that users can work on before publishing to the jobs table';
COMMENT ON COLUMN job_drafts.draft_status IS 'Current status of the draft: draft, review, ready, archived';
COMMENT ON COLUMN job_drafts.is_template IS 'Whether this draft can be used as a template for future jobs';
COMMENT ON COLUMN job_drafts.template_name IS 'Name for the template if is_template is true';
COMMENT ON COLUMN job_drafts.ai_generated IS 'Whether AI assistance was used in creating this draft';
COMMENT ON COLUMN job_drafts.generation_metadata IS 'Metadata about AI generation process and parameters used';
COMMENT ON COLUMN job_drafts.last_edited_at IS 'Timestamp of when the draft was last modified by the user';
COMMENT ON COLUMN job_drafts.salary_range IS 'Compensation information for the position';
COMMENT ON COLUMN job_drafts.benefits IS 'Benefits and perks offered with the position';

-- Commit the transaction
COMMIT;