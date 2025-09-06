-- Create comments table for per-submission reviewer comments
-- Run this in Supabase SQL editor or psql against your database

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create index if not exists comments_submission_idx on comments(submission_id);

-- Optional: hard cap enforcement can remain in the API layer. This migration
-- creates storage only.


