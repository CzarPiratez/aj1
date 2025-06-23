/*
  # Fix JD Drafts Input Type Constraint

  1. Database Schema Updates
    - Update existing data to use correct input types
    - Replace input type constraint with correct values
    - Ensure status constraint is also correct
  
  2. Data Migration
    - Convert 'brief' and 'upload' to 'manual'
    - Convert 'link' to 'website'
    - Handle any edge cases in existing data
*/

-- First, let's see what input types currently exist and handle them
-- Update any existing data to use the new input types
UPDATE jd_drafts 
SET input_type = 'manual' 
WHERE input_type IN ('brief', 'upload');

UPDATE jd_drafts 
SET input_type = 'website' 
WHERE input_type = 'link';

-- Handle any other potential values by setting them to 'manual' as default
UPDATE jd_drafts 
SET input_type = 'manual' 
WHERE input_type NOT IN ('manual', 'website');

-- Now drop the existing check constraint
ALTER TABLE jd_drafts DROP CONSTRAINT IF EXISTS jd_drafts_input_type_check;

-- Add the new check constraint with correct values
ALTER TABLE jd_drafts ADD CONSTRAINT jd_drafts_input_type_check 
  CHECK (input_type = ANY (ARRAY['manual'::text, 'website'::text]));

-- Also ensure the status constraint is correct
ALTER TABLE jd_drafts DROP CONSTRAINT IF EXISTS jd_drafts_status_check;
ALTER TABLE jd_drafts ADD CONSTRAINT jd_drafts_status_check 
  CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text]));

-- Ensure generation_status constraint is also correct if it exists
ALTER TABLE jd_drafts DROP CONSTRAINT IF EXISTS jd_drafts_generation_status_check;
ALTER TABLE jd_drafts ADD CONSTRAINT jd_drafts_generation_status_check 
  CHECK (generation_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text]));