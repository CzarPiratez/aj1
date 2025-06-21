/*
  # JD Drafts Table Setup

  1. New Tables
    - `jd_drafts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `input_type` (text, check constraint)
      - `input_summary` (text, required)
      - `content` (text, optional)
      - `file_name` (text, optional)
      - `file_type` (text, optional)
      - `url` (text, optional)
      - `status` (text, default 'pending')
      - `generated_jd` (text, optional)
      - `error_message` (text, optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `jd_drafts` table
    - Add policies for users to manage their own JD drafts

  3. Progress Flags
    - Add JD-related flags to `user_progress_flags` table
*/

-- First, check if jd_drafts table exists and handle accordingly
DO $$
BEGIN
  -- If table doesn't exist, create it with full structure
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jd_drafts') THEN
    CREATE TABLE jd_drafts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      input_type text CHECK (input_type IN ('brief', 'upload', 'link')) NOT NULL,
      input_summary text NOT NULL,
      content text,
      file_name text,
      file_type text,
      url text,
      status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')) NOT NULL,
      generated_jd text,
      error_message text,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL
    );
  ELSE
    -- Table exists, add missing columns safely
    
    -- Add content first (since input_summary might reference it)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'jd_drafts' AND column_name = 'content'
    ) THEN
      ALTER TABLE jd_drafts ADD COLUMN content text;
    END IF;

    -- Add input_summary if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'jd_drafts' AND column_name = 'input_summary'
    ) THEN
      ALTER TABLE jd_drafts ADD COLUMN input_summary text;
      -- Update existing rows with a safe default value
      -- Check if content column exists before using it
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jd_drafts' AND column_name = 'content'
      ) THEN
        UPDATE jd_drafts SET input_summary = COALESCE(content, 'Legacy JD draft') WHERE input_summary IS NULL;
      ELSE
        UPDATE jd_drafts SET input_summary = 'Legacy JD draft' WHERE input_summary IS NULL;
      END IF;
      -- Make it NOT NULL after setting values
      ALTER TABLE jd_drafts ALTER COLUMN input_summary SET NOT NULL;
    END IF;

    -- Add file_name if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'jd_drafts' AND column_name = 'file_name'
    ) THEN
      ALTER TABLE jd_drafts ADD COLUMN file_name text;
    END IF;

    -- Add file_type if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'jd_drafts' AND column_name = 'file_type'
    ) THEN
      ALTER TABLE jd_drafts ADD COLUMN file_type text;
    END IF;

    -- Add url if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'jd_drafts' AND column_name = 'url'
    ) THEN
      ALTER TABLE jd_drafts ADD COLUMN url text;
    END IF;

    -- Add status if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'jd_drafts' AND column_name = 'status'
    ) THEN
      ALTER TABLE jd_drafts ADD COLUMN status text DEFAULT 'pending';
      -- Update existing rows
      UPDATE jd_drafts SET status = 'pending' WHERE status IS NULL;
      -- Make it NOT NULL
      ALTER TABLE jd_drafts ALTER COLUMN status SET NOT NULL;
      -- Add check constraint if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'jd_drafts' AND constraint_name = 'jd_drafts_status_check'
      ) THEN
        ALTER TABLE jd_drafts ADD CONSTRAINT jd_drafts_status_check 
          CHECK (status IN ('pending', 'processing', 'completed', 'failed'));
      END IF;
    END IF;

    -- Add generated_jd if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'jd_drafts' AND column_name = 'generated_jd'
    ) THEN
      ALTER TABLE jd_drafts ADD COLUMN generated_jd text;
    END IF;

    -- Add error_message if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'jd_drafts' AND column_name = 'error_message'
    ) THEN
      ALTER TABLE jd_drafts ADD COLUMN error_message text;
    END IF;

    -- Add input_type constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'jd_drafts' AND constraint_name = 'jd_drafts_input_type_check'
    ) THEN
      -- First ensure input_type column exists and has valid values
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jd_drafts' AND column_name = 'input_type'
      ) THEN
        -- Update any invalid values
        UPDATE jd_drafts SET input_type = 'brief' 
        WHERE input_type IS NULL OR input_type NOT IN ('brief', 'upload', 'link');
        -- Add the constraint
        ALTER TABLE jd_drafts ADD CONSTRAINT jd_drafts_input_type_check 
          CHECK (input_type IN ('brief', 'upload', 'link'));
      END IF;
    END IF;
  END IF;
