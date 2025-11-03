-- Create sender_violation_exemptions table for ActBlue-verified exemptions
-- This allows specific senders to have certain violations marked as verified

-- Function to normalize sender names for flexible matching
-- Handles variations like "DLCC" vs "Democratic Legislative Campaign Committee (DLCC)"
create or replace function normalize_sender_name(name text)
returns text as $$
begin
  if name is null then
    return null;
  end if;
  
  return regexp_replace(
    regexp_replace(
      lower(trim(name)),
      '\s*\([^)]+\)\s*$',  -- Remove trailing parentheticals like "(DLCC)" or "(PAC)"
      '',
      'g'
    ),
    '[^a-z0-9\s]',  -- Remove special characters except spaces
    '',
    'g'
  );
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

-- Create trigger to automatically update updated_at
create trigger update_sender_exemptions_updated_at
  before update on sender_violation_exemptions
  for each row
  execute function update_sender_exemptions_updated_at();

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

