# notes-app — staged agent prompts

Nine prompts, run one at a time, in order. Paste one, let the agent finish, verify its
own "definition of done" before pasting the next. Each prompt is self-contained and has
an explicit stop condition, so there's never a contradiction between "what to build" and
"where to stop."

**This repo is self-contained — see `docs/data-sources.md` before adding a new
section here.** Don't draft or copy content into this file from any project
outside this repo (including the separate "Turing College - Study workspace"
tool) — everything this file needs already lives in this repo.

| # | Prompt | Why here |
|---|---|---|
| 1 | Notes CRUD | Prove Supabase persistence works at all |
| 2 | Collections, tags, search | Completes the graded assignment |
| 3 | Study model + chapter→summary link | Sprints/parts/todos + `part_id` on notes |
| — | *Seed real course data* | *Run between 3 and 4 — see note below* |
| 4 | Folder UI foundation | Design tokens + component library, before more UI exists |
| 5 | Course config + weighted projection engine | Built correctly once — no provisional math |
| 6 | Dashboard and simple timeline | Composed from prompt 4's components, prompt 5's real numbers |
| 7 | Project review workflow + STL log + review turnaround | Scoped to project/capstone parts only |
| 8 | What-if controls + advanced timeline | Depends on prompt 7's review-turnaround data |
| 9 | **Final responsive, accessibility, and regression audit** | Runs last, so nothing built in 7–8 escapes it |
| — | *Optional: Colour-coded tags* | *Independent of the tracker — can run any time after Prompt 2. See the end of this doc.* |
| — | *Optional: Server-side full-text search* | *Also independent of the tracker — see the note below on why it may already be done.* |

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

## Data is seeded early, between prompt 3 and prompt 4

The unnumbered "Seed" prompt below (real course progress: 6 sprints, 34 parts, 2
todos) runs right after prompt 3, before the visual work starts. Reasoning: prompt 4
asks the agent to derive "the current sprint" from
real data, which isn't actually verifiable against an empty database — and every
prompt after that (projections, dashboard, review workflow, the final audit) is far
more meaningful to build and check against real numbers than against placeholders.

This has two knock-on effects, both already folded into the prompts below:

- **Prompt 5** adds `kind` to `parts` with existing rows defaulting to `part` — but 10
  of the 34 already-seeded rows aren't actually kind `part` (they're mid-projects,
  sprint projects, the career module, and the capstone). Left at the default, the
  weighted-effort numbers would be wrong from the very first run of the dashboard.
  Prompt 5 now explicitly reclassifies those rows by name.
- **Prompt 7** adds the `project_reviews` table — and Sprint 1's project already has a
  real, known review (score 92, reviewer Jochen Zuegge, submitted 2026-08-04, passed
  2026-08-05). Without backfilling it, "measured review turnaround" would report
  "assumed" despite real data existing. Prompt 7 now inserts that one record as part
  of standing up the table.

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

Real sprint/part data gets inserted next, via a separate seed prompt — no import
logic needed here.

Finish by reporting what you verified and what's left.
```

---

## Seed — Insert real course progress

```
Paste this into the agent working on notes-app. Assumes Prompt 3 (sprints/parts/todos
+ the chapter→summary link) is already built. Task for this run only: insert the
following real data into the existing tables. No schema changes, no new features —
pure data entry.

## Do

- Use the existing tracker/notes helper functions to create these rows — a one-off
  seed script that calls the existing createSprint()/createPart()/createTodo()-style
  functions, or an idempotent SQL seed file. Don't bypass the helper module if
  equivalent functions already exist.
- Insert sprints first, then their parts, then the todos.
- Make it safe to re-run without creating duplicates (e.g. skip a sprint if one with
  this name already exists) — I may need to re-run this.

## Sprints (name, planned_start, planned_end)

| Sprint | planned_start | planned_end |
|---|---|---|
| Sprint 1 — Claude Code Foundations & Simple Applications | 2026-07-22 | 2026-08-05 |
| Sprint 2 — Databases, Deployment & Full-Stack Apps | 2026-08-06 | 2026-09-18 |
| Sprint 3 — Security, Testing & AI Apps | 2026-09-19 | 2026-10-14 |
| Sprint 4 — Advanced Builds: Mobile, Commerce & Production | 2026-10-15 | 2026-11-16 |
| Career Module — Building with AI Agents | 2026-11-17 | 2026-11-18 |
| Capstone — Building with AI Agents | 2026-11-19 | 2026-11-20 |

