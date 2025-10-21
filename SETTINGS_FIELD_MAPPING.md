# Moodle Settings & Field Mapping Feature

## Overview

Different Moodle implementations organize their attendance report data differently. Some sites may have course names where student names should be, or columns in a different order. This feature allows you to configure field mappings per Moodle site, with settings persisted across sessions.

## Features

### 🎯 Key Capabilities

1. **Per-Site Configuration**: Settings are saved based on your Moodle site's base URL
2. **Persistent Storage**: Uses localStorage to remember settings across sessions
3. **Quick Fix Options**: One-click solutions for common issues
4. **Advanced Field Mapping**: Manually configure each field's column index
5. **Live Preview**: Changes apply immediately when saved

## How to Use

### Accessing Settings

1. Navigate to any attendance report
2. Look for the **gear icon** (⚙️) next to the "Filters" button
3. Click the gear icon to open the Settings modal

### Quick Fix: Swap Fields

**Problem**: Student names appearing as course names?

**Solution**: 
1. Open Settings
2. Click the **"Swap Fields"** button in the Quick Fix section
3. This will exchange the course name and student name columns
4. Click **"Save Settings"** to apply

### Advanced Field Mapping

If your Moodle implementation has a unique structure, you can manually configure each field:

1. Open Settings
2. Click **"Advanced Field Mapping"** to expand options
3. Configure the column indices for each field:
   - **Course Name Column**: Index of the course/class name
   - **Student Name Column**: Index of the student name
   - **Date/Time Column**: Index of the session date/time
   - **Status Column**: Index of the attendance status (P/A/L/E)
   - **Grade Column**: Index of the numeric grade
   - **Total Present Column**: Index of total present count
   - **Total Late Column**: Index of total late count
   - **Total Excused Column**: Index of total excused count
   - **Total Absent Column**: Index of total absent count

**Note**: Column indices start from 0 (first column = 0, second column = 1, etc.)

## Default Field Mapping

The default configuration assumes this column order:

| Index | Field |
|-------|-------|
| 0 | Course Name |
| 1 | Student Name |
| 2 | Date/Time |
| 3 | Status |
| 4 | Grade |
| 5 | Total Present |
| 6 | Total Late |
| 7 | Total Excused |
| 8 | Total Absent |

## Settings Storage

### Where Settings Are Stored

Settings are stored in your browser's localStorage under the key `moodle_settings`. Each Moodle site has its own configuration based on the base URL.

### Data Structure

```typescript
{
  "https://your-moodle-site.com": {
    "baseUrl": "https://your-moodle-site.com",
    "fieldMapping": {
      "courseNameIndex": 0,
      "studentNameIndex": 1,
      "dateTimeIndex": 2,
      // ... other fields
    },
    "useCourseName": true,
    "swapFields": false,
    "lastUpdated": 1234567890
  }
}
```

## Common Issues & Solutions

### Issue 1: Wrong Names in Headers

**Symptom**: Student names appear in the session headers instead of course names

**Solution**: Use the "Swap Fields" quick fix button

### Issue 2: Data Appears Misaligned

**Symptom**: Status shows as dates, names appear in wrong columns

**Solution**: 
1. Open Settings → Advanced Field Mapping
2. Check your Moodle report structure
3. Adjust column indices to match your data
4. Save and verify

### Issue 3: Settings Not Saving

**Symptom**: Settings reset when you refresh the page

**Solution**:
- Ensure cookies and localStorage are enabled in your browser
- Check if you're in private/incognito mode (localStorage doesn't persist)
- Try a different browser

## Resetting Settings

To reset settings to default:

1. Open Settings
2. Click **"Reset to Default"** at the bottom left
3. Confirm by saving

## Multiple Moodle Sites

If you work with multiple Moodle installations:

- Each site maintains its own settings automatically
- Settings are identified by the base URL (protocol + domain)
- You can configure different field mappings for each site

## Technical Details

### Implementation

- **Types**: Defined in `src/types/moodle.ts`
- **Service**: `src/services/settingsService.ts` handles persistence
- **UI Component**: `src/components/SettingsModal.tsx`
- **Transform Function**: `src/utils/attendanceTransform.ts` uses the field mappings

### API

```typescript
// Get settings for current site
const settings = settingsService.getOrCreateSettings(baseUrl);

// Save settings
settingsService.saveSettings(settings);

// Reset to default
settingsService.resetToDefault(baseUrl);

// Transform data with custom mapping
const data = transformReportToAttendance(reportData, fieldMapping);
```

## Best Practices

1. **Test First**: After changing settings, verify data displays correctly
2. **Document Your Setup**: Note down which column indices work for your site
3. **Use Quick Fix First**: Try the "Swap Fields" option before manual configuration
4. **One Site at a Time**: Configure settings while viewing reports from that site

## Troubleshooting

### Settings Don't Apply

1. Click "Save Settings" after making changes
2. Refresh the page to see the updated data
3. Check browser console for any errors

### Can't Find the Right Mapping

1. Export the raw Moodle report as CSV
2. Open in Excel/spreadsheet software
3. Count columns from left (starting at 0)
4. Use those indices in Advanced Field Mapping

### Multiple Reports on Same Site

Settings apply to all reports from the same Moodle site (same base URL). You don't need to configure separately for each report.

## Future Enhancements

Potential improvements for future versions:

- Visual column mapper with drag-and-drop
- Import/export settings configuration
- Template presets for common Moodle setups
- Auto-detection of field positions
- Settings backup/restore functionality

## Support

If you encounter issues:

1. Check this documentation first
2. Try resetting to default settings
3. Verify your Moodle report structure matches your configuration
4. Report bugs with screenshots of both the Settings modal and the resulting table

---

**Last Updated**: October 2025  
**Version**: 1.0.0
