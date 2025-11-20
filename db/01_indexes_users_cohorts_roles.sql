-- ============================================================================
-- USER, COHORT, AND ROLE TABLES INDEXING OPTIMIZATION
-- ============================================================================
-- Purpose: Improve query performance for user, cohort, and role-related tables
-- Date: 2024-11-20
-- Description: Creates additional indexes for frequently queried columns
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: mdl_user
-- Indexes: User lookup optimization
-- ----------------------------------------------------------------------------
-- Basic indexes (already exist in Prisma schema)
CREATE INDEX IF NOT EXISTS mdl_user_aut_ix ON mdl_user(auth);
CREATE INDEX IF NOT EXISTS mdl_user_con_ix ON mdl_user(confirmed);
CREATE INDEX IF NOT EXISTS mdl_user_del_ix ON mdl_user(deleted);
CREATE INDEX IF NOT EXISTS mdl_user_fir_ix ON mdl_user(firstname);
CREATE INDEX IF NOT EXISTS mdl_user_las_ix ON mdl_user(lastname);
CREATE INDEX IF NOT EXISTS mdl_user_cit_ix ON mdl_user(city);
CREATE INDEX IF NOT EXISTS mdl_user_cou_ix ON mdl_user(country);
CREATE INDEX IF NOT EXISTS mdl_user_ema_ix ON mdl_user(email);
CREATE INDEX IF NOT EXISTS mdl_user_idn_ix ON mdl_user(idnumber);
CREATE INDEX IF NOT EXISTS mdl_user_las2_ix ON mdl_user(lastaccess);

-- Composite index for active user lookups (most common query)
CREATE INDEX IF NOT EXISTS mdl_user_del_sus_ix 
ON mdl_user(deleted, suspended) 
WHERE deleted = 0 AND suspended = 0;

-- Composite index for name searches
CREATE INDEX IF NOT EXISTS mdl_user_fir_las_ix 
ON mdl_user(firstname, lastname);

-- Index for login tracking
CREATE INDEX IF NOT EXISTS mdl_user_lastlog_ix 
ON mdl_user(lastlogin DESC);

-- Index for user authentication lookups
CREATE INDEX IF NOT EXISTS mdl_user_use_aut_del_ix 
ON mdl_user(username, auth, deleted);

-- Full text search index for user names (optional - for advanced search)
-- CREATE INDEX IF NOT EXISTS mdl_user_fullname_gin_ix 
-- ON mdl_user USING gin(to_tsvector('english', firstname || ' ' || lastname));


-- ----------------------------------------------------------------------------
-- TABLE: mdl_cohort
-- Indexes: Cohort lookup optimization
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS mdl_coho_con_ix 
ON mdl_cohort(contextid);

-- Index for visible cohorts
CREATE INDEX IF NOT EXISTS mdl_coho_vis_ix 
ON mdl_cohort(visible);

-- Composite index for context + visible queries
CREATE INDEX IF NOT EXISTS mdl_coho_con_vis_ix 
ON mdl_cohort(contextid, visible);

-- Index for cohort name searches
CREATE INDEX IF NOT EXISTS mdl_coho_nam_ix 
ON mdl_cohort(name);

-- Index for idnumber lookups
CREATE INDEX IF NOT EXISTS mdl_coho_idn_ix 
ON mdl_cohort(idnumber) 
WHERE idnumber IS NOT NULL;

-- Index for component-based queries
CREATE INDEX IF NOT EXISTS mdl_coho_com_ix 
ON mdl_cohort(component);

-- Time-based indexes
CREATE INDEX IF NOT EXISTS mdl_coho_timecre_ix 
ON mdl_cohort(timecreated DESC);

CREATE INDEX IF NOT EXISTS mdl_coho_timemod_ix 
ON mdl_cohort(timemodified DESC);


-- ----------------------------------------------------------------------------
-- TABLE: mdl_cohort_members
-- Indexes: Cohort membership optimization
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS mdl_cohomemb_coh_ix 
ON mdl_cohort_members(cohortid);

CREATE INDEX IF NOT EXISTS mdl_cohomemb_use_ix 
ON mdl_cohort_members(userid);

