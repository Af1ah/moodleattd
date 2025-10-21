# Session-Based Attendance Tracking Feature

## Overview
Added a new feature that allows teachers to toggle between **session-by-session** attendance tracking and **day-by-day** attendance tracking with automatic half-day calculation.

## Feature Location
The toggle is located in the **Filter Modal** (accessible via the "Filter by Course" button).

## How It Works

### Day Structure
- Each day has a maximum of **6 sessions**
- Sessions are split into:
  - **Morning Sessions**: 9:30 AM - 12:30 PM
  - **Afternoon Sessions**: After 12:30 PM

### Attendance Rules

When **Session-Based Tracking** is enabled, the system automatically calculates attendance as follows:

| Condition | Result | Display Value |
|-----------|--------|---------------|
| Student present in all sessions | Full Day Present | **P** (1.0) |
| Student absent in any morning session(s) | Half Day | **0.5** |
| Student absent in any afternoon session(s) + present all morning | Half Day | **0.5** |
| Student missed one session from morning AND one from afternoon | Absent | **A** (0) |

## UI Changes

### When Enabled
1. **Table View**:
   - Shows **one column per day** instead of multiple session columns
   - Displays: `P` (full day), `0.5` (half day), or `A` (absent)
   - Date headers are simplified (no session details row)

2. **Summary Columns**:
   - "Total L" column changes to **"Half Days"**
   - Shows count of half-day attendances

3. **Legend**:
   - Updates to show:
     - `P` = Full Day Present (1)
     - `0.5` = Half Day (0.5)
     - `A` = Absent (0)

### When Disabled
- Returns to normal session-by-session view
- Shows all individual session statuses: P, A, L, E, -
- Standard legend displayed

## Benefits

1. **Simplified View**: Teachers can quickly see daily attendance patterns
2. **Automatic Calculation**: No manual calculation of half-days needed
3. **Fair Tracking**: Accounts for partial attendance with half-day credit
4. **Flexible**: Can toggle between detailed and summary views as needed

## Technical Implementation

### Components Modified
- `FilterModal.tsx`: Added toggle UI with detailed explanation
- `AttendanceTable.tsx`: Added logic for day-based calculation and conditional rendering

### Key Functions
- `calculateDayAttendance()`: Determines if a student gets full day (1), half day (0.5), or absent (0)
- `studentsWithSessionTracking`: Recalculates student totals based on tracking mode

### Time Detection
The system determines morning vs afternoon by parsing session times:
- Converts 12-hour time format to 24-hour
- Compares against 12:30 PM threshold
- Handles AM/PM indicators properly

## Usage

1. Click the **"Filter by Course"** button
2. Toggle **"Session-Based Attendance Tracking"** ON
3. Review the tracking rules in the modal
4. Click **"Apply Filters"**
5. View the simplified day-by-day attendance table

To return to session view, toggle the setting OFF and apply filters again.
