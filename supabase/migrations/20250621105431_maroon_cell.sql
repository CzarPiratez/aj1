/*
  # Create error_logs table

  1. New Tables
    - `error_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `error_type` (text, required)
      - `details` (text, required)
      - `source` (text, required)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `error_logs` table
    - Add policy for system to insert error logs
    - Add policy for users to read their own error logs

  3. Performance
    - Add indexes on user_id, error_type, and created_at
*/

-- Create error_logs table if it doesn't exist
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

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "System can insert error logs" ON error_logs;
  DROP POLICY IF EXISTS "Users can read own error logs" ON error_logs;
  
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
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id 
  ON error_logs USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_error_logs_error_type 
  ON error_logs USING btree (error_type);

CREATE INDEX IF NOT EXISTS idx_error_logs_created_at 
  ON error_logs USING btree (created_at DESC);