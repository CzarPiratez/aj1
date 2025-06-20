/*
  # User Progress Flags Table

  1. New Tables
    - `user_progress_flags`
      - `user_id` (uuid, primary key, references users)
      - `has_uploaded_cv` (boolean, default false)
      - `has_analyzed_cv` (boolean, default false)
      - `has_selected_job` (boolean, default false)
      - `has_written_cover_letter` (boolean, default false)
      - `has_published_job` (boolean, default false)
      - `has_applied_to_job` (boolean, default false)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `user_progress_flags` table
    - Add policies for authenticated users to manage their own progress flags

  3. Indexes
    - Add index on user_id for efficient lookups

  4. Triggers
    - Auto-update updated_at column on row updates
*/

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_progress_flags (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  has_uploaded_cv boolean DEFAULT false,
  has_analyzed_cv boolean DEFAULT false,
  has_selected_job boolean DEFAULT false,
  has_written_cover_letter boolean DEFAULT false,
  has_published_job boolean DEFAULT false,
  has_applied_to_job boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_progress_flags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can insert own progress flags" ON user_progress_flags;
  DROP POLICY IF EXISTS "Users can read own progress flags" ON user_progress_flags;
  DROP POLICY IF EXISTS "Users can update own progress flags" ON user_progress_flags;
END $$;

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

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_progress_flags_user_id 
  ON user_progress_flags(user_id);

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update the updated_at column
DO $$
BEGIN
  -- Drop existing trigger if it exists
  DROP TRIGGER IF EXISTS update_user_progress_flags_updated_at ON user_progress_flags;
  
  -- Create the trigger
  CREATE TRIGGER update_user_progress_flags_updated_at
    BEFORE UPDATE ON user_progress_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
END $$;