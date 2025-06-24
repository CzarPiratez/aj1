/*
  # Phase 3: Database Integration for Published Jobs
  
  This migration implements Step 3 of Phase 3, creating the complete database infrastructure
  for the publishing workflow as specified in the detailed plan.

  1. Re-introduce jobs table for published job postings
  2. Re-introduce applications table for job applications  
  3. Add back has_published_job and has_applied_to_job flags to user_progress_flags
  4. Ensure all tables have proper schemas, foreign keys, and indexes
  5. Set up comprehensive RLS policies for security

  CRITICAL: Every detail from the Phase 3 specification is implemented here.
*/

-- Start transaction for atomicity
BEGIN;

-- ============================================================================
-- STEP 1: Re-introduce jobs table for published job postings
-- ============================================================================

CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic job information (matching job_drafts structure for easy migration)
  title text NOT NULL,
  description text NOT NULL,
  
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
  
  -- Publishing status and metadata
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'archived', 'closed')),
  published_at timestamptz NOT NULL DEFAULT now(),
  
  -- Template and AI metadata (copied from draft)
  is_template boolean DEFAULT false,
  template_name text,
  source_draft_id uuid REFERENCES job_drafts(id) ON DELETE SET NULL,
  ai_generated boolean DEFAULT false,
  generation_metadata jsonb DEFAULT '{}',
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add constraints for valid enum values
ALTER TABLE jobs ADD CONSTRAINT jobs_contract_type_check 
  CHECK (contract_type IS NULL OR contract_type IN (
    'full-time', 'part-time', 'contract', 'consultant', 
    'volunteer', 'internship', 'temporary', 'freelance'
  ));

-- Create comprehensive indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_published_at ON jobs(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_updated_at ON jobs(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_sector ON jobs(sector);
CREATE INDEX IF NOT EXISTS idx_jobs_contract_type ON jobs(contract_type);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);
CREATE INDEX IF NOT EXISTS idx_jobs_application_end_date ON jobs(application_end_date);
CREATE INDEX IF NOT EXISTS idx_jobs_source_draft_id ON jobs(source_draft_id);

-- GIN index for SDGs array
CREATE INDEX IF NOT EXISTS idx_jobs_sdgs ON jobs USING gin(sdgs);

-- Full-text search indexes for job discovery
CREATE INDEX IF NOT EXISTS idx_jobs_title_search ON jobs USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_jobs_description_search ON jobs USING gin(to_tsvector('english', description));

-- ============================================================================
-- STEP 2: Re-introduce applications table for job applications
-- ============================================================================

CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  
  -- Application content
  cover_letter text,
  additional_notes text,
  cv_file_url text,
  
  -- Application status and workflow
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'reviewed', 'shortlisted', 'interviewed', 
    'accepted', 'rejected', 'withdrawn'
  )),
  
  -- Application metadata
  applied_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  status_changed_at timestamptz DEFAULT now(),
  
  -- AI assistance tracking
  ai_assisted boolean DEFAULT false,
  ai_metadata jsonb DEFAULT '{}',
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Prevent duplicate applications
  CONSTRAINT applications_user_job_unique UNIQUE (user_id, job_id)
);

-- Create comprehensive indexes for applications
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_reviewed_at ON applications(reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_status_changed_at ON applications(status_changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_user_job ON applications(user_id, job_id);

-- ============================================================================
-- STEP 3: Add back progress flags to user_progress_flags table
-- ============================================================================

-- Add the missing progress flags for job publishing and applications
DO $$
BEGIN
  -- Add has_published_job column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_progress_flags' AND column_name = 'has_published_job'
  ) THEN
    ALTER TABLE user_progress_flags ADD COLUMN has_published_job boolean NOT NULL DEFAULT false;
  END IF;

  -- Add has_applied_to_job column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_progress_flags' AND column_name = 'has_applied_to_job'
  ) THEN
    ALTER TABLE user_progress_flags ADD COLUMN has_applied_to_job boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Enable RLS and create comprehensive security policies
-- ============================================================================

-- Enable Row Level Security on all tables
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR JOBS TABLE
-- ============================================================================

