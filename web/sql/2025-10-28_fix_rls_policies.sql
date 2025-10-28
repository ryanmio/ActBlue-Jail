-- Fix Row Level Security Policies
-- Remove dangerous write policies that allow direct DB manipulation via anon key

-- DROP dangerous write policies that bypass API validation
DROP POLICY IF EXISTS "public_insert_submissions" ON submissions;
DROP POLICY IF EXISTS "public_update_submissions_raw_text" ON submissions;

-- Keep existing read policies (these are correct):
-- - public_read_submissions: allows reading public=true submissions
-- - public_read_violations: allows reading violations on public submissions

-- Add RLS to related tables (read-only for anon, full access for service role)
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "public_read_comments" ON comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM submissions s 
      WHERE s.id = comments.submission_id 
      AND s.public = true
    )
  );

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "public_read_reports" ON reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM submissions s 
      WHERE s.id = reports.case_id 
      AND s.public = true
    )
  );

ALTER TABLE report_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "public_read_replies" ON report_replies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM submissions s 
      WHERE s.id = report_replies.case_id 
      AND s.public = true
    )
  );

-- Note: service_role key automatically bypasses RLS, so no separate policies needed
-- Keep audit_log, deletion_requests, evaluation_* without RLS (admin/service only)

