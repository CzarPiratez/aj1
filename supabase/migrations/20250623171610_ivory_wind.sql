/*
  # Fix JD Drafts Input Type Constraint

  1. Updates
    - Update any existing rows with invalid input_type values to valid ones
    - Drop the old constraint that only allowed 'website' and 'manual'
    - Add new constraint that allows 'brief', 'upload', and 'link'

  2. Data Migration
    - Maps 'website' -> 'link' 
    - Maps 'manual' -> 'brief'
    - Any other values default to 'brief'

  3. Security
    - Maintains data integrity with proper constraint validation
*/

-- First, update any existing rows to use the new valid values
UPDATE jd_drafts 
SET input_type = CASE 
  WHEN input_type = 'website' THEN 'link'
  WHEN input_type = 'manual' THEN 'brief'
  ELSE 'brief'  -- Default fallback for any other values
END
WHERE input_type NOT IN ('brief', 'upload', 'link');

-- Drop the existing constraint
ALTER TABLE jd_drafts DROP CONSTRAINT IF EXISTS jd_drafts_input_type_check;

-- Add the corrected constraint with the values the application actually uses
ALTER TABLE jd_drafts ADD CONSTRAINT jd_drafts_input_type_check 
  CHECK (input_type = ANY (ARRAY['brief'::text, 'upload'::text, 'link'::text]));