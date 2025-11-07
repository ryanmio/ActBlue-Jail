-- Fix overly broad exemption matching that was marking too many violations as verified
-- The previous logic had two major issues:
-- 1. Bidirectional substring matching (pattern contains sender name)
-- 2. Broken initialism matching (all patterns starting with same letter matched)

-- First, reset all actblue_verified flags
UPDATE violations SET actblue_verified = false WHERE actblue_verified = true;

-- Now re-mark violations using the corrected matching logic
-- Only uses: exact match, sender-contains-pattern, and wildcard pattern
-- Removed the broken initialism matching that caused false positives
UPDATE violations v
SET actblue_verified = true
FROM submissions s, sender_violation_exemptions e
WHERE v.submission_id = s.id
  AND v.code = e.violation_code
  AND v.actblue_verified = false
  AND (
    -- Exact normalized match
    normalize_sender_name(s.sender_name) = normalize_sender_name(e.sender_pattern)
    OR
    -- Sender contains pattern (covers appended/prepended variants like "DCCC - Democratic Congressional Campaign Committee")
    normalize_sender_name(s.sender_name) ILIKE ('%' || normalize_sender_name(e.sender_pattern) || '%')
    OR
    -- Wildcard pattern support: if pattern contains % treat it as already-wild
    (e.sender_pattern LIKE '%\%%' AND normalize_sender_name(s.sender_name) ILIKE normalize_sender_name(e.sender_pattern))
  );

