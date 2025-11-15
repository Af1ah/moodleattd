# Role-Based Cohort Access System

## Overview

This system implements role-based access control for cohort reports in the Moodle Attendance application. It ensures that:
- **Students**: Cannot access cohort reports
- **Teachers/Managers/Editing Teachers**: Can only access cohorts specifically assigned to them
- **Administrators (Managers)**: Can assign cohorts to teachers and manage access

## Database Schema

### New Tables

#### 1. `mdl_role` (Existing Moodle Table)
Stores all Moodle roles.

```sql
id | name | shortname      | description | sortorder | archetype
---+------+----------------+-------------+-----------+----------------
 1 |      | manager        |             |         1 | manager
 2 |      | coursecreator  |             |         2 | coursecreator
 3 |      | editingteacher |             |         3 | editingteacher
 4 |      | teacher        |             |         4 | teacher
 5 |      | student        |             |         5 | student
```

#### 2. `mdl_role_assignments` (Existing Moodle Table)
Maps users to their roles in specific contexts.

```sql
id | roleid | contextid | userid | timemodified | modifierid | component | itemid | sortorder
```

#### 3. `mdl_cohort_role_assignments` (New Custom Table)
Maps non-student users to cohorts they can access.

```sql
CREATE TABLE mdl_cohort_role_assignments (
  id BIGSERIAL PRIMARY KEY,
  cohortid BIGINT NOT NULL,
  userid BIGINT NOT NULL,
  roleid BIGINT NOT NULL,
  timeassigned BIGINT NOT NULL,
  assignedby BIGINT NOT NULL,
  CONSTRAINT mdl_cohoroleass_cohuse_uix UNIQUE (cohortid, userid)
);
```

To create this table, run:
```bash
psql -U moodleuser -d moodle -f create_cohort_role_assignments.sql
```

## Architecture

### 1. Authentication & Role Detection

When a user logs in (`/api/login`):
1. Validates credentials with Moodle
2. Fetches user ID from Moodle API
3. Queries `mdl_role_assignments` to get user's primary role
4. Stores token, userId, and role info in localStorage

### 2. Session Management

The `AuthProvider` component now stores:
```typescript
{
  token: string | null;
  userId: number | null;
  role: {
    roleId: number;
    roleName: string;
    roleShortname: string;
  } | null;
}
```

### 3. Cohort Filtering

The `/api/getCohorts` endpoint:
- Accepts `userId` and `roleShortname` as query parameters
- Returns empty array for students
- Returns only assigned cohorts for teachers/managers
- Uses `mdl_cohort_role_assignments` to determine access

### 4. Admin Interface

Located at `/admin/cohort-assignments`:
- Lists all non-student users (teachers, managers, etc.)
- Shows current cohort assignments for each user
- Allows assigning/removing cohorts
- Supports multiple cohort assignments per user

## API Endpoints

### GET `/api/getCohorts`
Get cohorts based on user role and assignments.

**Query Parameters:**
- `userId` (required): The user's ID
- `roleShortname` (required): The user's role shortname

**Response:**
```json
{
  "success": true,
  "totalCohorts": 2,
  "cohorts": [
    {
      "id": 1,
      "name": "2024 Spring Cohort",
      "idnumber": "2024-spring",
      "description": "Spring 2024 students",
      "contextid": 1,
      "timecreated": 1234567890,
      "timemodified": 1234567890
    }
  ]
}
```

### GET `/api/getAllCohorts`
Get all cohorts (admin only - no filtering).

**Response:**
```json
{
  "success": true,
  "totalCohorts": 5,
  "cohorts": [...]
}
```

### GET `/api/cohortAssignments`
Get all non-student users with their cohort assignments.

**Response:**
```json
{
  "success": true,
  "totalUsers": 10,
  "users": [
    {
      "id": 2,
      "username": "teacher1",
      "firstname": "John",
      "lastname": "Doe",
      "email": "john@example.com",
      "roles": [
        {
          "id": 3,
          "shortname": "editingteacher",
          "name": ""
        }
      ],
      "cohorts": [
        {
          "cohortId": 1,
          "cohortName": "2024 Spring Cohort",
          "cohortIdnumber": "2024-spring",
          "roleId": 3,
          "timeAssigned": 1234567890
        }
      ]
    }
  ]
}
```

### POST `/api/cohortAssignments`
Assign a cohort to a user.

**Request Body:**
```json
{
  "cohortId": 1,
  "userId": 2,
  "roleId": 3,
  "assignedBy": 1
}
```

**Response:**
```json
{
  "success": true,
  "assignment": {
    "id": 1,
    "cohortId": 1,
    "userId": 2,
    "roleId": 3,
    "timeAssigned": 1234567890
  },
  "message": "Cohort assigned successfully"
}
```

