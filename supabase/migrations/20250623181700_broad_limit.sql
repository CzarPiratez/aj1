/*
  # Fix JD Drafts Input Type Constraint

  1. Database Schema Updates
    - Drop existing input_type check constraint
    - Add new constraint allowing 'manual' and 'website' values
    - Ensure compatibility with application code

  2. Data Migration
    - Update any existing records to use new input types
    - 'brief' and 'upload' -> 'manual'
    - 'link' -> 'website'
*/

-- First, update any existing data to use the new input types
UPDATE jd_drafts 
SET input_type = 'manual' 
WHERE input_type IN ('brief', 'upload');

UPDATE jd_drafts 
SET input_type = 'website' 
WHERE input_type = 'link';

-- Drop the existing check constraint
ALTER TABLE jd_drafts DROP CONSTRAINT IF EXISTS jd_drafts_input_type_check;

-- Add the new check constraint with correct values
ALTER TABLE jd_drafts ADD CONSTRAINT jd_drafts_input_type_check 
  CHECK (input_type = ANY (ARRAY['manual'::text, 'website'::text]));

-- Also update the status constraint to ensure it's correct
ALTER TABLE jd_drafts DROP CONSTRAINT IF EXISTS jd_drafts_status_check;
ALTER TABLE jd_drafts ADD CONSTRAINT jd_drafts_status_check 
  CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text]));