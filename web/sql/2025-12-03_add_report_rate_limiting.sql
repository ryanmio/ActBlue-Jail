-- Add rate limiting support for reports
-- Adds 'queued' status and send_token for manual sending

-- Add 'queued' to the report_status enum
-- PostgreSQL requires ALTER TYPE to add enum values
ALTER TYPE report_status ADD VALUE IF NOT EXISTS 'queued';

-- Add new columns
alter table reports add column if not exists send_token text;
alter table reports add column if not exists html_body text;

-- Add index for looking up queued reports by token
create index if not exists reports_send_token_idx on reports(send_token) where send_token is not null;

-- Add index for efficient rate limit checking (reports sent today)
create index if not exists reports_status_created_idx on reports(status, created_at);

