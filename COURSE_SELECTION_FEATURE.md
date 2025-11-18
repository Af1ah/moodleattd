# Course Selection for Cohort Assignments

## Overview

This feature allows administrators to selectively assign specific courses to teachers for each cohort. When a teacher is assigned to a cohort, they can choose which courses within that cohort they want to see in reports, rather than viewing all courses.

## Benefits

- **Focused Reports**: Teachers only see relevant courses for their teaching assignments
- **Reduced Clutter**: Eliminates unnecessary course data from reports
- **Flexible Management**: Admins can customize course visibility per teacher per cohort
- **Default Behavior**: If no courses are selected, all courses in the cohort are shown (backward compatible)

## Database Changes

### New Field: `selectedcourses`

Added to the `mdl_cohort_role_assignments` table:

```sql
ALTER TABLE mdl_cohort_role_assignments 
ADD COLUMN selectedcourses TEXT NULL;
```

- **Type**: TEXT (stores JSON array)
- **Format**: JSON array of course IDs, e.g., `[101, 102, 103]`
- **Nullable**: Yes (null means all courses are accessible)

### Migration

Run the migration script to update your database:

```bash
psql -U your_user -d your_database -f add_selected_courses_migration.sql
```

Or using Prisma:

```bash
npx prisma generate
npx prisma migrate dev --name add_selected_courses_to_cohort_assignments
```

## Features

### 1. Admin Interface - Course Selection

**Location**: `/admin/cohort-assignments`

#### How to Use:

1. **Navigate to Admin Panel**: Go to the cohort assignments page
2. **Expand User**: Click on a user to view their assigned cohorts
3. **Select Courses**: For each assigned cohort:
   - Click the "Select Courses" button
   - Check/uncheck courses to include/exclude
   - Use "Select All" or "Clear All" for quick actions
4. **Auto-Save**: Course selections are automatically saved on change

#### UI Features:

- **Course Counter**: Shows how many courses are selected for each cohort
- **Loading States**: Displays spinner while fetching courses
- **Expand/Collapse**: Toggle course selection panel per cohort
- **Checkboxes**: Multi-select interface for easy course selection
- **Quick Actions**: "Select All" and "Clear All" buttons

### 2. Filtered Reports

When a teacher views cohort reports, they will only see:

- Courses they have explicitly selected (if any courses are selected)
- All courses (if no specific courses are selected - default behavior)

**Affected Pages**:
- `/report/cohort/[cohortId]` - Single cohort report
- `/report/cohort/all` - All cohorts report

## API Endpoints

### 1. Get Courses for Cohort

**Endpoint**: `GET /api/cohortCourses?cohortId={cohortId}`

**Response**:
```json
{
  "success": true,
  "cohortId": 1,
  "totalCourses": 5,
  "courses": [
    {
      "id": 101,
      "attendanceId": 1,
      "name": "Mathematics 101"
    }
  ]
}
```

### 2. Update Course Selection

**Endpoint**: `PATCH /api/cohortAssignments`

**Request Body**:
```json
{
  "cohortId": 1,
  "userId": 123,
  "selectedCourses": [101, 102, 103]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Course selection updated successfully"
}
```

### 3. Get Cohort Attendance (Updated)

**Endpoint**: `POST /api/getCohortAttendance`

**Request Body**:
```json
{
  "cohortId": 1,
  "userId": 123,  // Optional - filters courses if provided
  "datefrom": 1234567890,  // Optional
  "dateto": 1234567890     // Optional
}
```

**Behavior**:
- If `userId` is provided and has selected courses: Returns only selected courses
- If `userId` is provided but no courses selected: Returns all courses
- If `userId` is not provided: Returns all courses (admin view)

## Service Functions

### `roleService.ts`

#### `assignCohortToUser()`
Updated to accept optional `selectedCourses` parameter:

```typescript
assignCohortToUser(
  cohortId: number,
  userId: number,
  roleId: number,
  assignedBy: number,
  selectedCourses?: number[]
)
```

#### `updateCohortCourseSelection()`
New function to update course selection:

```typescript
updateCohortCourseSelection(
  cohortId: number,
  userId: number,
  selectedCourses: number[]
)
```

