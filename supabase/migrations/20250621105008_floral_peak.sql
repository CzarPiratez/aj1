/*
  # Fix User Progress Flags Table

  1. New Tables
    - `user_progress_flags`
      - `user_id` (uuid, primary key)
      - `has_uploaded_cv` (boolean)
      - `has_analyzed_cv` (boolean)
      - `has_selected_job` (boolean)
      - `has_written_cover_letter` (boolean)
      - `has_published_job` (boolean)
      - `has_applied_to_job` (boolean)
      - `has_started_jd` (boolean)
      - `has_submitted_jd_inputs` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `user_progress_flags` table
    - Add policies for authenticated users to manage their own progress
*/

-- Drop table if it exists to start fresh
DROP TABLE IF EXISTS user_progress_flags CASCADE;

-- Create the user_progress_flags table
CREATE TABLE user_progress_flags (
  user_id uuid PRIMARY KEY,
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

-- Add foreign key constraint to users table
ALTER TABLE user_progress_flags 
ADD CONSTRAINT user_progress_flags_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_user_progress_flags_user_id ON user_progress_flags USING btree (user_id);

-- Enable Row Level Security
ALTER TABLE user_progress_flags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Create trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_user_progress_flags_updated_at
  BEFORE UPDATE ON user_progress_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();