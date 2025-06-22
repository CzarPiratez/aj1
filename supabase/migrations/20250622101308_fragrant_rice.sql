/*
  # Create error_logs table

  1. New Tables
    - `error_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable, foreign key to users table)
      - `error_type` (text, required)
      - `details` (text, required)
      - `source` (text, required)
      - `created_at` (timestamp with time zone, default now)

  2. Security
    - Enable RLS on `error_logs` table
    - Add policy for anonymous error logging (user_id can be null)
    - Add policy for authenticated users to insert their own error logs
    - Add policy for service role to insert and read error logs
    - Add policy for users to read their own error logs

  3. Indexes
    - Index on `created_at` for efficient time-based queries
    - Index on `error_type` for filtering by error type
    - Index on `user_id` for user-specific error queries
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