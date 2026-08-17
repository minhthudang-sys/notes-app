# notes-app — staged agent prompts

Nine prompts, run one at a time, in order. Paste one, let the agent finish, verify its
own "definition of done" before pasting the next. Each prompt is self-contained and has
an explicit stop condition, so there's never a contradiction between "what to build" and
"where to stop."

| # | Prompt | Why here |
|---|---|---|
| 1 | Notes CRUD | Prove Supabase persistence works at all |
| 2 | Collections, tags, search | Completes the graded assignment |
| 3 | Study model + chapter→summary link | Sprints/parts/todos + `part_id` on notes |
| 4 | Folder UI foundation | Design tokens + component library, before more UI exists |
| 5 | Course config + weighted projection engine | Built correctly once — no provisional math |
| 6 | Dashboard and simple timeline | Composed from prompt 4's components, prompt 5's real numbers |
| 7 | Project review workflow + STL log + review turnaround | Scoped to project/capstone parts only |
| 8 | What-if controls + advanced timeline | Depends on prompt 7's review-turnaround data |
| 9 | **Final responsive, accessibility, and regression audit** | Runs last, so nothing built in 7–8 escapes it |

## Two corrections from the previous version of this doc

**Weighted effort moved from last to prompt 5, before the dashboard exists.** The
earlier sequence had the dashboard built on raw part counts, then a later prompt
replacing that math — which meant building the same UI twice against two different
numbers. Now the projection engine is built correctly once, in prompt 5, and prompt 6
composes the dashboard against real weighted numbers from the start. No dashboard
figure in this app is ever "provisional."

**The accessibility/responsive audit moved from prompt 7 to the very end (prompt 9).**
It used to run before the review workflow, what-if controls, and advanced timeline
existed — which meant the newest, most interactive parts of the app (sliders, a
multi-segment Gantt, review status displays) would never get audited. It now runs after
everything else, and includes a regression pass across every prior prompt's
functionality, not just the visual/a11y checks.

## A data-model correction worth flagging explicitly

