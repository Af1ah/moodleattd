-- ============================================================================
-- ATTENDANCE TABLES INDEXING OPTIMIZATION
-- ============================================================================
-- Purpose: Improve query performance for attendance-related tables
-- Date: 2024-11-20
-- Description: Creates additional indexes for frequently queried columns
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: mdl_attendance
-- Indexes: course lookups (already exists in Prisma)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS mdl_atte_cou_ix 
ON mdl_attendance(course);

CREATE INDEX IF NOT EXISTS mdl_atte_timemod_ix 
ON mdl_attendance(timemodified DESC);

-- Composite index for course + name searches
CREATE INDEX IF NOT EXISTS mdl_atte_cou_nam_ix 
ON mdl_attendance(course, name);


-- ----------------------------------------------------------------------------
-- TABLE: mdl_attendance_sessions
-- Indexes: Optimize session lookups by date, attendance, and group
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS mdl_attesess_att_ix 
ON mdl_attendance_sessions(attendanceid);

CREATE INDEX IF NOT EXISTS mdl_attesess_gro_ix 
ON mdl_attendance_sessions(groupid);

CREATE INDEX IF NOT EXISTS mdl_attesess_ses_ix 
ON mdl_attendance_sessions(sessdate DESC);

CREATE INDEX IF NOT EXISTS mdl_attesess_cal_ix 
ON mdl_attendance_sessions(caleventid);

-- Composite index for attendance + date range queries
CREATE INDEX IF NOT EXISTS mdl_attesess_att_ses_ix 
ON mdl_attendance_sessions(attendanceid, sessdate DESC);

-- Composite index for attendance + group + date
CREATE INDEX IF NOT EXISTS mdl_attesess_att_gro_ses_ix 
ON mdl_attendance_sessions(attendanceid, groupid, sessdate DESC);

-- Index for last taken queries
CREATE INDEX IF NOT EXISTS mdl_attesess_lastak_ix 
ON mdl_attendance_sessions(lasttaken DESC) 
WHERE lasttaken IS NOT NULL;

-- Index for modified sessions
CREATE INDEX IF NOT EXISTS mdl_attesess_timemod_ix 
ON mdl_attendance_sessions(timemodified DESC) 
WHERE timemodified IS NOT NULL;


-- ----------------------------------------------------------------------------
-- TABLE: mdl_attendance_log
-- Indexes: Optimize attendance record lookups
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS mdl_attelog_ses_ix 
ON mdl_attendance_log(sessionid);

CREATE INDEX IF NOT EXISTS mdl_attelog_stu_ix 
ON mdl_attendance_log(studentid);

CREATE INDEX IF NOT EXISTS mdl_attelog_sta_ix 
ON mdl_attendance_log(statusid);

-- Composite index for session + student lookups (most common query)
CREATE INDEX IF NOT EXISTS mdl_attelog_ses_stu_ix 
ON mdl_attendance_log(sessionid, studentid);

-- Composite index for student + status queries
CREATE INDEX IF NOT EXISTS mdl_attelog_stu_sta_ix 
ON mdl_attendance_log(studentid, statusid);

-- Index for timetaken queries
CREATE INDEX IF NOT EXISTS mdl_attelog_timetaken_ix 
ON mdl_attendance_log(timetaken DESC);

-- Index for taken by queries
CREATE INDEX IF NOT EXISTS mdl_attelog_takenby_ix 
ON mdl_attendance_log(takenby);


-- ----------------------------------------------------------------------------
-- TABLE: mdl_attendance_statuses
-- Indexes: Optimize status lookups
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS mdl_attestat_att_ix 
ON mdl_attendance_statuses(attendanceid);

CREATE INDEX IF NOT EXISTS mdl_attestat_del_ix 
ON mdl_attendance_statuses(deleted);

CREATE INDEX IF NOT EXISTS mdl_attestat_vis_ix 
ON mdl_attendance_statuses(visible);

-- Composite index for attendance + visible + not deleted (common filter)
CREATE INDEX IF NOT EXISTS mdl_attestat_att_vis_del_ix 
ON mdl_attendance_statuses(attendanceid, visible, deleted);

-- Index for acronym lookups
CREATE INDEX IF NOT EXISTS mdl_attestat_acr_ix 
ON mdl_attendance_statuses(acronym);

-- Index for grade-based queries
CREATE INDEX IF NOT EXISTS mdl_attestat_gra_ix 
ON mdl_attendance_statuses(grade DESC);


-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify all indexes are created:

/*
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN (
    'mdl_attendance',
    'mdl_attendance_sessions',
    'mdl_attendance_log',
    'mdl_attendance_statuses'
)
ORDER BY tablename, indexname;
*/

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================
-- 1. Composite indexes are used for queries that filter on multiple columns
-- 2. DESC indexes are used for date/time columns for chronological ordering
-- 3. Partial indexes (with WHERE clause) reduce index size
-- 4. Always test query performance with EXPLAIN ANALYZE before and after
-- ============================================================================
