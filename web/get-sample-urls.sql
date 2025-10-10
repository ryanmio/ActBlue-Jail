-- Get sample non-ActBlue URLs from recent fundraising emails
-- Copy/paste results to analyze tracking domain patterns

SELECT 
  created_at,
  sender_name,
  landing_url,
  substring(raw_text from 'https?://[^\s<>"''()]+') AS first_url_in_text,
  substring(email_body from 'href="(https?://[^"]+)"') AS first_url_in_html
FROM submissions
WHERE 
  created_at > NOW() - INTERVAL '30 days'
  AND is_fundraising = true
  AND message_type = 'email'
  AND (
    raw_text ~ 'https?://' 
    OR email_body ~ 'https?://'
  )
ORDER BY created_at DESC
LIMIT 50;

