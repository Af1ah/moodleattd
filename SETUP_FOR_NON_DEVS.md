# Setup Instructions for Non-Developers

This guide will help you set up the Moodle Attendance Report Generator without any technical knowledge.

## ⚙️ One-Time Setup (Administrator)

### Step 1: Get Your Moodle Token

1. Log into your Moodle website as an administrator
2. Click on **Site Administration** (usually in the left sidebar or top menu)
3. Navigate to: **Plugins** → **Web Services** → **Manage tokens**
4. You'll see a list of tokens, or you can create a new one
5. **Copy** the long token string (it looks like: `7970b778005353e144525d58937ebce9`)

### Step 2: Configure the Application

1. Open the project folder on your computer
2. Find the file named **`.env.example`**
3. **Right-click** on `.env.example` and select **Copy**
4. **Right-click** in the same folder and select **Paste**
5. **Rename** the copied file from `.env.example` to **`.env.local`**
   - **Windows**: Right-click → Rename
   - **Mac**: Click once, then press Enter to rename
6. **Open** `.env.local` with Notepad (Windows) or TextEdit (Mac)
7. Find the line that says: `NEXT_PUBLIC_MOODLE_TOKEN=your_token_here`
8. **Replace** `your_token_here` with your actual token from Step 1
9. **Save** the file

**Example:**
```env
NEXT_PUBLIC_MOODLE_TOKEN=7970b778005353e144525d58937ebce9
```

### Step 3: Install and Run (First Time Only)

**Windows:**
1. Open **PowerShell** or **Command Prompt**
2. Navigate to the project folder (use `cd` command)
3. Type: `npm install` and press Enter (wait for it to finish)
4. Type: `npm run dev` and press Enter
5. Open your web browser and go to: **http://localhost:3000**

**Mac/Linux:**
1. Open **Terminal**
2. Navigate to the project folder (use `cd` command)
3. Type: `npm install` and press Enter (wait for it to finish)
4. Type: `npm run dev` and press Enter
5. Open your web browser and go to: **http://localhost:3000**

## 📋 Daily Use (After Setup)

Once the setup is complete, users can simply:

1. **Start the application:**
   - Windows: Open PowerShell, navigate to folder, run `npm run dev`
   - Mac/Linux: Open Terminal, navigate to folder, run `npm run dev`

2. **Open in browser:**
   - Go to: **http://localhost:3000**
   - The token loads automatically (no need to enter anything!)

3. **Generate reports:**
   - Select a report from the dropdown
   - View the attendance table
   - Click "Download CSV" to save the report

4. **Close when done:**
   - Close the browser tab
   - In PowerShell/Terminal, press **Ctrl+C** to stop the server

## 🎯 Simple Workflow Diagram

```
Administrator (One Time):
1. Get Token from Moodle
2. Create .env.local file  
3. Paste token in file
4. Save file
↓
End Users (Daily):
1. Run: npm run dev
2. Open: http://localhost:3000
3. Select report
4. Download CSV
```

## ❓ Common Questions

### Q: Do I need to enter the token every time?
**A:** No! Once configured in `.env.local`, it loads automatically.

### Q: Can multiple users use the same token?
**A:** Yes, but they need access to the same computer or need their own copy with the token configured.

### Q: Is my token safe?
**A:** Yes, as long as you don't share the `.env.local` file or commit it to git.

### Q: What if I see "Token not found" error?
**A:** Make sure the `.env.local` file exists and the token is correctly pasted.

### Q: Can I use this on a different Moodle site?
**A:** Yes, but you'll need to get a token from that Moodle site and update the `.env.local` file.

## 🚨 Important Security Notes

- ✅ **DO**: Keep `.env.local` file private
- ✅ **DO**: Use a token with limited permissions
- ❌ **DON'T**: Share `.env.local` file with anyone
- ❌ **DON'T**: Upload `.env.local` to internet/cloud
- ❌ **DON'T**: Commit `.env.local` to git/version control

## 📞 Need Help?

If you encounter any issues:

1. Make sure Node.js is installed (download from: https://nodejs.org)
2. Check that `.env.local` exists in the project folder
3. Verify the token is correctly copied (no extra spaces)
4. Check your internet connection (needed to access Moodle)
5. Contact your system administrator or developer

---

**That's it!** Once set up, users can generate reports with just a few clicks. No technical knowledge required for daily use! 🎉
