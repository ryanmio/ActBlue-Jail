-- Add kind column to comments to distinguish user vs system/landing entries
alter table if exists comments
  add column if not exists kind text default 'user' check (kind in ('user','landing_page'));

create index if not exists comments_kind_idx on comments(kind);


