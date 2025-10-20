# Pagination Fix - Complete Data Retrieval

## Problem
The Moodle API returns paginated data (10 rows per page by default). When fetching a report with `totalrowcount: 49`, we were only getting the first 10 rows from page 0, missing 39 rows of data.

## Solution
Created a new method `retrieveCompleteReport()` that:

1. **Fetches the first page** to get `totalrowcount`
2. **Calculates total pages needed** (totalrowcount / 10 rows per page)
3. **Fetches all remaining pages in parallel** using `Promise.all()`
4. **Combines all rows** into a single response
5. **Returns complete dataset** with all students and sessions

## Changes Made

### 1. Updated Type Definition (`src/types/moodle.ts`)
```typescript
export interface RetrieveReportResponse {
  data: {
    headers: string[];
    rows: ReportRow[];
    totalrowcount: number;  // ← Added this
  };
  details: {
    name: string;
    source: string;
  };
  warnings?: unknown[];  // ← Added this
}
```

### 2. Added New Method (`src/services/moodleAPI.ts`)
```typescript
async retrieveCompleteReport(reportId: number): Promise<RetrieveReportResponse> {
  // Fetches ALL pages automatically
  // For 49 rows: fetches pages 0, 1, 2, 3, 4 (5 pages total)
  // Returns combined response with all 49 rows
}
```

### 3. Updated Page Handler (`src/app/page.tsx`)
```typescript
// OLD: Only fetched page 0
const reportData = await apiService.retrieveReport(reportId);

// NEW: Fetches all pages automatically
const reportData = await apiService.retrieveCompleteReport(reportId);
```

## Example
For a report with 49 rows:
- **Page 0**: 10 rows
- **Page 1**: 10 rows
- **Page 2**: 10 rows
- **Page 3**: 10 rows
- **Page 4**: 9 rows
- **Total**: 49 rows ✅

## Result
Now all students and all attendance sessions are displayed in the table, not just the first 10 rows!

## Performance
- Pages are fetched **in parallel** (not sequentially) for better performance
- Only makes 1 API call for reports with ≤10 rows
- Makes N API calls for larger reports (N = total pages)
