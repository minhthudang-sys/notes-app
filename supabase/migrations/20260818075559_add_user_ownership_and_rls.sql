-- Add per-user ownership and enable Row Level Security on every table that
-- holds user data. Closes the gap CLAUDE.md flagged as deferred ("schema
-- deliberately left ready for a later user_id + RLS pass"): real Supabase
-- Auth is live (lib/supabase/auth.ts's requireUser()), but until now none
-- of these tables restricted access by row, so anyone holding the public
-- anon/publishable key could read or write every row directly through the
-- Data API, bypassing the app's login checks entirely.
--
-- Ownership model: every table gets a `user_id` defaulting to `auth.uid()`,
-- so the existing insert code in lib/supabase/notes.ts and
-- lib/supabase/tracker.ts needs no changes — Postgres fills it in from the
-- caller's verified JWT at insert time. The `with check` clause on each
-- policy below is what actually enforces ownership; the column default is
-- only a convenience so callers don't have to pass it explicitly.

-- 1. Add ownership columns (nullable for now; backfilled in step 2).
alter table notes       add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table collections add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table tags        add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table sprints     add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table parts       add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table course      add column user_id uuid references auth.users(id) on delete cascade default auth.uid();

-- 2. Backfill existing rows (all created before any account existed) to the
--    sole current account, if that account exists yet. It won't on a fresh
--    project being migrated before any user is created (see README) — in
--    that case there's nothing to backfill anyway, so skip rather than
--    aborting the whole migration.
do $$
declare
  owner_id uuid;
begin
  select id into owner_id from auth.users where email = 'mtdangde@gmail.com' limit 1;

  if owner_id is not null then
    update notes       set user_id = owner_id where user_id is null;
    update collections set user_id = owner_id where user_id is null;
    update tags        set user_id = owner_id where user_id is null;
    update sprints     set user_id = owner_id where user_id is null;
    update parts       set user_id = owner_id where user_id is null;
    update course      set user_id = owner_id where user_id is null;
  end if;
end $$;

-- 3. Now that every row has an owner, require it going forward.
alter table notes       alter column user_id set not null;
alter table collections alter column user_id set not null;
alter table tags        alter column user_id set not null;
alter table sprints     alter column user_id set not null;
alter table parts       alter column user_id set not null;
alter table course      alter column user_id set not null;

-- 4. Index the column every RLS policy below filters on.
create index notes_user_id_idx       on notes (user_id);
create index collections_user_id_idx on collections (user_id);
create index tags_user_id_idx        on tags (user_id);
create index sprints_user_id_idx     on sprints (user_id);
create index parts_user_id_idx       on parts (user_id);

-- 5. tags.name was globally unique; now that tags are per-user, uniqueness
--    should be scoped per owner so two users can each have a "urgent" tag.
alter table tags drop constraint tags_name_key;
alter table tags add constraint tags_user_id_name_key unique (user_id, name);

-- 6. course was a single global singleton (boolean PK enforced by the
--    course_singleton check). Make it one row per user instead, keyed by
--    user_id, now that ownership is per-account.
alter table course drop constraint course_singleton;
alter table course drop constraint course_pkey;
alter table course add primary key (user_id);
alter table course drop column id;

-- 7. Enable RLS and add ownership policies on every table above, plus
--    note_tags (which has no user_id of its own; ownership is derived
--    through the notes/tags rows it links).
alter table notes       enable row level security;
alter table collections enable row level security;
alter table tags        enable row level security;
alter table sprints     enable row level security;
alter table parts       enable row level security;
alter table course      enable row level security;
alter table note_tags   enable row level security;

create policy "select own notes" on notes for select
  to authenticated using ((select auth.uid()) = user_id);
create policy "insert own notes" on notes for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy "update own notes" on notes for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own notes" on notes for delete
  to authenticated using ((select auth.uid()) = user_id);

create policy "select own collections" on collections for select
  to authenticated using ((select auth.uid()) = user_id);
create policy "insert own collections" on collections for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy "update own collections" on collections for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own collections" on collections for delete
  to authenticated using ((select auth.uid()) = user_id);

create policy "select own tags" on tags for select
  to authenticated using ((select auth.uid()) = user_id);
create policy "insert own tags" on tags for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy "update own tags" on tags for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own tags" on tags for delete
  to authenticated using ((select auth.uid()) = user_id);

create policy "select own sprints" on sprints for select
  to authenticated using ((select auth.uid()) = user_id);
create policy "insert own sprints" on sprints for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy "update own sprints" on sprints for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own sprints" on sprints for delete
  to authenticated using ((select auth.uid()) = user_id);

create policy "select own parts" on parts for select
  to authenticated using ((select auth.uid()) = user_id);
create policy "insert own parts" on parts for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy "update own parts" on parts for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own parts" on parts for delete
  to authenticated using ((select auth.uid()) = user_id);

create policy "select own course" on course for select
  to authenticated using ((select auth.uid()) = user_id);
create policy "insert own course" on course for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy "update own course" on course for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "select own note_tags" on note_tags for select
  to authenticated using (
    exists (
      select 1 from notes
      where notes.id = note_tags.note_id and notes.user_id = (select auth.uid())
    )
  );
create policy "insert own note_tags" on note_tags for insert
  to authenticated with check (
    exists (
      select 1 from notes
      where notes.id = note_tags.note_id and notes.user_id = (select auth.uid())
    )
    and exists (
      select 1 from tags
      where tags.id = note_tags.tag_id and tags.user_id = (select auth.uid())
    )
  );
create policy "delete own note_tags" on note_tags for delete
  to authenticated using (
    exists (
      select 1 from notes
      where notes.id = note_tags.note_id and notes.user_id = (select auth.uid())
    )
  );