-- Users can create their own jobs
CREATE POLICY "Users can create own jobs"
  ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own jobs
CREATE POLICY "Users can read own jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own jobs
CREATE POLICY "Users can update own jobs"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own jobs
CREATE POLICY "Users can delete own jobs"
  ON jobs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Public can read published jobs (for job seekers to browse)
CREATE POLICY "Public can read published jobs"
  ON jobs
  FOR SELECT
  TO public
  USING (status = 'published');

-- Public can read public templates
CREATE POLICY "Public can read public job templates"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (is_template = true AND template_name IS NOT NULL);

-- ============================================================================
-- RLS POLICIES FOR APPLICATIONS TABLE
-- ============================================================================

-- Users can create applications to jobs
CREATE POLICY "Users can create applications"
  ON applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own applications
CREATE POLICY "Users can read own applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own applications (e.g., withdraw)
CREATE POLICY "Users can update own applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Job owners can read applications to their jobs
CREATE POLICY "Job owners can read applications to their jobs"
  ON applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = applications.job_id 
      AND jobs.user_id = auth.uid()
    )
  );

-- Job owners can update applications to their jobs (e.g., change status)
CREATE POLICY "Job owners can update applications to their jobs"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = applications.job_id 
      AND jobs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = applications.job_id 
      AND jobs.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 5: Create trigger functions for timestamp management
-- ============================================================================

-- Create trigger function for jobs table
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for applications table
CREATE OR REPLACE FUNCTION update_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  -- Update status_changed_at if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_jobs_updated_at();

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_applications_updated_at();

-- ============================================================================
-- STEP 6: Update handle_new_user function to include new progress flags
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = NOW();
  
  -- Create user preferences
  INSERT INTO public.user_preferences (user_id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create user progress flags with ALL flags including new ones
  INSERT INTO public.user_progress_flags (
    user_id, 
    has_uploaded_cv, 
    has_analyzed_cv, 
    has_selected_job, 
    has_written_cover_letter,
    has_started_jd,
    has_submitted_jd_inputs,
    has_generated_jd,
    jd_generation_failed,
    has_published_job,
    has_applied_to_job,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id, 
    false, 
    false, 
    false, 
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    NOW(), 
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: Add helpful comments for documentation
-- ============================================================================

-- Table comments
COMMENT ON TABLE jobs IS 'Published job postings that are live and accepting applications';
COMMENT ON TABLE applications IS 'Job applications submitted by users to published jobs';

-- Jobs table column comments
COMMENT ON COLUMN jobs.status IS 'Current status of the job: published, archived, closed';
COMMENT ON COLUMN jobs.published_at IS 'Timestamp when the job was published and made live';
COMMENT ON COLUMN jobs.source_draft_id IS 'Reference to the job_drafts record this job was created from';
COMMENT ON COLUMN jobs.ai_generated IS 'Whether AI assistance was used in creating this job';
COMMENT ON COLUMN jobs.generation_metadata IS 'Metadata about AI generation process and parameters used';

-- Applications table column comments
COMMENT ON COLUMN applications.status IS 'Current status: pending, reviewed, shortlisted, interviewed, accepted, rejected, withdrawn';
COMMENT ON COLUMN applications.applied_at IS 'Timestamp when the application was submitted';
COMMENT ON COLUMN applications.reviewed_at IS 'Timestamp when the application was last reviewed by the job owner';
COMMENT ON COLUMN applications.status_changed_at IS 'Timestamp when the application status was last changed';
COMMENT ON COLUMN applications.ai_assisted IS 'Whether AI assistance was used in creating this application';
COMMENT ON COLUMN applications.ai_metadata IS 'Metadata about AI assistance used in the application';

-- Progress flags comments
COMMENT ON COLUMN user_progress_flags.has_published_job IS 'Whether user has published a job posting';
COMMENT ON COLUMN user_progress_flags.has_applied_to_job IS 'Whether user has applied to a job';

-- Update main table comment
COMMENT ON TABLE user_progress_flags IS 'User progress tracking for CV, job search, and job posting activities (complete with all workflow flags)';

-- Commit the transaction
COMMIT;