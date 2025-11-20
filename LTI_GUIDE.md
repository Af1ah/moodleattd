# LTI Setup Guide

This guide explains how to integrate the Moodle Attendance Reports application into Moodle using LTI (Learning Tools Interoperability). LTI allows you to embed this application directly within Moodle courses, so students and teachers can access attendance reports without leaving Moodle.

---

## What is LTI?

LTI is a standard way to integrate external applications with learning management systems like Moodle. When a user clicks an LTI link in Moodle, they are automatically authenticated and redirected to your application with their Moodle identity.

---

## Understanding LTI Keys

### Consumer Key
A unique identifier that Moodle uses to recognize your application. Think of it as a username for your app. Moodle generates this automatically when you configure the external tool.

**Example:** `moodle-attendance-1762867`

### Shared Secret
A password that both Moodle and your application know. It's used to encrypt and verify messages between Moodle and your app, ensuring secure communication.

**Example:** `a1b2c3d4e5f6g7h8` (This will be masked with dots in Moodle)

**Security Note:** Never share your Shared Secret publicly or commit it to version control. Keep it only in your `.env.local` file.

---

## Step 1: Configure External Tool in Moodle

### 1.1 Access External Tool Settings

1. Login to Moodle as **administrator**
2. Go to **Site administration**
3. Navigate to **Plugins** → **Activity modules** → **External tool**
4. Click **Manage tools**

### 1.2 Create New Tool

1. Click **Configure a tool manually**
2. Fill in the following fields:

**Basic Settings:**
- **Tool name:** `Attendance Reports`
- **Tool URL:** `http://localhost:3000/api/lti/launch` (change to your domain in production)
- **Tool description:** Leave blank or add: "View student attendance reports"
- **LTI version:** Select `LTI 1.0/1.1`

