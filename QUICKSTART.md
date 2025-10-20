# Quick Start Guide

## 🚀 Running the Application

### 1. Install Dependencies
```powershell
npm install
```

### 2. Configure Your Token

Create a `.env.local` file in the project root and add your Moodle token:

```env
NEXT_PUBLIC_MOODLE_TOKEN=7970b778005353e144525d58937ebce9
```

Replace with your actual token from Moodle.

### 3. Start Development Server
```powershell
npm run dev
```

The app will be available at: **http://localhost:3000**

## 📱 Using the Application

### Step 1: Application Loads Automatically
1. Open the application
2. Token loads automatically from `.env.local`
3. Available reports load automatically
4. You'll see a green checkmark: "Token loaded from environment"

### Step 2: Select a Report
1. Reports load automatically when the page opens
2. Select a report from the dropdown menu
3. Wait for the attendance data to load

### Step 3: View and Download
1. View the structured attendance table
2. Check student attendance by session
3. Click "Download CSV" to export the data

## 🔑 Getting Your Moodle Token

1. Log into your Moodle site as administrator
2. Go to: **Site Administration → Plugins → Web Services → Manage tokens**
3. Or visit: `https://your-moodle-site/admin/settings.php?section=webservicetokens`
4. Create a new token or use an existing one
5. Copy the token string (example: `7970b778005353e144525d58937ebce9`)

## 🎯 API Endpoints Reference

The app uses these Moodle API functions:

### List All Reports
- **Function**: `core_reportbuilder_list_reports`
- **Returns**: Array of available reports
- **Example Response**:
```json
{
  "reports": [
    {
      "id": 13,
      "name": "Attendance Report",
      "source": "mod_attendance\\reportbuilder\\datasource\\attendance",
      "type": 0,
      "uniquerows": false
    }
  ]
}
```

### Get Report Data
- **Function**: `core_reportbuilder_retrieve_report`
- **Parameters**: 
  - `reportid`: The ID of the report
  - `page`: Page number (default: 0)
- **Returns**: Report data with headers and rows

## 📊 Table Format

The attendance table shows:

- **Student Name**: Full name of the student
- **Course Name**: Name of the course
- **Session Dates**: Each session as a column
- **Status Codes**:
  - 🟢 **P** = Present
  - 🔴 **A** = Absent
  - 🟡 **L** = Late
  - 🔵 **E** = Excused
- **Totals**: Count of each status type

## 💾 CSV Export Format

Downloaded CSV files include:
```csv
Student Name,Course Name,2025-10-20,2025-10-21,...,Total Present,Total Absent,Total Late,Total Excused,Total Sessions
John Doe,Mathematics 101,P,A,L,E,P,15,2,1,0,18
Jane Smith,Physics 201,P,P,P,P,A,17,1,0,0,18
```

## 🛠️ Troubleshooting

### Token Not Working
- Verify the token is correct
- Check user has necessary permissions
- Ensure Web Services are enabled in Moodle

### No Reports Showing
- Confirm attendance reports exist in Moodle
- Check token has access to report builder
- Look for errors in browser console (F12)

### CORS Errors
- Moodle must allow requests from your domain
- Contact Moodle administrator to configure CORS
- Use a proxy server in development if needed

## 📂 Project Structure

```
moodleattd/
├── src/
│   ├── app/
│   │   ├── page.tsx           # Main page
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Styles
│   ├── components/
│   │   ├── AttendanceTable.tsx    # Table display
│   │   ├── ReportSelector.tsx     # Report dropdown
│   │   └── TokenInput.tsx         # Token input
│   ├── services/
│   │   └── moodleAPI.ts           # API client
│   ├── types/
│   │   └── moodle.ts              # TypeScript types
│   └── utils/
│       └── attendanceTransform.ts # Data processing
├── package.json
├── tsconfig.json
├── next.config.ts
├── README.md
├── PROJECT_SUMMARY.md
└── QUICKSTART.md              # This file
```

## ⚙️ Development Commands

```powershell
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## 🔐 Security Notes

- ✅ Token stored in `.env.local` file (server-side, never exposed to browser)
- ✅ `.env.local` is in `.gitignore` (never committed to git)
- ✅ Direct API calls to Moodle (no intermediary server)
- ✅ No data sent to external services
- ⚠️ Never share your token publicly
- ⚠️ Never commit `.env.local` to version control
- ⚠️ Use HTTPS in production
- ✨ **Perfect for non-dev users**: Admin sets up `.env.local` once, users just click!

## 🎨 Customization

### Change Color Theme
Edit `src/components/AttendanceTable.tsx`:
```typescript
const statusColors: Record<AttendanceStatus, string> = {
  'P': 'bg-green-100 text-green-800',  // Present
  'A': 'bg-red-100 text-red-800',      // Absent
  'L': 'bg-yellow-100 text-yellow-800', // Late
  'E': 'bg-blue-100 text-blue-800',    // Excused
};
```

### Modify Status Codes
Edit `src/utils/attendanceTransform.ts`:
```typescript
export function parseAttendanceStatus(value: string | number | null): AttendanceStatus {
  // Add your custom logic here
}
```

## 📞 Need Help?

1. Check the `README.md` for detailed documentation
2. Review `PROJECT_SUMMARY.md` for technical details
3. Open browser DevTools (F12) to see console errors
4. Check Moodle Web Services documentation

---

**Ready to start!** Run `npm run dev` and open http://localhost:3000 🚀
