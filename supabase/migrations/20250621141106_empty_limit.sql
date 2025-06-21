/*
  # Fix Database Schema Issues

  1. Create error_logs table if it doesn't exist
  2. Add missing has_generated_jd column to user_progress_flags
  3. Set up proper RLS policies and indexes

  This migration fixes the schema cache errors and missing table issues.
*/

-- Ensure error_logs table exists
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
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

-- Handle RLS policies for error_logs (drop existing ones first to avoid conflicts)
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Allow service role to insert error logs" ON error_logs;
  DROP POLICY IF EXISTS "Allow authenticated users to insert their own error logs" ON error_logs;
  DROP POLICY IF EXISTS "Allow service role to read error logs" ON error_logs;
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
    USING (user_id = auth.uid() OR user_id IS NULL);
END $$;