-- Migration: Change semester uniqueness constraint
-- From: Unique per admission year
-- To: Globally unique across all admission years

-- Drop old unique constraint
ALTER TABLE mdl_semester_dates DROP CONSTRAINT IF EXISTS mdl_semdate_admsem_uix;

-- Add new unique constraint on semester name only
ALTER TABLE mdl_semester_dates ADD CONSTRAINT mdl_semdate_sem_uix UNIQUE (semestername);

-- Note: This enforces that each semester number (1-10) can only be used once
-- across all admission years. For example:
-- ✓ 2023: Semester 6
-- ✓ 2024: Semester 4  
-- ✓ 2025: Semester 2
-- ✗ 2023: Semester 2 (CONFLICT - already used by 2025!)
