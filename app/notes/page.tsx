"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
  type Collection,
  type NoteWithRelations,
  type Tag,
} from "@/lib/supabase/notes";

const textareaClassName = cn(
  "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
);

const selectClassName = cn(
  "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
);

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id];
}

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteWithRelations[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newCollectionName, setNewCollectionName] = useState("");
  const [newTagName, setNewTagName] = useState("");

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
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  async function loadNotes() {
    setError(null);
    try {
      const data = await getNotes({
        collectionId: filterCollectionId || undefined,
        tagId: filterTagId || undefined,
        search: appliedSearch || undefined,
      });
      setNotes(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([getCollections(), getTags()])
      .then(([c, t]) => {
        setCollections(c);
        setTags(t);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCollectionId, filterTagId, appliedSearch]);

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
      const tag = await createTag(newTagName.trim());
      setTags((prev) =>
        [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setNewTagName("");
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
    <div className="flex-1 w-full flex flex-col gap-8 max-w-3xl mx-auto p-5">
      <h1 className="font-bold text-2xl">Notes</h1>

      {error && (
        <p className="text-sm text-destructive-foreground bg-destructive/10 border border-destructive/50 rounded-md p-3">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-6">
        <form
          onSubmit={handleCreateCollection}
          className="flex gap-2 items-end"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-collection">New collection</Label>
            <Input
              id="new-collection"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Collection name"
            />
          </div>
          <Button type="submit" variant="outline">
            Add
          </Button>
        </form>

        <form onSubmit={handleCreateTag} className="flex gap-2 items-end">
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-tag">New tag</Label>
            <Input
              id="new-tag"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag name"
            />
          </div>
          <Button type="submit" variant="outline">
            Add
          </Button>
        </form>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-collection">Collection</Label>
          <select
            id="filter-collection"
            className={selectClassName}
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-tag">Tag</Label>
          <select
            id="filter-tag"
            className={selectClassName}
            value={filterTagId}
            onChange={(e) => setFilterTagId(e.target.value)}
          >
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2 items-end">
          <div className="flex flex-col gap-2">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search title & body..."
            />
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
          {appliedSearch && (
            <Button type="button" variant="ghost" onClick={clearSearch}>
              Clear
            </Button>
          )}
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New note</CardTitle>
        </CardHeader>
        <form onSubmit={handleCreate}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-title">Title</Label>
              <Input
                id="new-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Title"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-body">Body</Label>
              <textarea
                id="new-body"
                className={textareaClassName}
                rows={4}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Write your note..."
              />
            </div>
            {collections.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label>Collections</Label>
                <div className="flex flex-wrap gap-3">
                  {collections.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-1.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={newCollectionIds.includes(c.id)}
                        onChange={() =>
                          setNewCollectionIds((prev) => toggleId(prev, c.id))
                        }
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {tags.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-3">
                  {tags.map((t) => (
                    <label
                      key={t.id}
                      className="flex items-center gap-1.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={newTagIds.includes(t.id)}
                        onChange={() =>
                          setNewTagIds((prev) => toggleId(prev, t.id))
                        }
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={creating}>
              {creating ? "Adding..." : "Add note"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div className="flex flex-col gap-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading notes...</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes found.</p>
        ) : (
          notes.map((note) => (
            <Card key={note.id}>
              {editingId === note.id ? (
                <>
                  <CardContent className="flex flex-col gap-4 pt-6">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Title"
                    />
                    <textarea
                      className={textareaClassName}
                      rows={4}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      placeholder="Write your note..."
                    />
                    {collections.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <Label>Collections</Label>
                        <div className="flex flex-wrap gap-3">
                          {collections.map((c) => (
                            <label
                              key={c.id}
                              className="flex items-center gap-1.5 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={editCollectionIds.includes(c.id)}
                                onChange={() =>
                                  setEditCollectionIds((prev) =>
                                    toggleId(prev, c.id),
                                  )
                                }
                              />
                              {c.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    {tags.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <Label>Tags</Label>
                        <div className="flex flex-wrap gap-3">
                          {tags.map((t) => (
                            <label
                              key={t.id}
                              className="flex items-center gap-1.5 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={editTagIds.includes(t.id)}
                                onChange={() =>
                                  setEditTagIds((prev) => toggleId(prev, t.id))
                                }
                              />
                              {t.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="gap-2">
                    <Button onClick={() => handleUpdate(note.id)}>
                      Save
                    </Button>
                    <Button variant="outline" onClick={cancelEditing}>
                      Cancel
                    </Button>
                  </CardFooter>
                </>
              ) : (
                <>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {note.title || "Untitled"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <p className="whitespace-pre-wrap text-sm">
                      {note.body}
                    </p>
                    {(note.collections.length > 0 || note.tags.length > 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {note.collections.map((c) => (
                          <Badge key={c.id} variant="secondary">
                            {c.name}
                          </Badge>
                        ))}
                        {note.tags.map((t) => (
                          <Badge key={t.id} variant="outline">
                            {t.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={() => startEditing(note)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDelete(note.id)}
                    >
                      Delete
                    </Button>
                  </CardFooter>
                </>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
