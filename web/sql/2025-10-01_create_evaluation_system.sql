-- Evaluation System: Beta tester evaluation bench for AI violation detection

-- Track evaluation sessions
create table if not exists evaluation_sessions (
  id uuid primary key default gen_random_uuid(),
  device_id text not null, -- browser fingerprint or generated device id
  ip_address text, -- optional IP address for aggregate reporting
  started_at timestamptz default now(),
  completed_at timestamptz,
  total_evaluations int default 0,
  is_complete boolean default false
);

create index if not exists evaluation_sessions_device_idx on evaluation_sessions(device_id);
create index if not exists evaluation_sessions_completed_idx on evaluation_sessions(completed_at);

-- Store individual evaluation responses
create table if not exists evaluation_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references evaluation_sessions(id) on delete cascade,
  submission_id uuid references submissions(id) on delete cascade,
  manual_violations jsonb default '[]'::jsonb, -- Array of violation codes selected by evaluator: ["AB001", "AB004"]
  evaluator_notes text, -- Optional notes, max 240 chars enforced in app
  created_at timestamptz default now(),
  -- Optionally store AI violations at time of evaluation for comparison
  ai_violations jsonb default '[]'::jsonb -- Array of AI-detected violation codes at evaluation time
);

create index if not exists evaluation_responses_session_idx on evaluation_responses(session_id);
create index if not exists evaluation_responses_submission_idx on evaluation_responses(submission_id);
create index if not exists evaluation_responses_created_idx on evaluation_responses(created_at);

-- Prevent duplicate evaluations of same submission in same session
create unique index if not exists evaluation_responses_unique_submission_session 
  on evaluation_responses(session_id, submission_id);