END $$;

-- Add table and column comments
COMMENT ON TABLE jd_drafts IS 'Job description drafts and generation requests with multiple input modes';

-- Add column comments safely
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jd_drafts' AND column_name = 'input_type') THEN
    COMMENT ON COLUMN jd_drafts.input_type IS 'Type of input: brief text, file upload, or URL link';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jd_drafts' AND column_name = 'input_summary') THEN
    COMMENT ON COLUMN jd_drafts.input_summary IS 'Brief description or summary of the input';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jd_drafts' AND column_name = 'content') THEN
    COMMENT ON COLUMN jd_drafts.content IS 'Extracted content from files or URLs';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jd_drafts' AND column_name = 'file_name') THEN
    COMMENT ON COLUMN jd_drafts.file_name IS 'Original filename for uploaded files';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jd_drafts' AND column_name = 'file_type') THEN
    COMMENT ON COLUMN jd_drafts.file_type IS 'File extension (doc, docx, pdf)';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jd_drafts' AND column_name = 'url') THEN
    COMMENT ON COLUMN jd_drafts.url IS 'URL for link-based inputs';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jd_drafts' AND column_name = 'status') THEN
    COMMENT ON COLUMN jd_drafts.status IS 'Processing status of the JD generation';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jd_drafts' AND column_name = 'generated_jd') THEN
    COMMENT ON COLUMN jd_drafts.generated_jd IS 'AI-generated job description';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jd_drafts' AND column_name = 'error_message') THEN
    COMMENT ON COLUMN jd_drafts.error_message IS 'Error message if generation failed';
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE jd_drafts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can create own JD drafts" ON jd_drafts;
DROP POLICY IF EXISTS "Users can read own JD drafts" ON jd_drafts;
DROP POLICY IF EXISTS "Users can update own JD drafts" ON jd_drafts;
DROP POLICY IF EXISTS "Users can delete own JD drafts" ON jd_drafts;

-- Create policies for JD drafts
CREATE POLICY "Users can create own JD drafts"
  ON jd_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own JD drafts"
  ON jd_drafts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own JD drafts"
  ON jd_drafts
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own JD drafts"
  ON jd_drafts
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_jd_drafts_user_id ON jd_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_jd_drafts_status ON jd_drafts(status);
CREATE INDEX IF NOT EXISTS idx_jd_drafts_created_at ON jd_drafts(created_at DESC);

-- Create trigger for updated_at (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'update_jd_drafts_updated_at'
  ) THEN
    CREATE TRIGGER update_jd_drafts_updated_at
      BEFORE UPDATE ON jd_drafts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add new progress flags to user_progress_flags table
DO $$
BEGIN
  -- Add has_started_jd column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress_flags' AND column_name = 'has_started_jd'
  ) THEN
    ALTER TABLE user_progress_flags ADD COLUMN has_started_jd boolean DEFAULT false NOT NULL;
    COMMENT ON COLUMN user_progress_flags.has_started_jd IS 'User has initiated job description creation process';
  END IF;

  -- Add has_submitted_jd_inputs column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress_flags' AND column_name = 'has_submitted_jd_inputs'
  ) THEN
    ALTER TABLE user_progress_flags ADD COLUMN has_submitted_jd_inputs boolean DEFAULT false NOT NULL;
    COMMENT ON COLUMN user_progress_flags.has_submitted_jd_inputs IS 'User has provided input for JD generation';
  END IF;

  -- Add has_generated_jd column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress_flags' AND column_name = 'has_generated_jd'
  ) THEN
    ALTER TABLE user_progress_flags ADD COLUMN has_generated_jd boolean DEFAULT false NOT NULL;
    COMMENT ON COLUMN user_progress_flags.has_generated_jd IS 'User has successfully generated a job description';
  END IF;
END $$;