-- ============================================================================
-- APPLY PERFORMANCE INDEXES FOR ATTENDANCE
-- ============================================================================
-- This script applies the critical composite index for performance optimization
-- Run this on your production database to improve query performance
-- ============================================================================

-- Critical composite index for session + status joins (NEW)
-- This significantly improves the performance of queries that join logs with status
CREATE INDEX CONCURRENTLY IF NOT EXISTS mdl_attelog_ses_sta_ix 
ON mdl_attendance_log(sessionid, statusid);

-- Verify the index was created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'mdl_attendance_log' 
  AND indexname = 'mdl_attelog_ses_sta_ix';

-- Show query plan for typical attendance query (example)
EXPLAIN ANALYZE
SELECT 
    al.id,
    al.sessionid,
    al.studentid,
    al.statusid,
    al.timetaken,
    al.takenby,
    al.remarks,
    ats.acronym,
    ats.description,
    ats.grade
FROM mdl_attendance_log al
INNER JOIN mdl_attendance_statuses ats ON al.statusid = ats.id
INNER JOIN mdl_attendance_sessions ases ON al.sessionid = ases.id
WHERE ases.attendanceid IN (
    SELECT id FROM mdl_attendance WHERE course = 8
)
LIMIT 100;
