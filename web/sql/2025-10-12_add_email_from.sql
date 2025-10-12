-- Add email_from field to store raw "From" line from email headers
-- This is distinct from sender_name (extracted entity name) and sender_id (extracted email)
-- Example: "NEW ActBlue Update (via dccc@dccc.org) <dccc@ak.dccc.org>"

alter table submissions
add column if not exists email_from text;

comment on column submissions.email_from is 'Raw From line from email header (e.g., "Name <email@example.com>"). Distinct from sender_name (AI-extracted entity) and sender_id (extracted email address).';

