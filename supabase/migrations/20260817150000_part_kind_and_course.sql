-- Course configuration for the projection engine: part kind classification
-- and a course-level target date. Same no-auth/no-RLS phase as the other
-- tracker migrations. Per-kind weights live in lib/tracker/weights.ts (a
-- constants file, not the DB) since nothing edits them yet.

alter table parts
  add column kind text not null default 'part'
    check (kind in ('part', 'mid_project', 'project', 'career', 'capstone'));

-- Backfill kind on the rows seed.sql already inserted, which would otherwise
-- incorrectly stay at the 'part' default.
update parts set kind = 'mid_project' where name in (
  'Practice Project: Build Your Own Web App and Deploy It',
  'Mid-Sprint Project: Notes App with Collections and Search',
  'Mid-Sprint Project: Ship a Secured App and Prove It',
  'Mid-Sprint Project: Build a Mobile App with an AI Feature'
);

update parts set kind = 'project' where name in (
  'Sprint Project: Build a Simple Next.js App',
  'Sprint Project: Full-Stack App with Database and Authentication',
  'Sprint Project: Ship an AI App of Your Own',
  'Sprint Project: Ship Your Own Online Shop'
);

update parts set kind = 'career' where name = 'Career Module';

update parts set kind = 'capstone' where name = 'Building with AI Agents Capstone';

-- Course-level settings: a single row holding the personal target completion
-- date. Enforced as a singleton the standard Postgres way (boolean PK that
-- can only ever be true).
create table course (
  id boolean primary key default true,
  target_date date,
  constraint course_singleton check (id)
);

insert into course (target_date) values ('2026-09-30');
