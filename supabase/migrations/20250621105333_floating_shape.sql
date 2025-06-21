/*
  # Create error logs table

  1. New Tables
    - `error_logs`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, nullable) - References users table (nullable for system errors)
      - `error_type` (text) - Type/category of error
      - `details` (text) - Detailed error information
      - `source` (text) - Source system/component that generated the error
      - `created_at` (timestamp) - When the error occurred

  2. Security
    - Enable RLS on `error_logs` table
    - Add policies for system to insert errors and users to read their own errors

  3. Indexes
    - Add indexes for common query patterns (user_id, error_type, created_at)
*/

CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  error_type text NOT NULL,
  details text NOT NULL,
  source text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for error logs
CREATE POLICY "System can insert error logs"
  ON error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read own error logs"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id 
  ON error_logs USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_error_logs_error_type 
  ON error_logs USING btree (error_type);

CREATE INDEX IF NOT EXISTS idx_error_logs_created_at 
  ON error_logs USING btree (created_at DESC);