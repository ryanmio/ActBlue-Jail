# Supabase Storage Setup for Bug Report Screenshots

The bug report form uploads screenshots to your existing `screenshots` bucket. Here's how to ensure it's properly configured.

## Quick Setup

### Option 1: Via Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the sidebar
3. Find your `screenshots` bucket (or create it if it doesn't exist)
4. Click the bucket → **Policies** tab
5. Add this policy for uploads:

**Policy Name:** "Allow authenticated uploads to bug-reports folder"

**Policy Definition:**
```sql
CREATE POLICY "Allow service role to upload bug screenshots"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (
  bucket_id = 'screenshots' 
  AND (storage.foldername(name))[1] = 'bug-reports'
);
```

**Or simpler (if you want service role to manage the entire bucket):**
```sql
CREATE POLICY "Service role full access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'screenshots');
```

### Option 2: Via SQL (Advanced)

If you prefer SQL, run this in your Supabase SQL editor:

```sql
-- Ensure the screenshots bucket exists (it should already from your setup)
INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Allow service role full access to screenshots bucket
CREATE POLICY IF NOT EXISTS "Service role full access to screenshots"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'screenshots');
```

## Verifying Setup

After setting up, test by:

1. Opening your bug report form
2. Uploading a screenshot
3. Checking the Supabase Storage → `screenshots` bucket → `bug-reports/` folder

You should see your uploaded image there!

## Troubleshooting

**"Failed to upload screenshot" error:**
- Verify the `screenshots` bucket exists in Supabase
- Check that the service role policy allows uploads
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in your environment variables

**Images not appearing in GitHub issues:**
- The signed URL might not be generated - check server logs
- Verify bucket policies allow the service role to create signed URLs

**"File must be less than 5MB" error:**
- This is intentional - bug report screenshots are limited to 5MB
- Users can compress images or upload to another service and paste a link in the description

## Notes

- Screenshots are stored in `screenshots/bug-reports/` folder
- Signed URLs last for 10 years (effectively permanent)
- Images are uploaded server-side using the service role key (secure)
- The bucket can be private - signed URLs work regardless

