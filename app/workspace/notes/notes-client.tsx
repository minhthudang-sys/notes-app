"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Folder,
  FolderTab,
  MetadataLabel,
  PaperPanel,
  TagBadge,
  TagColorPicker,
} from "@/components/archive";
import {
  DEFAULT_TAG_COLOR,
  folderColorForCollection,
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
  setNoteCollection,
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
  // Independent of every filter below — feeds the sidebar's per-collection
  // note lists, which must show what's filed regardless of what the main
  // list is currently narrowed to.
  const [allNotes, setAllNotes] = useState<NoteWithRelations[]>([]);
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
  const [newCollectionId, setNewCollectionId] = useState("");
  const [newTagIds, setNewTagIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editCollectionId, setEditCollectionId] = useState("");
  const [editTagIds, setEditTagIds] = useState<string[]>([]);

  const [filterCollectionId, setFilterCollectionId] = useState("");
  const [uncollectedOpen, setUncollectedOpen] = useState(false);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
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

  /** collection id -> its notes, for the sidebar's expandable groups. */
  const notesByCollection = useMemo(() => {
    const map = new Map<string, NoteWithRelations[]>();
    for (const note of allNotes) {
      if (!note.collection) continue;
      const list = map.get(note.collection.id) ?? [];
      list.push(note);
      map.set(note.collection.id, list);
    }
    return map;
  }, [allNotes]);

  const uncollectedNotes = useMemo(
    () => allNotes.filter((n) => !n.collection),
    [allNotes],
  );

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
        tagIds: filterTagIds.length > 0 ? filterTagIds : undefined,
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

  async function loadAllNotes() {
    try {
      setAllNotes(await getNotes({}));
    } catch (err) {
      setError((err as Error).message);
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
    loadAllNotes();
  }, []);

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filterCollectionId,
    filterTagIds,
    appliedSearch,
    filterSprintId,
    filterPartId,
  ]);

  // Live search: apply 300ms after typing stops, no submit needed.
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function handleCollectionClick(id: string) {
    setFilterCollectionId((prev) => (prev === id ? "" : id));
    setUncollectedOpen(false);
  }

  function handleUncollectedClick() {
    setUncollectedOpen((prev) => !prev);
  }

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
      const patchTags = (list: NoteWithRelations[]) =>
        list.map((n) => ({
          ...n,
          tags: n.tags.map((t) => (t.id === tagId ? updated : t)),
        }));
      setNotes(patchTags);
      setAllNotes(patchTags);
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
        setNoteCollection(note.id, newCollectionId || null),
        setNoteTags(note.id, newTagIds),
      ]);
      await Promise.all([loadNotes(), loadAllNotes()]);
      setNewTitle("");
      setNewBody("");
      setNewCollectionId("");
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
    setEditCollectionId(note.collection?.id ?? "");
    setEditTagIds(note.tags.map((t) => t.id));
  }

  function cancelEditing() {
    setEditingId(null);
    setEditTitle("");
    setEditBody("");
    setEditCollectionId("");
    setEditTagIds([]);
  }

  async function handleUpdate(id: string) {
    setError(null);
    try {
      await updateNote(id, { title: editTitle, body: editBody });
      await Promise.all([
        setNoteCollection(id, editCollectionId || null),
        setNoteTags(id, editTagIds),
      ]);
      await Promise.all([loadNotes(), loadAllNotes()]);
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
      setAllNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function clearSearch() {
    setSearchInput("");
    setAppliedSearch("");
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
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

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Sidebar: dividers (collections) as expandable groups, labels
            (tags) as a multi-select filter. */}
        <aside
          aria-label="Collections and tags"
          className="flex flex-col gap-6 border border-archive-rule bg-archive-raised p-4"
        >
          <div>
            <h2 className={captionClassName}>Dividers</h2>
            <form
              onSubmit={handleCreateCollection}
              className="mt-2 flex items-end gap-2"
            >
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="new-collection" className="sr-only">
                  New divider
                </Label>
                <Input
                  id="new-collection"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="New divider…"
                  className={fieldClassName}
                />
              </div>
              <Button type="submit" variant="outline" size="sm">
                Add
              </Button>
            </form>

            <div className="mt-3 flex flex-col gap-2">
              {collections.map((c) => {
                const collectionNotes = notesByCollection.get(c.id) ?? [];
                const isOpen = filterCollectionId === c.id;
                const contentId = `collection-${c.id}`;
                return (
                  <Folder
                    key={c.id}
                    color={folderColorForCollection(c)}
                    state={isOpen ? "open" : "closed"}
                    label={c.name}
                    contentId={contentId}
                    tab={
                      <FolderTab
                        label={c.name}
                        meta={String(collectionNotes.length)}
                        active={isOpen}
                        controls={contentId}
                        expanded={isOpen}
                        size="chapter"
                        onClick={() => handleCollectionClick(c.id)}
                      />
                    }
                  >
                    {collectionNotes.length === 0 ? (
                      <p className="font-mono text-[10px] text-archive-dim">
                        No notes filed here yet.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {collectionNotes.map((n) => (
                          <li
                            key={n.id}
                            className="truncate font-mono text-[10px] text-archive-dim"
                          >
                            {n.title || "Untitled"}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Folder>
                );
              })}

              {/* Default group for notes filed under no divider. */}
              <Folder
                color="blue"
                state={uncollectedOpen ? "open" : "closed"}
                label="Uncollected"
                contentId="collection-uncollected"
                tab={
                  <FolderTab
                    label="Uncollected"
                    meta={String(uncollectedNotes.length)}
                    active={uncollectedOpen}
                    controls="collection-uncollected"
                    expanded={uncollectedOpen}
                    size="chapter"
                    onClick={handleUncollectedClick}
                  />
                }
              >
                {uncollectedNotes.length === 0 ? (
                  <p className="font-mono text-[10px] text-archive-dim">
                    Every note is filed in a divider.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {uncollectedNotes.map((n) => (
                      <li
                        key={n.id}
                        className="truncate font-mono text-[10px] text-archive-dim"
                      >
                        {n.title || "Untitled"}
                      </li>
                    ))}
                  </ul>
                )}
              </Folder>
            </div>
          </div>

          <div className="border-t border-archive-rule pt-4">
            <h2 className={captionClassName}>Labels</h2>
            <form
              onSubmit={handleCreateTag}
              className="mt-2 flex flex-wrap items-end gap-2"
            >
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="new-tag" className="sr-only">
                  New label
                </Label>
                <Input
                  id="new-tag"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="New label…"
                  className={fieldClassName}
                />
              </div>
              <TagColorPicker value={newTagColor} onChange={setNewTagColor} />
              <Button type="submit" variant="outline" size="sm">
                Add
              </Button>
            </form>

            {tags.length === 0 ? (
              <p className="mt-3 font-mono text-[10px] text-archive-dim">
                No labels yet.
              </p>
            ) : (
              <>
                <fieldset className="mt-3">
                  <legend className="sr-only">Filter by label</legend>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFilterTagIds([])}
                      className={cn(
                        "border px-2 py-1 font-mono text-[10px] uppercase tracking-label",
                        filterTagIds.length === 0
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
                        onClick={() =>
                          setFilterTagIds((prev) => toggleId(prev, t.id))
                        }
                        className={cn(
                          filterTagIds.includes(t.id) &&
                            "ring-1 ring-archive-bright",
                        )}
                      >
                        <TagBadge name={t.name} color={t.color} />
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="mt-4 flex flex-col gap-2 border-t border-archive-rule pt-4">
                  <span className={captionClassName}>Label colours</span>
                  {tags.map((t) => (
                    <div
                      key={t.id}
                      className="flex flex-wrap items-center gap-3"
                    >
                      <TagBadge name={t.name} color={t.color} />
                      <TagColorPicker
                        value={t.color}
                        onChange={(color) => handleChangeTagColor(t.id, color)}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </aside>

        <div className="min-w-0">
          {/* Search + chapter filters */}
          <section
            aria-label="Search and chapter filters"
            className="border border-archive-rule bg-archive-raised p-4"
          >
            <div className="flex flex-wrap items-end gap-2">
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
              {appliedSearch && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                >
                  Clear
                </Button>
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                      {sprints.find((s) => s.id === p.sprint_id)?.name ?? "?"}{" "}
                      — {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
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
                collectionId={newCollectionId}
                tagIds={newTagIds}
                onChangeCollection={setNewCollectionId}
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
              <p className="font-mono text-xs text-archive-dim">
                Reading index…
              </p>
            ) : notes.length === 0 ? (
              <p className="font-mono text-xs text-archive-dim">
                No papers match this filter.
              </p>
            ) : (
              <ul className="grid gap-4 md:grid-cols-2">
                {notes.map((note) => {
                  const filing = note.part_id
                    ? filedIn.get(note.part_id)
                    : undefined;
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
                            collectionId={editCollectionId}
                            tagIds={editTagIds}
                            onChangeCollection={setEditCollectionId}
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

                          {(note.collection || note.tags.length > 0) && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {note.collection && (
                                <span className="border-l-4 border-l-ink/50 bg-paper-shade px-2 py-0.5 font-mono text-[10px] uppercase tracking-label text-ink">
                                  {note.collection.name}
                                </span>
                              )}
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
        </div>
      </div>
    </main>
  );
}

/** Divider (collection) and label (tag) pickers, shared by create + edit. */
function FilingPickers({
  collections,
  tags,
  collectionId,
  tagIds,
  onChangeCollection,
  onToggleTag,
}: {
  collections: Collection[];
  tags: Tag[];
  collectionId: string;
  tagIds: string[];
  onChangeCollection: (id: string) => void;
  onToggleTag: (id: string) => void;
}) {
  if (collections.length === 0 && tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3">
      {collections.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="filing-collection"
            className="font-mono text-[10px] uppercase tracking-label text-ink-soft"
          >
            Divider
          </Label>
          <select
            id="filing-collection"
            className={cn(paperFieldClassName, "w-48")}
            value={collectionId}
            onChange={(e) => onChangeCollection(e.target.value)}
          >
            <option value="">Uncollected</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
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
