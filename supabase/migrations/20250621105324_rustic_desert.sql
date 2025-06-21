/*
  # Create user progress flags table

  1. New Tables
    - `user_progress_flags`
      - `user_id` (uuid, primary key) - References users table
      - `has_uploaded_cv` (boolean) - Track if user has uploaded CV
      - `has_analyzed_cv` (boolean) - Track if user has analyzed CV
      - `has_selected_job` (boolean) - Track if user has selected a job
      - `has_written_cover_letter` (boolean) - Track if user has written cover letter
      - `has_published_job` (boolean) - Track if user has published a job
      - `has_applied_to_job` (boolean) - Track if user has applied to job
      - `has_started_jd` (boolean) - Track if user has started job description
      - `has_submitted_jd_inputs` (boolean) - Track if user has submitted JD inputs
      - `has_generated_jd` (boolean) - Track if user has generated JD
      - `created_at` (timestamp) - Record creation time
      - `updated_at` (timestamp) - Record update time

  2. Security
    - Enable RLS on `user_progress_flags` table
    - Add policies for users to manage their own progress flags

  3. Triggers
    - Add trigger to automatically update `updated_at` timestamp
*/

CREATE TABLE IF NOT EXISTS user_progress_flags (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  has_uploaded_cv boolean NOT NULL DEFAULT false,
  has_analyzed_cv boolean NOT NULL DEFAULT false,
  has_selected_job boolean NOT NULL DEFAULT false,
  has_written_cover_letter boolean NOT NULL DEFAULT false,
  has_published_job boolean NOT NULL DEFAULT false,
  has_applied_to_job boolean NOT NULL DEFAULT false,
  has_started_jd boolean NOT NULL DEFAULT false,
  has_submitted_jd_inputs boolean NOT NULL DEFAULT false,
  has_generated_jd boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_progress_flags ENABLE ROW LEVEL SECURITY;

-- Create policies for user progress flags
CREATE POLICY "Users can insert own progress flags"
  ON user_progress_flags
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own progress flags"
  ON user_progress_flags
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own progress flags"
  ON user_progress_flags
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_progress_flags_user_id 
  ON user_progress_flags USING btree (user_id);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_user_progress_flags_updated_at
  BEFORE UPDATE ON user_progress_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();