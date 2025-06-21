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
    - Add policy for authenticated users to insert error logs
    - Add policy for users to read their own error logs

  3. Performance
    - Add indexes on user_id, error_type, and created_at
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

-- Add foreign key constraint to users table if it exists and constraint doesn't already exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') 
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints 
       WHERE constraint_name = 'error_logs_user_id_fkey' 
       AND table_name = 'error_logs'
     ) THEN
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
  -- Drop existing policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'error_logs' 
    AND policyname = 'System can insert error logs'
  ) THEN
    DROP POLICY "System can insert error logs" ON error_logs;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'error_logs' 
    AND policyname = 'Users can read own error logs'
  ) THEN
    DROP POLICY "Users can read own error logs" ON error_logs;
  END IF;
  
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