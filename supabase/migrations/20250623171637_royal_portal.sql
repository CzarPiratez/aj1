/*
  # Fix JD Drafts Input Type Constraint

  1. Database Schema Analysis
     - Current constraint allows: 'website', 'manual'
     - Application code uses: 'brief', 'upload', 'link'
     - Need to update constraint to match application usage

  2. Data Migration Strategy
     - Update existing rows to use application-compatible values
     - Ensure no data loss during migration
     - Apply new constraint safely

  3. Constraint Update
     - Remove old constraint that uses 'website', 'manual'
     - Add new constraint that uses 'brief', 'upload', 'link'
*/

-- First, let's see what values currently exist and update them
-- Update existing rows to use the new valid values that match the application
UPDATE jd_drafts 
SET input_type = CASE 
  WHEN input_type = 'website' THEN 'link'
  WHEN input_type = 'manual' THEN 'brief'
  WHEN input_type = 'link' THEN 'link'      -- Keep existing 'link' values
  WHEN input_type = 'brief' THEN 'brief'    -- Keep existing 'brief' values  
  WHEN input_type = 'upload' THEN 'upload'  -- Keep existing 'upload' values
  ELSE 'brief'  -- Default fallback for any other unexpected values
END;

-- Drop the existing constraint that uses the old values
ALTER TABLE jd_drafts DROP CONSTRAINT IF EXISTS jd_drafts_input_type_check;

-- Add the new constraint with the values the application actually uses
ALTER TABLE jd_drafts ADD CONSTRAINT jd_drafts_input_type_check 
  CHECK (input_type IN ('brief', 'upload', 'link'));