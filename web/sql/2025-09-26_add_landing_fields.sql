-- Add landing page related fields to submissions
-- Run this in Supabase SQL editor or via migration tooling

alter table if exists submissions
  add column if not exists landing_url text,
  add column if not exists landing_screenshot_url text,
  add column if not exists landing_rendered_at timestamptz,
  add column if not exists landing_render_status text check (landing_render_status in ('pending','success','failed'));


