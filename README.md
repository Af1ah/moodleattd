# Moodle Attendance Report Generator

A Next.js application that generates structured attendance reports from Moodle courses using the Moodle Web Services API.

## Features

- 🔐 **Secure Token Storage**: Store your Moodle web service token locally in browser
- 📊 **Report Selection**: Browse and select from available attendance reports
- 📋 **Structured Display**: View attendance in a clear table format:
  - Student Name
  - Course Name
  - Session dates with status (P/A/L/E)
  - Total Present, Absent, Late, Excused counts
- 💾 **CSV Export**: Download reports as CSV files for further analysis
- 🎨 **Dark Mode Support**: Responsive design with dark mode
- ⚡ **Real-time Loading**: Loading states and error handling

## Prerequisites

- Node.js 18+ installed
- A Moodle instance with Web Services enabled
- A Moodle Web Service Token with appropriate permissions

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Moodle Web Service Token:

```env
NEXT_PUBLIC_MOODLE_TOKEN=your_actual_token_here
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Configure Moodle Token

Get your Moodle Web Service Token:

1. Log into your Moodle site as administrator
2. Go to: **Site Administration → Plugins → Web Services → Manage tokens**
3. Create a new token or copy an existing one
4. Add it to `.env.local` file (see step 2 above)

### 4. Generate Reports

1. Select a report from the dropdown
2. View the structured attendance table
3. Click "Download CSV" to export the data

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main application page
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── AttendanceTable.tsx   # Attendance table component
│   ├── ReportSelector.tsx    # Report selection dropdown
│   └── TokenInput.tsx        # Token input component
├── services/
│   └── moodleAPI.ts          # Moodle API service
├── types/
│   └── moodle.ts             # TypeScript type definitions
└── utils/
    └── attendanceTransform.ts # Data transformation utilities
```

## API Endpoints Used

### Base URL
```
https://moodle.aflahdev.me/webservice/rest/server.php
```

### Endpoints

1. **List Reports**
   - Function: `core_reportbuilder_list_reports`
   - Returns: Available attendance reports

2. **Retrieve Report**
   - Function: `core_reportbuilder_retrieve_report`
   - Parameters: `reportid`, `page`
   - Returns: Report data with headers and rows

## Attendance Status Codes

- **P**: Present (Green)
- **A**: Absent (Red)
- **L**: Late (Yellow)
- **E**: Excused (Blue)
- **-**: Not Available (Gray)

## Technologies Used

- **Next.js 15**: React framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Moodle Web Services API**: Data source

## Building for Production

```bash
npm run build
npm start
```

## Environment Variables

Configure these in your `.env.local` file:

```env
# Required: Your Moodle Web Service Token
NEXT_PUBLIC_MOODLE_TOKEN=your_token_here

# Optional: Custom Moodle base URL (defaults to https://moodle.aflahdev.me/webservice/rest/server.php)
# NEXT_PUBLIC_MOODLE_BASE_URL=https://your-moodle-site.com/webservice/rest/server.php
```

**Important:** Never commit `.env.local` to version control!

## Security Notes

- Tokens are stored in `.env.local` (not committed to git)
- Add `.env.local` to `.gitignore` (already configured)
- Never commit your token to version control
- Use HTTPS in production
- Validate token permissions in Moodle
- For non-developers: Admin configures `.env.local` once

## Troubleshooting

### Reports not loading
- Verify your token has correct permissions
- Check Moodle Web Services are enabled
- Ensure the base URL is accessible

### CORS errors
- Configure Moodle to allow your domain
- Use a proxy if needed in development

## License

MIT

## Support

For issues or questions, please check:
- Moodle Web Services documentation
- Next.js documentation
- Project issues on GitHub

