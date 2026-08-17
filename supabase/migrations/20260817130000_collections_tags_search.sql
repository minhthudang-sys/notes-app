-- Collections, tags, and full-text search on top of the notes table.
-- Same no-auth/no-RLS phase as the notes migration.

create table collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table note_collections (
  note_id uuid not null references notes(id) on delete cascade,
  collection_id uuid not null references collections(id) on delete cascade,
  primary key (note_id, collection_id)
);

create table note_tags (
  note_id uuid not null references notes(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (note_id, tag_id)
);

-- Full-text search across title + body.
alter table notes
  add column search_vector tsvector
  generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))
  ) stored;

create index notes_search_vector_idx on notes using gin (search_vector);
