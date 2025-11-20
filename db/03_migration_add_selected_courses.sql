-- Migration: Add selected courses field to cohort role assignments
-- Date: 2024-11-18
-- Description: Adds a 'selectedcourses' column to store course selections for each cohort assignment

-- Add the selectedcourses column to mdl_cohort_role_assignments table
ALTER TABLE mdl_cohort_role_assignments 
ADD COLUMN selectedcourses TEXT NULL;

-- Add a comment to the column
COMMENT ON COLUMN mdl_cohort_role_assignments.selectedcourses IS 'JSON array of selected course IDs for this cohort assignment';

-- Verify the migration
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'mdl_cohort_role_assignments' 
AND column_name = 'selectedcourses';
