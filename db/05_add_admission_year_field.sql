-- Migration: Add Admission Year custom user field
-- This script creates a custom user profile field for admission year
-- and populates it based on cohort names

BEGIN;

-- Create the custom user profile field for admission year
INSERT INTO mdl_user_info_field
(shortname, name, datatype, description, descriptionformat, categoryid, sortorder, required, locked, visible, forceunique, signup, defaultdata, defaultdataformat, param1, param2, param3, param4, param5)
VALUES
('adm_year', 'Admission Year', 'text', 'Admission year (e.g. 2024)', 0, 1, 1, 0, 0, 1, 0, 0, '', 0, NULL, NULL, NULL, NULL, NULL)
RETURNING id;

-- Note: Replace X with the field ID returned above before running the next queries
-- You can get it by running: SELECT id FROM mdl_user_info_field WHERE shortname = 'adm_year';

-- Insert admission year data for users who don't have it yet
-- Checks for full year (2023, 2024, 2025) or short year (23, 24, 25) in cohort name
INSERT INTO mdl_user_info_data (userid, fieldid, data)
SELECT DISTINCT cm.userid, 
    (SELECT id FROM mdl_user_info_field WHERE shortname = 'adm_year'),
    CASE
      WHEN c.name ILIKE '%2023%' OR c.name ILIKE '%23%' THEN '2023'
      WHEN c.name ILIKE '%2024%' OR c.name ILIKE '%24%' THEN '2024'
      WHEN c.name ILIKE '%2025%' OR c.name ILIKE '%25%' THEN '2025'
      ELSE ''
    END AS data
FROM mdl_cohort_members cm
JOIN mdl_cohort c ON cm.cohortid = c.id
LEFT JOIN mdl_user_info_data d ON d.userid = cm.userid 
    AND d.fieldid = (SELECT id FROM mdl_user_info_field WHERE shortname = 'adm_year')
WHERE d.userid IS NULL
  AND (c.name ILIKE '%2023%' OR c.name ILIKE '%2024%' OR c.name ILIKE '%2025%'
       OR c.name ILIKE '%23%' OR c.name ILIKE '%24%' OR c.name ILIKE '%25%');

-- Update existing admission year data based on cohort names
-- This will update records that already exist but may need correction
UPDATE mdl_user_info_data d
SET data = CASE
    WHEN c.name ILIKE '%2023%' OR c.name ILIKE '%23%' THEN '2023'
    WHEN c.name ILIKE '%2024%' OR c.name ILIKE '%24%' THEN '2024'
    WHEN c.name ILIKE '%2025%' OR c.name ILIKE '%25%' THEN '2025'
    ELSE d.data
END
FROM mdl_cohort_members cm
JOIN mdl_cohort c ON cm.cohortid = c.id
WHERE d.userid = cm.userid
  AND d.fieldid = (SELECT id FROM mdl_user_info_field WHERE shortname = 'adm_year')
  AND (c.name ILIKE '%2023%' OR c.name ILIKE '%2024%' OR c.name ILIKE '%2025%'
       OR c.name ILIKE '%23%' OR c.name ILIKE '%24%' OR c.name ILIKE '%25%');

-- Verify the results
SELECT 
    COUNT(DISTINCT d.userid) as users_with_admission_year,
    d.data as admission_year
FROM mdl_user_info_data d
WHERE d.fieldid = (SELECT id FROM mdl_user_info_field WHERE shortname = 'adm_year')
GROUP BY d.data
ORDER BY d.data;

COMMIT;
