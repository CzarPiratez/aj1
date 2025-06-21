/*
  # Fix error_logs table and user progress flags

  1. New Tables
    - `error_logs` table for logging application errors
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `error_type` (text)
      - `details` (text)
      - `source` (text)
      - `created_at` (timestamptz)

  2. Schema Updates
    - Add `has_generated_jd` column to `user_progress_flags` if missing

  3. Security
    - Enable RLS on `error_logs` table
    - Add policies for error logging access
    - Create performance indexes
*/

-- Ensure error_logs table exists
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type text NOT NULL,
  details text NOT NULL,
  source text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add missing column to user_progress_flags if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_progress_flags' AND column_name = 'has_generated_jd'
  ) THEN
    ALTER TABLE user_progress_flags ADD COLUMN has_generated_jd boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Enable RLS on error_logs table
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs USING btree (error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs USING btree (user_id);

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
  -- Drop policies if they exist
  DROP POLICY IF EXISTS "Allow service role to insert error logs" ON error_logs;
  DROP POLICY IF EXISTS "Allow authenticated users to insert their own error logs" ON error_logs;
  DROP POLICY IF EXISTS "Allow service role to read error logs" ON error_logs;
  DROP POLICY IF EXISTS "Allow error log inserts" ON error_logs;
  DROP POLICY IF EXISTS "System can insert error logs" ON error_logs;
  DROP POLICY IF EXISTS "Users can read error logs" ON error_logs;
  DROP POLICY IF EXISTS "Users can read own error logs" ON error_logs;
  DROP POLICY IF EXISTS "Allow anonymous error logging" ON error_logs;
END $$;

-- Create RLS policies for error_logs
CREATE POLICY "Allow service role to insert error logs"
  ON error_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert their own error logs"
  ON error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Allow service role to read error logs"
  ON error_logs
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Users can read own error logs"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow anonymous error logging"
  ON error_logs
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);