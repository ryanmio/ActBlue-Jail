-- Add email_body_original column to store unsanitized HTML for troubleshooting
-- This preserves all original links (tracking, CTA buttons, etc.) before sanitization

alter table submissions add column if not exists email_body_original text;

comment on column submissions.email_body_original is 'Original unsanitized email HTML (preserves all links for troubleshooting)';

