/*
  # Complete JD Drafts Table Implementation

  1. New Tables
    - `jd_drafts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `input_type` ('brief' | 'upload' | 'link')
      - `input_summary` (text, brief description or extracted content)
      - `content` (text, for file or URL content)
      - `file_name` (text, original filename for uploads)
      - `file_type` (text, file extension)
      - `url` (text, for link inputs)
      - `status` ('pending' | 'processing' | 'completed' | 'failed')
      - `generated_jd` (text, AI-generated job description)
      - `error_message` (text, if generation failed)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `jd_drafts` table
    - Add policies for users to manage their own JD drafts

  3. Progress Flags
    - Add `has_started_jd` to user_progress_flags
    - Add `has_submitted_jd_inputs` to user_progress_flags
    - Add `has_generated_jd` to user_progress_flags
*/

-- Create jd_drafts table with comprehensive structure
CREATE TABLE IF NOT EXISTS jd_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  input_type text CHECK (input_type IN ('brief', 'upload', 'link')) NOT NULL,
  input_summary text NOT NULL,
  content text,
  file_name text,
  file_type text,
  url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')) NOT NULL,
  generated_jd text,
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add comments for documentation
COMMENT ON TABLE jd_drafts IS 'Job description drafts and generation requests with multiple input modes';
COMMENT ON COLUMN jd_drafts.input_type IS 'Type of input: brief text, file upload, or URL link';
COMMENT ON COLUMN jd_drafts.input_summary IS 'Brief description or summary of the input';
COMMENT ON COLUMN jd_drafts.content IS 'Extracted content from files or URLs';
COMMENT ON COLUMN jd_drafts.file_name IS 'Original filename for uploaded files';
COMMENT ON COLUMN jd_drafts.file_type IS 'File extension (doc, docx, pdf)';
COMMENT ON COLUMN jd_drafts.url IS 'URL for link-based inputs';
COMMENT ON COLUMN jd_drafts.status IS 'Processing status of the JD generation';
COMMENT ON COLUMN jd_drafts.generated_jd IS 'AI-generated job description';
COMMENT ON COLUMN jd_drafts.error_message IS 'Error message if generation failed';

-- Enable Row Level Security
ALTER TABLE jd_drafts ENABLE ROW LEVEL SECURITY;

-- Create policies for JD drafts
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

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_jd_drafts_user_id ON jd_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_jd_drafts_status ON jd_drafts(status);
CREATE INDEX IF NOT EXISTS idx_jd_drafts_created_at ON jd_drafts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jd_drafts_input_type ON jd_drafts(input_type);

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
    COMMENT ON COLUMN user_progress_flags.has_started_jd IS 'User has initiated job description creation process';
  END IF;

  -- Add has_submitted_jd_inputs column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress_flags' AND column_name = 'has_submitted_jd_inputs'
  ) THEN
    ALTER TABLE user_progress_flags ADD COLUMN has_submitted_jd_inputs boolean DEFAULT false NOT NULL;
    COMMENT ON COLUMN user_progress_flags.has_submitted_jd_inputs IS 'User has provided input for JD generation';
  END IF;

  -- Add has_generated_jd column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress_flags' AND column_name = 'has_generated_jd'
  ) THEN
    ALTER TABLE user_progress_flags ADD COLUMN has_generated_jd boolean DEFAULT false NOT NULL;
    COMMENT ON COLUMN user_progress_flags.has_generated_jd IS 'User has successfully generated a job description';
  END IF;
END $$;