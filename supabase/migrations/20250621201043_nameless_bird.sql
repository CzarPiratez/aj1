/*
  # Create error_logs table

  1. New Tables
    - `error_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users table, nullable)
      - `error_type` (text, required)
      - `details` (text, required)
      - `source` (text, required)
      - `created_at` (timestamp with timezone)

  2. Security
    - Enable RLS on `error_logs` table
    - Add policies for authenticated users, anonymous users, and service role
    - Allow users to read their own error logs
    - Allow service role full access for admin purposes

  3. Indexes
    - Index on user_id for performance
    - Index on created_at for time-based queries
    - Index on error_type for filtering
*/

-- Create error_logs table
CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  error_type text NOT NULL,
  details text NOT NULL,
  source text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON public.error_logs(error_type);

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to insert their own error logs" ON public.error_logs;
DROP POLICY IF EXISTS "Allow anonymous error logging" ON public.error_logs;
DROP POLICY IF EXISTS "Allow service role to insert error logs" ON public.error_logs;
DROP POLICY IF EXISTS "Users can read own error logs" ON public.error_logs;
DROP POLICY IF EXISTS "Allow service role to read error logs" ON public.error_logs;

-- Create RLS policies

-- Allow authenticated users to insert their own error logs
CREATE POLICY "Allow authenticated users to insert their own error logs"
  ON public.error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow anonymous users to insert error logs (for client-side logging)
CREATE POLICY "Allow anonymous error logging"
  ON public.error_logs
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Allow service role to insert error logs
CREATE POLICY "Allow service role to insert error logs"
  ON public.error_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow users to read their own error logs
CREATE POLICY "Users can read own error logs"
  ON public.error_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow service role to read error logs (for admin purposes)
CREATE POLICY "Allow service role to read error logs"
  ON public.error_logs
  FOR SELECT
  TO service_role
  USING (true);