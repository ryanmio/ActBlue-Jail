-- Enums
create type message_type as enum ('sms','email','unknown');
create type redact_level as enum ('default','strict');

-- Tables
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  uploader_fingerprint text,
  image_url text not null,
  message_type message_type default 'unknown',
  raw_text text,
  processing_status text default 'queued' check (processing_status in ('queued','ocr','classified','done','error')),
  ocr_method text,
  ocr_confidence numeric(3,2),
  ocr_ms int,
  classifier_ms int,
  sender_id text,
  sender_name text,
  links jsonb default '[]'::jsonb,
  redact_level redact_level default 'default',
  ai_version text,
  ai_confidence numeric(3,2),
  email_subject text,
  email_body text,
  public boolean default true
);
create index if not exists submissions_sender_idx on submissions(sender_id);
create index if not exists submissions_created_idx on submissions(created_at);

create table if not exists violations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  code text not null,
  title text not null,
  description text not null,
  evidence_spans jsonb,
  severity int not null,
  confidence numeric(3,2) not null
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  submission_id uuid references submissions(id) on delete cascade,
  payload jsonb,
  created_at timestamptz default now()
);

-- Deletion Requests: allow anyone to request a case be deleted
create table if not exists deletion_requests (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  reason text not null,
  requester text, -- optional: email, ip hash, or name if provided
  created_at timestamptz default now()
);

-- indexes for faster lookups
create index if not exists deletion_requests_submission_idx on deletion_requests(submission_id);

-- RLS (to enable in Supabase)
-- alter table submissions enable row level security;
-- create policy public_read_only on submissions for select using (public = true);
-- create policy admin_full on submissions for all using (auth.role() = 'admin') with check (auth.role() = 'admin');

-- alter table violations enable row level security;
-- create policy public_read on violations for select using (
--   exists(select 1 from submissions s where s.id = violations.submission_id and s.public = true)
-- );

