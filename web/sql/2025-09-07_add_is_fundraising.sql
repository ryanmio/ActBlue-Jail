-- Add is_fundraising boolean to submissions
-- Run this in Supabase SQL editor or via your migration runner

alter table if exists submissions
  add column if not exists is_fundraising boolean;


