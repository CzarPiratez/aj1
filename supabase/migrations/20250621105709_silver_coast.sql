/*
  # Create error_logs table

  1. New Tables
    - `error_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable, foreign key to users)
      - `error_type` (text, required)
      - `details` (text, required)
      - `source` (text, required)
      - `created_at` (timestamp with timezone, default now())

  2. Security
    - Enable RLS on `error_logs` table
    - Add policy for system to insert error logs
    - Add policy for users to read their own error logs

  3. Indexes
    - Index on user_id for efficient queries
    - Index on error_type for filtering
    - Index on created_at for time-based queries
*/

-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  error_type text NOT NULL,
  details text NOT NULL,
  source text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint to users table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    ALTER TABLE error_logs 
    ADD CONSTRAINT error_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and create new ones
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "System can insert error logs" ON error_logs;
  DROP POLICY IF EXISTS "Users can read own error logs" ON error_logs;
  
  -- Create new policies
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