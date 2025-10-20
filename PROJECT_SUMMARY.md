# Moodle Attendance Report Generator - Project Summary

## ✅ Project Setup Complete!

This project has been successfully organized with a clean architecture for generating attendance reports from Moodle.

## 📁 File Structure Created

```
src/
├── app/
│   ├── page.tsx              ✅ Main UI with report generation
│   ├── layout.tsx            ✅ Root layout (unchanged)
│   └── globals.css           ✅ Global styles (unchanged)
│
├── components/               🆕 UI Components
│   ├── AttendanceTable.tsx   ✅ Displays attendance in table format
│   ├── ReportSelector.tsx    ✅ Dropdown to select reports
│   └── TokenInput.tsx        ✅ Token input and storage
│
├── services/                 🆕 API Layer
│   └── moodleAPI.ts          ✅ Moodle API service client
│
├── types/                    🆕 TypeScript Definitions
│   └── moodle.ts             ✅ All type interfaces
│
└── utils/                    🆕 Utilities
    └── attendanceTransform.ts ✅ Data transformation & CSV export
```

## 🔧 Key Features Implemented

### 1. **API Service Layer** (`src/services/moodleAPI.ts`)
- Base URL: `https://moodle.aflahdev.me/webservice/rest/server.php`
- `listReports()` - Fetch available reports (core_reportbuilder_list_reports)
- `retrieveReport(reportId, page)` - Get report data (core_reportbuilder_retrieve_report)
- Error handling and TypeScript support

### 2. **Data Transformation** (`src/utils/attendanceTransform.ts`)
- Converts Moodle JSON responses to structured format
- Attendance status parsing: P (Present), A (Absent), L (Late), E (Excused)
- Automatic session date extraction
- CSV export functionality with totals

### 3. **UI Components**
- **TokenInput**: Secure token storage in localStorage
- **ReportSelector**: Browse available reports
- **AttendanceTable**: Beautiful table with:
  - Student names and courses
  - Session dates as columns
  - Color-coded status (P/A/L/E)
  - Total counts for each status
  - Responsive design with dark mode

### 4. **Main Page** (`src/app/page.tsx`)
- Complete workflow:
  1. Enter and save Moodle token
  2. Auto-fetch available reports
  3. Select a report
  4. View structured attendance table
  5. Download as CSV
- Loading states and error handling
- Instructions for first-time users

## 📊 Output Format

The attendance table displays:

| Student Name | Course | Session 1 | Session 2 | ... | Total P | Total A | Total L | Total E | Total |
|--------------|--------|-----------|-----------|-----|---------|---------|---------|---------|-------|
| Student 1    | Course | P         | A         | ... | 15      | 2       | 1       | 0       | 18    |
| Student 2    | Course | P         | P         | ... | 17      | 0       | 1       | 0       | 18    |

## 🚀 How to Run

### Development Mode:
```bash
npm install
npm run dev
```

Then open http://localhost:3000

### Production Build:
```bash
npm run build
npm start
```

## 🔐 Token Setup

1. Go to your Moodle site
2. Navigate to: Site Administration → Server → Web Services
3. Generate a token with appropriate permissions
4. Copy the token
5. Paste it in the app and click "Save"

## 📥 Export Options

- **CSV Download**: Click "Download CSV" button
- Filename includes report name and date
- Compatible with Excel, Google Sheets, etc.

## 🎨 Status Color Coding

- **P (Present)**: Green
- **A (Absent)**: Red
- **L (Late)**: Yellow
- **E (Excused)**: Blue
- **- (N/A)**: Gray

## ⚡ Technical Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **Storage**: LocalStorage (browser)

## 🔄 API Flow

```
1. User enters token → Saved to localStorage
2. App calls listReports() → Shows dropdown
3. User selects report → calls retrieveReport(id)
4. Transform raw data → Structured attendance
5. Display table → Download CSV option
```

## 🛠️ Customization Options

### Modify Status Parsing
Edit `src/utils/attendanceTransform.ts` → `parseAttendanceStatus()`

### Change Colors
Edit `src/components/AttendanceTable.tsx` → `statusColors` object

### Add More API Endpoints
Edit `src/services/moodleAPI.ts` → Add new methods

### Custom Report Format
Edit `src/utils/attendanceTransform.ts` → `transformReportToAttendance()`

## 📝 Notes

- Token is stored locally (never sent to external servers)
- All API calls are made directly to your Moodle instance
- No backend required - pure frontend application
- Works with any Moodle installation with Web Services enabled

## 🐛 Troubleshooting

**Issue**: Reports not loading
- Solution: Check token permissions in Moodle

**Issue**: CORS errors
- Solution: Configure Moodle to allow your domain

**Issue**: Wrong data format
- Solution: Adjust transformation logic for your Moodle version

## ✨ Future Enhancements (Optional)

- [ ] Multiple report comparison
- [ ] Print-friendly view
- [ ] PDF export
- [ ] Date range filtering
- [ ] Student search/filter
- [ ] Attendance percentage charts
- [ ] Email reports
- [ ] Multi-language support

## 📧 Support

Refer to:
- Moodle Web Services API documentation
- Next.js documentation
- Project README.md

---

**Status**: ✅ Ready to use!  
**Last Updated**: October 20, 2025

All components are created and organized. Simply run `npm run dev` to start the application!
