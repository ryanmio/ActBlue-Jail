-- Create sender_violation_exemptions table for ActBlue-verified exemptions
-- This allows specific senders to have certain violations marked as verified

-- Function to normalize sender names for flexible matching
-- Handles variations like "DLCC" vs "Democratic Congressional Campaign Committee (DCCC)"
-- Idempotent: create or replace
create or replace function normalize_sender_name(name text)
returns text as $$
declare
  stripped text;
begin
  if name is null then
    return null;
  end if;

  -- 1) Lowercase and trim
  stripped := lower(trim(name));
  -- 2) Remove ANY parentheticals anywhere (not just trailing)
  stripped := regexp_replace(stripped, '\\s*\(.*?\)\\s*', ' ', 'g');
  -- 3) Remove non-alphanumeric except spaces
  stripped := regexp_replace(stripped, '[^a-z0-9\s]', '', 'g');
  -- 4) Collapse multiple spaces
  stripped := regexp_replace(stripped, '\\s+', ' ', 'g');
  -- 5) Trim again
  stripped := btrim(stripped);
  return stripped;
end;
$$ language plpgsql immutable;

-- Function to derive an initialism from a name (e.g., "democratic congressional campaign committee" -> "dccc")
-- Idempotent: create or replace
create or replace function name_initialism(input_name text)
returns text as $$
declare
  n text;
  piece text;
  acc text := '';
begin
  if input_name is null then return null; end if;
  n := normalize_sender_name(input_name);
  if n is null or n = '' then return null; end if;
  for piece in select unnest(regexp_split_to_array(n, '\\s+')) loop
    if length(piece) > 0 then
      acc := acc || substr(piece, 1, 1);
    end if;
  end loop;
  return acc;
end;
$$ language plpgsql immutable;

-- Create the exemptions table
create table if not exists sender_violation_exemptions (
  id uuid primary key default gen_random_uuid(),
  sender_pattern text not null,  -- Pattern to match (can use % wildcards for ILIKE)
  violation_code text not null,  -- e.g., "AB008"
  reason text,                   -- e.g., "ActBlue verified matching program on 2025-10-31"
  verified_by text,              -- e.g., "Cam Sullivan" or "ActBlue Team"
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Unique constraint to prevent duplicate exemptions
create unique index if not exists sender_violation_exemptions_unique_idx 
  on sender_violation_exemptions(sender_pattern, violation_code);

-- Index for faster lookups during classification
create index if not exists sender_violation_exemptions_code_idx 
  on sender_violation_exemptions(violation_code);

-- Create a function to update updated_at timestamp
create or replace function update_sender_exemptions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to automatically update updated_at (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_trigger 
    where tgname = 'update_sender_exemptions_updated_at'
  ) then
    create trigger update_sender_exemptions_updated_at
      before update on sender_violation_exemptions
      for each row
      execute function update_sender_exemptions_updated_at();
  end if;
end $$;

-- Example usage comments:
-- To add an exemption:
--   INSERT INTO sender_violation_exemptions (sender_pattern, violation_code, reason, verified_by)
--   VALUES ('democratic legislative campaign committee', 'AB008', 'ActBlue verified matching program', 'Cam Sullivan');
--
-- The pattern 'democratic legislative campaign committee' will match:
--   - "DLCC"
--   - "Democratic Legislative Campaign Committee"
--   - "Democratic Legislative Campaign Committee (DLCC)"
--   - "democratic legislative campaign committee (DLCC)"
--
-- For wildcard matching:
--   VALUES ('%stop republicans%', 'AB008', 'Verified matching', 'ActBlue Team');