**Security Settings:**
- **Consumer key:** Moodle will auto-generate this (e.g., `moodle-attendance-1762867`)
- **Shared secret:** Moodle will auto-generate this (you'll see dots masking it)

**Tool Settings:**
- **Tool configuration usage:** Select `Show in activity chooser and as a preconfigured tool`
- **Default launch container:** Select `Embed, without blocks`
- **Supports Deep Linking:** Leave **unchecked**

**Privacy Settings:**
- **Share launcher's name with tool:** Check this
- **Share launcher's email with tool:** Check this
- **Accept grades from the tool:** Leave unchecked (not needed for attendance)

### 1.3 Save and Copy Keys

1. Click **Save changes**
2. **Important:** Copy both the **Consumer key** and **Shared secret**
   - Click "Show" next to Shared secret to reveal it
   - Copy these values immediately
3. You can find these again by clicking **Edit** on your tool in the tools list

---

## Step 2: Configure Environment Variables

Add the LTI configuration to your `.env.local` file:

```env
# LTI Configuration
LTI_CONSUMER_KEY=moodle-attendance-1762867
LTI_SHARED_SECRET=your_actual_shared_secret_here

# Session Configuration (required for LTI)
NEXTAUTH_SECRET=generate_random_32_char_string
NEXTAUTH_URL=http://localhost:3000
```

### Getting Each Value:

**LTI_CONSUMER_KEY**
- Copy from Moodle external tool configuration (Step 1.3)

**LTI_SHARED_SECRET**
- Copy from Moodle external tool configuration (Step 1.3)
- Click "Show" to reveal the secret before copying

**NEXTAUTH_SECRET**
- Generate using: `openssl rand -base64 32`
- Or use any random 32+ character string

**NEXTAUTH_URL**
- Development: `http://localhost:3000`
- Production: Your actual domain (e.g., `https://attendance.yourschool.com`)

---

## Step 3: Add LTI Link to Course

### 3.1 Enable Editing

1. Go to any Moodle course
2. Click **Turn editing on** (top right)

### 3.2 Add External Tool

1. In any section, click **Add an activity or resource**
2. Select **External tool** from the list
3. Click **Add**

### 3.3 Configure Activity

**Activity Settings:**
- **Activity name:** `View Attendance Report`
- **Preconfigured tool:** Select `Attendance Reports` (the tool you created)
- **Launch container:** Already set to "Embed, without blocks"

**Privacy Settings:** (if shown)
- Accept grades: Leave unchecked
- Share launcher's name: Checked
- Share launcher's email: Checked

### 3.4 Save

1. Click **Save and display**
2. The application will load embedded in Moodle

---

## Step 4: Test LTI Integration

### 4.1 As a Teacher

1. Click the LTI link you created in Step 3
2. You should see the login page embedded in Moodle
3. Enter your Moodle username and password
4. You should be redirected to the attendance reports

### 4.2 As a Student

1. Enroll a test student in the course
2. Login as that student
3. Click the LTI link
4. Student should see their own attendance data

---

## LTI Session Flow

Understanding what happens when a user clicks an LTI link:

1. **User clicks LTI link** in Moodle course
2. **Moodle sends LTI launch request** to your app with encrypted user data
3. **Your app verifies** the request using Consumer Key and Shared Secret
4. **Session created** with user's Moodle identity (username, email, roles)
5. **User redirected** to login page with LTI context
6. **User logs in** with Moodle credentials
7. **Full access granted** to attendance reports based on role

### Session Data Stored

When LTI launches, the following data is stored in the session:

- User ID from Moodle
- Username
- Email address
- Full name
- Roles in course
- Course ID
- Course name
- Context ID

This data is used to:
- Pre-fill login username
- Show course context
- Apply role-based permissions
- Track which course the user came from

---

## Troubleshooting

### Error: 403 Forbidden

**Cause:** NEXTAUTH_URL doesn't match your domain

**Fix:**
- Check `.env.local` has correct URL
- Restart your app after changing env variables
- For production, ensure NEXTAUTH_URL matches your actual domain exactly

### Error: Invalid state or Token verification failed

**Cause:** Session expired or invalid LTI signature

**Fix:**
- Clear browser cookies for your app domain
- Check Consumer Key and Shared Secret match exactly
- Verify LTI version is 1.0/1.1 in Moodle
- Check system clock is synchronized on both servers

### User not found or No access

**Cause:** Privacy settings not sharing user data

**Fix:**
- Edit external tool in Moodle
- Ensure "Share launcher's name" is checked
- Ensure "Share launcher's email" is checked
- Save changes and try again

### Application not loading in embed

**Cause:** Container setting or CSP headers

**Fix:**
- Change launch container to "New window" temporarily
- Check browser console for errors
- Verify Tool URL is accessible
- For production, configure CSP headers to allow iframe embedding

### Getting blank page after login

**Cause:** Session not persisting or redirect loop

**Fix:**
- Clear all cookies and try again
- Check NEXTAUTH_SECRET is set
- Verify database connection is working
- Check browser console for JavaScript errors

---

## Production Deployment Notes

When deploying to production:

1. **Update Tool URL** in Moodle to your production domain
2. **Update NEXTAUTH_URL** in `.env.local` to match production domain
3. **Use HTTPS** - LTI requires secure connections in production
4. **Keep secrets secure** - Never commit `.env.local` to version control
5. **Test thoroughly** with different user roles before going live

---

## Security Best Practices

- Store secrets only in `.env.local`
- Use strong, randomly generated secrets
- Rotate shared secrets periodically
- Monitor LTI access logs
- Use HTTPS in production
- Validate all LTI parameters on server side
- Keep Next.js and dependencies updated

---

## Additional Resources

- [IMS LTI Specification](https://www.imsglobal.org/activity/learning-tools-interoperability)
- [Moodle LTI Documentation](https://docs.moodle.org/en/External_tool)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)

---

**Need Help?**

If you encounter issues not covered here:
- Check application logs for error messages
- Verify all configuration steps were followed
- Test with a simple user first before rolling out
- Contact: GitHub [@Af1ah](https://github.com/Af1ah)

---

**Last Updated:** November 2025
