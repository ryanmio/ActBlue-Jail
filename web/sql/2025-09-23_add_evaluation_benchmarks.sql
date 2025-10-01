-- Add evaluation benchmarks table for prompt testing
-- Run this in Supabase SQL editor or psql against your database

create table if not exists evaluation_benchmarks (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  manual_violations jsonb default '[]'::jsonb, -- manually tagged violations
  evaluator_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists evaluation_benchmarks_submission_idx on evaluation_benchmarks(submission_id);

-- Add updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_evaluation_benchmarks_updated_at
    before update on evaluation_benchmarks
    for each row execute function update_updated_at_column();
