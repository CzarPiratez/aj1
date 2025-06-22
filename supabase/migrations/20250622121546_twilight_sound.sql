/*
  # Create error_logs table with RLS policies

  1. New Tables
    - `error_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users, nullable)
      - `error_type` (text, required)
      - `details` (text, required)
      - `source` (text, required)
      - `created_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `error_logs` table
    - Add policies for anonymous, authenticated, and service role access
    - Allow users to read their own error logs

  3. Performance
    - Add indexes on created_at, error_type, and user_id
*/

-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  error_type text NOT NULL,
  details text NOT NULL,
  source text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs USING btree (error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs USING btree (user_id);

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow anonymous error logging" ON error_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own error logs" ON error_logs;
DROP POLICY IF EXISTS "Allow service role to insert error logs" ON error_logs;
DROP POLICY IF EXISTS "Allow service role to read error logs" ON error_logs;
DROP POLICY IF EXISTS "Users can read own error logs" ON error_logs;

-- RLS Policies

-- Allow anonymous error logging (for cases where user_id is null)
CREATE POLICY "Allow anonymous error logging"
  ON error_logs
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Allow authenticated users to insert their own error logs
CREATE POLICY "Allow authenticated users to insert their own error logs"
  ON error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL));

-- Allow service role to insert error logs
CREATE POLICY "Allow service role to insert error logs"
  ON error_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow service role to read error logs
CREATE POLICY "Allow service role to read error logs"
  ON error_logs
  FOR SELECT
  TO service_role
  USING (true);

-- Users can read their own error logs
CREATE POLICY "Users can read own error logs"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());