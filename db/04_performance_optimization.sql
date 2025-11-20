-- ============================================================================
-- COMPREHENSIVE PERFORMANCE OPTIMIZATION
-- ============================================================================
-- Purpose: Additional performance improvements for Moodle attendance system
-- Date: 2024-11-20
-- Description: Materialized views, partition strategies, and maintenance tasks
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ANALYZE STATISTICS UPDATE
-- Keep statistics up-to-date for query planner
-- ----------------------------------------------------------------------------
ANALYZE mdl_attendance;
ANALYZE mdl_attendance_sessions;
ANALYZE mdl_attendance_log;
ANALYZE mdl_attendance_statuses;
ANALYZE mdl_user;
ANALYZE mdl_cohort;
ANALYZE mdl_cohort_members;
ANALYZE mdl_role;
ANALYZE mdl_role_assignments;
ANALYZE mdl_cohort_role_assignments;


-- ----------------------------------------------------------------------------
-- MATERIALIZED VIEW: Active Student Attendance Summary
-- Pre-compute attendance statistics for faster reporting
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_student_attendance_summary AS
SELECT 
    al.studentid,
    u.firstname,
    u.lastname,
    u.email,
    s.attendanceid,
    a.course,
    a.name as attendance_name,
    COUNT(*) as total_sessions,
    SUM(CASE WHEN st.acronym = 'P' THEN 1 ELSE 0 END) as present_count,
    SUM(CASE WHEN st.acronym = 'A' THEN 1 ELSE 0 END) as absent_count,
    SUM(CASE WHEN st.acronym = 'L' THEN 1 ELSE 0 END) as late_count,
    SUM(CASE WHEN st.acronym = 'E' THEN 1 ELSE 0 END) as excused_count,
    ROUND(
        (SUM(CASE WHEN st.acronym = 'P' THEN 1 ELSE 0 END)::numeric / 
        NULLIF(COUNT(*), 0) * 100), 2
    ) as attendance_percentage,
    MAX(s.sessdate) as last_session_date,
    MAX(al.timetaken) as last_taken
FROM mdl_attendance_log al
JOIN mdl_attendance_sessions s ON al.sessionid = s.id
JOIN mdl_attendance a ON s.attendanceid = a.id
JOIN mdl_user u ON al.studentid = u.id
JOIN mdl_attendance_statuses st ON al.statusid = st.id
WHERE u.deleted = 0 AND u.suspended = 0
GROUP BY 
    al.studentid, 
    u.firstname, 
    u.lastname, 
    u.email,
    s.attendanceid,
    a.course,
    a.name;

-- Create indexes on materialized view
CREATE INDEX IF NOT EXISTS mv_stuattesum_stu_ix 
ON mv_student_attendance_summary(studentid);

CREATE INDEX IF NOT EXISTS mv_stuattesum_att_ix 
ON mv_student_attendance_summary(attendanceid);

CREATE INDEX IF NOT EXISTS mv_stuattesum_cou_ix 
ON mv_student_attendance_summary(course);

CREATE INDEX IF NOT EXISTS mv_stuattesum_per_ix 
ON mv_student_attendance_summary(attendance_percentage DESC);


-- ----------------------------------------------------------------------------
-- MATERIALIZED VIEW: Cohort Attendance Summary
-- Pre-compute cohort-level statistics
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_cohort_attendance_summary AS
SELECT 
    c.id as cohort_id,
    c.name as cohort_name,
    c.idnumber as cohort_idnumber,
    a.course,
    a.name as attendance_name,
    COUNT(DISTINCT cm.userid) as total_students,
    COUNT(DISTINCT s.id) as total_sessions,
    SUM(CASE WHEN st.acronym = 'P' THEN 1 ELSE 0 END) as total_present,
    SUM(CASE WHEN st.acronym = 'A' THEN 1 ELSE 0 END) as total_absent,
    ROUND(
        (SUM(CASE WHEN st.acronym = 'P' THEN 1 ELSE 0 END)::numeric / 
        NULLIF(COUNT(al.id), 0) * 100), 2
    ) as cohort_attendance_percentage,
    MAX(s.sessdate) as last_session_date
