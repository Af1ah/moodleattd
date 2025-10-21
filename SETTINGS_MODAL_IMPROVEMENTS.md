# Settings Modal Improvements

## Changes Made

### 1. **Fixed Modal UI and Layout**
   - Fixed dark overlay background (`rgba(0, 0, 0, 0.75)`)
   - Made modal properly scrollable with fixed header and footer
   - Used flexbox layout for better structure
   - Improved spacing and visual hierarchy

### 2. **Implemented Drag-and-Drop Interface**
   - Replaced manual index input fields with drag-and-drop reordering
   - Users can now drag rows to swap field mappings
   - Visual feedback during drag operations (opacity change, border highlight)
   - Intuitive drag handles (hamburger menu icon)

### 3. **Display Actual Column Names**
   - Settings modal now receives `reportHeaders` from the actual report data
   - Shows real column names instead of just indices
   - Each field mapping displays:
     - Field name (e.g., "Student Name")
     - Current column index
     - Actual column name from report (e.g., "Full Name")

### 4. **Dropdown Alternative**
   - Added dropdown menus as an alternative to drag-and-drop
   - Users can select from actual column names
   - Works alongside drag-and-drop functionality

### 5. **Better Error Handling & CORS Fix**
   - Created `/api/moodle` proxy route to bypass CORS errors
   - Added retry logic for server errors (520, 522, 524)
   - Exponential backoff for failed requests
   - Batch fetching (5 pages at a time) to avoid overwhelming server
   - Better error messages for users

## How It Works

### User Flow:
1. Click the **gear icon** ⚙️ next to Filters button
2. Settings modal opens showing current field mappings
3. Each row shows: Field Name → Column Name from your Moodle report
4. **To reorder**: Drag and drop rows to swap assignments
5. **Or use dropdown**: Select different columns from dropdowns
6. **Quick Fix button**: One-click swap for course/student names
7. Click **Save Settings** to apply changes
8. Settings persist per Moodle site URL

### Technical Flow:
1. Report page fetches data and extracts headers
2. Headers passed to AttendanceTable component
3. AttendanceTable passes headers to SettingsModal
4. SettingsModal displays actual column names
5. User maps fields via drag-and-drop or dropdowns
6. On save, field mappings stored in localStorage
7. Transform function uses custom mappings

## Files Modified

- `src/components/SettingsModalNew.tsx` - New drag-and-drop settings UI
- `src/components/AttendanceTable.tsx` - Pass headers to settings modal
- `src/app/report/[reportId]/page.tsx` - Extract and pass report headers
- `src/app/api/moodle/route.ts` - API proxy with retry logic and better error handling
- `src/services/moodleAPI.ts` - Use proxy, batch fetching

## Features

✅ Dark overlay background (75% opacity)  
✅ Fixed header and footer  
✅ Scrollable content area  
✅ Drag-and-drop column reordering  
✅ Shows actual column names from reports  
✅ Dropdown selection as alternative  
✅ Quick swap button for common issues  
✅ Visual drag feedback  
✅ Persistent settings per site  
✅ CORS bypass via API route  
✅ Retry logic for server errors  

## Next Steps (Optional Enhancements)

- Add visual preview of how data will look with new mappings
- Column highlighting to show which field uses which column
- Export/import settings configuration
- Auto-detect best field mappings based on column names
- Undo/redo functionality for mapping changes
