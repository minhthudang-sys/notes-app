# Data sources

This repo is self-contained. It does not read from, sync with, or get
drafted from any file or project outside this git repository — in
particular, **not** the separate "Turing College - Study workspace"
project (`~/Desktop/cowork/Turing College - Study workspace/`, an
unrelated dashboard-generation tool built around its own
`course-data.json`).

All the real seed data this project needed — sprints, parts, todos — is
already captured in-repo, in two places:

- `supabase/seed.sql` — what was actually applied to the live Supabase
  database.
- `docs/agent-prompts.md`'s "Seed — Insert real course progress" section —
  the prompt-history record of the same data.

Nothing here needs, or should ever need, a fresh copy from that external
project.

## Why this file exists

A password-looking string was pasted into `docs/agent-prompts.md` three
times across one session — not as a git artifact, but as a side effect of
drafting new prompt sections by copying from that external
`course-data.json`, which still had it in its `todos` array. Each copy
undid whatever redaction had been committed here (see `c961454`, `ef7d46e`,
and any commit after them that mentions this). The credential itself was
real at the time but has since been rotated and is no longer live — the
actual fix is upstream of any single redaction: **stop treating that
external file as something to draft from.**

If a future prompt needs to reference "the real seed data," reference the
two in-repo locations above — don't reopen the external project.

## Safety net

`.githooks/pre-commit` blocks any commit containing that leaked string,
as a backstop in case this happens again anyway. It's wired via
`core.hooksPath`, which is a local git config, not something a fresh clone
picks up automatically — run this once after cloning:

```sh
git config core.hooksPath .githooks
```

(Already set for this working copy.)
