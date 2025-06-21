/*
  # Fix error logs RLS policy

  1. Security Updates
    - Update RLS policy on `error_logs` table to allow inserts for both authenticated users and system logging
    - Allow inserts when user_id is null (for system errors) or when user_id matches authenticated user
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "System can insert error logs" ON error_logs;
DROP POLICY IF EXISTS "Users can read own error logs" ON error_logs;

-- Create new policy that allows inserts for authenticated users OR when user_id is null
CREATE POLICY "Allow error log inserts"
  ON error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = user_id) OR (user_id IS NULL)
  );

-- Allow users to read their own error logs or system logs (where user_id is null)
CREATE POLICY "Users can read error logs"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = user_id) OR (user_id IS NULL)
  );

-- Also allow anonymous users to insert error logs for better error tracking
CREATE POLICY "Allow anonymous error logging"
  ON error_logs
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);