/*
  # Create error_logs table for application error tracking

  1. New Tables
    - `error_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users, nullable)
      - `error_type` (text, required)
      - `details` (text, optional)
      - `source` (text, required)
      - `created_at` (timestamp with timezone)

  2. Security
    - Enable RLS on `error_logs` table
    - Add policy for authenticated users to insert error logs
    - Add policy for service role to read error logs
    - Add policy for anonymous users to insert error logs (for unauthenticated errors)
*/

-- Create the error_logs table
CREATE TABLE IF NOT EXISTS public.error_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    error_type text NOT NULL,
    details text,
    source text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON public.error_logs USING btree (error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs USING btree (user_id);

-- Create RLS policies
CREATE POLICY "Allow anonymous error logging"
  ON public.error_logs
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Allow authenticated users to insert their own error logs"
  ON public.error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL));

CREATE POLICY "Allow service role to insert error logs"
  ON public.error_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Allow service role to read error logs"
  ON public.error_logs
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Users can read own error logs"
  ON public.error_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());