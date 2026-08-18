# CLAUDE.md

Behavioral guidelines for this repo — bias toward caution over speed, use judgment on trivial tasks.

## Repo Map

**Top-level:** `app/` Next.js App Router · `components/` UI (`archive/`, `ui/`, `tutorial/`, one-offs) · `lib/` Supabase + design + tracker logic · `supabase/` migrations + seed · `docs/` reference docs (pointers below).

**`app/`**
- `auth/*` — Supabase route handlers (`callback`, `confirm`) + plain form pages (`error`, `forgot-password`, `sign-up`, `sign-up-success`, `update-password`).
- `login/page.tsx` — sign-in page (intentionally outside `/auth`).
- `workspace/*` — authenticated area: `notes`, `tracker`, `tracker/dashboard`, `tracker/debug`. Pattern: `page.tsx` (Server Component, `Suspense`, calls `requireUser()`) + `<name>-client.tsx` (`"use client"` UI, e.g. `notes-client.tsx`). `workspace/page.tsx` just redirects to `/workspace/notes`. `workspace/layout.tsx` is config-only — does NOT gate auth (see Auth section below).
- root `proxy.ts` — this project's `middleware.ts` equivalent, wires `lib/supabase/proxy.ts`.

**`components/`**
- `archive/` — shared design-system kit (folder, tab, panel, badges, skeleton...). Full doc: `components/archive/README.md` — read that, don't re-derive styling rules here.
- `ui/` — shadcn/radix primitives, config in `components.json`.
- `tutorial/` — leftover Supabase starter-template components, not wired into any real route. Don't extend; flag for deletion if touched.
- top-level one-offs — auth forms (`login-form`, `sign-up-form`, `forgot-password-form`, `update-password-form`), app-shell bits (`archive-header`, `archive-auth-status`, `archive-sign-out-button`), marketing/starter leftovers (`hero`, `next-logo`, `supabase-logo`).

**`lib/supabase/`** — `client.ts` (browser client) · `server.ts` (server client, fresh per call) · `auth.ts` (`requireUser()`) · `proxy.ts` (`updateSession`, cookie refresh only) · `notes.ts` / `tracker.ts` (browser CRUD/query per domain).

**`lib/` other:** `design/folder-colors.ts` (color tokens) · `tracker/projection.ts` + `weights.ts` (pure pacing engine, no I/O; tests in `projection.test.ts`, run via `npm test`) · `utils.ts` (`cn()`).

**`supabase/migrations/`** (chronological): create_notes → collections_tags_search → study_tracker (sprints/parts/todos) → part_kind_and_course → drop_todos → tag_colors → notes_single_collection (dropped the `note_collections` join table for a nullable `notes.collection_id`) → add_user_ownership_and_rls. Current tables: `notes`, `collections`, `tags`, `note_tags`, `sprints`, `parts`, `course`. `seed.sql` is real data applied to the live DB.

**Docs (read instead of re-deriving):** `docs/product-vision.md` (why this app exists) · `docs/supabase-reference.md` (Supabase/Postgres doc → decision mapping) · `docs/data-sources.md` (repo is self-contained) · `docs/agent-prompts.md` (1000+ line build history — archaeology only) · `components/archive/README.md` (design-system rules).

## Coding Guidelines

- **Think before coding:** state assumptions, surface multiple interpretations instead of picking silently, push back if a simpler approach exists, stop and ask if something's unclear.
- **Simplicity first:** minimum code that solves the problem — no speculative features, abstractions, or error handling for impossible cases.
- **Surgical changes:** touch only what the request requires; don't refactor or "improve" adjacent code; remove only the imports/vars your own change orphaned.
- **Goal-driven execution:** turn tasks into verifiable goals ("fix the bug" → reproduce with a test, then make it pass); state a brief numbered plan for multi-step work.

## Auth: Signed-In Pages Must Verify Server-Side

Use Supabase Auth for all sign-in and session handling — never build custom auth or store passwords ourselves.

Every page under `/workspace` requires a signed-in user, verified server-side, before it loads.

- Call `requireUser()` (`lib/supabase/auth.ts`) at the top of every `/workspace` page — wraps `supabase.auth.getClaims()`, `redirect("/login")`s on failure. Deliberately per-page, not a single `app/workspace/layout.tsx` check: a layout doesn't reliably re-run on client-side navigation between sibling routes, so a layout-only gate isn't a reliable auth boundary — don't reintroduce one.
- `/workspace` pages are `"use client"` and can't call `requireUser()` directly — the pattern is a thin async Server Component `page.tsx` that calls it then renders the real `*-client.tsx` component (see `app/workspace/notes/page.tsx`).
- `proxy.ts`/`lib/supabase/proxy.ts`'s cookie refresh is not a substitute — it's session housekeeping, not access control, and its allowlist excludes `/workspace` on purpose.
- Never trust `lib/supabase/client.ts`'s browser session alone — it can be stale or forged.
- Fixed redirects: sign-in success → `/workspace`; sign-out → `/login`. Sign-in page is `/login` (not under `/auth`).
- No service-role key anywhere client-accessible (no `NEXT_PUBLIC_*`, no client-component code). This app doesn't use one — RLS handles authorization.

## Supabase Conventions

**Clients** — browser (`lib/supabase/client.ts`, `createBrowserClient`) for Client Components; server (`lib/supabase/server.ts`, `createServerClient`) for Server Components/Route Handlers/Server Actions — **create a fresh instance per call** (Fluid compute, never cache at module scope).

**Tables** (source of truth: `supabase/migrations/*.sql`)

- snake_case names; `uuid primary key default gen_random_uuid()`; `timestamptz ... default now()` for `created_at`/`updated_at`.
- Foreign keys named `<table_singular>_id`, explicit `on delete cascade`/`on delete set null`.
- Enum-like columns use `check (col in (...))`, not a Postgres enum type.
- Join tables named `<table1>_<table2>` with a composite primary key.
- RLS is enabled on every table, scoped by `user_id uuid references auth.users(id) on delete cascade default auth.uid()`. Policies follow `to authenticated using ((select auth.uid()) = user_id)` (+ matching `with check`); `note_tags` has no `user_id` of its own and checks ownership through the `notes`/`tags` rows it links. `course`'s primary key is `user_id` itself. New user-data tables must follow this pattern — RLS is not optional.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
