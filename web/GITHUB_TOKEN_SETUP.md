# GitHub Token Setup for Bug Report Form

The bug report form requires a GitHub Personal Access Token (PAT) to automatically create issues in your repository.

## Features

- ✅ In-app bug report and feature request forms
- ✅ Optional screenshot uploads (stored in Supabase, linked in GitHub issues)
- ✅ No email collection (privacy-friendly)
- ✅ Automatic labeling and organization

## Steps to Create a GitHub Token

1. **Go to GitHub Settings**
   - Navigate to: https://github.com/settings/tokens
   - Or: Click your profile → Settings → Developer settings → Personal access tokens → Tokens (classic)

2. **Generate New Token**
   - Click "Generate new token" → "Generate new token (classic)"
   - Give it a descriptive name like "AB Jail Bug Reports"
   - Set expiration (recommend: No expiration for production, or 1 year+)

3. **Select Permissions**
   - Under **repo** section, select:
     - ✅ `public_repo` (for public repositories)
     - OR ✅ `repo` (full control, if private repo)
   
   That's all you need! The token only needs permission to create issues.

4. **Generate and Copy Token**
   - Click "Generate token" at the bottom
   - **⚠️ IMPORTANT:** Copy the token immediately - you won't be able to see it again!

5. **Add to Environment Variables**
   
   **For Local Development:**
   ```bash
   # In your .env.local file (create if it doesn't exist)
   GITHUB_TOKEN=ghp_your_token_here
   ```
   
   **For Production (Vercel):**
   - Go to your project on Vercel
   - Settings → Environment Variables
   - Add: `GITHUB_TOKEN` = `your_token_here`
   - Make sure to add it for all environments (Production, Preview, Development)
   - Redeploy your app after adding the token

## Testing

After setting up the token:

1. Run your development server: `npm run dev`
2. Navigate to your site
3. Open the dropdown menu (top right)
4. Click "Bug Report" or "Feature Request"
5. Fill out the form and submit
6. Check your GitHub repository's Issues tab - you should see the new issue!

## Security & Privacy Notes

- ✅ The token is only stored server-side (never exposed to the client)
- ✅ The token is only used to create issues (limited scope)
- ✅ Issues are tagged with `from-app` label so you can identify automated submissions
- ✅ No email addresses are collected (privacy-friendly)
- ✅ Screenshots are stored in your Supabase storage with signed URLs (10-year expiry)
- ⚠️ Never commit the token to your repository
- ⚠️ Keep `.env.local` in your `.gitignore`

## Troubleshooting

**"GitHub integration not configured" error:**
- Make sure `GITHUB_TOKEN` is set in your environment variables
- Restart your development server after adding the token

**"Failed to create GitHub issue" error:**
- Verify your token has the correct permissions
- Check that the repository name in the API route matches your actual repo
- Ensure the token hasn't expired

**Issues appear but without labels:**
- The token needs `public_repo` or `repo` permission to add labels
- Labels `bug`, `enhancement`, and `from-app` will be added automatically if they exist in your repo

## Disable the Feature

If you don't want to set up the GitHub integration, the form will gracefully degrade:
- The form will show an error message to users
- OR you can revert to the simple GitHub links by undoing the changes to `PageHeader.tsx` and `page.tsx`

