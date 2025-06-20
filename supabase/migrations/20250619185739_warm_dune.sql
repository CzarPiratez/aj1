/*
  # Create user_progress_flags table for contextual AI tools

  1. New Table
    - `user_progress_flags`
      - `user_id` (uuid, primary key, references auth.users)
      - `has_uploaded_cv` (boolean, default false)
      - `has_analyzed_cv` (boolean, default false)
      - `has_selected_job` (boolean, default false)
      - `has_written_cover_letter` (boolean, default false)
      - `has_published_job` (boolean, default false)
      - `has_applied_to_job` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on user_progress_flags table
    - Add policies for authenticated users to manage their own progress data

  3. Performance
    - Add index on user_id for efficient lookups
    - Add trigger for automatic updated_at timestamp updates
*/

-- Create the user_progress_flags table
CREATE TABLE IF NOT EXISTS user_progress_flags (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  has_uploaded_cv boolean DEFAULT false,
  has_analyzed_cv boolean DEFAULT false,
  has_selected_job boolean DEFAULT false,
  has_written_cover_letter boolean DEFAULT false,
  has_published_job boolean DEFAULT false,
  has_applied_to_job boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);

-- Enable Row Level Security
ALTER TABLE user_progress_flags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can insert own progress flags" ON user_progress_flags;
DROP POLICY IF EXISTS "Users can read own progress flags" ON user_progress_flags;
DROP POLICY IF EXISTS "Users can update own progress flags" ON user_progress_flags;

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

-- Create or replace the trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS update_user_progress_flags_updated_at ON user_progress_flags;

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_user_progress_flags_updated_at
  BEFORE UPDATE ON user_progress_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();