Parts keep a single simple status — **open/completed, for every kind, always.** Reading
chapters don't submit for review and shouldn't grow the same lifecycle as a sprint
project. The richer workflow (`submitted → in_review → corrections → passed`) applies
**only** to parts where `kind` is `project` or `capstone`, and it lives in its own
`project_reviews` record rather than overloading `parts.status`. A project/capstone
part's `status` flips to `completed` automatically once its review record reaches
`passed` — the two are linked, not merged. (I'm assuming mid-sprint projects, kind
`mid_project`, stay on the simple open/completed status too, since they're practice
builds without an external review step — that matches how the real course data looked.
Flag it if that's wrong.)

## Reference material in this folder

- `product-vision.md` — the full eventual feature set, for context
- `dashboard-template.html` — a static mockup of the dashboard views, referenced by
  prompt 6 for **information architecture and copy only**. Its visual styling predates
  the folder/case-file design language; prompt 4's tokens win where they conflict.

---

## Prompt 1 — Notes CRUD only

```
You're working in an existing Next.js project (App Router, TypeScript, Tailwind,
shadcn-style components already scaffolded with Radix + CVA). @supabase/supabase-js
and @supabase/ssr are already installed and .env.local may already have Supabase
credentials — check before assuming you need to set up a new project.

Task for this run only: basic Notes CRUD backed by Supabase Postgres. Nothing else.

Do:
- Inspect the existing repo structure (app/, components/, lib/) before adding
  anything. Follow existing conventions, don't restructure.
- Create a Supabase migration for one `notes` table: id, title, body, created_at,
  updated_at. No collections, tags, or search columns yet.
- Put every database call in one helper module (e.g. lib/db.ts or
  lib/supabase/notes.ts) — the rest of the app calls functions like getNotes(),
  createNote(), updateNote(), deleteNote(), never supabase.from(...) directly.
- Build the minimum UI to create, list, edit, and delete notes. Plain and
  unstyled is fine — visual design is a later prompt, deliberately.
- No authentication, single-user — but don't shape the table in a way that would
  block adding a user_id column later.

Don't:
- Don't implement collections, tags, or full-text search.
- Don't touch the study-tracker side of the app.
- Don't add anything beyond what's listed above.

Definition of done for this run:
- I can create a note, refresh the browser, and it's still there.
- I can edit and delete a note and see it persist.
- All Supabase calls live in the one helper module.

Finish by reporting what you verified (and how), and what's explicitly left for the
next prompt.
```

---

## Prompt 2 — Collections, tags, full-text search

```
Building on the notes CRUD from the previous run (one `notes` table + a DB helper
module). Task for this run only: collections, tags, and search.

Do:
- Add a `collections` table and a `note_collections` join table; support creating a
  collection and assigning a note to one or more collections.
- Add a `tags` table and a `note_tags` join table; support tagging a note with
  multiple tags.
- Filter the notes list by collection, by tag, and by both combined.
- Create a generated `tsvector` covering title and body, add a GIN index, and
  query it using Supabase `.textSearch()`. Search must cover both title and
  body — not a naive `ILIKE '%term%'`.
- Keep all new database calls in the same helper module as the notes CRUD.

Don't:
- Don't touch the study-tracker side of the app.
- Don't add authentication.
- Don't invest in visual design yet — that's a later prompt.

Definition of done for this run:
- I can create a collection and a few tags, assign them to notes, and filter the
  list by either or both.
- Searching a word that only appears in one note's body returns that note.
- Refreshing the browser preserves all of the above.

Finish by reporting what you verified and what's left.
```

---

## Prompt 3 — Study model + chapter→summary link

```
This starts the study-tracker half of the app, living alongside notes in the same
Next.js app. Task for this run only: the minimal data model, plus the one link
between chapters and notes. No calculations, no timeline, no advanced workflow.

Do — the study model:
- Add tables: sprints (id, name, planned_start, planned_end), parts (id,
  sprint_id fk, name, status — just "open" or "completed", this stays the ONLY
  status field on parts for every kind, permanently — planned_completion_date
  nullable, actual_completion_date nullable, teach_back_done boolean), todos
  (id, text, due_date, done, priority).
- Build basic UI to list sprints and their parts, mark a part completed (which
  sets actual_completion_date), toggle teach_back_done, and manage todos
  (add/complete/delete).
- Keep all database calls behind the same helper-module pattern as the notes app
  (new file is fine, e.g. lib/supabase/tracker.ts, but no supabase.from() in
  components).

Do — the chapter→summary link (Sprint → Part → Teach-Back → Summary Note):
- Add a nullable part_id column (fk to parts) on the notes table, with a UNIQUE
  constraint/index on part_id — enforced at the database level, so a part can
  never have more than one summary note.
- On a part's row, add a "Create/Open chapter summary" action:
  - If no note exists for that part_id, create one (pre-filling the title from
    the part's name is fine) and open it for editing.
  - If one already exists, open it — the unique constraint means this is the
    only possible outcome besides creating a new one.
- Show a link to a part's summary note once one exists.
- Add filtering the notes list by sprint and by part, alongside the existing
  collection/tag/search filters — using the part_id link, not a new tagging
  mechanism.
- Keep notes calls in the notes helper and part/sprint lookups in the tracker
  helper. Don't merge them into one file.

Plain styling throughout — a later prompt is a full visual redesign, so don't
invest effort in presentation that's about to be replaced. Get the data and the
actions correct.

Don't:
- Don't implement weighted effort, pace, buffer, or projected-completion math.
- Don't implement a timeline or Gantt visualization.
- Don't implement STL scoring, rubrics, or any workflow beyond open/completed —
  parts stay open/completed only, for every kind, indefinitely. A richer review
  lifecycle for project/capstone parts comes later as a *separate* record, not
  as an extension of this status field.
- Don't implement what-if controls.
- Don't change what teach_back_done means — it stays independent of whether a
  summary note exists (you can teach back without writing anything, or draft a
  summary before marking teach-back done).

Definition of done for this run:
- I can see my sprints and parts, mark a part completed, toggle teach-back, and
  manage todos — all persisted in Supabase.
- "Create/Open chapter summary" on a part takes me to a note tied to that part —
  new if none existed, the existing one otherwise, never a duplicate (enforced
  by the database, not just application logic).
- I can filter the notes list down to a single sprint or a single part.
- A note with no part_id still works normally.

I'll enter my real sprint/part data by hand once this exists — no import needed.

Finish by reporting what you verified and what's left.
```

---

## Prompt 4 — Folder-based visual redesign (UI foundation)

```
You're working in the existing Next.js + Supabase notes-app. Notes CRUD,
collections/tags/search, the sprint/part study model, and the chapter→summary
note link are all already working.

Task for this run only: redesign the application around an archival folder and
case-file metaphor, and extract that design into a reusable component library.
This is a visual-design and information-architecture change. Preserve the
existing data model, routes, and working behavior.

## Visual reference

Use https://www.mosbyfiles.com/ as inspiration, but do not clone it.

Borrow the broad design language:
- A dark archival workspace
- Large, overlapping, color-coded folders
- Clearly labeled folder tabs
- An open folder revealing warm, paper-like content
- Strong editorial typography
- Small monospaced metadata labels
- Restrained transitions when opening or switching folders

Do not copy its logo, text, photographs, assets, branding, exact layout, or
source code. Adapt the folder concept to this study application.

## Core interface metaphor

Treat the course as a personal study archive:
- The programme is the archive.
- Each sprint is a large folder.
- Each chapter or part is a tabbed document inside its sprint folder.
- Chapter notes and Teach-Back summaries are papers filed with that chapter.
- Todos and deadlines are practical metadata, not separate decorative features.

## Reusable components — build these first

Create these as real, documented components rather than duplicating styling.
Later prompts will compose the dashboard and review UI out of them, so their
APIs matter more than their pixels:

- `Folder` — a sprint container, takes a sprint and a color, handles the
  open/closed/behind states
- `FolderTab` — a labeled tab, used for both sprint tabs and chapter documents
- `PaperPanel` — the warm off-white content surface
- `MetadataLabel` — monospaced label + value pair for dates, deadlines, counts
- `StatusStamp` — a filed/completed/in-progress marker

IMPORTANT on `StatusStamp`: parts themselves only ever have two statuses, open
and completed — that never changes. But a later prompt (7) introduces a
*separate* status domain for project/capstone review records (submitted →
in_review → corrections → passed), and it should reuse this same component.
Design `StatusStamp` to accept an arbitrary status value + label from a set you
pass in, rather than hardcoding it to the two-value open/completed case — so
prompt 7 can hand it a different status set without rewriting it.

## Design tokens

Define all of the following in ONE shared place (Tailwind config and/or CSS
custom properties), not hardcoded per component:

- Near-black or charcoal workspace background
- Warm off-white paper surfaces
- A limited folder palette: muted blue, red, olive, mustard, purple. Sprint
  colors must be resolvable from a sprint record, so a new sprint picks up a
  color automatically without touching component code.
- Condensed sans-serif for large headings
- A readable serif or neutral sans-serif for body text
- Monospaced for dates, labels, deadlines, and metadata
- Crisp borders; mostly square or lightly rounded shapes rather than generic
  floating dashboard cards

Use existing or freely available fonts loaded via next/font. No paid assets.

Paper texture is optional and, if used, must be near-invisible — a heavy tiling
noise texture will read as cheap. Skip it rather than overdo it.

NOTE: `next-themes` is currently installed. This design language is a single
intentional look — dark chrome with warm paper — not a light/dark theme pair.
Either remove next-themes or keep it and force dark; don't leave a half-working
toggle that inverts the paper surfaces. Tell me which you chose.

## Study archive view

Build the sprint-folder interface from live Supabase data. Each sprint folder
shows: sprint name, planned completion date, completed parts vs. total parts, a
compact progress indicator, whether it's the current sprint, and its open
chapters.

Determine the current sprint from existing data — e.g. the first sprint
containing an open part. Do not introduce a new database status solely to
support the visual design.

Desktop: sprints as a layered stack of folders, each in its restrained folder
color, selected sprint brought visually to the front, opened by clicking its
tab, chapters revealed within the open folder.

Mobile: convert the layered folders into a clear vertical folder or accordion
layout. Preserve the metaphor without horizontal overflow or tiny tabs.

## Chapter presentation

Chapters appear as documents or tabs inside their sprint folder, showing:
chapter name, open/completed state, planned and actual completion dates when
available, Teach-Back state, a link to its connected summary note when one
exists (the part_id link already exists in the schema), and the relevant primary
action — "Mark completed," "Start Teach-Back," or "Open summary."

A completed chapter may use a subtle stamp, checkmark, or filed-document
treatment. Do not communicate status through color alone.

Opening a chapter should feel like opening a case file: a `PaperPanel` on the
sprint's folder color, with monospaced metadata on one side and the summary
note's prose on the other, serif with a large drop-cap on the first letter.
Dedicated page, drawer, or expanding panel — whichever fits the existing routing
best.

## Notes area

Keep Notes as its own functional area, but make it visually part of the same
archive. Possible treatments: notes as papers or index cards, collections as
labeled dividers, tags as small archival labels, search styled like an archive
index.

Do not force every note into a sprint. Notes linked to a chapter should show
that relationship; general notes remain valid and keep an ordinary treatment.

## Motion

Short and purposeful only: folder moving forward, tabs changing position, paper
content revealing, small hover and focus feedback. Respect
prefers-reduced-motion. No long scroll animations or effects that delay access
to information.

## Usability requirements

The metaphor must not obscure the two questions answerable at this stage:
1. What should I work on next?
2. What have I completed and understood?

(Buffer, pace, and projected completion don't exist yet — a later prompt adds
them and re-asserts this guardrail in full.)

Keep the current chapter, nearest deadline, and progress easy to find. Use
semantic buttons and links, visible keyboard focus, sufficient contrast, and
meaningful labels. No hover-only interactions.

Build responsive-aware — implement the mobile layout described above and avoid
desktop-only assumptions. A dedicated later prompt (9) audits and fixes all
three breakpoints once every view exists, so don't spend this run pixel-tuning;
just don't paint yourself into a desktop-only corner.

## Do not

- Do not change the Supabase schema or add new workflow statuses.
- Do not replace real application behavior with hardcoded demo data.
- Do not implement drag-and-drop filing.
- Do not build a dashboard, timeline, pace display, buffer/projected-completion
  headline, review workflow, or what-if controls — those come in later prompts
  and will be composed from the components you build here.
- Do not break Notes CRUD, filters, search, todos, or completion actions.
- Do not copy Mosby's Files exactly.

## Working approach

First inspect the existing components, styling system, routes, and working user
flows. Briefly state the visual approach you'll use, then implement it without
pausing for approval unless a material product decision is genuinely required.

## Definition of done

- Sprints are presented through a recognizable visual folder structure.
- Chapters appear as documents or tabs within their sprint.
- The selected/current sprint is visually obvious.
- Notes and the study archive feel like parts of the same application.
- All information comes from existing live data.
- `Folder`, `FolderTab`, `PaperPanel`, `MetadataLabel`, and `StatusStamp` exist
  as reusable components, and `StatusStamp` accepts an arbitrary status set.
- Design tokens live in one place and I can see where to change them.
- Existing functionality continues to work; tests, linting, and the production
  build pass.

Final report: the visual components created and their props, files changed,
flows verified, the next-themes decision, and how a later prompt should consume
these tokens and components when building the dashboard.
```

---

## Prompt 5 — Course configuration and weighted projection engine

```
Building on the study model (prompt 3). Task for this run only: the real
projection engine, built correctly once — no separate "raw counts now, weighted
later" pass. No UI work beyond a bare debug view.

## Course configuration

- Add a `kind` column to `parts`: one of `part`, `mid_project`, `project`,
  `career`, `capstone`. Migrate existing rows to default to `part` — this must
  not break data from prompt 3.
- Add a weights configuration mapping kind → weight, in one place (a settings
  table or a constants file, your call) — not hardcoded inline wherever it's
  used. Starting values: part=1, mid_project=1.5, project=2, career=1,
  capstone=3.
- Add a course-level `target_date` (the personal deadline). A second,
  platform-mandated deadline is added later (prompt 8) — just this one for now.

## Projection engine

Write pure, unit-tested functions in one module (e.g. lib/tracker/projection.ts).
These exact rules matter — a later prompt (6) builds a per-sprint timeline
directly on top of this, so ambiguity here becomes an ambiguous UI:

- **Units**: totalUnits = sum of weight(kind) over all parts. builtUnits = sum
  of weight(kind) over parts with status == 'completed'. This is the only
  completion signal available at this stage — prompt 7 later teaches this
  function that a submitted-but-not-yet-passed project also counts as built,
  but don't anticipate that here.
- **Elapsed days**: elapsedDays = max(1, wholeCalendarDays(start_date, today)).
  Never zero, never negative — clamp at 1 even if today is on or before
  start_date.
- **Pace**: pace = builtUnits / elapsedDays, in units/day.
- **Course-level projected completion**:
  - If remainingUnits == 0 (everything built): return the latest
    actual_completion_date across all parts if any is set, otherwise today.
  - Else if pace == 0 (nothing built yet, remaining > 0): return null. This is
    an explicit "not enough data yet" state — the UI must handle null, not
    receive Infinity, NaN, or a garbage date.
  - Else: today + ceil(remainingUnits / pace) days.
- **Buffer**: target_date − projectedCompletion, in whole days. Only computed
  when projectedCompletion is not null; otherwise also null.
- **Per-sprint projection** (walk sprints in planned_start order):
  - If every part in a sprint is completed: state "done", end = the latest
    actual_completion_date among its parts, falling back to the sprint's
    planned_end if no actual dates are set.
  - Else: state "projected". remainingUnitsInSprint = sum of weight(kind) over
    its open parts. buildDays = pace > 0 ? ceil(remainingUnitsInSprint / pace)
    : null. The sprint's start is a running cursor that begins at today for the
    first not-done sprint. end = start + buildDays − 1 (or null if buildDays is
    null — the UI shows "not enough data" for that sprint, not a broken date).
    Advance the cursor to end + 1 before processing the next sprint. Do NOT
    insert any review-turnaround gap here — that arrives in prompt 8, once
    review-turnaround data exists.
- **Rounding, applied at the display layer, not internally**: weighted unit
  totals shown to 1 decimal place. Pace shown as units/week (pace × 7) to 1
  decimal place. All date-based figures (elapsed days, buffer, build days) are
  always whole integers — never fractional days anywhere in the output.

Real unit tests covering:
- Zero elapsed days (today == start_date) — elapsedDays must be 1, not 0.
- Zero builtUnits with remainingUnits > 0 — pace is 0, projectedCompletion is
  null, no division by zero anywhere.
- All parts already complete — remainingUnits is 0, projectedCompletion falls
  back correctly.
- A negative buffer (target already missed) — buffer is a negative integer, not
  clamped to zero.
- A multi-sprint case verifying perSprintProjection chains correctly: sprint A's
  projected end becomes sprint B's start, in whole-day steps.

A bare debug page or console output confirming these numbers against my real
data is enough — the dashboard is the next prompt.

Don't:
- Don't build the dashboard or timeline UI — next prompt.
- Don't add the review workflow, review-turnaround, second deadline, or what-if
  controls — prompts 7 and 8.
- Don't change any styling or the prompt 4 components.
- Don't touch the notes app.

Definition of done for this run:
- The unit tests exist and pass, including every edge case above.
- kind and weights are configured and used by the engine.
- Course-level pace, projectedCompletion, and buffer compute correctly against
  real data, including the null "not enough data" case if it applies right now.
- perSprintProjection returns a defined result — "done" or a chained
  start/end — for every sprint.

Finish by reporting what you verified, confirming the exact rounding and
edge-case behavior implemented matches the rules above, and what's left.
```

---

## Prompt 6 — Dashboard and simple timeline

```
Building on the study model (prompt 3), the folder component library and design
tokens (prompt 4), and the weighted projection engine (prompt 5). Task for this
run only: the dashboard and a simple timeline, using real weighted numbers from
the start.

Do:
- Build a dashboard view: buffer/projected-completion headline (course-level,
  from prompt 5 — including the "not enough data yet" state if projectedCompletion
  is null, don't hide or fake it), todos, sprint progress (weighted units
  completed / total per sprint, not raw part counts), and the review queue
  (parts completed but teach_back_done still false).
- Build a simple timeline: one row per sprint, planned window (planned_start →
  planned_end) vs. the projected/actual completion from prompt 5's
  perSprintProjection — use that function's output directly, don't
  re-derive a simpler version of it. Plain bars are fine.
- Compose it from the components built in prompt 4 — `PaperPanel`,
  `MetadataLabel`, `StatusStamp`, the folder colors — and use the existing
  design tokens. Do not introduce new one-off colors or fonts. If you need a
  token that doesn't exist, add it to the shared token file.
- For information architecture, wording, and which numbers appear where,
  reference docs/dashboard-template.html — a static mockup of these exact views.
  IMPORTANT: take its STRUCTURE and COPY, not its visual style. Its palette and
  card styling predate the folder/case-file language, and prompt 4's tokens win
  where they conflict. Don't copy its JS wholesale either — it assumes one JSON
  blob, not a database, and unweighted units where this build uses weighted
  ones throughout.

Now that projections exist, the full usability guardrail applies. These three
questions must be easy to answer at a glance:
1. What should I work on next?
2. Am I on track?
3. What have I completed and understood?

Don't:
- Don't add the review workflow or STL scoring — prompt 7.
- Don't add a second deadline, what-if controls, or the multi-segment Gantt —
  prompt 8.
- Don't touch the notes app.

Definition of done for this run:
- The dashboard shows real weighted numbers from Supabase, matching what
  prompt 5's functions compute, and updates when I mark a part completed
  elsewhere.
- The timeline's per-sprint dates match perSprintProjection's output exactly.
- It visually belongs to the same app as the folder archive — no stylistic seam.

Finish by reporting what you verified and what's left.
```

---

## Prompt 7 — Project review workflow, STL review log, review turnaround

```
Building on the study model with kind (prompt 5) and the dashboard (prompt 6).
Task for this run only: a review lifecycle for project/capstone parts, and
teaching the projection engine about submitted-but-not-passed effort.

Scope, explicitly: this workflow applies ONLY to parts where kind is 'project'
or 'capstone'. Reading parts (kind 'part'), mid-sprint projects (kind
'mid_project'), and career parts (kind 'career') are untouched — they keep the
plain open/completed status from prompt 3, permanently. Do not extend
parts.status itself.

Do:
- Add a `project_reviews` table: id, part_id (fk, unique — one active review
  record per project/capstone part), status (submitted | in_review |
  corrections | passed), reviewer, score, rubric (jsonb), review_notes,
  submitted_on, passed_on.
- UI: for a project/capstone part, show its review status using `StatusStamp`
  from prompt 4 with this review-status set (it was built to accept an
  arbitrary status set for exactly this reuse). Show this alongside, not
  instead of, the part's own simple open/completed marker.
- Wire the transition: when a review record's status becomes 'passed', set the
  part's own status to 'completed' and its actual_completion_date to
  passed_on. This is the only thing allowed to auto-complete a project/capstone
  part.
- Build a simple STL review log UI: capture reviewer, score, rubric,
  review_notes, submitted_on, passed_on for a project/capstone part.
- Update the projection engine from prompt 5: a project/capstone part now also
  counts toward builtUnits once its review record's status is 'submitted' or
  later — even while parts.status still reads 'open' pending the review
  passing. (This mirrors reality: your build effort is spent once you submit,
  whether or not the review has come back.) Update the engine's existing tests
  to cover this, and add a new test for it.
- Compute measured review turnaround: average (passed_on − submitted_on) in
  whole days across all review records with both dates set. Fall back to a
  configurable assumed default (e.g. 3 days) until at least one real pair
  exists. Label clearly in the UI which one is currently in use — "measured
  from N reviews" vs "assumed."

Don't:
- Don't touch the status field or workflow for kind 'part', 'mid_project', or
  'career' parts — they stay simple open/completed.
- Don't build the what-if sliders, the second deadline, or the multi-segment
  Gantt timeline yet — prompt 8.
- Don't touch the notes app.

Definition of done for this run:
- I can log a review for a project/capstone part (score, rubric, dates), and
  its review status is tracked independently of the simple open/completed
  status.
- The part's status flips to 'completed' automatically, and only, once its
  review passes.
- The pace/projection engine correctly counts a submitted-but-not-yet-passed
  project as built effort — verified by the new test.
- Measured review turnaround appears once real data exists, clearly labeled
  measured vs. assumed.

Finish by reporting what you verified and what's left.
```

---

## Prompt 8 — What-if controls and advanced timeline

```
Building on the projection engine (prompt 5) and the review-turnaround data
(prompt 7). Task for this run only: the advanced timeline and the interactive
what-if scratchpad.

Do:
- Add a second deadline: the platform capstone date, alongside the personal
  target_date from prompt 5. Show buffer against both, clearly labeling which
  is self-imposed (target_date) and which is mandatory (platform deadline).
- Extend perSprintProjection (prompt 5) to insert the review-turnaround segment
  into the chain for any sprint containing a project/capstone part: after that
  part's build-days segment, add the measured-or-assumed review-turnaround
  (from prompt 7) before advancing the cursor to the next sprint. This replaces
  prompt 5's simplification of no review gap.
- Build a what-if scratchpad: two sliders — pace (units/week) and review
  turnaround (days) — that live-recompute projected completion and buffer
  against both deadlines. Nothing is saved; it's a scratchpad.
- Replace the simple timeline bars from prompt 6 with a multi-segment
  Gantt-style timeline per sprint: planned vs. actual vs. projected-build vs.
  review-turnaround vs. buffer, each visually distinct.
- Use the existing tokens and components from prompt 4 for all new UI.

Don't:
- Don't touch the notes app.
- Don't introduce a new design direction for the new views — extend the
  existing folder/case-file language.

Definition of done for this run:
- Buffer is shown against both deadlines, clearly labeled.
- The what-if sliders live-recompute correctly, including the review-turnaround
  segment feeding back into the chained per-sprint dates.
- The Gantt timeline shows all five segment types correctly, per sprint.

Finish by reporting what you verified and what's left.
```

---

## Prompt 9 — Final responsive, accessibility, and regression audit

```
Every view now exists: the folder archive, chapter case files, notes, todos, the
dashboard, the review workflow, the what-if controls, and the advanced Gantt
timeline. Task for this run only: audit and fix responsive behavior,
accessibility, and functional regressions across the whole app. This is a
verification pass with pass/fail criteria, not an open-ended restyling session.

Do — responsive, at three widths, every view including the ones added in
prompts 7 and 8:
- ~1440px (desktop), ~768px (tablet), ~390px (mobile)
- No horizontal overflow, no tiny or overlapping tap targets, no clipped folder
  tabs, no unreadable text
- The layered folder stack degrades to the vertical/accordion layout on mobile
  as intended
- Dashboard numbers, the simple timeline, the what-if sliders, and the advanced
  Gantt all stay usable when narrow — the Gantt in particular is the most
  likely thing in the app to break on mobile; verify it explicitly

Do — accessibility, everywhere including the review log and what-if sliders:
- Full keyboard traversal of folder tabs, chapter documents, note actions,
  todos, the review log form, and the what-if sliders, with visible focus
  indicators throughout
- Semantic buttons and links (no clickable divs), meaningful accessible names
- Text and UI contrast meets WCAG AA against both the dark chrome and the paper
  surfaces — check the folder colors specifically, muted palettes on near-black
  fail easily
- No information conveyed by color alone; every status (including the
  project-review status from prompt 7) has text, a stamp, or an icon, not just
  a color
- prefers-reduced-motion honored on every transition, including the what-if
  slider recompute and the Gantt segments
- No hover-only interactions

Do — regression check, exercise every prior prompt's core flow end to end:
- Notes: create, edit, delete, persists on refresh
- Collections/tags/search still filter and find correctly
- Chapter→summary link: create/open a summary from a part, filter notes by
  sprint/part, the unique-per-part constraint still holds
- Sprint/part folder navigation still works, current sprint still detected
  correctly
- Dashboard numbers still match the projection engine's output
- Simple timeline (prompt 6) and advanced Gantt (prompt 8) both still render
  correctly per sprint
- Logging a review still transitions a project/capstone part to completed
  correctly, and non-project parts are unaffected
- What-if sliders still recompute live and don't persist anything

Do — consistency:
- One pass for stylistic drift: components not using the shared tokens, one-off
  colors or font sizes, spacing inconsistencies between the archive and the
  dashboard/review/Gantt views added later. Fix by moving values into tokens,
  not by adding overrides.

Don't:
- Don't add features or change any calculation, query, or data model.
- Don't redesign anything — this is conformance to the system established in
  prompt 4, not a new direction.

Definition of done for this run:
- A written pass/fail table: each view × each breakpoint, plus the a11y checks
  and the regression checklist above, with what you fixed.
- Tests, linting, and the production build pass.
- Any remaining known limitation is listed explicitly rather than left implied.
```
