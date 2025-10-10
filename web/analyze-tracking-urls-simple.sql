-- Simpler query: Just get all unique domains from recent submissions
-- Run this in Supabase SQL Editor

SELECT 
  substring(
    unnest(regexp_matches(raw_text || ' ' || COALESCE(email_body, ''), 
    'https?://([^/\s<>"''()]+)', 'g'))
    from 1
  ) AS domain,
  COUNT(*) AS occurrences
FROM submissions
WHERE 
  created_at > NOW() - INTERVAL '30 days'
  AND is_fundraising = true
  AND (raw_text IS NOT NULL OR email_body IS NOT NULL)
GROUP BY domain
HAVING substring(unnest(regexp_matches(raw_text || ' ' || COALESCE(email_body, ''), 
    'https?://([^/\s<>"''()]+)', 'g')) from 1) NOT LIKE '%actblue.com%'
  AND substring(unnest(regexp_matches(raw_text || ' ' || COALESCE(email_body, ''), 
    'https?://([^/\s<>"''()]+)', 'g')) from 1) NOT LIKE '%abjail.org%'
ORDER BY occurrences DESC
LIMIT 50;

