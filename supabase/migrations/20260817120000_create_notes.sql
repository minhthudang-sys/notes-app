-- Notes table for basic CRUD (create/list/edit/delete).
-- Single-user, no-auth phase: RLS is intentionally left disabled so the
-- anon/publishable key can read and write directly. A `user_id uuid`
-- column (referencing auth.users) can be added later without reshaping
-- this table, at which point RLS should be enabled.

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
