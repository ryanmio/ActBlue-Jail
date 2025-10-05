-- Add normalized text and hashes for duplicate detection on submissions
alter table if exists submissions
  add column if not exists normalized_text text;

alter table if exists submissions
  add column if not exists normalized_hash text;

alter table if exists submissions
  add column if not exists simhash64 bigint;

-- Backfill-safe: do not set NOT NULL in migration to avoid locking; app will populate going forward

create unique index if not exists submissions_normalized_hash_key on submissions(normalized_hash);
create index if not exists submissions_simhash64_idx on submissions(simhash64);


