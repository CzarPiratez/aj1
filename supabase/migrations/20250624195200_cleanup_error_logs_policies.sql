
-- Cleanup: Drop all existing error_logs policies and create consolidated ones
DO $$ 
BEGIN
  -- Drop all existing policies to avoid conflicts
  DROP POLICY IF EXISTS "Allow anonymous error logging" ON error_logs;
  DROP POLICY IF EXISTS "Allow authenticated users to insert their own error logs" ON error_logs;
  DROP POLICY IF EXISTS "Allow service role to insert error logs" ON error_logs;
  DROP POLICY IF EXISTS "Allow service role to read error logs" ON error_logs;
  DROP POLICY IF EXISTS "Users can read own error logs" ON error_logs;
  DROP POLICY IF EXISTS "System can insert error logs" ON error_logs;
END $$;

-- Create consolidated RLS policies for error_logs

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

-- Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs USING btree (error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs USING btree (user_id);
