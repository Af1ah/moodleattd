-- Migration: Create semester dates table
-- This script creates a table to store semester date ranges for each admission year

BEGIN;

-- Create the semester dates table
CREATE TABLE IF NOT EXISTS mdl_semester_dates (
    id BIGSERIAL PRIMARY KEY,
    admissionyear VARCHAR(4) NOT NULL,
    semestername VARCHAR(50) NOT NULL,
    startdate DATE NOT NULL,
    enddate DATE NOT NULL,
    iscurrent BOOLEAN DEFAULT FALSE,
    timecreated BIGINT NOT NULL,
    timemodified BIGINT NOT NULL,
    createdby BIGINT NOT NULL,
    CONSTRAINT mdl_semdate_admsem_uix UNIQUE (admissionyear, semestername)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS mdl_semdate_adm_ix ON mdl_semester_dates (admissionyear);
CREATE INDEX IF NOT EXISTS mdl_semdate_cur_ix ON mdl_semester_dates (iscurrent);

-- Add some example data (optional - remove or modify as needed)
-- INSERT INTO mdl_semester_dates (admissionyear, semestername, startdate, enddate, iscurrent, timecreated, timemodified, createdby)
-- VALUES 
--   ('2023', 'Semester 1', '2023-09-01', '2023-12-31', false, EXTRACT(EPOCH FROM NOW()), EXTRACT(EPOCH FROM NOW()), 2),
--   ('2024', 'Semester 1', '2024-09-01', '2024-12-31', true, EXTRACT(EPOCH FROM NOW()), EXTRACT(EPOCH FROM NOW()), 2),
--   ('2025', 'Semester 1', '2025-09-01', '2025-12-31', false, EXTRACT(EPOCH FROM NOW()), EXTRACT(EPOCH FROM NOW()), 2);

-- Verify the table was created
SELECT 
    tablename, 
    schemaname
FROM pg_tables 
WHERE tablename = 'mdl_semester_dates';

-- Show table structure
\d mdl_semester_dates

COMMIT;
