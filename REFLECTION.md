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

## Review — PR #4 ("Verify auth server-side on every /workspace page")

**Tool:** `/code-review high`, run against `gh pr diff` for PR #4
(`feature/add-auth` → `master`) — the Sprint 2 authentication/RLS branch,
before merging.

**Findings:**

1. `supabase/migrations/20260818075559_add_user_ownership_and_rls.sql:126` —
   `course` became a per-user table (`primary key (user_id)`) with no code
   path that ever inserts a `course` row for a new user. `getCourse()`'s
   `.single()` call is guaranteed to fail for every user except the one row
   backfilled to the original account, so a second test account hitting
   `/workspace/tracker/dashboard` or `/debug` sees an error, not the tracker.
2. `components/archive-auth-status.tsx` — this Server Component lives in the
   root layout, and neither `login-form.tsx`'s `router.push("/workspace")`
   nor `archive-sign-out-button.tsx`'s `router.push("/login")` calls
   `router.refresh()`. The header can keep showing "Sign in / Sign up" right
   after a successful sign-in, or keep showing the previous user after
   sign-out, until something else forces a layout re-render.
3. `supabase/migrations/...rls.sql:83` — the `notes` insert/update policies
   only check `user_id = auth.uid()`; unlike the `note_tags` policies a few
   lines below (which explicitly check both the note's and the tag's
   ownership), nothing verifies that `notes.collection_id` actually points
   at a collection owned by the same user. A leaked/guessed collection UUID
   from another account could be set as a note's `collection_id`.
4. `lib/supabase/auth.ts:17` — `requireUser()` and `ArchiveAuthStatus` each
   independently call `getClaims()`, so every `/workspace` page performs two
   separate session-verification round trips per request instead of sharing
   one result (Next's own auth guide recommends `cache()`-wrapping this).
5. `components/archive-header.tsx:36` — `ArchiveAuthStatus`'s `getClaims()`
   check still runs on `/login` and every `/auth/*` page even though
   `suppressAuthSlot` hides its output — the check happens before the page
   decides to discard the result.
6. `supabase/migrations/20260818075559_add_user_ownership_and_rls.sql:32` —
   the backfill hardcodes `select id into strict owner_id from auth.users
   where email = 'mtdangde@gmail.com'`. `strict into` raises an exception on
   zero matching rows, so replaying the full migration history on a fresh
   Supabase project — exactly what the README's own setup steps describe
   (apply migrations, *then* create a test user) — aborts the migration
   outright, since that email doesn't exist yet at that point. This is the
   one finding that's literally the assignment's named "hardcoded email
   address" mistake, even though it's a one-time data backfill rather than
   auth logic.
7. `supabase/migrations/...rls.sql:130` — `course` gets select/insert/update
   policies but no delete policy, asymmetric with every other table in the
   same migration (notes/collections/tags/sprints/parts all get full CRUD
   policies).
8. `app/workspace/notes/page.tsx` (and its tracker/dashboard/debug
   siblings) — the `Suspense fallback={null}` + nested-async-wrapper +
   `requireUser()` boilerplate is duplicated verbatim across four files,
   while `app/workspace/page.tsx` uses a simpler direct-`await` form with no
   Suspense wrapper. A shared helper would collapse this to one line per
   page and remove the inconsistency — and this exact copy-paste pattern is
   already what let `e36c9cd`'s bug happen once in this same PR's history
   (a route missing the check because it wasn't applied uniformly).

A second, independent `/code-review high` pass (run in parallel, delayed by
a session-limit interruption) corroborated #1, #3, #4, and #5 above and
surfaced #2, #6, #7, and #8 as additional findings.

**Disposition:** recorded here, not auto-fixed before merge. Of the
assignment's specific named mistakes (browser-only auth check, hardcoded
email, service-role key, custom password handling), only #6 actually
matches one — and even that is a migration backfill value, not auth logic,
so the core sign-in/session-check/RLS design is sound. #1 and #6 are the
two worth fixing soon: #1 will visibly break the tracker for the second
verification account, and #6 will break `npx supabase db reset`/a fresh
project setup outright. #2–#5, #7, and #8 are real but lower-priority
(stale display state, a defense-in-depth gap, duplicated/wasted work, an
asymmetric missing policy, and copy-pasted boilerplate) and are being
picked up individually rather than blocking this merge.

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

When drafting new sections of `docs/agent-prompts.md`, I asked Claude Code to
pull realistic seed content from an unrelated external project's
`course-data.json` rather than inventing placeholder data. It interpreted
that as "copy the file's content," which included a real (if
already-rotated) database password sitting in that JSON — it pasted the
literal string into the todos table, I caught it and redacted it (`c961454`),
and then it came back on a *later*, unrelated prompt (`ef7d46e`), because I
kept pointing it at the same external file to draft from and it kept copying
from wherever the password still lived there. It happened a third time on
another branch before I noticed the pattern: I was fixing the symptom every
time instead of the cause.

My next prompt changed the ask entirely — not "redact this occurrence" but
"find why this keeps happening and make it structurally impossible." That
produced `38352a7`: a `docs/data-sources.md` declaring the repo
self-contained (all real seed data already lives in `supabase/seed.sql`, so
there's no reason to ever draft from the external file again) and a
pre-commit hook that blocks the leaked string from being committed at all, as
a backstop. Code review on that PR then caught a bug in the hook itself — it
was grepping whole diffs, including *removed* lines, so a commit that
deleted a leaked occurrence still got blocked (`23af4f5` fixed it to check
only added lines).
