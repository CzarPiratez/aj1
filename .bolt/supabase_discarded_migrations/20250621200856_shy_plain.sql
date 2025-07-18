/*
  # Create error_logs table

  1. New Tables
    - `error_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, optional foreign key to users)
      - `error_type` (text, required)
      - `details` (text, optional)
      - `source` (text, required)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `error_logs` table
    - Add policies for authenticated users to insert their own error logs
    - Add policy for service role to read error logs
    - Add policy for anonymous users to insert error logs (for client-side logging)
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);

-- RLS Policies

-- Allow authenticated users to insert their own error logs
CREATE POLICY "Allow authenticated users to insert their own error logs"
  ON error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow anonymous users to insert error logs (for client-side logging)
CREATE POLICY "Allow anonymous error logging"
  ON error_logs
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Allow service role to insert error logs
CREATE POLICY "Allow service role to insert error logs"
  ON error_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow users to read their own error logs
CREATE POLICY "Users can read own error logs"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow service role to read error logs (for admin purposes)
CREATE POLICY "Allow service role to read error logs"
  ON error_logs
  FOR SELECT
  TO service_role
  USING (true);