# Branch Protection Setup Guide for 'special-features'

## Overview
This document explains how to set up protected branch rules for the `special-features` branch to ensure that only authorized users can make changes and all changes require approval.

## Branch Protection Configuration

### Step 1: Access GitHub Repository Settings
1. Go to your GitHub repository: https://github.com/Af1ah/moodleattd
2. Click on **Settings** tab
3. In the left sidebar, click on **Branches** under "Code and automation"

### Step 2: Add Branch Protection Rule
1. Click on **Add branch protection rule**
2. In "Branch name pattern" field, enter: `special-features`

### Step 3: Configure Protection Settings

#### Required Settings (Standard Protection):

**Require a pull request before merging:**
- ✅ Enable this option
- ✅ Require approvals: Set to **1** (or more)
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require review from Code Owners (if you have a CODEOWNERS file)

**Require status checks to pass before merging:**
- ✅ Enable this option
- ✅ Require branches to be up to date before merging

**Require conversation resolution before merging:**
- ✅ Enable this option (ensures all PR comments are resolved)

**Require signed commits:**
- ✅ Enable this option (for additional security)

**Require linear history:**
- ✅ Enable this option (prevents merge commits, keeps clean history)

**Do not allow bypassing the above settings:**
- ✅ Enable this option

**Restrict who can push to matching branches:**
- ✅ Enable this option
- Add only your username or specific collaborators who should have direct push access
- Leave empty to require PRs from everyone (most secure)

**Allow force pushes:**
- ❌ Keep this DISABLED

**Allow deletions:**
- ❌ Keep this DISABLED

### Step 4: Save Changes
Click **Create** or **Save changes** at the bottom of the page.

## How It Works

### For You (Repository Owner):
- You can configure who has direct push access
- You can approve or reject pull requests
- You maintain full control over the branch

### For Other Contributors:
1. They must **fork** the repository or create a **feature branch**
2. They make changes in their fork/branch
3. They submit a **Pull Request** to the `special-features` branch
4. You receive a notification and can:
   - Review the code changes
   - Request modifications
   - Approve or reject the PR
5. Only after your approval can the changes be merged

## Additional Security Measures

### 1. Make Repository Private (Optional)
If you want complete privacy:
1. Go to **Settings** → **General**
2. Scroll to "Danger Zone"
3. Click "Change repository visibility"
4. Select "Make private"

### 2. Manage Collaborator Access
1. Go to **Settings** → **Collaborators and teams**
2. Add specific collaborators with appropriate permissions:
   - **Read**: Can view and clone
   - **Triage**: Can manage issues and PRs
   - **Write**: Can push to unprotected branches
   - **Maintain**: Can manage some settings
   - **Admin**: Full access

### 3. Create CODEOWNERS File (Optional)
Create a file at `.github/CODEOWNERS`:
```
# Special features branch requires your approval
/src/    @Af1ah
*        @Af1ah
```

### 4. Use GitHub Actions for Additional Checks
Create automated tests that must pass before merging.

## Common Workflows

### Scenario 1: You Want to Make Changes
```bash
git checkout special-features
# Make your changes
git add .
git commit -m "Add new feature"
git push origin special-features
```

### Scenario 2: Someone Else Wants to Contribute
```bash
# They fork your repo or create a feature branch
git checkout -b my-feature-for-special
# Make changes
git add .
git commit -m "Propose new feature"
git push origin my-feature-for-special
# Then create a PR to your special-features branch
```

### Scenario 3: You Review and Approve
1. Go to the Pull Requests tab on GitHub
2. Review the proposed changes
3. Leave comments or request changes
4. Click "Approve" when satisfied
5. Click "Merge pull request" to integrate changes

## Password/Token Protection for Cloning

### Make Repository Private
Private repositories require authentication to clone:
```bash
# Others need a personal access token or SSH key
git clone https://github.com/Af1ah/moodleattd.git
# Will prompt for username and personal access token
```

### Deploy Keys (For Specific Access)
1. Go to **Settings** → **Deploy keys**
2. Add specific SSH keys for authorized systems
3. Can be read-only or read-write

## Verification

To verify protection is active:
```bash
# Try to push directly (should fail if not authorized)
git push origin special-features

# Expected error message:
# remote: error: GH006: Protected branch update failed for refs/heads/special-features.
```

## Support Commands

### View current branch protection status (using GitHub CLI):
```bash
gh api repos/Af1ah/moodleattd/branches/special-features/protection
```

### View who can access your repository:
```bash
gh api repos/Af1ah/moodleattd/collaborators
```

## Summary

✅ **Branch created**: `special-features`  
✅ **Pushed to remote**: Available on GitHub  
⚠️ **Action required**: Configure branch protection rules in GitHub Settings  
⚠️ **Optional**: Make repository private for complete access control  

With these settings, the `special-features` branch will be protected and require your approval for any changes, effectively creating a password/approval-based access control system.
