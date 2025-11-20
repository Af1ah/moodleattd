-- Create table for cohort-role assignments
-- This allows non-student roles (teachers, managers, etc.) to be assigned to cohorts

CREATE TABLE IF NOT EXISTS mdl_cohort_role_assignments (
  id BIGSERIAL PRIMARY KEY,
  cohortid BIGINT NOT NULL,
  userid BIGINT NOT NULL,
  roleid BIGINT NOT NULL,
  timeassigned BIGINT NOT NULL,
  assignedby BIGINT NOT NULL,
  CONSTRAINT mdl_cohoroleass_cohuse_uix UNIQUE (cohortid, userid)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS mdl_cohoroleass_coh_ix ON mdl_cohort_role_assignments(cohortid);
CREATE INDEX IF NOT EXISTS mdl_cohoroleass_use_ix ON mdl_cohort_role_assignments(userid);
CREATE INDEX IF NOT EXISTS mdl_cohoroleass_rol_ix ON mdl_cohort_role_assignments(roleid);

-- Add foreign key constraints
ALTER TABLE mdl_cohort_role_assignments
  ADD CONSTRAINT mdl_cohoroleass_coh_fk 
  FOREIGN KEY (cohortid) REFERENCES mdl_cohort(id) ON DELETE CASCADE;

ALTER TABLE mdl_cohort_role_assignments
  ADD CONSTRAINT mdl_cohoroleass_use_fk 
  FOREIGN KEY (userid) REFERENCES mdl_user(id) ON DELETE CASCADE;

ALTER TABLE mdl_cohort_role_assignments
  ADD CONSTRAINT mdl_cohoroleass_rol_fk 
  FOREIGN KEY (roleid) REFERENCES mdl_role(id) ON DELETE CASCADE;

COMMENT ON TABLE mdl_cohort_role_assignments IS 'Maps non-student users (teachers, managers) to cohorts they can access';
COMMENT ON COLUMN mdl_cohort_role_assignments.cohortid IS 'ID of the cohort';
COMMENT ON COLUMN mdl_cohort_role_assignments.userid IS 'ID of the user (teacher/manager)';
COMMENT ON COLUMN mdl_cohort_role_assignments.roleid IS 'ID of the role of the user';
COMMENT ON COLUMN mdl_cohort_role_assignments.timeassigned IS 'Unix timestamp when assignment was created';
COMMENT ON COLUMN mdl_cohort_role_assignments.assignedby IS 'User ID who created this assignment';
