/*
  # Fix JD Input Type Constraint

  1. Changes
    - Update the check constraint on jd_drafts.input_type to allow 'brief', 'upload', and 'link'
    - The current constraint only allows 'website' and 'manual' but the app uses 'brief', 'upload', and 'link'

  2. Security
    - Maintains data integrity with proper constraint validation
    - Allows the application to function with the intended input types
*/

-- Drop the existing constraint
ALTER TABLE jd_drafts DROP CONSTRAINT IF EXISTS jd_drafts_input_type_check;

-- Add the corrected constraint with the values the application actually uses
ALTER TABLE jd_drafts ADD CONSTRAINT jd_drafts_input_type_check 
  CHECK (input_type = ANY (ARRAY['brief'::text, 'upload'::text, 'link'::text]));