#### `getUserCohortAssignmentsWithDetails()`
Updated to return `selectedCourses` in the result:

```typescript
{
  cohortId: number,
  cohortName: string,
  cohortIdnumber: string | null,
  roleId: number,
  timeAssigned: number,
  selectedCourses: number[] | null  // NEW
}
```

## Implementation Details

### Data Storage

- **Format**: JSON string in database
- **Parsing**: Automatically parsed/stringified by service layer
- **Validation**: Course IDs must be valid integers
- **Empty Array**: `[]` means no courses selected (will show all courses)
- **Null**: Means all courses are accessible (default)

### Backward Compatibility

- Existing assignments without `selectedcourses` will show all courses
- No data migration required for existing records
- API handles both null and empty array cases gracefully

### Performance Considerations

- Courses are fetched on-demand (lazy loading)
- Course lists are cached per cohort in component state
- Course filtering happens at the API level, not client-side
- Database queries use indexes on cohortid and userid

## User Workflow

### Admin Assigning Courses:

1. Admin assigns a cohort to a teacher
2. Admin clicks "Select Courses" for that cohort
3. System fetches all available courses for the cohort
4. Admin selects specific courses (or leaves all selected)
5. Selection is saved automatically

### Teacher Viewing Reports:

1. Teacher navigates to cohort reports
2. Teacher selects a cohort they're assigned to
3. System fetches attendance data
4. **API filters courses based on teacher's selection**
5. Report displays only selected courses (or all if none selected)

## Example Usage

### Scenario: Teacher teaches only 2 out of 5 courses in a cohort

**Before**:
- Teacher sees all 5 courses in reports
- Cluttered with irrelevant data

**After**:
1. Admin assigns cohort to teacher
2. Admin selects only the 2 relevant courses
3. Teacher now sees only those 2 courses in reports
4. Cleaner, more focused reports

## Testing

### Manual Testing Steps:

1. **Assign Cohort**:
   - Go to `/admin/cohort-assignments`
   - Assign a cohort to a user

2. **Select Courses**:
   - Click "Select Courses"
   - Select 2-3 courses out of available courses
   - Verify selection count updates

3. **View Report as Teacher**:
   - Login as the assigned teacher
   - Go to cohort reports
   - Verify only selected courses appear

4. **Clear Selection**:
   - Go back to admin panel
   - Click "Clear All"
   - Verify all courses appear again in reports

### Database Verification:

```sql
-- Check course selections
SELECT 
  u.username,
  c.name as cohort_name,
  cra.selectedcourses
FROM mdl_cohort_role_assignments cra
JOIN mdl_user u ON cra.userid = u.id
JOIN mdl_cohort c ON cra.cohortid = c.id
WHERE cra.selectedcourses IS NOT NULL;
```

## Troubleshooting

### Courses not showing in selection:

- Verify cohort has students enrolled
- Check that courses have attendance records
- Ensure attendance activities exist for the cohort

### Selection not saving:

- Check browser console for errors
- Verify API endpoint is accessible
- Check database permissions

### All courses still showing despite selection:

- Verify userId is being passed in the API call
- Check that selectedcourses field is properly populated in database
- Clear browser cache and reload

## Future Enhancements

Potential improvements:

1. **Bulk Course Assignment**: Select courses for multiple users at once
2. **Course Templates**: Save common course selections as templates
3. **Auto-Assignment**: Automatically assign courses based on teacher's role
4. **Course Categories**: Group courses by category for easier selection
5. **Search/Filter**: Add search functionality for large course lists

## Related Files

- `/prisma/schema.prisma` - Database schema
- `/src/services/roleService.ts` - Service layer functions
- `/src/app/api/cohortAssignments/route.ts` - API endpoints
- `/src/app/api/cohortCourses/route.ts` - Course fetching API
- `/src/app/api/getCohortAttendance/route.ts` - Attendance API with filtering
- `/src/app/admin/cohort-assignments/page.tsx` - Admin UI
- `/add_selected_courses_migration.sql` - Database migration script

## Support

For issues or questions, please refer to the main project documentation or contact the development team.
