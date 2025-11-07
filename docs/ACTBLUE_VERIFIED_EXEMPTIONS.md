# ActBlue Verified Exemptions

## Quick Start

When ActBlue verifies that a sender's matching program meets their standards:

### 1. Add exemption
```sql
INSERT INTO sender_violation_exemptions (sender_pattern, violation_code, reason, verified_by) VALUES
('democratic legislative campaign committee', 'AB008', 'ActBlue verified matching program', 'Cam Sullivan');
```

### 2. Mark existing violations as verified
```sql
UPDATE violations v
SET actblue_verified = true
FROM submissions s, sender_violation_exemptions e
WHERE v.submission_id = s.id
  AND v.code = e.violation_code
  AND v.actblue_verified = false
  AND normalize_sender_name(s.sender_name) = normalize_sender_name(e.sender_pattern);
```

## How it works

- Sender names are normalized: `"DCCC (Democratic Congressional Campaign Committee)"`, `"Democratic Congressional Campaign Committee (DCCC)"` both match the pattern `'democratic congressional campaign committee'`
- Matching uses two simple strategies:
  1. **Exact match** (after normalization): Pattern matches sender exactly
  2. **Sender contains pattern**: Sender name includes the pattern (e.g., `"DCCC - Democratic Congressional Campaign Committee"` matches pattern `"democratic congressional campaign committee"`)
- **Important**: Patterns must be specific enough to avoid false positives. The matching is intentionally one-directional (sender must contain pattern, not vice versa) to prevent partial word matches
- Violations marked as `actblue_verified = true` appear as blue badges "ActBlue Permitted Matching Program" instead of orange "Unverified Matching Program"
- These violations are excluded from "Most Potential Violations" card and stats page sender counts
- The violations remain publicly visible for transparency

## Verify it worked
```sql
SELECT sender_name, 
  COUNT(*) total,
  COUNT(*) FILTER (WHERE actblue_verified = true) verified,
  COUNT(*) FILTER (WHERE actblue_verified = false) unverified
FROM violations v
JOIN submissions s ON v.submission_id = s.id
WHERE s.sender_name ILIKE '%pattern%'
GROUP BY sender_name;
```

If all violations show verified count = total, they'll disappear from worst offenders lists.

## Remove exemption
```sql
DELETE FROM sender_violation_exemptions 
WHERE sender_pattern = 'democratic legislative campaign committee' AND violation_code = 'AB008';

UPDATE violations SET actblue_verified = false 
WHERE code = 'AB008' AND submission_id IN (
  SELECT id FROM submissions WHERE normalize_sender_name(sender_name) = 'democratic legislative campaign committee'
);
```

