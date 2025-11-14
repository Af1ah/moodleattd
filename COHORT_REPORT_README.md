# Cohort Attendance Report Feature

## Overview

The Cohort Attendance Report feature allows you to view consolidated attendance data for an entire class/batch (cohort) across all courses in a single comprehensive report. This is useful for:

- Class advisors monitoring overall attendance
- Academic administrators tracking batch performance
- Generating consolidated reports for entire student groups

## What is a Cohort?

A **cohort** in Moodle is a group of students, typically representing:
- A class/batch (e.g., "BCA 2025", "BSc Elc 2024")
- A program year (e.g., "Engineering 2023")
- Any custom student grouping

## Features

✅ **Multi-Course View**: See attendance across all courses for the cohort
✅ **Consolidated Table**: All students and sessions in one unified table
✅ **Course Filtering**: Filter by specific courses or view all together
✅ **Export Ready**: Export to PDF or Excel with all course data
✅ **Real-time Stats**: View total students, courses, and sessions
✅ **Direct Database Access**: Fast performance using PostgreSQL direct queries

## How to Use

### 1. Access Cohort Report

From the main page, click the **"Cohort Attendance Report"** button (purple gradient button at the top).

### 2. Select a Cohort

1. Choose a cohort from the dropdown menu (e.g., "BCA 2025", "BSc Elc 2024")
2. Click **"Get Report"** button
3. Wait for the system to fetch attendance data

### 3. View Consolidated Report

The report shows:
- **All students** in the selected cohort
- **All attendance sessions** across all courses
- **Session details** including course name, date, time
- **Attendance status** (Present, Absent, Late, Excused) for each session

### 4. Filter and Export

Use the built-in AttendanceTable features:
- **Filter by course**: Show/hide specific courses
- **Filter by date range**: Focus on specific time periods
- **Export to PDF**: Generate printable reports
- **Export to Excel**: For further analysis

## Technical Architecture

### Database Models

Added two new Prisma models:

```prisma
model mdl_cohort {
  id          BigInt   @id
  name        String
  idnumber    String?
  // ... other fields
  members     mdl_cohort_members[]
}

model mdl_cohort_members {
  id        BigInt @id
  cohortid  BigInt
  userid    BigInt
  cohort    mdl_cohort @relation(fields: [cohortid], references: [id])
}
```

### API Endpoints

#### 1. GET /api/getCohorts

Fetches all available cohorts.

**Response:**
```json
{
  "success": true,
  "totalCohorts": 9,
  "cohorts": [
    {
      "id": 1,
      "name": "BCA 2025",
      "idnumber": "BCA 2025"
    }
  ]
}
```

#### 2. POST /api/getCohortAttendance

Fetches consolidated attendance for all students in a cohort across all courses.

**Request:**
```json
{
  "cohortId": 1,
  "datefrom": 1763135000,  // optional
  "dateto": 1765513800      // optional
}
```

**Response:**
```json
{
  "success": true,
  "cohortId": 1,
  "cohortName": "BCA 2025",
  "totalStudents": 10,
  "totalCourses": 5,
  "courses": [
    {
      "courseId": 2,
      "courseName": "Computer Science 101",
      "totalSessions": 15,
      "sessions": [...]
    }
  ]
}
```

### Service Layer

**File:** `src/services/cohortService.ts`

Functions:
- `getAllCohorts()` - Get all visible cohorts
- `getCohortById(cohortId)` - Get cohort details
- `getCohortStudents(cohortId)` - Get student IDs in cohort
- `getCohortStudentDetails(cohortId)` - Get full student info
- `getCoursesForCohort(cohortId)` - Get courses with attendance

### Frontend Page

**File:** `src/app/report/cohort/page.tsx`

Features:
- Cohort dropdown selector
- Loading states and error handling
- Data transformation for AttendanceTable component
- Statistics cards (students, courses, sessions)
- Reuses existing AttendanceTable component

## Data Flow

```
User selects cohort → GET /api/getCohorts
                    ↓
User clicks "Get Report" → POST /api/getCohortAttendance
                         ↓
System fetches:
  1. Cohort details
  2. Student IDs in cohort
  3. All courses with attendance
  4. Attendance sessions for each course
  5. Filters to only cohort students
                         ↓
Transform to AttendanceTableData format
                         ↓
Display in AttendanceTable component
```

## Example Use Cases

### 1. Monthly Class Report

Generate a monthly attendance report for "BCA 2025":
1. Select "BCA 2025" cohort
2. Apply date filter (current month)
3. Export to PDF
4. Submit to administration

### 2. Course Performance Analysis

Compare attendance across different courses:
1. Select cohort
2. View all courses in one table
3. Export to Excel
4. Analyze patterns

### 3. Student Tracking

Monitor individual student attendance across all subjects:
1. Select cohort
2. Locate student row
3. View attendance across all course sessions
4. Identify concerning patterns

## Advantages Over Single Course Reports

| Feature | Single Course Report | Cohort Report |
|---------|---------------------|---------------|
| View multiple courses | ❌ No | ✅ Yes |
| Consolidated view | ❌ No | ✅ Yes |
| Class-level insights | ❌ Limited | ✅ Comprehensive |
| Export all data together | ❌ No | ✅ Yes |
| Track student across subjects | ❌ No | ✅ Yes |

## Performance

- **Database-driven**: Direct PostgreSQL queries for speed
- **Efficient filtering**: Only fetches data for cohort students
- **Caching ready**: Can be extended with caching layer
- **Scalable**: Handles large cohorts (100+ students)

## Future Enhancements

Potential improvements:
- [ ] Date range filters in UI
- [ ] Attendance percentage calculations per course
- [ ] Student-wise summary statistics
- [ ] Comparison with other cohorts
- [ ] Download cohort-specific analytics

## Files Created/Modified

### New Files
1. `src/services/cohortService.ts` - Cohort database service
2. `src/app/api/getCohorts/route.ts` - Fetch cohorts API
3. `src/app/api/getCohortAttendance/route.ts` - Cohort attendance API
4. `src/app/report/cohort/page.tsx` - Cohort report UI

### Modified Files
1. `prisma/schema.prisma` - Added cohort models
2. `src/app/page.tsx` - Added navigation to cohort reports

## Database Requirements

The feature requires:
- ✅ `mdl_cohort` table
- ✅ `mdl_cohort_members` table
- ✅ `mdl_attendance` and related tables
- ✅ `mdl_user` table

All standard Moodle tables - no custom tables needed!

## Setup Steps

1. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

2. **Verify Database Connection**
   Ensure `DATABASE_URL` is set in `.env`

3. **Access Feature**
   Navigate to main page and click "Cohort Attendance Report"

## Troubleshooting

### "No cohorts found"
- Check if cohorts exist in Moodle
- Verify cohorts have `visible = 1`
- Check database connection

### "No students in cohort"
- Verify students are added to cohort in Moodle
- Check `mdl_cohort_members` table

### "No courses found"
- Students must have attendance records
- At least one attendance activity must exist
- Check attendance logs are created

## Support

For issues or questions:
1. Check console logs for detailed error messages
2. Verify database connectivity
3. Ensure Prisma client is generated
4. Review API responses in Network tab

---

**Built with**: Next.js, Prisma, PostgreSQL, TypeScript
**Compatible with**: Moodle 3.x and 4.x
