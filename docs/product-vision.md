# notes-app — product vision (reference doc, not a paste-able prompt)

This is the full picture of what `notes-app` should eventually become. It's kept here
for context — what each feature is for, why it exists, the eventual schema shape — but
it is **not** meant to be pasted into a coding agent as a single task. It's too large
for one run and its own "definition of done" section used to contradict itself about
where to stop (fixed now by splitting into staged prompts — see `agent-prompts.md` in
this same folder, which is the thing to actually paste).

I'm building a Next.js + Supabase web app called **notes-app**. It has two jobs in one:
it's my submission for the Turing College Sprint 2 mid-project ("Notes App with
Collections and Search"), and it's my personal study-progress tracker for the whole
*Building with AI Agents* programme — replacing a static-HTML dashboard I was using
before (`dashboard-template.html` in this folder is that dashboard, kept as a visual
and logic reference). Both halves need to work together in one coherent app, not feel
bolted on.

## Tech stack

- Next.js (App Router), TypeScript
- Supabase (Postgres) as the only datastore — no local JSON files, no static rebuild step
- `@supabase/supabase-js` for all data access, isolated behind one helper module
- No authentication for now. Auth comes in a later pass — design the schema and API
  layer so RLS policies and a `user_id` column can be added later without a rewrite.

## Part 1 — Notes app (the graded assignment)

- **Schema design and `supabase-js` client setup** — graded on its own; normalized
  schema, not one denormalized notes table.
- **Notes**: create, edit, delete, list. Title + body content.
- **Collections**: notes belong to at most one collection; filter by collection.
- **Tag-based filtering**: notes can have multiple tags; filter by tag, and combine
  with a collection filter.
- **Full-text search across notes**: title + body, real Postgres full-text search
  (`tsvector` + GIN index, or Supabase's `.textSearch()`), not `ILIKE '%term%'`.
- **Persistence**: Supabase, not browser storage — survives closing the browser and
  works from any device.

## Part 2 — Study progress tracker

Rebuilds the static dashboard's data model as Supabase tables and its features as
real, live app views.

**Full data model (the eventual shape — build incrementally, see agent-prompts.md):**
- Sprints: name, module, platform deadline, started/completed dates, review-day override
- Parts within a sprint: name, `kind` (`part` / `mid_project` / `project` / `career` /
  `capstone`, each with a weight — part=1, mid_project=1.5, project=2, career=1,
  capstone=3), status (`not_started → in_progress → submitted → in_review →
  corrections → passed`/`done`), whether it's been taught back, link to its summary
- Sprint-project fields: `submitted_on`, `passed_on`, `repo`, `review_score`,
  `reviewer`, `review_notes` — used to compute real review turnaround once at least
  one exists, falling back to an assumed default otherwise
- Course-level config: `start_date`, `target_deadline` (mine), `programme_deadline`
  (the platform's), `default_review_days`, per-kind weights
- Todos: text, due date, done flag, priority
- STL reviews: reviewer, score, per-criterion rubric, narrative feedback, tied to a
  sprint project

**Full feature list (the eventual shape):**
- Hero: buffer to target in days, status badge, projected finish date, summary vs.
  both the personal target and the platform deadline
- Tiles: % effort done (weighted units), builds passed vs. total, parts ready for
  teach-back vs. reviewed, open todo count, next platform deadline, days to target
- Pace panel: actual vs. required pace, gauge, measured-vs-assumed review turnaround
- Open todos with priority/due-date handling
- Review queue (done but not taught back)
- Build deliverables with weight, status, landing date, score
- Progress by sprint
- Gantt-style timeline: planned vs. actual/projected vs. review turnaround vs. buffer,
  chained sprint-to-sprint, recomputed live
- What-if scratchpad: pace + review-turnaround sliders, live recompute, nothing saved
- STL review log

## Full schema sketch (the eventual shape)

```
sprints(id, name, module, platform_deadline, started, completed, review_days)
parts(id, sprint_id fk, n, name, kind, status, reviewed, summary_url,
      submitted_on, passed_on, repo, review_score, reviewer, review_notes)
todos(id, text, due, done, priority, created_at)
notes(id, title, body, part_id fk nullable, collection_id fk nullable, search_vector tsvector, created_at, updated_at)
collections(id, name, description)
tags(id, name)
note_tags(note_id fk, tag_id fk)
stl_reviews(id, part_id fk, reviewer, score, rubric jsonb, notes, created_at)
settings(key, value)   -- start_date, target_deadline, programme_deadline, weights, default_review_days
```

## Non-goals, for a good while

- No authentication/login yet — single-user, schema kept auth-ready
- No mobile app — responsive web is enough
- No migration tooling for the old JSON file — real course/sprint data gets re-entered
  by hand once the schema exists