(Each sprint's window runs from the previous sprint's end + 1 day to its own platform
deadline — that's the actual Turing College schedule, not an estimate.)

## Parts, per sprint

Status is only ever `open` or `completed` — nothing else exists at this stage.
`planned_completion_date` is `null` for every single part below — it was never tracked
at this granularity, only at the sprint level above, so there's nothing real to put
there. `actual_completion_date` is filled in only where noted; leave it `null`
everywhere else. `teach_back_done` is `false` for every part, including completed
ones — no teach-back has actually been done yet.

### Sprint 1 — Claude Code Foundations & Simple Applications (all completed)

1. Why use Claude Code? — completed — actual_completion_date 2026-08-05
2. Setup and Getting Started — completed — actual_completion_date 2026-08-05
3. Agent Mode Memory and Follow-Up Prompting — completed — actual_completion_date 2026-08-05
4. Git, GitHub and Deploying a Static App — completed — actual_completion_date 2026-08-05
5. Practice Project: Build Your Own Web App and Deploy It — completed — actual_completion_date 2026-08-05
6. Intro to Web Applications and Next.js — completed — actual_completion_date 2026-08-05
7. Context Engineering and Web Search — completed — actual_completion_date 2026-08-05
8. Sprint Project: Build a Simple Next.js App — completed — actual_completion_date 2026-08-05

All eight backfilled to the sprint's own completion date (2026-08-05) — the most
accurate date actually known, since per-part dates within the sprint weren't tracked.

### Sprint 2 — Databases, Deployment & Full-Stack Apps (parts 1-7 completed, project open)

1. Claude Code Slash Commands — completed — actual_completion_date null
2. Agent Skills and Plugins — completed — actual_completion_date null
3. Intro to Databases and Supabase — completed — actual_completion_date null
4. Next.js with Supabase — completed — actual_completion_date null
5. Mid-Sprint Project: Notes App with Collections and Search — completed — actual_completion_date null
6. Authentication with Supabase — completed — actual_completion_date null
7. Fixing errors and debugging with Claude Code — completed — actual_completion_date null
8. Sprint Project: Full-Stack App with Database and Authentication — open — actual_completion_date null

`actual_completion_date` is null across all eight here — Sprint 2 isn't marked
complete yet, so there's no sprint-level date to borrow. Part 8 is the one currently
being worked on.

### Sprint 3 — Security, Testing & AI Apps (all open)

1. Subagents and Superpowers — open
2. Intro to Vercel and Deploying Full-Stack Apps — open
3. Security of web apps — open
4. MCP, Browser Use, and Automated Tests with Playwright — open
5. Mid-Sprint Project: Ship a Secured App and Prove It — open
6. Building AI apps — open
7. RAG: chat with your own data — open
8. Sprint Project: Ship an AI App of Your Own — open

### Sprint 4 — Advanced Builds: Mobile, Commerce & Production (all open)

1. Automations with Claude Code — open
2. Compliance for AI Builders — open
3. Building Mobile Apps: Expo and React Native — open
4. Mid-Sprint Project: Build a Mobile App with an AI Feature — open
5. Multitasking and loop engineering — open
6. Building a CMS and Integrating Payments — open
7. Building production systems — open
8. Sprint Project: Ship Your Own Online Shop — open

### Career Module — Building with AI Agents (open)

1. Career Module — open

### Capstone — Building with AI Agents (open)

1. Building with AI Agents Capstone — open

34 parts total across the six sprints (8+8+8+8+1+1).

## Todos

| text | due_date | done | priority |
|---|---|---|---|
| Build the delivery-review skill (speech/delivery analysis for Feynman sessions) — design decisions already locked in, see delivery-review-notes.md | null | false | low |
| [REDACTED — was a plaintext DB password, removed before commit] | null | false | low |

Note on the second todo: this reads like a generated password or credential rather
than a task description. I'm inserting it as literal text at explicit instruction —
if it's a real credential, treat it as exposed and rotate it now that it lives as
plain text in a database, not just a local JSON file.

## Don't

- Don't change the schema, add columns, or add any feature.
- Don't touch the notes app, collections, tags, or search.
- Don't flip `teach_back_done` to true for any part, including the ones marked
  completed above — that stays false for everything until a real teach-back happens.

## Definition of done

- All 6 sprints and their 34 parts exist in Supabase, matching the tables above
  exactly — including which `actual_completion_date` values are set vs. left null.
- Both todos exist, matching the table above.
- Re-running the script doesn't create duplicates.
- Opening the study-tracker UI shows: Sprint 1 fully complete, Sprint 2 parts 1-7
  complete with the sprint project still open, Sprints 3-4/career/capstone entirely
  open, no teach-backs marked done anywhere.

Finish by reporting what you inserted and confirming the counts (6 sprints, 34 parts,
2 todos).
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
- Real sprint/part data is already seeded (from seed-data-prompt.md). After the
  migration, update `kind` on these already-existing rows by name, since they'd
  otherwise incorrectly stay at the `part` default:
  - `kind = 'mid_project'`: "Practice Project: Build Your Own Web App and Deploy
    It", "Mid-Sprint Project: Notes App with Collections and Search",
    "Mid-Sprint Project: Ship a Secured App and Prove It", "Mid-Sprint Project:
    Build a Mobile App with an AI Feature"
  - `kind = 'project'`: "Sprint Project: Build a Simple Next.js App", "Sprint
    Project: Full-Stack App with Database and Authentication", "Sprint Project:
    Ship an AI App of Your Own", "Sprint Project: Ship Your Own Online Shop"
  - `kind = 'career'`: "Career Module"
  - `kind = 'capstone'`: "Building with AI Agents Capstone"
  - Everything else stays `part`, which is already correct at the default.
- Add a weights configuration mapping kind → weight, in one place (a settings
  table or a constants file, your call) — not hardcoded inline wherever it's
  used. Starting values:
  | kind | weight |
  |---|---|
  | part (reading part) | 1 |
  | mid_project (mid-sprint project) | 1.5 |
  | project (sprint project) | 2 |
  | career (career module) | 1 |
  | capstone | 3 |
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
- Backfill one real row: Sprint 1's "Sprint Project: Build a Simple Next.js
  App" already has a completed, known review — status 'passed', reviewer
  "Jochen Zuegge", score 92, submitted_on 2026-08-04, passed_on 2026-08-05.
  Leave rubric and review_notes null unless I provide them later. Insert this
  as part of standing up the table, the same way seed-data-prompt.md backfilled
  the sprints and parts — without it, "measured review turnaround" below would
  report "assumed" despite a real data point existing.
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

---

## Optional — Colour-coded tags

The assignment requires completing at least one optional task via a dedicated feature
branch and pull request. This is that task. It only touches notes/tags (built in
Prompt 2) — it doesn't depend on, or get depended on by, any of the tracker prompts
(3 and up), so it's safe to run whenever, in any order relative to them.

```
You're working in the existing notes-app. Notes, collections, and tags (Prompt 2) are
already working, and the folder/case-file design tokens (Prompt 4) already exist.

Task for this run only: give each tag a colour from a small fixed palette, and show it
as a coloured dot or pill wherever tags appear. This is an optional task for the
assignment — do all of this on a dedicated feature branch, and open a pull request
against main rather than committing directly. Don't merge it yourself; leave the PR
open for me to review.

Do:
- Inspect the current tag UI first — how tags are created, and everywhere they're
  currently displayed (note cards, the filter panel's tag list) — before changing
  anything.
- Add a `color` column to the `tags` table. Store a token key (e.g. "red", "olive"),
  not a raw hex value or a freeform color — colour stays constrained to the palette
  below, no custom color picker.
- Define a small fixed tag palette (6-8 colours) as part of the existing shared
  design-token file from Prompt 4 — same file, same pattern, not a separate one-off
  set of colours. Make it visually consistent with the sprint folder palette but
  distinguishable from it in context, since a tag colour and a sprint's folder colour
  mean different things and shouldn't be confusable — e.g. keep tag colours as small
  swatches (dots/pills) rather than colour-blocking a whole card the way a folder does.
- Let a colour be chosen from that palette when creating a tag (swatch picker, not a
  text/hex input), and let it be changed afterward.
- Migrate any existing tags to a sensible default colour — don't leave the column
  null or break existing tag data.
- Display the colour as a small dot or pill next to the tag's name in both places
  tags currently show up: on note cards, and in the filter panel's tag list.

Don't:
- Don't touch collections, search, notes CRUD, or anything on the study-tracker side
  of the app.
- Don't build a full custom colour picker — the fixed palette is the whole point,
  it keeps the archive's visual language consistent.
- Don't change how tag filtering itself works — this is presentation only.

Definition of done for this run:
- Every tag has a colour from the fixed palette, stored in Supabase.
- The colour shows as a dot/pill next to the tag name on note cards and in the
  filter panel.
- Creating a new tag lets me pick its colour from the palette; pre-existing tags got
  a sensible default via migration, not a null or broken value.
- The work is on its own feature branch, with a pull request open against main —
  not committed directly to main.

Finish by reporting what you verified, the branch name, and the PR link/number.
```

---

## Optional — Server-side full-text search

Flag before using this one: Prompt 2 already specified server-side full-text search
— a generated `tsvector` over title + body, a GIN index, queried via Supabase's
`.textSearch()` — which is exactly what this optional task asks for. Whether this is
still a meaningful additional task depends on whether Prompt 2 was actually built to
that spec. The prompt below audits that first and branches accordingly, so it's
useful either way: if Prompt 2 already did it correctly, this becomes a hardening +
proof-of-performance pass (ranking, an EXPLAIN-verified index, a demonstrated result
at a few thousand rows) rather than an empty PR; if search actually drifted to
client-side filtering somewhere, this does the real move-to-server work.

If you only want to submit one optional task for the assignment, colour-coded tags
above is the safer choice precisely because it can't turn out to be redundant. Use
this one instead of, or in addition to, that one — your call.

```
You're working in the existing notes-app. Notes, collections, tags, and search
(Prompt 2) are already working.

Task for this run only: make sure full-text search genuinely runs server-side, is
properly indexed, ranks by relevance, and demonstrably stays fast at scale. This is
an optional task for the assignment — do all of this on a dedicated feature branch,
and open a pull request against main rather than committing directly. Don't merge it
yourself; leave the PR open for me to review.

First, audit before changing anything:
- Read the current search code path end to end — from the search box's input handler
  through to the database. Confirm whether it already executes as a database query
  using a `tsvector` column + GIN index via Supabase's `.textSearch()` (per Prompt
  2's original spec), or whether it fetches notes to the browser and filters/matches
  them in JavaScript.
- Report which one it actually is before doing anything else — this determines the
  rest of the work.

If it's already server-side (Prompt 2's spec was followed) — harden and prove it:
- Confirm the GIN index exists and is actually used: run EXPLAIN ANALYZE on a
  representative search query and check for an index scan, not a sequential scan.
  Include the output in your final report.
- Add relevance ranking if it isn't there already — order results by `ts_rank` or
  `ts_rank_cd`, not just an unordered set of matches.
- Prove it holds up "even with thousands of notes," as the task requires: seed a
  batch of a few thousand synthetic notes via a throwaway script, run a representative
  search, and report the query time and EXPLAIN output before and after. Clean up
  the synthetic data afterward — don't leave it polluting the real notes list.

If it's actually client-side (search drifted from Prompt 2's spec) — move it:
- Add a generated `tsvector` column over title + body if one doesn't exist, with a
  GIN index.
- Replace the client-side filtering with a query using Supabase's `.textSearch()`
  (or an RPC using `websearch_to_tsquery`/`plainto_tsquery`), so matching happens in
  Postgres, not in the browser.
- Then do the same hardening and scale-proof steps listed above.

Either way:
- The user-facing behaviour doesn't change — typing in the search box still narrows
  the list live, same as before. This is a backend/performance change only.
- Don't touch collection or tag filtering logic, or any visual/UI styling — this
  isn't a Prompt 4 restyling opportunity.

Don't:
- Don't leave synthetic performance-test notes in the real data after you're done
  proving performance.
- Don't change how collections/tags filter, or anything on the study-tracker side.
- Don't merge the PR yourself.

Definition of done for this run:
- You've reported which case applied — already server-side, or moved from
  client-side — before describing what you changed.
- Search executes as a database query against an indexed `tsvector` column, verified
  via EXPLAIN showing an index scan.
- Results are ranked by relevance.
- Documented evidence of performance at a few-thousand-row scale is included in the
  PR description, and no leftover synthetic data remains in the real notes table.
- The user-facing search box behaves exactly as before.
- The work is on its own feature branch, with a pull request open against main.

Finish by reporting which case applied, what you changed (if anything), the EXPLAIN
output, the performance numbers, the branch name, and the PR link/number.
```
