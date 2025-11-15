# Role-Based Cohort Access - Implementation Summary

## What Was Implemented

A complete role-based access control system for cohort reports that restricts access based on Moodle user roles and explicit cohort assignments.

## Key Changes

### 1. Database Schema Updates (`prisma/schema.prisma`)
- Added `mdl_role` model
- Added `mdl_role_assignments` model
- Added `mdl_cohort_role_assignments` model (custom table)
- SQL script created: `create_cohort_role_assignments.sql`

### 2. New Services
- **`src/services/roleService.ts`**: Complete role management service
  - Get user roles from database
  - Check role permissions
  - Manage cohort assignments
  - Get non-student users for admin UI

### 3. Authentication Updates
- **`src/lib/session.ts`**: Added role fields to session interface
- **`src/app/api/login/route.ts`**: Fetches and returns user role on login
- **`src/components/AuthProvider.tsx`**: Stores and manages role in context
- **`src/app/login/page.tsx`**: Passes role info to auth context

### 4. New API Endpoints
- **`/api/cohortAssignments`** (GET/POST/DELETE): Manage cohort-user assignments
- **`/api/getAllCohorts`** (GET): Fetch all cohorts for admin
- **`/api/getCohorts`** (UPDATED): Filter cohorts by user role and assignments

### 5. Updated Pages
- **`src/app/report/cohort/page.tsx`**: Uses user role to filter cohorts
- **`src/app/admin/cohort-assignments/page.tsx`** (NEW): Admin interface for assignments

### 6. Documentation
- **`ROLE_BASED_COHORT_README.md`**: Complete system documentation
- **`create_cohort_role_assignments.sql`**: Database setup script

## Access Control Rules

| Role | Cohort Access |
|------|---------------|
| Student | ❌ None - cannot see cohort reports |
| Teacher | ✅ Only assigned cohorts |
| Editing Teacher | ✅ Only assigned cohorts |
| Course Creator | ✅ Only assigned cohorts |
| Manager | ✅ Only assigned cohorts + can manage assignments |

## Usage Instructions

### For Administrators
1. Login with manager role
2. Navigate to `/admin/cohort-assignments`
3. Expand a teacher's card
4. Click "Assign" next to cohorts to grant access
5. Click "Remove" to revoke access
6. Teachers can have multiple cohort assignments

### For Teachers
1. Login with teacher credentials
2. Navigate to `/report/cohort`
3. See dropdown with assigned cohorts only
4. Select a cohort to view its attendance report
5. Each cohort report is displayed separately

### For Students
- Students cannot access cohort reports
- Will see "Students do not have cohort access" message

## Database Setup

Run this command to create the custom table:

```bash
psql -U moodleuser -d moodle -f create_cohort_role_assignments.sql
```

## Testing Checklist

- [ ] Student cannot see cohort reports
- [ ] Teacher with no assignments sees "No cohorts assigned"
- [ ] Teacher with assignments sees only their cohorts
- [ ] Manager can access admin panel
- [ ] Admin can assign cohorts to teachers
- [ ] Admin can remove cohort assignments
- [ ] Multiple cohorts per teacher work correctly
- [ ] Each cohort report stays separate (no merging)

## Files Modified/Created

### Created
- `src/services/roleService.ts`
- `src/app/api/cohortAssignments/route.ts`
- `src/app/api/getAllCohorts/route.ts`
- `src/app/admin/cohort-assignments/page.tsx`
- `create_cohort_role_assignments.sql`
- `ROLE_BASED_COHORT_README.md`

### Modified
- `prisma/schema.prisma`
- `src/lib/session.ts`
- `src/app/api/login/route.ts`
- `src/app/api/getCohorts/route.ts`
- `src/components/AuthProvider.tsx`
- `src/app/login/page.tsx`
- `src/app/report/cohort/page.tsx`

## Next Steps

1. **Create the database table**:
   ```bash
   psql -U moodleuser -d moodle -f create_cohort_role_assignments.sql
   ```

2. **Regenerate Prisma client** (already done):
   ```bash
   npx prisma generate
   ```

3. **Test the system**:
   - Login as different role types
   - Test cohort assignment from admin panel
   - Verify access restrictions work

4. **Assign initial cohorts**:
   - Login as admin/manager
   - Go to `/admin/cohort-assignments`
   - Assign cohorts to teachers

## Important Notes

- The system checks roles from the Moodle database, not from session only
- Cohort assignments are stored in the custom `mdl_cohort_role_assignments` table
- Each cohort report remains separate - no merging of multiple cohorts
- Teachers can have unlimited cohort assignments
- The unique constraint ensures one assignment per user-cohort pair
- All access control is enforced server-side for security

## Security Features

✅ Server-side role verification  
✅ Database-level access filtering  
✅ No client-side permission trust  
✅ Foreign key constraints for data integrity  
✅ Unique constraints to prevent duplicates  
✅ Query parameter validation  

## Support & Troubleshooting

See `ROLE_BASED_COHORT_README.md` for:
- Detailed API documentation
- Troubleshooting guide
- Configuration details
- Future enhancement ideas
