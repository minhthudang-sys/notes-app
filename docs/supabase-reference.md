# Supabase reference

Specific Supabase/Postgres docs this repo's Supabase usage is actually
built against, and which file each one justifies. Not a reading list —
each entry backs a real decision already in the code.

- **[`@supabase/ssr` package guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client)**
  — the browser-client/server-client split this repo follows: a
  `createBrowserClient` for Client Components (`lib/supabase/client.ts`)
  and a `createServerClient` reading/writing cookies via `next/headers`
  for Server Components and Route Handlers (`lib/supabase/server.ts`).

- **[Next.js server-side auth guide](https://supabase.com/docs/guides/auth/server-side/nextjs)**
  — the session-refresh-in-middleware pattern behind
  `lib/supabase/proxy.ts`'s `updateSession()`, wired from the repo-root
  `proxy.ts`.

- **[`auth.getClaims()` reference](https://supabase.com/docs/reference/javascript/auth-getclaims)**
  — server-side session verification, wrapped by `requireUser()` in
  `lib/supabase/auth.ts` and called from every page under `/workspace`,
  as required by the "Auth: Signed-In Pages Must Verify Server-Side"
  rule in `CLAUDE.md`.

- **[OAuth server-side auth guide](https://supabase.com/docs/guides/auth/social-login/auth-google#with-nextjs-ssr)**
  — the `signInWithOAuth()` → redirect → `exchangeCodeForSession()` flow
  behind `components/login-form.tsx`'s Google sign-in button and
  `app/auth/callback/route.ts`.

- **[Postgres full text search guide](https://supabase.com/docs/guides/database/full-text-search)**
  — the generated `tsvector` column + GIN index + `.textSearch()` used
  for note search (`supabase/migrations/20260817130000_collections_tags_search.sql`,
  `lib/supabase/notes.ts`'s `getNotes()`), instead of `ILIKE '%term%'`.

- **[`select()` reference, embedded resources](https://supabase.com/docs/reference/javascript/select#query-foreign-tables)**
  — how `getNotes()` embeds a note's `collections(*)` (to-one, via the
  `collection_id` foreign key) and `note_tags(tag_id, tags(*))` (to-many,
  via the join table) in a single query.

- **[Row Level Security guide](https://supabase.com/docs/guides/database/postgres/row-level-security)**
  — why every migration in `supabase/migrations/` leaves RLS off: this
  app has no `user_id` column yet (single-user, no-auth phase, see
  `docs/product-vision.md`), and RLS policies need something to key on.
  Enabling RLS is the documented next step once auth lands for real.
