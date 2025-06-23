/*
  # Create user progress flags table

  1. New Tables
    - `user_progress_flags`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users table, unique)
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
    - Add policies for authenticated users to manage their own progress flags

  3. Indexes
    - Add index on user_id for performance
    - Add unique constraint on user_id
*/

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

-- Add foreign key constraint to users table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    ALTER TABLE user_progress_flags 
    ADD CONSTRAINT user_progress_flags_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add unique constraint on user_id
ALTER TABLE user_progress_flags 
ADD CONSTRAINT user_progress_flags_user_id_unique UNIQUE (user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_flags_user_id 
ON user_progress_flags USING btree (user_id);

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

-- Create trigger for updating updated_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'update_updated_at_column'
  ) THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

CREATE TRIGGER update_user_progress_flags_updated_at
  BEFORE UPDATE ON user_progress_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();