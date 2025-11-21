# Special Features Branch - Access Control Strategy

## Overview
This repository uses a **two-branch strategy** to control access to special features:
- **`master`** branch: Public version that normal users clone and use
- **`special-features`** branch: Private version with exclusive features that require your approval

## How It Works

### What Normal Users Get
When someone clones your repository, they get the `master` branch by default:
```bash
git clone https://github.com/Af1ah/moodleattd.git
# They only get master branch - NO special features
```

### What They DON'T Get
- The `special-features` branch is **NOT** included in their clone by default
- Even if they see it exists, they **CANNOT** access it without your permission
- Your special features remain exclusive to the `special-features` branch

## Your Workflow for Adding Special Features

### Step 1: Work on Special Features Branch
```bash
# Switch to special-features branch
git checkout special-features

# Add your exclusive features
# Edit files, add new features, etc.

# Commit your changes
git add .
git commit -m "Add exclusive feature X"

# Push to special-features branch
git push origin special-features
```

### Step 2: Keep Master Branch Public
```bash
# Switch back to master
git checkout master

# Master stays as it is - NO special features merged
# Normal users only see master branch content
```

### Step 3: When You Approve a Feature for Public Release
Only when you decide to make a feature public:
```bash
# On master branch
git checkout master

# Selectively merge specific commits from special-features
git cherry-pick <commit-hash-from-special-features>

# Or merge entire branch if you want
git merge special-features

# Push to master - NOW users can get this feature
git push origin master
```

## Access Control Mechanisms

### 1. Branch Protection (GitHub Settings Required)
Go to: https://github.com/Af1ah/moodleattd/settings/branches

**For `special-features` branch:**
- ✅ Require pull request reviews
- ✅ Restrict who can push (only you)
- ✅ No force pushes allowed
- ❌ DO NOT make it the default branch

**For `master` branch:**
- Can be open or protected based on your preference
- This is what normal users get

### 2. Repository Visibility Options

#### Option A: Public Repository (Current)
- Anyone can clone and see `master` branch
- They can see `special-features` exists but **cannot access it** without permission
- Need to add collaborators to access `special-features`

#### Option B: Private Repository (Maximum Control)
```bash
# Make entire repo private on GitHub:
# Settings → General → Danger Zone → Change visibility → Private
```
- Nobody can clone without authentication
- You control who can access ANY branch
- More secure but requires you to approve all users

### 3. Collaborator Permissions
Settings → Collaborators and teams

**For normal users:**
- Give **Read** access only
- They can clone and use master
- They **CANNOT** see or access `special-features`

**For approved users:**
- Give **Write** or **Triage** access
- They can access `special-features` branch
- You still control merges via pull requests

## How to Check What Users Get

### Test as a Normal User:
```bash
# Clone the repo (as a normal user would)
git clone https://github.com/Af1ah/moodleattd.git
cd moodleattd

# Check which branch they're on
git branch
# Output: * master  (only master)

# Check if they can see special-features
git branch -r
# Output shows: origin/master, origin/special-features

# Try to checkout special-features
git checkout special-features
# If no permissions: error or empty branch
```

## Important Rules to Follow

### ✅ DO:
- Always develop special features in `special-features` branch
- Keep `master` as the public-facing version
- Only merge to `master` when you approve a feature for public release
- Push changes to `special-features` regularly to back them up
- Set branch protection on `special-features`

### ❌ DON'T:
- Don't accidentally work on special features in `master`
- Don't merge `special-features` into `master` unless you want to make features public
- Don't make `special-features` the default branch
- Don't give normal users Write access to repository

## Current Setup Status

✅ **Branches Created:**
- `master` - Public version (default)
- `special-features` - Your exclusive features

✅ **Current State:**
- You're on `master` branch
- Special features are isolated in `special-features` branch
- Normal users cloning will only get `master`

⚠️ **Action Required:**
1. Go to GitHub Settings → Branches
2. Confirm `master` is the default branch (should be)
3. Add branch protection to `special-features`:
   - Require PR reviews
   - Restrict push access to yourself only
4. (Optional) Make repository private for full control

## Example Scenarios

### Scenario 1: User Clones Your Repo
```bash
# User runs:
git clone https://github.com/Af1ah/moodleattd.git

# They get:
- master branch only
- NO special features
- Standard public version of your app
```

### Scenario 2: You Add New Special Feature
```bash
git checkout special-features
# Add new exclusive feature
git add src/components/SpecialComponent.tsx
git commit -m "Add premium feature"
git push origin special-features

# Result:
- Feature is in special-features branch
- NOT in master
- Normal users don't get it
```

### Scenario 3: You Approve Feature for Public
```bash
git checkout master
git cherry-pick abc123def  # specific commit from special-features
git push origin master

# Result:
- Feature now in master
- Users can pull and get it
- You controlled the release
```

### Scenario 4: Approved User Needs Access
```bash
# On GitHub:
# Settings → Collaborators → Add person
# Give them Read or Write access

# They can now:
git clone https://github.com/Af1ah/moodleattd.git
git checkout special-features  # Now they can access it
```

## Summary

🔒 **Access Control Achieved:**
- Normal users only get `master` branch (public version)
- Special features stay in `special-features` branch
- You control when features become public
- You approve who can access `special-features`

📝 **Your Workflow:**
1. Develop special features in `special-features` branch
2. Push to keep them backed up
3. Keep `master` as public version
4. Selectively merge features to `master` when you approve
5. Normal users never see unapproved features

🎯 **Result:**
Normal users can clone and use your app, but they **CANNOT** access special features until you approve and merge them to master.
