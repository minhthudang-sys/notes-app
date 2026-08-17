-- Study-tracker minimal data model: sprints, parts, todos.
-- Same no-auth/no-RLS phase as the notes migrations.

create table sprints (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  planned_start date,
  planned_end date
);

create table parts (
  id uuid primary key default gen_random_uuid(),
  sprint_id uuid not null references sprints(id) on delete cascade,
  name text not null,
  status text not null default 'open' check (status in ('open', 'completed')),
  planned_completion_date date,
  actual_completion_date date,
  teach_back_done boolean not null default false
);

create table todos (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  due_date date,
  done boolean not null default false,
  priority text
);

-- Chapter summary link: at most one note per part, enforced by the DB.
-- A plain UNIQUE constraint on a nullable column permits any number of NULLs
-- (notes with no part_id), so this doesn't affect ordinary notes.
alter table notes
  add column part_id uuid references parts(id) on delete set null unique;
