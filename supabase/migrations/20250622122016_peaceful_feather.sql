/*
  # Add RLS policies for jobs table

  1. Security Policies
    - Allow authenticated users to insert their own jobs
    - Allow authenticated users to read their own jobs
    - Allow authenticated users to update their own jobs
    - Allow authenticated users to delete their own jobs

  2. Changes
    - Add INSERT policy for authenticated users to create jobs with their user_id
    - Add SELECT policy for authenticated users to read their own jobs
    - Add UPDATE policy for authenticated users to modify their own jobs
    - Add DELETE policy for authenticated users to delete their own jobs
*/

-- Allow authenticated users to insert their own jobs
CREATE POLICY "Users can insert own jobs"
  ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to read their own jobs
CREATE POLICY "Users can read own jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow authenticated users to update their own jobs
CREATE POLICY "Users can update own jobs"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own jobs
CREATE POLICY "Users can delete own jobs"
  ON jobs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow public read access to published jobs (for job seekers to browse)
CREATE POLICY "Public can read published jobs"
  ON jobs
  FOR SELECT
  TO public
  USING (status = 'published');