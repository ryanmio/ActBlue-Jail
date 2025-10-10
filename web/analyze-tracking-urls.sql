-- Extract all unique URL domains from submissions to identify tracking patterns
-- Run this in Supabase SQL Editor

WITH urls_extracted AS (
  SELECT 
    id,
    created_at,
    sender_name,
    landing_url,
    -- Extract URLs from raw_text
    regexp_matches(raw_text, 'https?://[^\s<>"''()]+', 'g') AS url_match,
    -- Extract URLs from email_body HTML
    regexp_matches(email_body, 'https?://[^\s<>"''()]+', 'g') AS html_url_match
  FROM submissions
  WHERE 
    created_at > NOW() - INTERVAL '30 days' -- Last 30 days
    AND is_fundraising = true
),
all_urls AS (
  SELECT 
    id,
    sender_name,
    landing_url,
    unnest(ARRAY[url_match[1], html_url_match[1]]) AS url
  FROM urls_extracted
  WHERE url_match IS NOT NULL OR html_url_match IS NOT NULL
),
url_domains AS (
  SELECT 
    id,
    sender_name,
    landing_url,
    url,
    -- Extract domain from URL
    CASE 
      WHEN url ~ '^https?://([^/]+)' THEN 
        substring(url from '^https?://([^/]+)')
      ELSE NULL
    END AS domain
  FROM all_urls
  WHERE url IS NOT NULL
)
SELECT 
  domain,
  COUNT(DISTINCT id) AS submission_count,
  COUNT(*) AS url_count,
  -- Show if any resolved to ActBlue
  BOOL_OR(landing_url LIKE '%actblue.com%') AS leads_to_actblue,
  -- Sample URLs
  array_agg(DISTINCT url) FILTER (WHERE url IS NOT NULL) AS sample_urls,
  -- Sample senders
  array_agg(DISTINCT sender_name) FILTER (WHERE sender_name IS NOT NULL) AS sample_senders
FROM url_domains
WHERE 
  domain IS NOT NULL
  AND domain NOT LIKE '%actblue.com%' -- Exclude direct ActBlue
  AND domain NOT LIKE '%abjail.org%' -- Exclude our own domain
GROUP BY domain
ORDER BY submission_count DESC, url_count DESC
LIMIT 100;

