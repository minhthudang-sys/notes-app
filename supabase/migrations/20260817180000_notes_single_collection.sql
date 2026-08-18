-- Collapse notes<->collections from the many-to-many note_collections join
-- table down to a single nullable `collection_id` on notes: a note belongs
-- to at most one collection, and may belong to none. Live data already
-- satisfies this today (no note_id appears twice in note_collections), so
-- the backfill below is lossless. Same no-auth/no-RLS phase as prior
-- migrations.

alter table notes
  add column collection_id uuid references collections(id) on delete set null;

update notes n
set collection_id = nc.collection_id
from note_collections nc
where nc.note_id = n.id;

create index notes_collection_id_idx on notes (collection_id);

drop table note_collections;
