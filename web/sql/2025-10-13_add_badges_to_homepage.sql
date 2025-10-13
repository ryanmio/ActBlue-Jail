-- Update get_homepage_stats to include message_type and forwarder_email for badges
-- This allows the UI to show type (email/sms/mms) and source (user/bot) badges

create or replace function get_homepage_stats(
  recent_limit int default 5,
  offenders_limit int default 10,
  offenders_days int default null  -- null = lifetime, otherwise last N days
)
returns json
language plpgsql
stable
as $$
declare
  result json;
begin
  result := json_build_object(
    'recent_cases', (
      select json_agg(
        json_build_object(
          'id', id,
          'created_at', created_at,
          'sender_id', sender_id,
          'sender_name', sender_name,
          'raw_text', raw_text,
          'message_type', message_type,
          'forwarder_email', forwarder_email,
          'violations', violations
        ) order by created_at desc
      )
      from (
        select 
          s.id,
          s.created_at,
          s.sender_id,
          s.sender_name,
          s.raw_text,
          s.message_type,
          s.forwarder_email,
          json_agg(
            json_build_object('code', v.code, 'title', v.title)
            order by v.severity desc, v.confidence desc
          ) filter (where v.code is not null) as violations
        from submissions s
        join violations v on v.submission_id = s.id
        where s.public = true
        group by s.id
        order by s.created_at desc
        limit recent_limit
      ) recent
    ),
    'worst_offenders', (
      select json_agg(
        json_build_object(
          'sender_name', sender_name,
          'violation_count', violation_count,
          'latest_violation_at', latest_violation_at
        ) order by violation_count desc, latest_violation_at desc
      )
      from (
        with violation_cases as (
          select distinct 
            s.id,
            coalesce(s.sender_name, s.sender_id, 'Unknown') as sender,
            s.created_at
          from submissions s
          join violations v on v.submission_id = s.id
          where s.public = true
            and (offenders_days is null or s.created_at >= now() - (offenders_days || ' days')::interval)
        )
        select 
          sender as sender_name,
          count(*) as violation_count,
          max(created_at) as latest_violation_at
        from violation_cases
        group by sender
        order by violation_count desc, latest_violation_at desc
        limit offenders_limit
      ) offenders
    )
  );
  
  return result;
end;
$$;

