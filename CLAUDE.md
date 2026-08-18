# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Auth: Signed-In Pages Must Verify Server-Side

Use Supabase Auth for all sign-in and session handling — never build custom auth or store passwords ourselves.

Every page under `/workspace` (notes, tracker, dashboard, and any future area) requires a signed-in user, verified server-side, before it loads. Do not rely on the browser-side session alone.

- Call `requireUser()` (`lib/supabase/auth.ts`) at the top of every page under `/workspace` — it wraps the server client in `lib/supabase/server.ts` (`supabase.auth.getClaims()`) and `redirect("/login")`s on failure. This is deliberately a per-page call, not a single check in `app/workspace/layout.tsx`: per `node_modules/next/dist/docs/01-app/02-guides/authentication.md` ("Layouts and auth checks"), a layout doesn't re-run on client-side navigation between sibling routes and doesn't block the rest of the route from rendering, so a layout-only gate isn't reliable — don't reintroduce one.
- Every page under `/workspace` is a `"use client"` component today, which can't call `requireUser()` directly. The pattern: a plain `.tsx` file (e.g. `notes-client.tsx`) holds the existing client component, and `page.tsx` is a thin async Server Component that calls `requireUser()` then renders it — see `app/workspace/notes/page.tsx`.
- The root `proxy.ts` / `lib/supabase/proxy.ts` cookie-refresh check is not a substitute — it's a pathname-prefix allowlist (which currently excludes `/workspace` entirely, since the per-page checks above are the real gate) meant for session cookie housekeeping, not access control.
- A `"use client"` page reading `lib/supabase/client.ts`'s browser session isn't sufficient either — that state can be stale or forged; the check must happen server-side before the page's content is sent down.
- Redirect targets are fixed: sign-in success → `/workspace`; sign-out → `/login`. The sign-in page itself lives at `/login` (not under `/auth`); the other `/auth/*` routes (`sign-up`, `forgot-password`, `update-password`, `callback`, `confirm`, `error`) are unaffected.
- No service-role key anywhere client-accessible: never put a Supabase service-role key in a `NEXT_PUBLIC_*` env var, in client-component code, or anywhere it would ship to the browser. This app doesn't use one at all — RLS handles authorization, so a service-role key (which bypasses RLS) has no legitimate use here.

## Supabase Conventions

**Clients**

- Browser client (`lib/supabase/client.ts`): `createBrowserClient`, uses `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. For Client Components and browser-side data helpers (`lib/supabase/notes.ts`, `lib/supabase/tracker.ts`).
- Server client (`lib/supabase/server.ts`): `createServerClient`, cookies via `next/headers`. Create a fresh instance per call (Fluid compute — never cache at module scope). Use in Server Components, Route Handlers, Server Actions, and for the auth check above.
- Session refresh (`lib/supabase/proxy.ts`'s `updateSession`, wired from the root `proxy.ts`): refreshes the auth cookie every request via this project's `proxy.ts` convention (not `middleware.ts`). Its redirect gate is partial/incomplete by design today — treat it as cookie housekeeping, not access control.

**Tables** (source of truth: `supabase/migrations/*.sql`)

- snake_case names; `uuid primary key default gen_random_uuid()`; `timestamptz ... default now()` for `created_at`/`updated_at` where present.
- Foreign keys named `<table_singular>_id` with explicit `on delete cascade` / `on delete set null`.
- Enum-like text columns use `check (col in (...))` rather than a Postgres enum type.
- Join tables named `<table1>_<table2>` with a composite primary key.
- Current tables: `notes`, `collections`, `tags`, `note_collections`, `note_tags`, `sprints`, `parts`, `course`.
- RLS is enabled on every table, each scoped by a `user_id uuid references auth.users(id) on delete cascade default auth.uid()` column (see `supabase/migrations/20260818075559_add_user_ownership_and_rls.sql`). Policies follow `to authenticated using ((select auth.uid()) = user_id)` (plus matching `with check` on insert/update); `note_tags` has no `user_id` of its own and checks ownership through the `notes`/`tags` rows it links instead. `course`'s primary key is `user_id` itself (one row per user) rather than the old boolean singleton. New tables holding user data must follow this same pattern — RLS is not optional or deferred anymore.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
