# LTI Setup Guide

## What are Consumer Key and Shared Secret?

- **Consumer Key**: A unique identifier (like a username) that Moodle uses to identify your external app. Moodle generates this automatically (e.g., `moodle-attendance-1762867`)

- **Shared Secret**: A password that both Moodle and your app know. It's used to encrypt and verify messages between Moodle and your app, ensuring secure communication

Think of it like this:
- Consumer Key = Your app's username in Moodle
- Shared Secret = Your app's password that proves it's really you

**Security Note**: Never share your Shared Secret publicly or commit it to version control. Keep it in your `.env.local` file only.

---

## Quick Setup Steps

### 1. Configure Moodle External Tool

1. Go to **Site administration** → **Plugins** → **Activity modules** → **External tool** → **Manage tools**
2. Click **Configure a tool manually**
3. Fill in **Tool settings**:
   - **Tool name**: `attendance report`
   - **Tool URL**: `http://localhost:3000/api/lti/launch`
   - **Tool description**: (Optional - leave blank or describe your tool)
   - **LTI version**: `LTI 1.0/1.1`
   - **Consumer key**: (Copy this - e.g., `moodle-attendance-1762867`)
   - **Shared secret**: (Copy this - it will be masked with dots)
   - **Custom parameters**: (Leave blank unless needed)
   - **Tool configuration usage**: `Show in activity chooser and as a preconfigured tool`
   - **Default launch container**: `Embed, without blocks`
   - **Supports Deep Linking (Content-Item Message)**: Unchecked
4. Click **Save changes**
5. **Important**: Copy and save your **Consumer key** and **Shared secret** - you'll need these for your app

### 2. Add Environment Variables

Add to your `.env.local` file:

```env
LTI_CONSUMER_KEY=moodle-attendance-1762867
LTI_SHARED_SECRET=your_shared_secret_from_moodle
NEXTAUTH_SECRET=your_random_secret_key
NEXTAUTH_URL=http://localhost:3000
```

**Note**: 
- Use the **Consumer key** and **Shared secret** from Step 1
- For production, change `http://localhost:3000` to your actual domain

### 3. Add LTI Link in Moodle Course

1. Turn editing on in a Moodle course
2. Click **Add an activity or resource**
3. Select **External tool**
4. Choose your configured tool from the **Preconfigured tool** dropdown
5. Click **Save and display**

### 4. Test the Integration

1. Click the LTI link in your Moodle course
2. You should be redirected to your Next.js app
3. User should be automatically authenticated with their Moodle identity

## Troubleshooting

- **403 Forbidden**: Check NEXTAUTH_URL matches your domain exactly
- **Invalid state**: Clear cookies and try again
- **Token verification failed**: Verify LTI endpoints in environment variables
- **User not found**: Ensure privacy settings share user data in Moodle tool config
