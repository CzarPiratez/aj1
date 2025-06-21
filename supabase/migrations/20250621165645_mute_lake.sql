-- Add jd_generation_failed flag to user_progress_flags table
DO $$
BEGIN
  -- Add jd_generation_failed column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_progress_flags' AND column_name = 'jd_generation_failed'
  ) THEN
    ALTER TABLE user_progress_flags ADD COLUMN jd_generation_failed boolean DEFAULT false NOT NULL;
    COMMENT ON COLUMN user_progress_flags.jd_generation_failed IS 'Flag to track if JD generation has failed for retry functionality';
  END IF;
END $$;

-- Ensure jd_drafts table has all required columns
DO $$
BEGIN
  -- Add generated_jd column if it doesn't exist (renamed from generated_draft)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jd_drafts' AND column_name = 'generated_jd'
  ) THEN
    ALTER TABLE jd_drafts ADD COLUMN generated_jd text;
    COMMENT ON COLUMN jd_drafts.generated_jd IS 'AI-generated job description content';
  END IF;

  -- Add generation_status column if it doesn't exist (renamed from status)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jd_drafts' AND column_name = 'generation_status'
  ) THEN
    -- Check if status column exists and rename it
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'jd_drafts' AND column_name = 'status'
    ) THEN
      ALTER TABLE jd_drafts RENAME COLUMN status TO generation_status;
    ELSE
      ALTER TABLE jd_drafts ADD COLUMN generation_status text DEFAULT 'pending' CHECK (generation_status IN ('pending', 'processing', 'completed', 'failed'));
    END IF;
    COMMENT ON COLUMN jd_drafts.generation_status IS 'Status of the JD generation process';
  END IF;

  -- Add generated_draft column if it doesn't exist (for backward compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jd_drafts' AND column_name = 'generated_draft'
  ) THEN
    ALTER TABLE jd_drafts ADD COLUMN generated_draft text;
    COMMENT ON COLUMN jd_drafts.generated_draft IS 'Alias for generated_jd for backward compatibility';
  END IF;
END $$;

-- Update any existing status constraints to include the new column name
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'jd_drafts' AND constraint_name = 'jd_drafts_status_check'
  ) THEN
    ALTER TABLE jd_drafts DROP CONSTRAINT jd_drafts_status_check;
  END IF;

  -- Add new constraint for generation_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'jd_drafts' AND constraint_name = 'jd_drafts_generation_status_check'
  ) THEN
    ALTER TABLE jd_drafts ADD CONSTRAINT jd_drafts_generation_status_check 
      CHECK (generation_status IN ('pending', 'processing', 'completed', 'failed'));
  END IF;
END $$;

-- Create index on generation_status for efficient querying
CREATE INDEX IF NOT EXISTS idx_jd_drafts_generation_status ON jd_drafts(generation_status);