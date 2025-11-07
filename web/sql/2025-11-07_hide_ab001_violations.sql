-- Hide submissions with AB001 violations from public view
-- AB001 (Misrepresentation/Impersonation) requires the impacted party to report,
-- so we cannot consider these violations or allow third-party reporting

-- Set public=false for any submission that has an AB001 violation
UPDATE submissions
SET public = false
WHERE id IN (
  SELECT DISTINCT submission_id 
  FROM violations 
  WHERE code = 'AB001'
);

-- Optional: Add a comment explaining why (if you have an admin_notes column)
-- UPDATE submissions
-- SET admin_notes = COALESCE(admin_notes || E'\n', '') || 'Hidden due to AB001 violation (requires impacted party to report)'
-- WHERE id IN (
--   SELECT DISTINCT submission_id 
--   FROM violations 
--   WHERE code = 'AB001'
-- );

-- Summary: Show how many submissions were affected
SELECT 
  COUNT(DISTINCT submission_id) as affected_submissions,
  COUNT(*) as total_ab001_violations
FROM violations 
WHERE code = 'AB001';

