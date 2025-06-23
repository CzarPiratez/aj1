/*
  # Fix JD Drafts Input Type Constraint

  1. Problem Analysis
    - Current constraint allows: 'website', 'manual'
    - Application expects: 'brief', 'upload', 'link'
    - Existing data has mixed values causing constraint violations

  2. Solution
    - First remove constraint completely
    - Then update all data to match application expectations
    - Finally add new constraint with correct values

  3. Data Mapping
    - 'website' → 'link' (URL-based inputs)
    - 'manual' → 'brief' (text/file-based inputs)
    - Keep any existing correct values
*/

-- Step 1: Remove the existing constraint completely to avoid conflicts
ALTER TABLE jd_drafts DROP CONSTRAINT IF EXISTS jd_drafts_input_type_check;

-- Step 2: Update all existing data to use the application's expected values
UPDATE jd_drafts 
SET input_type = CASE 
  WHEN input_type = 'website' THEN 'link'
  WHEN input_type = 'manual' THEN 'brief'
  WHEN input_type = 'link' THEN 'link'      -- Keep existing correct values
  WHEN input_type = 'brief' THEN 'brief'    -- Keep existing correct values  
  WHEN input_type = 'upload' THEN 'upload'  -- Keep existing correct values
  ELSE 'brief'  -- Safe fallback for any unexpected values
END;

-- Step 3: Verify the update worked by checking what values exist
-- (This is just for verification, the constraint will enforce it)

-- Step 4: Add the new constraint with the values the application uses
ALTER TABLE jd_drafts ADD CONSTRAINT jd_drafts_input_type_check 
  CHECK (input_type IN ('brief', 'upload', 'link'));