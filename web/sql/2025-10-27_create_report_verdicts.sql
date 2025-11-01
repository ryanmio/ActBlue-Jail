-- Create report_verdicts table to store ActBlue determinations/responses
-- This allows manual tracking of whether ActBlue found violations or not

create table if not exists report_verdicts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references submissions(id) on delete cascade,
  verdict text not null check (verdict in ('violation_confirmed', 'no_violation', 'pending', 'under_review', 'resolved')),
  explanation text,
  determined_by text, -- optional: name or identifier of who made the determination
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists report_verdicts_case_idx on report_verdicts(case_id);

-- Create a function to update updated_at timestamp
create or replace function update_report_verdicts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to automatically update updated_at
create trigger update_report_verdicts_updated_at
  before update on report_verdicts
  for each row
  execute function update_report_verdicts_updated_at();

