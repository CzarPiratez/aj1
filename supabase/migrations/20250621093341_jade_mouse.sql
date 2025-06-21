/*
  # Create user_progress_flags table

  1. New Tables
    - `user_progress_flags`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users, unique)
      - `has_uploaded_cv` (boolean, default false)
      - `has_analyzed_cv` (boolean, default false)
      - `has_selected_job` (boolean, default false)
      - `has_written_cover_letter` (boolean, default false)
      - `has_published_job` (boolean, default false)
      - `has_applied_to_job` (boolean, default false)
      - `has_started_jd` (boolean, default false)
      - `has_submitted_jd_inputs` (boolean, default false)
      - `has_generated_jd` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `user_progress_flags` table
    - Add policies for users to manage their own progress flags

  3. Constraints and Indexes
    - Foreign key to users table
    - Unique constraint on user_id
    - Index for efficient lookups
    - Trigger for automatic updated_at updates
*/

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_progress_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
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

-- Add foreign key constraint to users table (only if it doesn't exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'user_progress_flags_user_id_fkey'
      AND table_name = 'user_progress_flags'
    ) THEN
      ALTER TABLE user_progress_flags 
      ADD CONSTRAINT user_progress_flags_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Add unique constraint on user_id (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_progress_flags_user_id_unique'
    AND table_name = 'user_progress_flags'
  ) THEN
    ALTER TABLE user_progress_flags 
    ADD CONSTRAINT user_progress_flags_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_flags_user_id 
ON user_progress_flags USING btree (user_id);

-- Enable Row Level Security
ALTER TABLE user_progress_flags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can insert own progress flags" ON user_progress_flags;
DROP POLICY IF EXISTS "Users can read own progress flags" ON user_progress_flags;
DROP POLICY IF EXISTS "Users can update own progress flags" ON user_progress_flags;

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

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS update_user_progress_flags_updated_at ON user_progress_flags;

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_user_progress_flags_updated_at
  BEFORE UPDATE ON user_progress_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();