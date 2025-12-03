-- Add rate limiting support for reports
-- Adds 'queued' status and send_token for manual sending

-- Extend the report_status enum to include 'queued'
-- If using text type, no change needed (schema.sql shows text not enum)
-- Just add the send_token column

alter table reports add column if not exists send_token text;
alter table reports add column if not exists html_body text;

-- Add index for looking up queued reports by token
create index if not exists reports_send_token_idx on reports(send_token) where send_token is not null;

-- Add index for efficient rate limit checking (reports sent today)
create index if not exists reports_status_created_idx on reports(status, created_at);

