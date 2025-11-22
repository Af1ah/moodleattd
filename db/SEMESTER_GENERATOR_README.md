# Semester Auto-Generator Script

Interactive shell script for managing semester generation across all admission years.

## Features

✨ **Interactive Menu**
- View all available admission years from the database
- Check semester completion status (X/8 semesters)
- Generate semesters for specific years
- Batch generate for all incomplete years
- View detailed semester information

🔄 **Auto-Increment Logic**
- System automatically moves to next semester when end date is reached
- Only one semester per admission year is active at a time
- Preserves manual edits made by admin

📅 **Semester Structure**
- Semesters numbered 1-8
- Odd (1,3,5,7): July - November
- Even (2,4,6,8): December - March
- Dates automatically avoid weekends

## Usage

### First Time Setup

1. Make sure your Next.js app is running on `http://localhost:3000`

2. Run the script:
```bash
cd db
./07_auto_generate_semesters.sh
```

3. Enter your Moodle token when prompted (stored securely in `.moodle_token`)

### Interactive Menu Options

**Option 1: Generate for specific year**
- Lists all available admission years
- Generate 8 semesters for selected year
- Skip years that already have all semesters

**Option 2: Batch generate**
- Automatically processes all years with incomplete semesters
- Generates missing semesters (up to 8 per year)
- Shows progress for each year

**Option 3: View details**
- Display all semesters or filter by year
- Shows start/end dates and current status
- Requires `jq` for formatted output (optional)

**Option 4: Update token**
- Change authentication token
- Useful when token expires

**Option 5: Exit**
- Clean exit

## Token Management

Your Moodle token is stored in `.moodle_token` (git-ignored).

To get a new token:
1. Log in to your Moodle instance
2. Go to Preferences → Security Keys
3. Generate/copy web services token
4. Use Option 4 in the script to update

## Requirements

- `curl` (for API calls)
- `jq` (optional, for better formatting)
- Running Next.js app on port 3000
- Valid Moodle authentication token

## Example Session

```bash
$ ./07_auto_generate_semesters.sh

================================
  Semester Auto-Generator
================================

✓ Token loaded

Fetching available admission years...
✓ Found admission years:
2024
2023
2022

Checking existing semesters...

Semester Status:
-----------------------------------
2024: Incomplete (1/8 semesters)
2023: Complete (8/8 semesters)
2022: Incomplete (0/8 semesters)
-----------------------------------

Options:
1) Generate semesters for a specific year
2) Generate for all incomplete years
3) View semester details
4) Update token
5) Exit

Select an option (1-5): 2

Generating semesters for all incomplete years...
Processing 2024...
  ✓ Success for 2024
Processing 2022...
  ✓ Success for 2022

✓ Batch generation complete!
```

## Troubleshooting

**"No admission years found"**
- Ensure students have admission year data in their profiles
- Check field name is 'adm_year' in Moodle

**"Unauthorized"**
- Token may be expired
- Use Option 4 to update token
- Check token has proper web service permissions

**"Connection refused"**
- Make sure Next.js app is running
- Check it's on port 3000
- Update `API_BASE_URL` in script if using different port

## API Endpoints Used

- `GET /api/availableAdmissionYears` - Fetch all years
- `GET /api/semesterDates` - View existing semesters
- `GET /api/semesterDates?admissionYear=YYYY&autoGenerate=true` - Generate semesters

## Notes

- Script is idempotent (safe to run multiple times)
- Existing semesters are never overwritten
- Auto-generation respects uniqueness constraints
- All dates automatically adjusted to avoid weekends
