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

## Sprint 2 required prompts

### The persistent-storage consultation

I asked Claude Code directly: given the existing Next.js + Supabase stack from
the database lesson, and with localStorage and sessionStorage ruled out
outright, what should back note persistence for Sprint 2? It recommended
keeping notes in the Supabase Postgres `notes` table already in place, rather
than any client-side option, and scoping it with Postgres Row Level Security
via a `user_id` column tied to `auth.uid()`.

It surfaced a few trade-offs. IndexedDB/localStorage would need a hand-rolled
per-device sync layer just to survive a reload in a different browser, and
neither has any natural per-user security boundary — anyone with access to a
shared machine could read every note, since there's no login gate at that
layer. A separate backend/API in front of a different database would
duplicate what the Supabase client already does, and would need its own auth
wiring instead of reusing Supabase Auth's session. Staying on Supabase
Postgres means persistence, auth, and per-row authorization are all handled
by the same system, with RLS enforcing "your notes only" at the database
layer instead of only in application code.

I went with that recommendation: extend the existing `notes` table with
`user_id uuid references auth.users(id) ... default auth.uid()`, enable RLS,
and add matching `select`/`insert`/`update`/`delete` policies keyed to
`auth.uid() = user_id`. That's the migration in
`supabase/migrations/20260818075559_add_user_ownership_and_rls.sql`, applied
to every user-data table, not just `notes`.

### An auth issue caught in diff review and fixed

Reviewing the diff before merging the auth branch, I found the signed-in
check only ran on `/workspace` itself (`WorkspaceContent` calling
`requireUser()`), while `/workspace/notes`, `/workspace/tracker`, and its
`dashboard`/`debug` sub-routes rendered their client components with no
server-side check of their own — reachable directly by URL even while
signed out, since Next.js doesn't re-run a parent route's check on
client-side navigation between siblings, and there was no shared
layout-level gate either. I expected every `/workspace/*` route to redirect
an unauthenticated visitor to `/login` before any content loaded, not just
the top-level page.

Fixed by adding `requireUser()` to the top of each of those pages
individually (commit `e36c9cd`, "fix: verify every /workspace page
server-side, not just /workspace itself"), following the same thin
server-wrapper-around-a-client-component pattern already used for the notes
page, and documented the rule explicitly in `CLAUDE.md` so it doesn't
regress if a new `/workspace` route gets added later.

### A prompt the agent misinterpreted

_TODO: fill in from memory — a real example from this build, not one I can
reconstruct from the repo alone. What did I ask, what did Claude Code build,
and what did I change in the next prompt to redirect it?_
