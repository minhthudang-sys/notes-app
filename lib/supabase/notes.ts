import { createClient } from "@/lib/supabase/client";
import type { TagColor } from "@/lib/design/folder-colors";

export type Note = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  part_id: string | null;
  collection_id: string | null;
};

export type Collection = {
  id: string;
  name: string;
  created_at: string;
};

export type Tag = {
  id: string;
  name: string;
  color: TagColor;
  created_at: string;
};

export type NoteWithRelations = Note & {
  collection: Collection | null;
  tags: Tag[];
};

export type NoteFilters = {
  collectionId?: string;
  // AND logic: only notes carrying every one of these tags.
  tagIds?: string[];
  search?: string;
  // Filter to a single part's summary note.
  partId?: string;
  // Filter to notes belonging to any of these parts (e.g. all parts in a
  // sprint). Resolving a sprint to part ids is the tracker helper's job —
  // this module just takes the resulting list.
  partIds?: string[];
};

type RawNoteRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  part_id: string | null;
  collection_id: string | null;
  collections: Collection | null;
  note_tags: { tag_id: string; tags: Tag }[];
};

export async function getNotes(
  filters: NoteFilters = {},
): Promise<NoteWithRelations[]> {
  const supabase = createClient();

  // AND-logic tag filter: an embedded-join filter on note_tags would only
  // express "has at least one" and would also truncate each note's
  // note_tags embed down to just the matched rows. Resolve matching note
  // ids ourselves first, so the main query's tag embed always carries a
  // note's full tag set (needed for display) and the AND check is exact.
  let matchingNoteIds: string[] | undefined;
  if (filters.tagIds && filters.tagIds.length > 0) {
    const { data: matches, error: tagError } = await supabase
      .from("note_tags")
      .select("note_id, tag_id")
      .in("tag_id", filters.tagIds);
    if (tagError) throw tagError;

    const countByNote = new Map<string, number>();
    for (const row of matches ?? []) {
      countByNote.set(row.note_id, (countByNote.get(row.note_id) ?? 0) + 1);
    }
    matchingNoteIds = [...countByNote.entries()]
      .filter(([, count]) => count === filters.tagIds!.length)
      .map(([noteId]) => noteId);

    if (matchingNoteIds.length === 0) return [];
  }

  let query = supabase
    .from("notes")
    .select(
      `id, title, body, created_at, updated_at, part_id, collection_id,
      collections(*),
      note_tags(tag_id, tags(*))`,
    )
    .order("updated_at", { ascending: false });

  if (filters.collectionId) {
    query = query.eq("collection_id", filters.collectionId);
  }
  if (matchingNoteIds) {
    query = query.in("id", matchingNoteIds);
  }
  if (filters.partId) {
    query = query.eq("part_id", filters.partId);
  }
  if (filters.partIds) {
    query = query.in("part_id", filters.partIds);
  }
  if (filters.search) {
    query = query.textSearch("search_vector", filters.search, {
      type: "websearch",
      config: "english",
    });
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data as unknown as RawNoteRow[]).map((note) => ({
    id: note.id,
    title: note.title,
    body: note.body,
    created_at: note.created_at,
    updated_at: note.updated_at,
    part_id: note.part_id,
    collection_id: note.collection_id,
    collection: note.collections,
    tags: note.note_tags.map((nt) => nt.tags),
  }));
}

// Looks up the single summary note tied to a part, if one exists.
export async function getNoteByPartId(partId: string): Promise<Note | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, body, created_at, updated_at, part_id, collection_id")
    .eq("part_id", partId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Which of these parts already have a summary note, keyed by part_id.
export async function getNotesForParts(
  partIds: string[],
): Promise<Pick<Note, "id" | "title" | "part_id">[]> {
  if (partIds.length === 0) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, part_id")
    .in("part_id", partIds);

  if (error) throw error;
  return data;
}

// Creates the (at most one, DB-enforced) summary note for a part.
export async function createNoteForPart(
  partId: string,
  title: string,
): Promise<Note> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notes")
    .insert({ title, body: "", part_id: partId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createNote(note: {
  title: string;
  body: string;
}): Promise<Note> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notes")
    .insert(note)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateNote(
  id: string,
  note: { title: string; body: string },
): Promise<Note> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notes")
    .update({ ...note, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteNote(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("notes").delete().eq("id", id);

  if (error) throw error;
}

export async function getCollections(): Promise<Collection[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .order("name");

  if (error) throw error;
  return data;
}

export async function createCollection(name: string): Promise<Collection> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("collections")
    .insert({ name })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTags(): Promise<Tag[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("name");

  if (error) throw error;
  return data;
}

export async function createTag(name: string, color: TagColor): Promise<Tag> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tags")
    .insert({ name, color })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTagColor(
  id: string,
  color: TagColor,
): Promise<Tag> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tags")
    .update({ color })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function setNoteCollection(
  noteId: string,
  collectionId: string | null,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("notes")
    .update({ collection_id: collectionId })
    .eq("id", noteId);
  if (error) throw error;
}

export async function setNoteTags(
  noteId: string,
  tagIds: string[],
): Promise<void> {
  const supabase = createClient();

  const { error: deleteError } = await supabase
    .from("note_tags")
    .delete()
    .eq("note_id", noteId);
  if (deleteError) throw deleteError;

  if (tagIds.length === 0) return;

  const { error: insertError } = await supabase.from("note_tags").insert(
    tagIds.map((tagId) => ({ note_id: noteId, tag_id: tagId })),
  );
  if (insertError) throw insertError;
}
