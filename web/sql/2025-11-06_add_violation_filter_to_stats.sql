-- Add violation filter parameters to get_stats RPC
-- Supports filtering by violation code and permitted status (actblue_verified flag)

create or replace function get_stats(
  start_date timestamptz default null,
  end_date timestamptz default now(),
  sender_names text[] default null,
  violation_codes text[] default null,
  violation_permitted_flags boolean[] default null
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
  violation_filter_enabled boolean := violation_codes is not null and array_length(violation_codes, 1) is not null;
begin
  if start_date is null then
    select coalesce(min(created_at), now() - interval '1 year') into start_date from submissions;
  end if;

  select count(*) into total_captures
  from submissions s
  where s.created_at >= start_date and s.created_at <= end_date
    and s.public = true
    and (not filter_enabled or coalesce(s.sender_name, s.sender_id, 'Unknown') = any(sender_names))
    and (not violation_filter_enabled or exists (
      select 1 from violations v
      where v.submission_id = s.id
        and v.code = any(violation_codes)
        and (
          case when violation_permitted_flags[array_position(violation_codes, v.code)] is null then v.actblue_verified = false
               when violation_permitted_flags[array_position(violation_codes, v.code)] = true then v.actblue_verified = true
               else v.actblue_verified = false
          end
        )
    ));

  select count(distinct submission_id) into captures_with_violations
  from violations v
  join submissions s on v.submission_id = s.id
  where s.created_at >= start_date and s.created_at <= end_date
    and s.public = true
    -- Only exclude verified violations when NOT filtering by violations
    and (violation_filter_enabled or v.actblue_verified = false)
    and (not filter_enabled or coalesce(s.sender_name, s.sender_id, 'Unknown') = any(sender_names))
    and (not violation_filter_enabled or (
      v.code = any(violation_codes)
      and (
        case when violation_permitted_flags[array_position(violation_codes, v.code)] is null then v.actblue_verified = false
             when violation_permitted_flags[array_position(violation_codes, v.code)] = true then v.actblue_verified = true
             else v.actblue_verified = false
        end
      )
    ));

  select count(*) into total_reports
  from reports r
  join submissions s on s.id = r.case_id
  where r.created_at >= start_date and r.created_at <= end_date
    and (not filter_enabled or coalesce(s.sender_name, s.sender_id, 'Unknown') = any(sender_names))
    and (not violation_filter_enabled or exists (
      select 1 from violations v
      where v.submission_id = s.id
        and v.code = any(violation_codes)
        and (
          case when violation_permitted_flags[array_position(violation_codes, v.code)] is null then v.actblue_verified = false
               when violation_permitted_flags[array_position(violation_codes, v.code)] = true then v.actblue_verified = true
               else v.actblue_verified = false
          end
        )
    ));

  -- UPDATED SOURCE SPLIT
  select 
    count(*) filter (where (s.message_type = 'unknown') or (s.message_type = 'email' and s.forwarder_email is not null)) as user_uploads,
    count(*) filter (where (s.message_type = 'sms') or (s.message_type = 'email' and s.forwarder_email is null)) as honeytraps
  into user_upload_count, honeytrap_count
  from submissions s
  where s.created_at >= start_date and s.created_at <= end_date
    and s.public = true
    and (not filter_enabled or coalesce(s.sender_name, s.sender_id, 'Unknown') = any(sender_names))
    and (not violation_filter_enabled or exists (
      select 1 from violations v
      where v.submission_id = s.id
        and v.code = any(violation_codes)
        and (
          case when violation_permitted_flags[array_position(violation_codes, v.code)] is null then v.actblue_verified = false
               when violation_permitted_flags[array_position(violation_codes, v.code)] = true then v.actblue_verified = true
               else v.actblue_verified = false
          end
        )
    ));

  select greatest(1, extract(days from end_date - start_date)::int) into day_count;

  result := json_build_object(
    'period', json_build_object('start', start_date, 'end', end_date, 'days', day_count),
    'kpis', json_build_object(
      'total_captures', total_captures,
      'captures_with_violations', captures_with_violations,
      'total_reports', total_reports,
      'user_uploads', user_upload_count,
      'honeytraps', honeytrap_count
    ),
    'captures_by_bucket', (
      select json_agg(json_build_object('bucket', bucket_key, 'count', count) order by bucket_key)
      from (
        select to_char(
                 case when day_count <= 45 then date_trunc('day', created_at at time zone 'America/New_York')
                      else date_trunc('week', created_at at time zone 'America/New_York') end,
                 'YYYY-MM-DD'
               ) as bucket_key,
               count(*) as count
        from submissions s
        where s.created_at >= start_date and s.created_at <= end_date
          and s.public = true
          and (not filter_enabled or coalesce(s.sender_name, s.sender_id, 'Unknown') = any(sender_names))
          and (not violation_filter_enabled or exists (
            select 1 from violations v
            where v.submission_id = s.id
              and v.code = any(violation_codes)
              and (
                case when violation_permitted_flags[array_position(violation_codes, v.code)] is null then v.actblue_verified = false
                     when violation_permitted_flags[array_position(violation_codes, v.code)] = true then v.actblue_verified = true
                     else v.actblue_verified = false
                end
              )
          ))
        group by bucket_key
        order by bucket_key
      ) buckets
    ),
    'violations_by_bucket', (
      select json_agg(json_build_object('bucket', bucket_key, 'count', count) order by bucket_key)
      from (
        select to_char(
                 case when day_count <= 45 then date_trunc('day', s.created_at at time zone 'America/New_York')
                      else date_trunc('week', s.created_at at time zone 'America/New_York') end,
                 'YYYY-MM-DD'
               ) as bucket_key,
               count(distinct s.id) as count
        from submissions s
        join violations v on v.submission_id = s.id
        where s.created_at >= start_date and s.created_at <= end_date
          and s.public = true
          -- Only exclude verified violations when NOT filtering by violations
          and (violation_filter_enabled or v.actblue_verified = false)
          and (not filter_enabled or coalesce(s.sender_name, s.sender_id, 'Unknown') = any(sender_names))
          and (not violation_filter_enabled or (
            v.code = any(violation_codes)
            and (
              case when violation_permitted_flags[array_position(violation_codes, v.code)] is null then v.actblue_verified = false
                   when violation_permitted_flags[array_position(violation_codes, v.code)] = true then v.actblue_verified = true
                   else v.actblue_verified = false
              end
            )
          ))
        group by bucket_key
        order by bucket_key
      ) buckets
    ),
    'reports_by_bucket', (
      select json_agg(json_build_object('bucket', bucket_key, 'count', count) order by bucket_key)
      from (
        select to_char(
                 case when day_count <= 45 then date_trunc('day', r.created_at at time zone 'America/New_York')
                      else date_trunc('week', r.created_at at time zone 'America/New_York') end,
                 'YYYY-MM-DD'
               ) as bucket_key,
               count(*) as count
        from reports r
        join submissions s on s.id = r.case_id
        where r.created_at >= start_date and r.created_at <= end_date
          and (not filter_enabled or coalesce(s.sender_name, s.sender_id, 'Unknown') = any(sender_names))
          and (not violation_filter_enabled or exists (
            select 1 from violations v
            where v.submission_id = s.id
              and v.code = any(violation_codes)
              and (
                case when violation_permitted_flags[array_position(violation_codes, v.code)] is null then v.actblue_verified = false
                     when violation_permitted_flags[array_position(violation_codes, v.code)] = true then v.actblue_verified = true
                     else v.actblue_verified = false
                end
              )
          ))
        group by bucket_key
        order by bucket_key
      ) buckets
    ),
    'top_senders', (
      select json_agg(json_build_object('sender', sender_name_val, 'total_captures', capture_count, 'captures_with_violations', violation_count, 'is_repeat_offender', violation_count >= 3) order by capture_count desc)
      from (
        select coalesce(sender_name, sender_id, 'Unknown') as sender_name_val,
               count(distinct s.id) as capture_count,
               count(distinct case 
                 -- Only count unverified violations, even when filtering
                 when v.actblue_verified = false then v.submission_id
                 else null
               end) as violation_count
        from submissions s
        left join violations v on v.submission_id = s.id
          -- When no violation filter: only join unverified violations
          -- When violation filter enabled: filter by the selected violations
          and (violation_filter_enabled or v.actblue_verified = false)
          and (not violation_filter_enabled or (
            v.code = any(violation_codes)
            and (
              case when violation_permitted_flags[array_position(violation_codes, v.code)] is null then v.actblue_verified = false
                   when violation_permitted_flags[array_position(violation_codes, v.code)] = true then v.actblue_verified = true
                   else v.actblue_verified = false
              end
            )
          ))
        where s.created_at >= start_date and s.created_at <= end_date
          and s.public = true
          and (not filter_enabled or coalesce(s.sender_name, s.sender_id, 'Unknown') = any(sender_names))
          and (not violation_filter_enabled or exists (
            select 1 from violations v2
            where v2.submission_id = s.id
              and v2.code = any(violation_codes)
              and (
                case when violation_permitted_flags[array_position(violation_codes, v2.code)] is null then v.actblue_verified = false
                     when violation_permitted_flags[array_position(violation_codes, v2.code)] = true then v2.actblue_verified = true
                     else v2.actblue_verified = false
                end
              )
          ))
        group by sender_name_val
        having count(*) >= 1
        order by capture_count desc
      ) senders
    ),
    'violation_mix', (
      select json_agg(json_build_object('code', violation_code, 'count', violation_count, 'percentage', round((violation_count::numeric / nullif(total_violations, 0) * 100)::numeric, 1)) order by violation_count desc)
      from (
        select v.code as violation_code,
               count(*) as violation_count,
               sum(count(*)) over () as total_violations
        from violations v
        join submissions s on v.submission_id = s.id
        where s.created_at >= start_date and s.created_at <= end_date
          and s.public = true
          -- Only exclude verified violations when NOT filtering by violations
          and (violation_filter_enabled or v.actblue_verified = false)
          and (not filter_enabled or coalesce(s.sender_name, s.sender_id, 'Unknown') = any(sender_names))
          and (not violation_filter_enabled or (
            v.code = any(violation_codes)
            and (
              case when violation_permitted_flags[array_position(violation_codes, v.code)] is null then v.actblue_verified = false
                   when violation_permitted_flags[array_position(violation_codes, v.code)] = true then v.actblue_verified = true
                   else v.actblue_verified = false
              end
            )
          ))
        group by v.code
        order by violation_count desc
      ) violation_stats
    ),
    'source_split', json_build_array(
      json_build_object('source', 'user_upload', 'count', user_upload_count, 'percentage', round((user_upload_count::numeric / nullif(total_captures, 0) * 100)::numeric, 1)),
      json_build_object('source', 'honeytrap', 'count', honeytrap_count, 'percentage', round((honeytrap_count::numeric / nullif(total_captures, 0) * 100)::numeric, 1))
    )
  );

  return result;
end;
$$;

