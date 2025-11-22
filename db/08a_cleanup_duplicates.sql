-- Clean up duplicate semesters before applying unique constraint
-- Keep only the current/most recent semester for each admission year

-- First, let's see what we have
SELECT admissionyear, semestername, iscurrent, startdate, enddate 
FROM mdl_semester_dates 
ORDER BY admissionyear, semestername;

-- Delete all non-current semesters, keeping only one per admission year
DELETE FROM mdl_semester_dates 
WHERE id NOT IN (
  SELECT DISTINCT ON (admissionyear) id
  FROM mdl_semester_dates
  ORDER BY admissionyear, iscurrent DESC, id DESC
);

-- Now verify we have only one row per admission year
SELECT admissionyear, semestername, iscurrent, startdate, enddate 
FROM mdl_semester_dates 
ORDER BY admissionyear;
