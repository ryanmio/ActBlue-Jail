-- RPC function to compute stats for transparent reporting
-- Uses America/New_York timezone for buckets
-- Returns aggregated data for a given date range

create or replace function get_stats(
  start_date timestamptz default null,
  end_date timestamptz default now(),
  sender_names text[] default null
)
returns json
language plpgsql
as $$
declare
  result json;
  total_captures int;
  captures_with_violations int;
  total_reports int;
  user_upload_count int;
  honeytrap_count int;
  day_count int;
  filter_enabled boolean := sender_names is not null and array_length(sender_names, 1) is not null;
begin
  -- If no start_date provided, use lifetime (earliest submission)
  if start_date is null then
    select coalesce(min(created_at), now() - interval '1 year')
    into start_date
    from submissions;
  end if;

  -- Basic counts
  select count(*)
  into total_captures
  from submissions s
  where s.created_at >= start_date and s.created_at <= end_date
    and s.public = true
    and (
      not filter_enabled or coalesce(s.sender_name, s.sender_id, 'Unknown') = any(sender_names)
    );

  select count(distinct submission_id)
  into captures_with_violations
  from violations v
  join submissions s on v.submission_id = s.id
  where s.created_at >= start_date and s.created_at <= end_date
    and s.public = true
    and (
      not filter_enabled or coalesce(s.sender_name, s.sender_id, 'Unknown') = any(sender_names)
    );

  select count(*)
  into total_reports
  from reports
  where created_at >= start_date and created_at <= end_date;

  -- Source split: unknown = user_upload, sms/email = honeytrap
  select 
    count(*) filter (where message_type = 'unknown') as user_uploads,
    count(*) filter (where message_type in ('sms', 'email')) as honeytraps
  into user_upload_count, honeytrap_count
  from submissions s
  where s.created_at >= start_date and s.created_at <= end_date
    and s.public = true
    and (
      not filter_enabled or coalesce(s.sender_name, s.sender_id, 'Unknown') = any(sender_names)
    );

  -- Calculate day count for bucket strategy
  select greatest(1, extract(days from end_date - start_date)::int)
  into day_count;

  -- Build result object
  result := json_build_object(
    'period', json_build_object(
      'start', start_date,
      'end', end_date,
      'days', day_count
    ),
    'kpis', json_build_object(
      'total_captures', total_captures,
      'captures_with_violations', captures_with_violations,
      'total_reports', total_reports,
      'user_uploads', user_upload_count,
      'honeytraps', honeytrap_count
    ),
    'captures_by_bucket', (
      select json_agg(
        json_build_object(
          'bucket', bucket_date,
          'count', count
        ) order by bucket_date
      )
      from (
        select 
          case
            when day_count <= 14 then date_trunc('day', created_at at time zone 'America/New_York')
            else date_trunc('week', created_at at time zone 'America/New_York')
          end as bucket_date,
          count(*) as count
        from submissions s
        where s.created_at >= start_date and s.created_at <= end_date
          and s.public = true
          and (
            not filter_enabled or coalesce(s.sender_name, s.sender_id, 'Unknown') = any(sender_names)
          )
        group by bucket_date
        order by bucket_date
      ) buckets
    ),
    'violations_by_bucket', (
      select json_agg(
        json_build_object(
          'bucket', bucket_date,
          'count', count
        ) order by bucket_date
      )
      from (
        select 
          case
            when day_count <= 14 then date_trunc('day', s.created_at at time zone 'America/New_York')
            else date_trunc('week', s.created_at at time zone 'America/New_York')
          end as bucket_date,
          count(distinct s.id) as count
        from submissions s
        join violations v on v.submission_id = s.id
        where s.created_at >= start_date and s.created_at <= end_date
          and s.public = true
          and (
            not filter_enabled or coalesce(s.sender_name, s.sender_id, 'Unknown') = any(sender_names)
          )
        group by bucket_date
        order by bucket_date
      ) buckets
    ),
    'top_senders', (
      select json_agg(
        json_build_object(
          'sender', sender_name_val,
          'total_captures', capture_count,
          'captures_with_violations', violation_count,
          'is_repeat_offender', violation_count >= 3
        ) order by capture_count desc
      )
      from (
        select 
          coalesce(sender_name, sender_id, 'Unknown') as sender_name_val,
          count(*) as capture_count,
          count(distinct v.submission_id) as violation_count
        from submissions s
        left join violations v on v.submission_id = s.id
        where s.created_at >= start_date and s.created_at <= end_date
          and s.public = true
          and (
            not filter_enabled or coalesce(s.sender_name, s.sender_id, 'Unknown') = any(sender_names)
          )
        group by sender_name_val
        having count(*) >= 1
        order by capture_count desc
        limit 20
      ) senders
    ),
    'violation_mix', (
      select json_agg(
        json_build_object(
          'code', violation_code,
          'count', violation_count,
          'percentage', round((violation_count::numeric / nullif(total_violations, 0) * 100)::numeric, 1)
        ) order by violation_count desc
      )
      from (
        select 
          v.code as violation_code,
          count(*) as violation_count,
          sum(count(*)) over () as total_violations
        from violations v
        join submissions s on v.submission_id = s.id
        where s.created_at >= start_date and s.created_at <= end_date
          and s.public = true
          and (
            not filter_enabled or coalesce(s.sender_name, s.sender_id, 'Unknown') = any(sender_names)
          )
        group by v.code
        order by violation_count desc
      ) violation_stats
    ),
    'source_split', json_build_array(
      json_build_object(
        'source', 'user_upload',
        'count', user_upload_count,
        'percentage', round((user_upload_count::numeric / nullif(total_captures, 0) * 100)::numeric, 1)
      ),
      json_build_object(
        'source', 'honeytrap',
        'count', honeytrap_count,
        'percentage', round((honeytrap_count::numeric / nullif(total_captures, 0) * 100)::numeric, 1)
      )
    )
  );

  return result;
end;
$$;
