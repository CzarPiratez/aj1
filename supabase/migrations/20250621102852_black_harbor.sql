/*
  # Create error logs table

  1. New Tables
    - `error_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable for system errors)
      - `error_type` (text, type of error)
      - `details` (text, error details)
      - `source` (text, source of error)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `error_logs` table
    - Add policy for users to read their own error logs
    - Add policy for system to insert error logs
*/

CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  error_type text NOT NULL,
  details text NOT NULL,
  source text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint to users table (with existence check)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') 
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints 
       WHERE table_name = 'error_logs' 
       AND constraint_name = 'error_logs_user_id_fkey'
     ) THEN
    ALTER TABLE error_logs 
    ADD CONSTRAINT error_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs USING btree (error_type);

-- Enable Row Level Security
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can read own error logs" ON error_logs;
DROP POLICY IF EXISTS "System can insert error logs" ON error_logs;

CREATE POLICY "Users can read own error logs"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert error logs"
  ON error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);