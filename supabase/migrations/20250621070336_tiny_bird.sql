/*
  # Create JD Drafts Table for Job Description Generation

  1. New Tables
    - `jd_drafts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `input_type` (text: 'website' or 'manual')
      - `website_url` (text, nullable)
      - `role_title` (text, nullable)
      - `sector` (text, nullable)
      - `experience_years` (text, nullable)
      - `required_skills` (text, nullable)
      - `additional_details` (text, nullable)
      - `raw_input` (text, stores original user input)
      - `status` (text: 'pending', 'processing', 'completed', 'failed')
      - `generated_jd` (text, nullable)
      - `error_message` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `jd_drafts` table
    - Add policies for users to manage their own drafts

  3. Indexes
    - Add indexes for efficient lookups

  4. Progress Flags
    - Add new flags to user_progress_flags table
*/

-- Create jd_drafts table
CREATE TABLE IF NOT EXISTS jd_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  input_type text CHECK (input_type IN ('website', 'manual')) NOT NULL,
  website_url text,
  role_title text,
  sector text,
  experience_years text,
  required_skills text,
  additional_details text,
  raw_input text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')) NOT NULL,
  generated_jd text,
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add comments
COMMENT ON TABLE jd_drafts IS 'Job description drafts and generation requests';
COMMENT ON COLUMN jd_drafts.input_type IS 'Type of input: website URL or manual details';
COMMENT ON COLUMN jd_drafts.website_url IS 'Organization/project website URL if provided';
COMMENT ON COLUMN jd_drafts.role_title IS 'Job role title (e.g., Gender Expert)';
COMMENT ON COLUMN jd_drafts.sector IS 'Sector or project type (e.g., Livelihoods)';
COMMENT ON COLUMN jd_drafts.experience_years IS 'Required years of experience';
COMMENT ON COLUMN jd_drafts.required_skills IS 'Required skills (e.g., M&E, grants, supervision)';
COMMENT ON COLUMN jd_drafts.additional_details IS 'Any additional details provided by user';
COMMENT ON COLUMN jd_drafts.raw_input IS 'Original user input for reference';
COMMENT ON COLUMN jd_drafts.status IS 'Processing status of the JD generation';
COMMENT ON COLUMN jd_drafts.generated_jd IS 'AI-generated job description';
COMMENT ON COLUMN jd_drafts.error_message IS 'Error message if generation failed';

-- Enable Row Level Security
ALTER TABLE jd_drafts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create own JD drafts"
  ON jd_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own JD drafts"
  ON jd_drafts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own JD drafts"
  ON jd_drafts
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own JD drafts"
  ON jd_drafts
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_jd_drafts_user_id ON jd_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_jd_drafts_status ON jd_drafts(status);
CREATE INDEX IF NOT EXISTS idx_jd_drafts_created_at ON jd_drafts(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_jd_drafts_updated_at
  BEFORE UPDATE ON jd_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add new progress flags to user_progress_flags table
DO $$
BEGIN
  -- Add has_started_jd column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress_flags' AND column_name = 'has_started_jd'
  ) THEN
    ALTER TABLE user_progress_flags ADD COLUMN has_started_jd boolean DEFAULT false NOT NULL;
  END IF;

  -- Add has_submitted_jd_inputs column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress_flags' AND column_name = 'has_submitted_jd_inputs'
  ) THEN
    ALTER TABLE user_progress_flags ADD COLUMN has_submitted_jd_inputs boolean DEFAULT false NOT NULL;
  END IF;

  -- Add has_generated_jd column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress_flags' AND column_name = 'has_generated_jd'
  ) THEN
    ALTER TABLE user_progress_flags ADD COLUMN has_generated_jd boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add comments to new progress flags
COMMENT ON COLUMN user_progress_flags.has_started_jd IS 'User has initiated job description creation process';
COMMENT ON COLUMN user_progress_flags.has_submitted_jd_inputs IS 'User has provided input for JD generation';
COMMENT ON COLUMN user_progress_flags.has_generated_jd IS 'User has successfully generated a job description';