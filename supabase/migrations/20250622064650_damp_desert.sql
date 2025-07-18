/*
  # Error Logs Table Migration

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
    - Add policies for authenticated users to insert/read their own logs
    - Add policy for anonymous users to insert logs (client-side logging)
    - Add policies for service role to manage all logs

  3. Performance
    - Add indexes on user_id, created_at, and error_type
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

-- RLS Policies with existence checks

-- Allow authenticated users to insert their own error logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'error_logs' 
    AND policyname = 'Allow authenticated users to insert their own error logs'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert their own error logs"
      ON error_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
  END IF;
END $$;

-- Allow anonymous users to insert error logs (for client-side logging)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'error_logs' 
    AND policyname = 'Allow anonymous error logging'
  ) THEN
    CREATE POLICY "Allow anonymous error logging"
      ON error_logs
      FOR INSERT
      TO anon
      WITH CHECK (user_id IS NULL);
  END IF;
END $$;

-- Allow service role to insert error logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'error_logs' 
    AND policyname = 'Allow service role to insert error logs'
  ) THEN
    CREATE POLICY "Allow service role to insert error logs"
      ON error_logs
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- Allow users to read their own error logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'error_logs' 
    AND policyname = 'Users can read own error logs'
  ) THEN
    CREATE POLICY "Users can read own error logs"
      ON error_logs
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Allow service role to read error logs (for admin purposes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'error_logs' 
    AND policyname = 'Allow service role to read error logs'
  ) THEN
    CREATE POLICY "Allow service role to read error logs"
      ON error_logs
      FOR SELECT
      TO service_role
      USING (true);
  END IF;
END $$;