FROM mdl_cohort c
JOIN mdl_cohort_members cm ON c.id = cm.cohortid
JOIN mdl_user u ON cm.userid = u.id
JOIN mdl_attendance_log al ON u.id = al.studentid
JOIN mdl_attendance_sessions s ON al.sessionid = s.id
JOIN mdl_attendance a ON s.attendanceid = a.id
JOIN mdl_attendance_statuses st ON al.statusid = st.id
WHERE u.deleted = 0 AND u.suspended = 0 AND c.visible = 1
GROUP BY 
    c.id,
    c.name,
    c.idnumber,
    a.course,
    a.name;

-- Create indexes on materialized view
CREATE INDEX IF NOT EXISTS mv_cohattesum_coh_ix 
ON mv_cohort_attendance_summary(cohort_id);

CREATE INDEX IF NOT EXISTS mv_cohattesum_cou_ix 
ON mv_cohort_attendance_summary(course);

CREATE INDEX IF NOT EXISTS mv_cohattesum_per_ix 
ON mv_cohort_attendance_summary(cohort_attendance_percentage DESC);


-- ----------------------------------------------------------------------------
-- FUNCTION: Refresh Materialized Views
-- Call this function periodically to update the statistics
-- Note: This function is compatible with PgBouncer transaction pooling
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_attendance_materialized_views()
RETURNS TABLE(status text, message text) AS $$
BEGIN
    -- Refresh student attendance summary
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_student_attendance_summary;
        RETURN QUERY SELECT 'success'::text, 'Student attendance summary refreshed'::text;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'error'::text, SQLERRM::text;
    END;
    
    -- Refresh cohort attendance summary
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cohort_attendance_summary;
        RETURN QUERY SELECT 'success'::text, 'Cohort attendance summary refreshed'::text;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'error'::text, SQLERRM::text;
    END;
    
    RETURN;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Grant execute permission (adjust role as needed)
-- GRANT EXECUTE ON FUNCTION refresh_attendance_materialized_views() TO moodle_app_role;


-- ----------------------------------------------------------------------------
-- RECOMMENDED MAINTENANCE TASKS
-- ----------------------------------------------------------------------------

-- 1. Schedule regular VACUUM ANALYZE (e.g., daily at off-peak hours)
/*
-- Example cron job (adjust timing as needed):
-- 0 2 * * * psql -U moodle_user -d moodle_db -c "VACUUM ANALYZE;"
*/

-- 2. Refresh materialized views (e.g., hourly during school hours)
/*
-- Example cron job:
-- 0 * * * * psql -U moodle_user -d moodle_db -c "SELECT refresh_attendance_materialized_views();"
*/

-- 3. Monitor index usage
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
*/

-- 4. Identify unused indexes (consider dropping if idx_scan is 0 after reasonable time)
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0 
AND indexrelname NOT LIKE '%pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
*/

-- 5. Check table bloat
/*
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - 
                   pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
*/


-- ============================================================================
-- QUERY OPTIMIZATION EXAMPLES
-- ============================================================================

-- Example 1: Use materialized view for student reports
/*
SELECT * FROM mv_student_attendance_summary
WHERE studentid = 123
ORDER BY course, attendance_name;
*/

-- Example 2: Use materialized view for cohort reports
/*
SELECT * FROM mv_cohort_attendance_summary
WHERE cohort_id = 456
ORDER BY course, attendance_name;
*/

-- Example 3: Efficient session lookup with date range
/*
SELECT s.*, a.name as attendance_name
FROM mdl_attendance_sessions s
JOIN mdl_attendance a ON s.attendanceid = a.id
WHERE s.attendanceid = 789
AND s.sessdate BETWEEN 1700000000 AND 1700086400
ORDER BY s.sessdate DESC;
*/


-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================
-- 1. Materialized views provide fast read access but need periodic refresh
-- 2. Use CONCURRENTLY option for refresh to avoid locking
-- 3. Schedule maintenance tasks during low-traffic periods
-- 4. Monitor query performance with EXPLAIN ANALYZE
-- 5. Consider partitioning large tables (e.g., attendance_log by year)
-- 6. Use connection pooling in application layer
-- ============================================================================
