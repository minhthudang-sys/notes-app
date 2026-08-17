# One-time data seed — insert real course progress

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