### DELETE `/api/cohortAssignments`
Remove a cohort assignment from a user.

**Request Body:**
```json
{
  "cohortId": 1,
  "userId": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cohort assignment removed successfully"
}
```

## Services

### `roleService.ts`

Key functions:
- `getUserRole(userId)` - Get user's primary role
- `isNonStudentRole(roleShortname)` - Check if role has cohort access
- `getUserAssignedCohorts(userId)` - Get cohort IDs assigned to user
- `assignCohortToUser(cohortId, userId, roleId, assignedBy)` - Assign cohort
- `removeCohortFromUser(cohortId, userId)` - Remove assignment
- `getNonStudentUsers()` - Get all teachers/managers for admin UI
- `getUserCohortAssignmentsWithDetails(userId)` - Get cohort details for user

## User Flow

### For Students
1. Login → Role detected as "student"
2. Navigate to Cohort Reports → See "Students do not have cohort access" message
3. No cohorts visible

### For Teachers/Managers
1. Login → Role detected (e.g., "editingteacher")
2. Admin assigns cohorts to teacher via `/admin/cohort-assignments`
3. Teacher navigates to Cohort Reports
4. See dropdown with only assigned cohorts
5. Select cohort → View attendance for that cohort
6. Each cohort report is displayed separately (no merging)

### For Administrators
1. Login → Role detected as "manager"
2. Access admin panel at `/admin/cohort-assignments`
3. View all non-student users
4. Expand user card to see current assignments
5. Assign/remove cohorts for each user
6. Changes take effect immediately

## Multiple Cohort Support

Teachers can be assigned multiple cohorts. Each cohort report is kept separate:
- Cohort dropdown shows all assigned cohorts
- Selecting a cohort loads only that cohort's attendance data
- No merging or combining of multiple cohort data
- Each report is independent and complete

## Security Considerations

1. **Role Verification**: All cohort requests require userId and roleShortname
2. **Database-Level Filtering**: Access is enforced at the database query level
3. **No Client-Side Trust**: Server validates all permissions
4. **Unique Constraints**: One cohort assignment per user-cohort pair
5. **Foreign Key Constraints**: Ensures referential integrity

## Installation Steps

1. **Update Prisma Schema**:
   ```bash
   npx prisma generate
   ```

2. **Create Custom Table**:
   ```bash
   psql -U moodleuser -d moodle -f create_cohort_role_assignments.sql
   ```

3. **Restart Application**:
   ```bash
   npm run dev
   ```

4. **Initial Setup**:
   - Login as administrator (manager role)
   - Navigate to `/admin/cohort-assignments`
   - Assign cohorts to teachers

## Testing

### Test Student Access
```bash
# Login as student
# Navigate to /report/cohort
# Should see: "Students do not have cohort access"
```

### Test Teacher Access (No Assignments)
```bash
# Login as teacher
# Navigate to /report/cohort
# Should see: "No cohorts assigned to this user"
```

### Test Teacher Access (With Assignments)
```bash
# Admin assigns cohorts to teacher
# Teacher navigates to /report/cohort
# Should see dropdown with assigned cohorts only
```

### Test Admin Interface
```bash
# Login as manager
# Navigate to /admin/cohort-assignments
# Should see list of all teachers/managers
# Can assign/remove cohorts
```

## Configuration

No additional environment variables required. The system uses:
- Existing Moodle database connection (DATABASE_URL)
- Existing Moodle API configuration (NEXT_PUBLIC_MOODLE_BASE_URL)

## Non-Student Roles

The following roles have potential cohort access:
- `manager` - Full access, can assign cohorts to others
- `coursecreator` - Can view assigned cohorts
- `editingteacher` - Can view assigned cohorts
- `teacher` - Can view assigned cohorts

Students (`student` role) never have cohort access.

## Future Enhancements

Possible improvements:
1. Add role-based permissions for who can assign cohorts
2. Add bulk assignment features
3. Add cohort assignment history/audit log
4. Add email notifications when cohorts are assigned
5. Add cohort access expiration dates
6. Add reports on cohort assignment usage

## Troubleshooting

### Users not seeing cohorts
1. Check if user has non-student role
2. Verify cohort assignments in database
3. Check browser localStorage for role info
4. Verify userId matches database

### Admin panel not accessible
1. Verify user has "manager" role
2. Check `mdl_role_assignments` for user's role
3. Clear browser cache and re-login

### Database errors
1. Verify custom table was created successfully
2. Check foreign key constraints
3. Verify Prisma schema is up to date
4. Run `npx prisma generate` again

## Support

For issues or questions, please refer to:
- Main README.md for general setup
- COHORT_REPORT_README.md for cohort report details
- Database schema documentation in `database_structure.md`
