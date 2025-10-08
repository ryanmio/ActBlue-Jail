-- Add forwarder email and submission token for email-based case preview feature
-- Allows users who forward emails to receive a preview and submit directly from inbox

alter table submissions add column if not exists forwarder_email text;
alter table submissions add column if not exists submission_token text;
alter table submissions add column if not exists token_used_at timestamptz;
alter table submissions add column if not exists preview_email_sent_at timestamptz;
alter table submissions add column if not exists preview_email_status text;

-- Index for fast token lookups
create index if not exists submissions_token_idx on submissions(submission_token);

-- Comments for documentation
comment on column submissions.forwarder_email is 'Email address of the person who forwarded the message to submit@abjail.org';
comment on column submissions.submission_token is 'Secure one-time token for submitting report via email link';
comment on column submissions.token_used_at is 'Timestamp when the submission token was used (null = unused)';
comment on column submissions.preview_email_sent_at is 'Timestamp when preview email was sent to forwarder';
comment on column submissions.preview_email_status is 'Status of preview email: pending, sent, failed';

