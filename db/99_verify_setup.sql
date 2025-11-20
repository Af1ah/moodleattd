-- ============================================================================
-- DATABASE SETUP AND EXECUTION ORDER GUIDE
-- ============================================================================
-- Purpose: Master setup file with instructions for database initialization
-- Date: 2024-11-20
-- Description: Execute SQL files in the correct order for optimal setup
-- ============================================================================

-- ============================================================================
-- EXECUTION ORDER
-- ============================================================================
-- Run the SQL files in this order:
--
-- 1. 00_indexes_attendance.sql          - Attendance table indexes
-- 2. 01_indexes_users_cohorts_roles.sql - User/cohort/role indexes
-- 3. 02_create_cohort_role_assignments.sql - Custom table for cohort assignments
-- 4. 03_migration_add_selected_courses.sql - Add selected courses column
-- 5. 04_performance_optimization.sql    - Materialized views and maintenance
-- 6. 99_verify_setup.sql                - Verification queries (this file)
--
-- ============================================================================

-- ============================================================================
-- PREREQUISITES
-- ============================================================================
-- Before running these scripts, ensure:
-- 1. You have PostgreSQL installed and running
-- 2. The Moodle database exists and is accessible
-- 3. You have sufficient privileges (CREATE INDEX, CREATE TABLE, etc.)
-- 4. Prisma schema has been applied (prisma db push or migrate)
-- ============================================================================

-- ============================================================================
-- EXECUTION COMMANDS
-- ============================================================================
-- From terminal, execute in order:
--
-- psql -U your_username -d your_database -f db/00_indexes_attendance.sql
-- psql -U your_username -d your_database -f db/01_indexes_users_cohorts_roles.sql
-- psql -U your_username -d your_database -f db/02_create_cohort_role_assignments.sql
-- psql -U your_username -d your_database -f db/03_migration_add_selected_courses.sql
-- psql -U your_username -d your_database -f db/04_performance_optimization.sql
-- psql -U your_username -d your_database -f db/99_verify_setup.sql
--
-- Or execute all at once:
-- for f in db/*.sql; do psql -U your_username -d your_database -f "$f"; done
-- ============================================================================


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- 1. Check all indexes are created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename LIKE 'mdl_%'
ORDER BY tablename, indexname;


-- 2. Check table sizes and index usage
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - 
                   pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'mdl_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;


-- 3. Check materialized views exist
SELECT 
    schemaname,
    matviewname,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size,
    last_refresh
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY matviewname;


-- 4. Verify custom tables
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'mdl_cohort_role_assignments'
ORDER BY ordinal_position;


-- 5. Count records in key tables
SELECT 
    'mdl_attendance' as table_name, 
    COUNT(*) as record_count 
FROM mdl_attendance
UNION ALL
SELECT 
    'mdl_attendance_sessions', 
    COUNT(*) 
FROM mdl_attendance_sessions
UNION ALL
SELECT 
    'mdl_attendance_log', 
    COUNT(*) 
FROM mdl_attendance_log
UNION ALL
SELECT 
    'mdl_attendance_statuses', 
    COUNT(*) 
FROM mdl_attendance_statuses
UNION ALL
SELECT 
    'mdl_user', 
    COUNT(*) 
FROM mdl_user
UNION ALL
SELECT 
    'mdl_cohort', 
    COUNT(*) 
FROM mdl_cohort
UNION ALL
SELECT 
    'mdl_cohort_members', 
    COUNT(*) 
FROM mdl_cohort_members
UNION ALL
SELECT 
    'mdl_cohort_role_assignments', 
    COUNT(*) 
FROM mdl_cohort_role_assignments;


-- 6. Check index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND tablename LIKE 'mdl_%'
ORDER BY idx_scan DESC
LIMIT 30;


-- 7. Check for missing indexes on foreign keys
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    CASE 
        WHEN i.indexname IS NOT NULL THEN '✓ Indexed'
        ELSE '✗ NOT Indexed (consider adding)'
    END as index_status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
LEFT JOIN pg_indexes i
    ON i.tablename = tc.table_name
    AND i.indexdef ILIKE '%' || kcu.column_name || '%'
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name LIKE 'mdl_%'
ORDER BY tc.table_name, kcu.column_name;


-- 8. Database health check
SELECT 
    'Total database size' as metric,
    pg_size_pretty(pg_database_size(current_database())) as value
UNION ALL
SELECT 
    'Total tables size',
    pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename)))
FROM pg_tables
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Total indexes size',
    pg_size_pretty(SUM(pg_relation_size(indexrelid)))
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Number of tables',
    COUNT(*)::text
FROM pg_tables
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Number of indexes',
    COUNT(*)::text
FROM pg_indexes
WHERE schemaname = 'public';


-- ============================================================================
-- PERFORMANCE TESTING QUERIES
-- ============================================================================

-- Test 1: Attendance log lookup by session (should use index)
EXPLAIN ANALYZE
SELECT * FROM mdl_attendance_log
WHERE sessionid = (SELECT id FROM mdl_attendance_sessions LIMIT 1);

-- Test 2: Student attendance history (should use composite index)
EXPLAIN ANALYZE
SELECT 
    s.*,
    al.statusid,
    st.acronym
FROM mdl_attendance_sessions s
JOIN mdl_attendance_log al ON s.id = al.sessionid
JOIN mdl_attendance_statuses st ON al.statusid = st.id
WHERE al.studentid = (SELECT id FROM mdl_user WHERE deleted = 0 LIMIT 1)
AND s.sessdate > (EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days'))::bigint
ORDER BY s.sessdate DESC;

-- Test 3: Cohort members lookup (should use index)
EXPLAIN ANALYZE
SELECT 
    c.name,
    COUNT(cm.userid) as member_count
FROM mdl_cohort c
LEFT JOIN mdl_cohort_members cm ON c.id = cm.cohortid
WHERE c.visible = 1
GROUP BY c.id, c.name;


-- ============================================================================
-- SUCCESS INDICATORS
-- ============================================================================
-- After running all scripts, you should see:
-- ✓ All indexes created without errors
-- ✓ mdl_cohort_role_assignments table exists with proper constraints
-- ✓ Materialized views created successfully
-- ✓ Foreign key indexes are in place
-- ✓ Query execution plans use indexes (look for "Index Scan" in EXPLAIN)
-- ✓ No table bloat warnings
-- ============================================================================

-- ============================================================================
-- MAINTENANCE REMINDER
-- ============================================================================
-- Schedule these tasks:
-- 1. Daily: VACUUM ANALYZE (at off-peak hours)
-- 2. Hourly: Refresh materialized views during school hours
-- 3. Weekly: Review index usage statistics
-- 4. Monthly: Check for table bloat and run VACUUM FULL if needed
-- ============================================================================
