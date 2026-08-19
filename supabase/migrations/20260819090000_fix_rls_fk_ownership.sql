-- Fixes two RLS gaps flagged by a Supabase security audit:
--
-- 1. The insert/update policies on `notes` and `parts` only checked
--    ownership of the row being written, never ownership of the rows its
--    foreign keys point at (notes.collection_id, notes.part_id,
--    parts.sprint_id). That let a user write their own row while pointing
--    it at another user's collection/part/sprint. `note_tags`'s policies
--    already check ownership across the join correctly; this applies the
--    same pattern here.
--
-- 2. `course` had select/insert/update policies but no delete policy, so a
--    user could never delete their own course row.

drop policy "insert own notes" on notes;
create policy "insert own notes" on notes for insert
  to authenticated with check (
    (select auth.uid()) = user_id
    and (collection_id is null or exists (
      select 1 from collections
      where collections.id = notes.collection_id and collections.user_id = (select auth.uid())
    ))
    and (part_id is null or exists (
      select 1 from parts
      where parts.id = notes.part_id and parts.user_id = (select auth.uid())
    ))
  );

drop policy "update own notes" on notes;
create policy "update own notes" on notes for update
  to authenticated using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (collection_id is null or exists (
      select 1 from collections
      where collections.id = notes.collection_id and collections.user_id = (select auth.uid())
    ))
    and (part_id is null or exists (
      select 1 from parts
      where parts.id = notes.part_id and parts.user_id = (select auth.uid())
    ))
  );

drop policy "insert own parts" on parts;
create policy "insert own parts" on parts for insert
  to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from sprints
      where sprints.id = parts.sprint_id and sprints.user_id = (select auth.uid())
    )
  );

drop policy "update own parts" on parts;
create policy "update own parts" on parts for update
  to authenticated using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from sprints
      where sprints.id = parts.sprint_id and sprints.user_id = (select auth.uid())
    )
  );

create policy "delete own course" on course for delete
  to authenticated using ((select auth.uid()) = user_id);
