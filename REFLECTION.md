# Reflection

## Review — PR #1 ("feat: colour-coded tags")

**Tool:** `/code-review` (Claude Code skill), run against `gh pr diff 1` — the
merged optional-task PR (`feature/tag-colors` → `master`, merged as
`4ddc897`). This is the one PR in this repo's history that had never had
any review recorded, on GitHub or otherwise.

**Findings:**

1. `components/archive/tag-color-picker.tsx:21` — `colorLabel(value)` calls
   `value[0].toUpperCase()` with no guard. If a `Tag` row is ever missing
   `color` (the PR's own description flags that its migration has to be
   applied by hand, so there's a real window where existing rows have no
   `color` yet), rendering the tag-colour list crashes the whole notes
   page instead of degrading. (`tags.color` is confirmed live now, so this
   isn't currently triggering — but the missing guard is still there.)
2. `app/notes/page.tsx:188` (`handleChangeTagColor`) — no request
   sequencing: two rapid colour changes on the same tag can resolve out of
   order and leave the UI showing a stale colour until the next reload.
3. `app/notes/page.tsx:351` — the tag filter's plain `<button>` pills carry
   no `aria-pressed`/`aria-current`, so a screen reader never announces
   which tag is currently selected (the `<select>` this replaced didn't
   have that gap).
4. `lib/design/folder-colors.ts:72` — `TAG_COLORS` aliases `FOLDER_COLORS`
   with nothing enforcing that they stay in sync with the DB's hand-written
   `check (color in (...))` constraint; adding a folder colour without
   updating the migration would let the UI offer a tag colour Postgres
   rejects at write time.
5. `components/archive/tag-color-picker.tsx:57` — hand-rolls single-select
   semantics instead of using `DropdownMenuRadioGroup`/`DropdownMenuRadioItem`,
   which already exist in `components/ui/dropdown-menu.tsx` with correct
   ARIA built in.
6. `app/notes/page.tsx:355` — the tag filter buttons don't use this file's
   own `Button` component (used right next to them), so they skip its
   focus-visible/disabled styling.
7. `app/notes/page.tsx:196` — `handleChangeTagColor` manually patches the
   tag colour into every already-loaded note's embedded `tags` array to
   keep it in sync — correct today, but a trap for any future code path
   that holds its own copy of notes-with-tags.
8. `docs/agent-prompts.md:962` — this PR, scoped to tag colours, also
   bundles an unrelated ~90-line "Optional — Server-side full-text search"
   section with no tag-colour content, which this repo's own `CLAUDE.md`
   ("Surgical Changes") argues against.

**Disposition:** recorded here, not auto-fixed. None are urgent (#1's
window has already closed now that `tags.color` is live); worth picking up
individually rather than as a batch.

## Rebuild — notes/collections/tags checklist gaps

Same session, immediately after the review above: rebuilt the notes app's
collections/tags feature to close every gap the Mid-Sprint Review checklist
found against the actual implementation — collections collapsed from a
many-to-many `note_collections` join table to a single nullable
`collection_id` on `notes`, a sidebar with expandable collection groups
and an "Uncollected" bucket replacing the old filter dropdowns, the tag
filter changed from single-select to multi-select AND logic, and search
changed from submit-based to live/debounced. See
`supabase/migrations/20260817180000_notes_single_collection.sql`,
`lib/supabase/notes.ts`, and `app/notes/page.tsx`.

## What was missing from our workflow before this

- No PR on GitHub had ever been reviewed — zero entries in `reviews`/
  `comments` on both merged PRs, confirmed via the GitHub API directly.
- No `REFLECTION.md` (or any file recording a review) existed anywhere in
  the repo before this one.
- `docs/` had no file that cited Supabase's actual documentation — see the
  new `docs/supabase-reference.md`.
