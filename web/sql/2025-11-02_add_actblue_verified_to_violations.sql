-- Add actblue_verified flag to violations table
-- This field is set to true when a violation matches an exemption in sender_violation_exemptions

alter table violations 
  add column if not exists actblue_verified boolean default false;

-- Index for filtering verified violations
create index if not exists violations_actblue_verified_idx 
  on violations(actblue_verified);

-- Helper function to check and mark violations as verified for a given submission
-- This can be called after classification or manually to update existing violations
create or replace function mark_verified_violations(submission_id_param uuid)
returns integer as $$
declare
  updated_count integer;
begin
  -- Update violations that match exemptions
  with matched_exemptions as (
    select 
      v.id as violation_id
    from violations v
    join submissions s on s.id = v.submission_id
    join sender_violation_exemptions e on e.violation_code = v.code
    where v.submission_id = submission_id_param
      and v.actblue_verified = false
      and (
        -- Exact normalized match
        normalize_sender_name(s.sender_name) = normalize_sender_name(e.sender_pattern)
        or
        -- Wildcard pattern match (if sender_pattern contains %)
        (e.sender_pattern like '%\%%' and normalize_sender_name(s.sender_name) ilike normalize_sender_name(e.sender_pattern))
      )
  )
  update violations
  set actblue_verified = true
  from matched_exemptions
  where violations.id = matched_exemptions.violation_id;
  
  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$ language plpgsql;

-- One-time update to mark existing violations (run after adding exemptions)
-- Uncomment and run manually when needed:
-- UPDATE violations v
-- SET actblue_verified = true
-- FROM submissions s, sender_violation_exemptions e
-- WHERE v.submission_id = s.id
--   AND v.code = e.violation_code
--   AND v.actblue_verified = false
--   AND (
--     normalize_sender_name(s.sender_name) = normalize_sender_name(e.sender_pattern)
--     OR (e.sender_pattern LIKE '%\%%' AND normalize_sender_name(s.sender_name) ILIKE normalize_sender_name(e.sender_pattern))
--   );

