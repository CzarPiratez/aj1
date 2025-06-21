/*
  # Fix RLS policies for jd_drafts table

  1. Security
    - Enable RLS on `jd_drafts` table (if not already enabled)
    - Add policy for authenticated users to insert their own JD drafts
    - Add policy for authenticated users to read their own JD drafts
    - Add policy for authenticated users to update their own JD drafts
    - Add policy for authenticated users to delete their own JD drafts

  2. Changes
    - Creates comprehensive CRUD policies for the jd_drafts table
    - Ensures users can only access their own JD drafts
    - Allows proper functionality for the job description generation feature
*/

-- Enable RLS on jd_drafts table (if not already enabled)
ALTER TABLE jd_drafts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can insert own JD drafts" ON jd_drafts;
DROP POLICY IF EXISTS "Users can read own JD drafts" ON jd_drafts;
DROP POLICY IF EXISTS "Users can update own JD drafts" ON jd_drafts;
DROP POLICY IF EXISTS "Users can delete own JD drafts" ON jd_drafts;

-- Create policy for INSERT operations
CREATE POLICY "Users can insert own JD drafts"
  ON jd_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create policy for SELECT operations
CREATE POLICY "Users can read own JD drafts"
  ON jd_drafts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policy for UPDATE operations
CREATE POLICY "Users can update own JD drafts"
  ON jd_drafts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy for DELETE operations
CREATE POLICY "Users can delete own JD drafts"
  ON jd_drafts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);