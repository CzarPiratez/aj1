/*
  # Create applications table

  1. New Tables
    - `applications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `job_id` (uuid, foreign key to jobs)
      - `status` (text, check constraint)
      - `cover_letter` (text, optional)
      - `additional_notes` (text, optional)
      - `applied_at` (timestamptz, default now())
      - `reviewed_at` (timestamptz, optional)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `applications` table
    - Add policies for users to manage their own applications
    - Add policies for job owners to view applications to their jobs

  3. Constraints
    - Unique constraint on (user_id, job_id) to prevent duplicate applications
    - Check constraint on status field
    - Foreign key constraints with CASCADE delete

  4. Indexes
    - Index on user_id for user's applications
    - Index on job_id for job applications
    - Index on status for filtering
    - Index on applied_at for sorting
*/

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected', 'withdrawn')),
  cover_letter text,
  additional_notes text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Prevent duplicate applications
  CONSTRAINT applications_user_job_unique UNIQUE (user_id, job_id)
);

-- Add table and column comments
COMMENT ON TABLE applications IS 'Job applications submitted by users';
COMMENT ON COLUMN applications.user_id IS 'User who submitted the application';
COMMENT ON COLUMN applications.job_id IS 'Job being applied to';
COMMENT ON COLUMN applications.status IS 'Current status of the application';
COMMENT ON COLUMN applications.cover_letter IS 'Cover letter text submitted with application';
COMMENT ON COLUMN applications.additional_notes IS 'Additional notes or documents from applicant';
COMMENT ON COLUMN applications.applied_at IS 'When the application was submitted';
COMMENT ON COLUMN applications.reviewed_at IS 'When the application was last reviewed';

-- Enable Row Level Security
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Create policies for applications
CREATE POLICY "Users can create own applications"
  ON applications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

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
  );

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_user_job ON applications(user_id, job_id);

-- Create trigger for updated_at
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();