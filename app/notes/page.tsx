"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MetadataLabel, PaperPanel, TagBadge, TagColorPicker } from "@/components/archive";
import {
  DEFAULT_TAG_COLOR,
  folderColorForSprint,
  type TagColor,
} from "@/lib/design/folder-colors";
import {
  createCollection,
  createNote,
  createTag,
  deleteNote,
  getCollections,
  getNotes,
  getTags,
  setNoteCollections,
  setNoteTags,
  updateNote,
  updateTagColor,
  type Collection,
  type NoteWithRelations,
  type Tag,
} from "@/lib/supabase/notes";
import {
  getParts,
  getSprints,
  type Part,
  type Sprint,
} from "@/lib/supabase/tracker";

const fieldClassName =
  "flex h-9 w-full border border-input bg-transparent px-3 py-1 font-mono text-xs text-archive-bright shadow-sm transition-colors placeholder:text-archive-dim focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const paperFieldClassName =
  "flex w-full border border-paper-edge bg-paper-shade px-3 py-2 text-sm text-ink shadow-sm placeholder:text-ink-soft focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const captionClassName =
  "font-mono text-[10px] uppercase tracking-label text-archive-dim";

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id];
}

export default function NotesPage() {
  return (
    <Suspense>
      <NotesPageContent />
    </Suspense>
  );
}

