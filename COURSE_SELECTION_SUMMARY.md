# Course Selection Feature - Implementation Summary

## What Was Implemented

A new feature that allows administrators to select specific courses for each teacher's cohort assignment. Teachers will only see the courses they've been assigned within each cohort, rather than all courses.

## Changes Made

### 1. Database Schema Update
- **File**: `prisma/schema.prisma`
- **Change**: Added `selectedcourses` TEXT field to `mdl_cohort_role_assignments` table
- **Migration**: `add_selected_courses_migration.sql` created for manual database update

### 2. New API Endpoint
- **File**: `src/app/api/cohortCourses/route.ts` (NEW)
- **Purpose**: Fetches all available courses for a specific cohort
- **Method**: GET
- **Query Params**: `cohortId`

### 3. Updated API Endpoints
- **File**: `src/app/api/cohortAssignments/route.ts`
  - Added PATCH method to update course selection
  - Updated to import `updateCohortCourseSelection` function

- **File**: `src/app/api/getCohortAttendance/route.ts`
  - Added `userId` parameter to both GET and POST methods
  - Added logic to filter courses based on user's selected courses
  - Skips courses not in the user's selection list

### 4. Service Layer Updates
- **File**: `src/services/roleService.ts`
  - Updated `assignCohortToUser()`: Added optional `selectedCourses` parameter
  - Updated `getUserCohortAssignmentsWithDetails()`: Returns `selectedCourses` field
  - Added new function `updateCohortCourseSelection()`: Updates course selection for a cohort assignment

### 5. Admin UI Enhancement
- **File**: `src/app/admin/cohort-assignments/page.tsx`
  - Added state management for course selection
  - Added "Select Courses" button for each assigned cohort
  - Implemented expandable course selection panel with checkboxes
  - Added "Select All" and "Clear All" quick action buttons
  - Shows course count for each cohort assignment
  - Displays loading states while fetching courses

### 6. Report Filtering
- **File**: `src/app/report/cohort/all.tsx`
  - Updated to pass `userId` when fetching cohort attendance
  
- **File**: `src/app/report/cohort/[cohortId]/page.tsx`
  - Updated to pass `userId` in query params when fetching attendance

### 7. Documentation
- **File**: `COURSE_SELECTION_FEATURE.md` (NEW)
  - Comprehensive documentation of the feature
  - API reference
  - User workflows
  - Testing guidelines
  - Troubleshooting tips

- **File**: `add_selected_courses_migration.sql` (NEW)
  - SQL migration script to add the new column

## How It Works

### Admin Workflow:
1. Admin navigates to `/admin/cohort-assignments`
2. Expands a user to view their cohort assignments
3. Clicks "Select Courses" on a cohort assignment
4. Selects/deselects specific courses
5. Changes are auto-saved via PATCH API call

### Teacher Workflow:
1. Teacher views cohort reports
2. System passes teacher's userId to the attendance API
3. API checks if teacher has specific courses selected for that cohort
4. If yes, only selected courses are returned
5. If no selection (or empty), all courses are returned
6. Report displays filtered course data

### Data Flow:
```
Admin UI → PATCH /api/cohortAssignments 
       → updateCohortCourseSelection() 
       → Database (JSON array stored)

Teacher Report → GET /api/getCohortAttendance?userId=X&cohortId=Y
              → Check selectedcourses field
              → Filter courses
              → Return filtered data
```

## Key Features

✅ Multi-select course dropdown for each cohort  
✅ Auto-save on course selection change  
✅ "Select All" / "Clear All" quick actions  
✅ Visual course count indicator  
✅ Lazy loading of courses (fetched on-demand)  
✅ Empty selection = show all courses (backward compatible)  
✅ Course filtering at API level (efficient)  
✅ Works with both single and multi-cohort reports  

## Testing Checklist

- [ ] Run database migration or Prisma generate
- [ ] Assign a cohort to a teacher in admin panel
- [ ] Click "Select Courses" and verify courses load
- [ ] Select 2-3 courses and save
- [ ] Verify course count updates in UI
- [ ] Login as the teacher
- [ ] View cohort report
- [ ] Verify only selected courses appear
- [ ] Go back to admin panel
- [ ] Click "Clear All" courses
- [ ] Verify all courses appear again in teacher's report

## Database Migration

### Using Prisma:
```bash
npx prisma generate
```

### Manual SQL:
```bash
psql -U your_user -d your_database -f add_selected_courses_migration.sql
```

## Breaking Changes

**None** - This is a backward-compatible feature. Existing cohort assignments without course selection will show all courses by default.

## Future Improvements

1. Bulk course assignment for multiple teachers
2. Course templates for common selections
3. Search/filter for large course lists
4. Course grouping by category

## Files Created

- `src/app/api/cohortCourses/route.ts`
- `add_selected_courses_migration.sql`
- `COURSE_SELECTION_FEATURE.md`
- `COURSE_SELECTION_SUMMARY.md` (this file)

## Files Modified

- `prisma/schema.prisma`
- `src/services/roleService.ts`
- `src/app/api/cohortAssignments/route.ts`
- `src/app/api/getCohortAttendance/route.ts`
- `src/app/admin/cohort-assignments/page.tsx`
- `src/app/report/cohort/all.tsx`
- `src/app/report/cohort/[cohortId]/page.tsx`

## Total Lines Changed

Approximately 500+ lines across 10 files

## Status

✅ Implementation Complete  
✅ TypeScript Compilation: No Errors  
✅ Documentation: Complete  
⏳ Testing: Pending User Testing  
⏳ Database Migration: Pending (needs `DATABASE_URL` in .env)
