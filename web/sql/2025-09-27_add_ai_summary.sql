-- Store model-written summary at the submission level
alter table if exists submissions
  add column if not exists ai_summary text;