-- Composite index for reverse lookups (all cohorts for a user)
CREATE INDEX IF NOT EXISTS mdl_cohomemb_use_coh_ix 
ON mdl_cohort_members(userid, cohortid);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS mdl_cohomemb_timead_ix 
ON mdl_cohort_members(timeadded DESC);

-- Composite index for cohort + time (membership history)
CREATE INDEX IF NOT EXISTS mdl_cohomemb_coh_timead_ix 
ON mdl_cohort_members(cohortid, timeadded DESC);


-- ----------------------------------------------------------------------------
-- TABLE: mdl_role
-- Indexes: Role lookup optimization
-- ----------------------------------------------------------------------------
-- Index for role shortname (already has unique constraint)
CREATE INDEX IF NOT EXISTS mdl_role_arc_ix 
ON mdl_role(archetype);

-- Index for active/visible roles
CREATE INDEX IF NOT EXISTS mdl_role_sor_ix 
ON mdl_role(sortorder);


-- ----------------------------------------------------------------------------
-- TABLE: mdl_role_assignments
-- Indexes: Role assignment optimization
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS mdl_roleassi_rol_ix 
ON mdl_role_assignments(roleid);

CREATE INDEX IF NOT EXISTS mdl_roleassi_con_ix 
ON mdl_role_assignments(contextid);

CREATE INDEX IF NOT EXISTS mdl_roleassi_use_ix 
ON mdl_role_assignments(userid);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS mdl_roleassi_rolcon_ix 
ON mdl_role_assignments(roleid, contextid);

CREATE INDEX IF NOT EXISTS mdl_roleassi_use_rol_ix 
ON mdl_role_assignments(userid, roleid);

CREATE INDEX IF NOT EXISTS mdl_roleassi_use_con_ix 
ON mdl_role_assignments(userid, contextid);

CREATE INDEX IF NOT EXISTS mdl_roleassi_comiteuse_ix 
ON mdl_role_assignments(component, itemid, userid);

-- Index for modifier tracking
CREATE INDEX IF NOT EXISTS mdl_roleassi_mod_ix 
ON mdl_role_assignments(modifierid);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS mdl_roleassi_timemod_ix 
ON mdl_role_assignments(timemodified DESC);


-- ----------------------------------------------------------------------------
-- TABLE: mdl_cohort_role_assignments (Custom table)
-- Indexes: Teacher/Manager cohort access optimization
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS mdl_cohoroleass_coh_ix 
ON mdl_cohort_role_assignments(cohortid);

CREATE INDEX IF NOT EXISTS mdl_cohoroleass_use_ix 
ON mdl_cohort_role_assignments(userid);

CREATE INDEX IF NOT EXISTS mdl_cohoroleass_rol_ix 
ON mdl_cohort_role_assignments(roleid);

-- Composite indexes for common access patterns
CREATE INDEX IF NOT EXISTS mdl_cohoroleass_use_rol_ix 
ON mdl_cohort_role_assignments(userid, roleid);

CREATE INDEX IF NOT EXISTS mdl_cohoroleass_coh_rol_ix 
ON mdl_cohort_role_assignments(cohortid, roleid);

-- Index for assigned by tracking
CREATE INDEX IF NOT EXISTS mdl_cohoroleass_assigby_ix 
ON mdl_cohort_role_assignments(assignedby);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS mdl_cohoroleass_timeas_ix 
ON mdl_cohort_role_assignments(timeassigned DESC);

-- Partial index for courses filter (when selectedcourses is not null)
CREATE INDEX IF NOT EXISTS mdl_cohoroleass_selcou_ix 
ON mdl_cohort_role_assignments(userid) 
WHERE selectedcourses IS NOT NULL;


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
    'mdl_user',
    'mdl_cohort',
    'mdl_cohort_members',
    'mdl_role',
    'mdl_role_assignments',
    'mdl_cohort_role_assignments'
)
ORDER BY tablename, indexname;
*/

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================
-- 1. Indexes on foreign keys improve JOIN performance
-- 2. Composite indexes should match your most frequent WHERE clause combinations
-- 3. Partial indexes (with WHERE clause) reduce index size and improve specificity
-- 4. Consider VACUUM ANALYZE after creating indexes
-- 5. Monitor index usage with pg_stat_user_indexes
-- ============================================================================
