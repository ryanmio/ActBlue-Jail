-- Create report_replies table to store inbound responses from ActBlue

create table if not exists report_replies (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  case_id uuid not null references submissions(id) on delete cascade,
  from_email text not null,
  body_text text not null,
  created_at timestamptz default now()
);

create index if not exists report_replies_case_idx on report_replies(case_id);
create index if not exists report_replies_report_idx on report_replies(report_id);


