-- Create reports table to track outbound violation report emails
-- and a status enum for lifecycle

do $$ begin
  create type report_status as enum ('sent','failed','responded');
exception
  when duplicate_object then null;
end $$;

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references submissions(id) on delete cascade,
  to_email text not null,
  cc_email text,
  subject text not null,
  body text not null,
  screenshot_url text,
  landing_url text not null,
  status report_status not null,
  created_at timestamptz default now()
);

create index if not exists reports_case_idx on reports(case_id);


