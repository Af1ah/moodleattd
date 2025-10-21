# Date Range Filter Feature

## Overview

Added a comprehensive date range filtering system that allows teachers to view attendance data for specific time periods. The filter supports three options: Current Week, Current Month, and Custom Range.

## Feature Location

The date range filter is located in the **Filter Modal** (accessible via the "Filters" button in the main attendance table view).

## Date Range Options

### 1. Current Week (Default)

- **Description**: Shows attendance for Monday through Sunday of the current week
- **Calculation**: Automatically determines the current week starting from Monday
- **Default**: This is the default selection when you first open the application

### 2. Current Month

- **Description**: Shows attendance for all days in the current calendar month
- **Calculation**: From the 1st day to the last day of the current month
- **Use Case**: Perfect for monthly reports and summaries

### 3. Custom Range

- **Description**: Allows you to select any custom start and end date
- **Features**:
  - Date picker inputs for both start and end dates
  - Flexible range selection
  - Visual calendar interface
- **Use Case**: Ideal for specific reporting periods, quarters, or custom analysis

## How to Use

### Changing the Date Range

1. Click the **"Filters"** button in the attendance table header
2. In the Filter Modal, locate the **"Date Range Filter"** section at the top
3. Select one of the three options:
   - **Current Week**: Automatically sets to Monday-Sunday of this week
   - **Current Month**: Automatically sets to the first and last day of this month
   - **Custom Range**: Reveals date picker inputs
4. For custom range:
   - Click on **"From Date"** input and select your start date
   - Click on **"To Date"** input and select your end date
5. View the selected range in the blue summary box
6. Click **"Apply Filters"** to update the table

### Visual Feedback

#### In the Filter Modal

- Selected date range option is highlighted with a radio button
- Current selection is displayed in a blue summary box showing the exact date range
- Format: "Mon DD, YYYY - Mon DD, YYYY"

#### In the Main Table View

- Below the Filters button, you'll see the active date range
- Format: "Current Week: Mon DD - Mon DD, YYYY" or similar
- Updates automatically when filters are applied

## Technical Details

### Default Behavior

- **Initial Load**: Defaults to current week (Monday to Sunday)
- **Week Calculation**: Uses Monday as the first day of the week
- **Date Normalization**: All dates are normalized to midnight (00:00:00) for accurate comparison

### Date Filtering Logic

The filter applies the following logic:

```typescript
// For each date group in attendance data
1. Parse the date from the session data
2. Normalize to midnight (remove time component)
3. Check if date falls within selected range:
   - groupDate >= startDate AND groupDate <= endDate
4. Include only matching dates in the table
```

### State Management

- **Current Selection**: Stored in component state
- **Real-time Updates**: Changes in the modal don't affect the table until "Apply Filters" is clicked
- **Persistence**: Selected range persists during the session (resets on page reload)

## UI Components

### Date Range Selector UI

```
┌─────────────────────────────────────┐
│ 📅 Date Range Filter                │
├─────────────────────────────────────┤
│ ◉ Current Week                      │
│   Monday to Sunday of this week     │
│                                     │
│ ○ Current Month                     │
│   All days in the current month     │
│                                     │
│ ○ Custom Range                      │
│   Select custom start and end dates │
│   [From Date: ________]             │
│   [To Date: ________]               │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Selected Range:                 │ │
│ │ Jan 20, 2025 - Jan 26, 2025    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Main Table Header Display

```
┌──────────────────────────────────────────┐
│ [Filters] (2/5)  📅 Current Week:        │
│                  Jan 20 - Jan 26, 2025   │
└──────────────────────────────────────────┘
```

## Integration with Other Filters

The date range filter works seamlessly with other filtering options:

- **Course Filter**: Shows only selected courses within the date range
- **Session-Based Tracking**: Calculates day-by-day attendance only for dates in range
- **All Filters Combined**: Date range + Course selection + Tracking mode = Precise data view

## Use Cases

### 1. Weekly Review
- **Setting**: Current Week
- **Purpose**: Quick review of this week's attendance
- **Benefit**: Default view for daily monitoring

### 2. Monthly Reports
- **Setting**: Current Month
- **Purpose**: Generate monthly attendance reports
- **Benefit**: One-click access to full month data

### 3. Quarter Analysis
- **Setting**: Custom Range (e.g., Jan 1 - Mar 31)
- **Purpose**: Analyze attendance patterns over a quarter
- **Benefit**: Flexible reporting for any period

### 4. Specific Event Period
- **Setting**: Custom Range (e.g., Dec 20 - Jan 5)
- **Purpose**: Check attendance during holidays or special events
- **Benefit**: Precise date control

## Benefits

1. **Focused View**: Only see data relevant to your time period
2. **Performance**: Reduced data display improves load times
3. **Better Analysis**: Compare week-to-week or month-to-month trends
4. **Flexible Reporting**: Generate reports for any time period
5. **User-Friendly**: Intuitive interface with clear labels and feedback

## Technical Implementation

### Components Modified

- **`FilterModal.tsx`**: Added date range UI and logic
  - Date range options (week/month/custom)
  - Date picker inputs for custom range
  - Selection display summary
  - State management for local changes

- **`AttendanceTable.tsx`**: Added date filtering logic
  - Default to current week on load
  - Filter session dates by selected range
  - Display current range in header
  - Pass date range to modal

### New Types

```typescript
export type DateRangeOption = 'week' | 'month' | 'custom';

export interface DateRange {
  option: DateRangeOption;
  startDate: string;      // ISO format: 'YYYY-MM-DD'
  endDate: string;        // ISO format: 'YYYY-MM-DD'
}
```

### Key Functions

- **`getCurrentWeekRange()`**: Calculates Monday-Sunday of current week
- **`handleDateRangeOptionChange()`**: Updates range based on selected option
- **`handleCustomDateChange()`**: Updates custom date inputs
- **`filteredSessionDates`**: Filters attendance data by date range

## Best Practices

1. **Default Selection**: Always defaults to current week for convenience
2. **Date Validation**: Ensures end date is not before start date
3. **Visual Feedback**: Clear indication of selected range
4. **Apply Confirmation**: Changes require clicking "Apply Filters"
5. **Responsive Design**: Works on mobile and desktop devices

## Future Enhancements (Potential)

- Save favorite date ranges
- Quick presets (Last Week, Last Month, This Quarter, etc.)
- Date range comparison view
- Export filtered data
- Remember last selected range in local storage
