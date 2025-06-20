/*
  # Fix jobs table structure

  1. Table Updates
    - Add missing columns to jobs table to match the schema
    - Add proper indexes and constraints
    - Update RLS policies

  2. New Columns
    - `org_name` (text) - Name of the hiring organization
    - `org_website` (text) - Website URL of the hiring organization  
    - `responsibilities` (text) - Job responsibilities and duties
    - `qualifications` (text) - Required and preferred qualifications
    - `sdgs` (text[]) - Array of relevant Sustainable Development Goals
    - `sector` (text) - Sector/industry of the job
    - `contract_type` (text) - Type of contract
    - `location` (text) - Job location
    - `how_to_apply` (text) - Instructions on how to apply
    - `application_end_date` (date) - Deadline for applications

  3. Indexes
    - Add indexes for efficient searching and filtering

  4. Comments
    - Add helpful comments to columns
*/

-- Add missing columns to jobs table
DO $$
BEGIN
  -- Add org_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'org_name'
  ) THEN
    ALTER TABLE jobs ADD COLUMN org_name text;
    COMMENT ON COLUMN jobs.org_name IS 'Name of the hiring organization';
  END IF;

  -- Add org_website column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'org_website'
  ) THEN
    ALTER TABLE jobs ADD COLUMN org_website text;
    COMMENT ON COLUMN jobs.org_website IS 'Website URL of the hiring organization';
  END IF;

  -- Add responsibilities column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'responsibilities'
  ) THEN
    ALTER TABLE jobs ADD COLUMN responsibilities text;
    COMMENT ON COLUMN jobs.responsibilities IS 'Job responsibilities and duties (text format)';
  END IF;

  -- Add qualifications column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'qualifications'
  ) THEN
    ALTER TABLE jobs ADD COLUMN qualifications text;
    COMMENT ON COLUMN jobs.qualifications IS 'Required and preferred qualifications (text format)';
  END IF;

  -- Add sdgs column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'sdgs'
  ) THEN
    ALTER TABLE jobs ADD COLUMN sdgs text[];
    COMMENT ON COLUMN jobs.sdgs IS 'Array of relevant Sustainable Development Goals';
  END IF;

  -- Add sector column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'sector'
  ) THEN
    ALTER TABLE jobs ADD COLUMN sector text;
    COMMENT ON COLUMN jobs.sector IS 'Sector/industry of the job (e.g., health, education, environment)';
  END IF;

  -- Add contract_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'contract_type'
  ) THEN
    ALTER TABLE jobs ADD COLUMN contract_type text;
    COMMENT ON COLUMN jobs.contract_type IS 'Type of contract (e.g., full-time, part-time, contract, volunteer)';
  END IF;

  -- Add location column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'location'
  ) THEN
    ALTER TABLE jobs ADD COLUMN location text;
    COMMENT ON COLUMN jobs.location IS 'Job location (can be remote, city, country, etc.)';
  END IF;

  -- Add how_to_apply column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'how_to_apply'
  ) THEN
    ALTER TABLE jobs ADD COLUMN how_to_apply text;
    COMMENT ON COLUMN jobs.how_to_apply IS 'Instructions on how to apply for the job';
  END IF;

  -- Add application_end_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'application_end_date'
  ) THEN
    ALTER TABLE jobs ADD COLUMN application_end_date date;
    COMMENT ON COLUMN jobs.application_end_date IS 'Deadline for job applications';
  END IF;
END $$;

-- Add comments to existing columns
COMMENT ON COLUMN jobs.published_at IS 'Timestamp when the job was published/made live';
COMMENT ON COLUMN jobs.updated_at IS 'Timestamp when the job record was last updated';
COMMENT ON TABLE jobs IS 'Job postings created by organizations';

-- Create additional indexes for efficient searching
CREATE INDEX IF NOT EXISTS idx_jobs_org_name ON jobs(org_name);
CREATE INDEX IF NOT EXISTS idx_jobs_sector ON jobs(sector);
CREATE INDEX IF NOT EXISTS idx_jobs_contract_type ON jobs(contract_type);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);
CREATE INDEX IF NOT EXISTS idx_jobs_application_end_date ON jobs(application_end_date);
CREATE INDEX IF NOT EXISTS idx_jobs_sdgs ON jobs USING gin(sdgs);
CREATE INDEX IF NOT EXISTS idx_jobs_updated_at ON jobs(updated_at DESC);