function NotesPageContent() {
  const searchParams = useSearchParams();

  const [notes, setNotes] = useState<NoteWithRelations[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newCollectionName, setNewCollectionName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState<TagColor>(DEFAULT_TAG_COLOR);

  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCollectionIds, setNewCollectionIds] = useState<string[]>([]);
  const [newTagIds, setNewTagIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editCollectionIds, setEditCollectionIds] = useState<string[]>([]);
  const [editTagIds, setEditTagIds] = useState<string[]>([]);

  const [filterCollectionId, setFilterCollectionId] = useState("");
  const [filterTagId, setFilterTagId] = useState("");
  const [filterSprintId, setFilterSprintId] = useState("");
  const [filterPartId, setFilterPartId] = useState(
    () => searchParams.get("partId") ?? "",
  );
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  /** part_id -> { part, sprint } so a filed note can show its chapter. */
  const filedIn = useMemo(() => {
    const map = new Map<string, { part: Part; sprint: Sprint | undefined }>();
    for (const part of parts) {
      map.set(part.id, {
        part,
        sprint: sprints.find((s) => s.id === part.sprint_id),
      });
    }
    return map;
  }, [parts, sprints]);

  async function loadNotes() {
    setError(null);
    try {
      let partIds: string[] | undefined;
      if (filterSprintId) {
        const sprintParts = await getParts(filterSprintId);
        partIds = sprintParts.map((p) => p.id);
        if (partIds.length === 0) {
          setNotes([]);
          setLoading(false);
          return;
        }
      }

      const data = await getNotes({
        collectionId: filterCollectionId || undefined,
        tagId: filterTagId || undefined,
        search: appliedSearch || undefined,
        partId: filterPartId || undefined,
        partIds,
      });
      setNotes(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([getCollections(), getTags(), getSprints(), getParts()])
      .then(([c, t, s, p]) => {
        setCollections(c);
        setTags(t);
        setSprints(s);
        setParts(p);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filterCollectionId,
    filterTagId,
    appliedSearch,
    filterSprintId,
    filterPartId,
  ]);

  async function handleCreateCollection(e: React.FormEvent) {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    try {
      const collection = await createCollection(newCollectionName.trim());
      setCollections((prev) =>
        [...prev, collection].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setNewCollectionName("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreateTag(e: React.FormEvent) {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      const tag = await createTag(newTagName.trim(), newTagColor);
      setTags((prev) =>
        [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setNewTagName("");
      setNewTagColor(DEFAULT_TAG_COLOR);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleChangeTagColor(tagId: string, color: TagColor) {
    setError(null);
    try {
      const updated = await updateTagColor(tagId, color);
      setTags((prev) => prev.map((t) => (t.id === tagId ? updated : t)));
      // Notes already loaded carry their own copies of each tag (joined at
      // fetch time), so the colour change won't show on filed papers until
      // the next reload unless those copies are patched too.
      setNotes((prev) =>
        prev.map((n) => ({
          ...n,
          tags: n.tags.map((t) => (t.id === tagId ? updated : t)),
        })),
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() && !newBody.trim()) return;

    setCreating(true);
    setError(null);
    try {
      const note = await createNote({ title: newTitle, body: newBody });
      await Promise.all([
        setNoteCollections(note.id, newCollectionIds),
        setNoteTags(note.id, newTagIds),
      ]);
      await loadNotes();
      setNewTitle("");
      setNewBody("");
      setNewCollectionIds([]);
      setNewTagIds([]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  function startEditing(note: NoteWithRelations) {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditBody(note.body);
    setEditCollectionIds(note.collections.map((c) => c.id));
    setEditTagIds(note.tags.map((t) => t.id));
  }

  function cancelEditing() {
    setEditingId(null);
    setEditTitle("");
    setEditBody("");
    setEditCollectionIds([]);
    setEditTagIds([]);
  }

  async function handleUpdate(id: string) {
    setError(null);
    try {
      await updateNote(id, { title: editTitle, body: editBody });
      await Promise.all([
        setNoteCollections(id, editCollectionIds),
        setNoteTags(id, editTagIds),
      ]);
      await loadNotes();
      cancelEditing();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
  }

  function clearSearch() {
    setSearchInput("");
    setAppliedSearch("");
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8">
        <p className={captionClassName}>Study archive</p>
        <h1 className="mt-2 font-display text-3xl uppercase tracking-tight text-archive-bright sm:text-5xl">
          Note Index
        </h1>
      </header>

      {error && (
        <p
          role="alert"
          className="mb-6 border border-destructive/60 bg-destructive/15 p-3 font-mono text-xs text-archive-bright"
        >
          {error}
        </p>
      )}

      {/* Index card catalogue: filters + search */}
      <section
        aria-label="Index filters"
        className="border border-archive-rule bg-archive-raised p-4"
      >
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-wrap items-end gap-2"
        >
          <div className="flex min-w-[12rem] flex-1 flex-col gap-1.5">
            <Label htmlFor="search" className={captionClassName}>
              Search the index
            </Label>
            <Input
              id="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Title & body full-text…"
              className={fieldClassName}
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
          {appliedSearch && (
            <Button type="button" variant="ghost" size="sm" onClick={clearSearch}>
              Clear
            </Button>
          )}
        </form>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-collection" className={captionClassName}>
              Divider
            </Label>
            <select
              id="filter-collection"
              className={fieldClassName}
              value={filterCollectionId}
              onChange={(e) => setFilterCollectionId(e.target.value)}
            >
              <option value="">All collections</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="flex min-w-0 flex-col gap-1.5">
            <legend className={captionClassName}>Label</legend>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setFilterTagId("")}
                className={cn(
                  "border px-2 py-1 font-mono text-[10px] uppercase tracking-label",
                  filterTagId === ""
                    ? "border-archive-bright text-archive-bright"
                    : "border-archive-rule text-archive-dim",
                )}
              >
                All tags
              </button>
              {tags.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilterTagId(t.id)}
                  className={cn(
                    filterTagId === t.id && "ring-1 ring-archive-bright",
                  )}
                >
                  <TagBadge name={t.name} color={t.color} />
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-sprint" className={captionClassName}>
              Sprint folder
            </Label>
            <select
              id="filter-sprint"
              className={fieldClassName}
              value={filterSprintId}
              onChange={(e) => {
                setFilterSprintId(e.target.value);
                setFilterPartId("");
              }}
            >
              <option value="">All sprints</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-part" className={captionClassName}>
              Chapter
            </Label>
            <select
              id="filter-part"
              className={fieldClassName}
              value={filterPartId}
              onChange={(e) => {
                setFilterPartId(e.target.value);
                setFilterSprintId("");
              }}
            >
              <option value="">All chapters</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {sprints.find((s) => s.id === p.sprint_id)?.name ?? "?"} —{" "}
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* New divider / new label */}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 border-t border-archive-rule pt-4">
          <form onSubmit={handleCreateCollection} className="flex items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-collection" className={captionClassName}>
                New divider
              </Label>
              <Input
                id="new-collection"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="Collection name"
                className={cn(fieldClassName, "w-48")}
              />
            </div>
            <Button type="submit" variant="outline" size="sm">
              Add
            </Button>
          </form>

          <form onSubmit={handleCreateTag} className="flex items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-tag" className={captionClassName}>
                New label
              </Label>
              <Input
                id="new-tag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name"
                className={cn(fieldClassName, "w-40")}
              />
            </div>
            <TagColorPicker value={newTagColor} onChange={setNewTagColor} />
            <Button type="submit" variant="outline" size="sm">
              Add
            </Button>
          </form>
        </div>

        {/* Existing labels' colours, changeable after creation */}
        {tags.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 border-t border-archive-rule pt-4">
            <span className={captionClassName}>Label colours</span>
            <div className="flex flex-col gap-2">
              {tags.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center gap-3">
                  <TagBadge name={t.name} color={t.color} />
                  <TagColorPicker
                    value={t.color}
                    onChange={(color) => handleChangeTagColor(t.id, color)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* File a new paper */}
      <PaperPanel edge="top" tooth className="mt-6 p-4 sm:p-5">
        <h2 className="font-display text-lg uppercase tracking-label">
          File a new note
        </h2>
        <form onSubmit={handleCreate} className="mt-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="new-title"
              className="font-mono text-[10px] uppercase tracking-label text-ink-soft"
            >
              Title
            </Label>
            <Input
              id="new-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title"
              className={paperFieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="new-body"
              className="font-mono text-[10px] uppercase tracking-label text-ink-soft"
            >
              Body
            </Label>
            <textarea
              id="new-body"
              rows={4}
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Write your note…"
              className={paperFieldClassName}
            />
          </div>

          <FilingPickers
            collections={collections}
            tags={tags}
            collectionIds={newCollectionIds}
            tagIds={newTagIds}
            onToggleCollection={(id) =>
              setNewCollectionIds((prev) => toggleId(prev, id))
            }
            onToggleTag={(id) => setNewTagIds((prev) => toggleId(prev, id))}
          />

          <div>
            <Button type="submit" disabled={creating} size="sm">
              {creating ? "Filing…" : "File note"}
            </Button>
          </div>
        </form>
      </PaperPanel>

      {/* The papers themselves */}
      <section aria-label="Notes" className="mt-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg uppercase tracking-label text-archive-bright">
            Filed papers
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-label text-archive-dim">
            {loading ? "…" : `${notes.length} shown`}
          </span>
        </div>

        {loading ? (
          <p className="font-mono text-xs text-archive-dim">Reading index…</p>
        ) : notes.length === 0 ? (
          <p className="font-mono text-xs text-archive-dim">
            No papers match this filter.
          </p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {notes.map((note) => {
              const filing = note.part_id ? filedIn.get(note.part_id) : undefined;
              const style = filing?.sprint
                ? {
                    "--folder-current": `var(--folder-${folderColorForSprint(filing.sprint)})`,
                  }
                : undefined;

              return (
                <PaperPanel
                  as="li"
                  key={note.id}
                  edge={filing ? "left" : "none"}
                  tooth
                  className="flex flex-col gap-3 p-4"
                  style={style as React.CSSProperties}
                >
                  {editingId === note.id ? (
                    <>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Title"
                        aria-label="Title"
                        className={paperFieldClassName}
                      />
                      <textarea
                        rows={5}
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        placeholder="Write your note…"
                        aria-label="Body"
                        className={paperFieldClassName}
                      />
                      <FilingPickers
                        collections={collections}
                        tags={tags}
                        collectionIds={editCollectionIds}
                        tagIds={editTagIds}
                        onToggleCollection={(id) =>
                          setEditCollectionIds((prev) => toggleId(prev, id))
                        }
                        onToggleTag={(id) =>
                          setEditTagIds((prev) => toggleId(prev, id))
                        }
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdate(note.id)}>
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEditing}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {filing && (
                        <p className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                          <span className="mr-1.5" aria-hidden="true">
                            ▤
                          </span>
                          Chapter summary · {filing.sprint?.name ?? "Sprint"} ·{" "}
                          {filing.part.name}
                        </p>
                      )}

                      <h3 className="font-display text-xl uppercase leading-tight">
                        {note.title || "Untitled"}
                      </h3>

                      {note.body && (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                          {note.body}
                        </p>
                      )}

                      {(note.collections.length > 0 ||
                        note.tags.length > 0) && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {note.collections.map((c) => (
                            <span
                              key={c.id}
                              className="border-l-4 border-l-ink/50 bg-paper-shade px-2 py-0.5 font-mono text-[10px] uppercase tracking-label text-ink"
                            >
                              {c.name}
                            </span>
                          ))}
                          {note.tags.map((t) => (
                            <TagBadge
                              key={t.id}
                              name={t.name}
                              color={t.color}
                              surface="paper"
                            />
                          ))}
                        </div>
                      )}

                      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-paper-edge pt-3">
                        <MetadataLabel
                          surface="paper"
                          layout="inline"
                          label="Updated"
                          value={note.updated_at.slice(0, 10)}
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditing(note)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(note.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </PaperPanel>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

/** Divider (collection) and label (tag) pickers, shared by create + edit. */
function FilingPickers({
  collections,
  tags,
  collectionIds,
  tagIds,
  onToggleCollection,
  onToggleTag,
}: {
  collections: Collection[];
  tags: Tag[];
  collectionIds: string[];
  tagIds: string[];
  onToggleCollection: (id: string) => void;
  onToggleTag: (id: string) => void;
}) {
  if (collections.length === 0 && tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3">
      {collections.length > 0 && (
        <fieldset className="min-w-0">
          <legend className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
            Dividers
          </legend>
          <div className="mt-1.5 flex flex-wrap gap-3">
            {collections.map((c) => (
              <label key={c.id} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={collectionIds.includes(c.id)}
                  onChange={() => onToggleCollection(c.id)}
                />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {tags.length > 0 && (
        <fieldset className="min-w-0">
          <legend className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
            Labels
          </legend>
          <div className="mt-1.5 flex flex-wrap gap-3">
            {tags.map((t) => (
              <label key={t.id} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={tagIds.includes(t.id)}
                  onChange={() => onToggleTag(t.id)}
                />
                {t.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
