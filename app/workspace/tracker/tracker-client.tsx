"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Folder,
  FolderTab,
  MetadataLabel,
  PaperPanel,
  Skeleton,
  StatusStamp,
  PART_STATUSES,
  TEACH_BACK_STATUSES,
  type StatusSet,
} from "@/components/archive";
import { folderColorForSprint } from "@/lib/design/folder-colors";
import {
  createPart,
  createSprint,
  getParts,
  getSprints,
  setPartStatus,
  setTeachBackDone,
  type Part,
  type Sprint,
} from "@/lib/supabase/tracker";
import {
  createNoteForPart,
  getNoteByPartId,
  getNotesForParts,
  type Note,
} from "@/lib/supabase/notes";

/**
 * "Which sprint am I in" is a *derived* view concern, not a stored
 * status — so it gets its own status set rather than a new column.
 * Demonstrates StatusStamp accepting an arbitrary set.
 */
const SPRINT_FOCUS_STATUSES = {
  current: { label: "Current", tone: "active", glyph: "◆" },
  complete: { label: "All filed", tone: "filed", glyph: "✓" },
} as const satisfies StatusSet<"current" | "complete">;

type PartDraft = { name: string; date: string };

export default function TrackerPage() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [notesByPart, setNotesByPart] = useState<Map<string, string>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openSprintId, setOpenSprintId] = useState<string | null>(null);
  const [openPartId, setOpenPartId] = useState<string | null>(null);
  const [openNote, setOpenNote] = useState<Note | null>(null);
  const [noteLoading, setNoteLoading] = useState(false);

  const [showSprintForm, setShowSprintForm] = useState(false);
  const [newSprintName, setNewSprintName] = useState("");
  const [newSprintStart, setNewSprintStart] = useState("");
  const [newSprintEnd, setNewSprintEnd] = useState("");
  const [newPartDrafts, setNewPartDrafts] = useState<Record<string, PartDraft>>(
    {},
  );

  useEffect(() => {
    Promise.all([getSprints(), getParts()])
      .then(async ([s, p]) => {
        setSprints(s);
        setParts(p);
        const partNotes = await getNotesForParts(p.map((part) => part.id));
        setNotesByPart(
          new Map(
            partNotes
              .filter((n) => n.part_id)
              .map((n) => [n.part_id as string, n.id]),
          ),
        );
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  /**
   * The current sprint is derived from existing data: the first
   * sprint (in planned order) that still has an open part. No new
   * database status was introduced for the visual design.
   */
  const currentSprintId = useMemo(() => {
    const withOpen = sprints.find((s) =>
      parts.some((p) => p.sprint_id === s.id && p.status === "open"),
    );
    return withOpen?.id ?? null;
  }, [sprints, parts]);

  /** The next thing to work on: first open part of the current sprint. */
  const nextPart = useMemo(
    () =>
      parts.find(
        (p) => p.sprint_id === currentSprintId && p.status === "open",
      ) ?? null,
    [parts, currentSprintId],
  );

  // Open the current sprint by default, once data has loaded.
  useEffect(() => {
    if (openSprintId === null && currentSprintId) {
      setOpenSprintId(currentSprintId);
    }
  }, [currentSprintId, openSprintId]);

  // Load the summary note whenever a chapter case file is opened.
  useEffect(() => {
    if (!openPartId) {
      setOpenNote(null);
      return;
    }
    let cancelled = false;
    setNoteLoading(true);
    getNoteByPartId(openPartId)
      .then((note) => {
        if (!cancelled) setOpenNote(note);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setNoteLoading(false));
    return () => {
      cancelled = true;
    };
  }, [openPartId]);

  function partsOf(sprintId: string) {
    return parts.filter((p) => p.sprint_id === sprintId);
  }

  async function handleCreateSprint(e: React.FormEvent) {
    e.preventDefault();
    if (!newSprintName.trim()) return;
    try {
      const sprint = await createSprint({
        name: newSprintName.trim(),
        planned_start: newSprintStart || null,
        planned_end: newSprintEnd || null,
      });
      setSprints((prev) => [...prev, sprint]);
      setNewSprintName("");
      setNewSprintStart("");
      setNewSprintEnd("");
      setShowSprintForm(false);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function getDraft(sprintId: string): PartDraft {
    return newPartDrafts[sprintId] ?? { name: "", date: "" };
  }

  function updateDraft(sprintId: string, patch: Partial<PartDraft>) {
    setNewPartDrafts((prev) => ({
      ...prev,
      [sprintId]: { ...getDraft(sprintId), ...patch },
    }));
  }

  async function handleCreatePart(sprintId: string, e: React.FormEvent) {
    e.preventDefault();
    const draft = getDraft(sprintId);
    if (!draft.name.trim()) return;
    try {
      const part = await createPart({
        sprint_id: sprintId,
        name: draft.name.trim(),
        planned_completion_date: draft.date || null,
      });
      setParts((prev) => [...prev, part]);
      setNewPartDrafts((prev) => ({
        ...prev,
        [sprintId]: { name: "", date: "" },
      }));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleToggleStatus(part: Part) {
    setError(null);
    try {
      const updated = await setPartStatus(part.id, part.status !== "completed");
      setParts((prev) => prev.map((p) => (p.id === part.id ? updated : p)));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleToggleTeachBack(part: Part) {
    setError(null);
    try {
      const updated = await setTeachBackDone(part.id, !part.teach_back_done);
      setParts((prev) => prev.map((p) => (p.id === part.id ? updated : p)));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  /** Creates the summary note if absent, then opens the case file. */
  async function handleOpenSummary(part: Part) {
    setError(null);
    setOpenPartId(part.id);
    if (notesByPart.has(part.id)) return;
    try {
      const note = await createNoteForPart(part.id, part.name);
      setNotesByPart((prev) => new Map(prev).set(part.id, note.id));
      setOpenNote(note);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const totalParts = parts.length;
  const totalCompleted = parts.filter((p) => p.status === "completed").length;
  const currentSprint = sprints.find((s) => s.id === currentSprintId) ?? null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-label text-archive-dim">
          Study archive
        </p>
        <h1 className="mt-2 font-display text-3xl uppercase tracking-tight text-archive-bright sm:text-5xl">
          Sprint Folders
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

      {/* Answers "what should I work on next?" and "what have I completed?" */}
      {!loading && (
        <PaperPanel edge="left" tooth className="mb-8 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                Up next
              </span>
              {nextPart && currentSprint ? (
                <>
                  <h2 className="mt-1 font-display text-lg uppercase leading-tight sm:text-2xl">
                    {nextPart.name}
                  </h2>
                  <p className="mt-1 font-mono text-[11px] text-ink-soft">
                    {currentSprint.name}
                  </p>
                </>
              ) : (
                <h2 className="mt-1 font-display text-lg uppercase sm:text-2xl">
                  Nothing open
                </h2>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-5">
              <MetadataLabel
                surface="paper"
                label="Deadline"
                value={currentSprint?.planned_end}
              />
              <MetadataLabel
                surface="paper"
                label="Chapters filed"
                value={`${totalCompleted}/${totalParts}`}
              />
              {nextPart && (
                <Button
                  size="sm"
                  onClick={() => {
                    setOpenSprintId(nextPart.sprint_id);
                    setOpenPartId(nextPart.id);
                  }}
                >
                  Go to chapter
                </Button>
              )}
            </div>
          </div>
        </PaperPanel>
      )}

      {loading ? (
        <div
          role="status"
          aria-label="Loading sprints"
          className="flex flex-col gap-2"
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : sprints.length === 0 ? (
        <p className="font-mono text-xs text-archive-dim">
          No sprints filed yet.
        </p>
      ) : (
        /* Layered folder stack on desktop; plain accordion on mobile. */
        <div className="flex flex-col">
          {sprints.map((sprint, index) => {
            const sprintParts = partsOf(sprint.id);
            const done = sprintParts.filter(
              (p) => p.status === "completed",
            ).length;
            const isOpen = openSprintId === sprint.id;
            const isCurrent = sprint.id === currentSprintId;
            const previousOpen = sprints[index - 1]?.id === openSprintId;
            const contentId = `folder-${sprint.id}`;

            return (
              <div
                key={sprint.id}
                className={cn(
                  index > 0 &&
                    (isOpen || previousOpen ? "mt-5" : "-mt-1 sm:-mt-2"),
                )}
              >
                <Folder
                  color={folderColorForSprint(sprint)}
                  state={isOpen ? "open" : isCurrent ? "closed" : "behind"}
                  label={sprint.name}
                  contentId={contentId}
                  tab={
                    <FolderTab
                      label={sprint.name}
                      active={isOpen}
                      controls={contentId}
                      expanded={isOpen}
                      meta={`${done}/${sprintParts.length}`}
                      onClick={() => {
                        setOpenSprintId(isOpen ? null : sprint.id);
                        setOpenPartId(null);
                      }}
                      className="max-w-full sm:max-w-[26rem]"
                    />
                  }
                  meta={
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      <ProgressTicks total={sprintParts.length} done={done} />
                      <MetadataLabel
                        layout="inline"
                        label="Due"
                        value={sprint.planned_end}
                      />
                      {isCurrent && (
                        <StatusStamp
                          status="current"
                          statuses={SPRINT_FOCUS_STATUSES}
                        />
                      )}
                    </div>
                  }
                >
                  <ChapterRail
                    parts={sprintParts}
                    openPartId={openPartId}
                    notesByPart={notesByPart}
                    onSelect={(id) =>
                      setOpenPartId(id === openPartId ? null : id)
                    }
                  />

                  {openPartId &&
                    sprintParts.some((p) => p.id === openPartId) && (
                      <CaseFile
                        part={sprintParts.find((p) => p.id === openPartId)!}
                        note={openNote}
                        noteLoading={noteLoading}
                        hasNote={notesByPart.has(openPartId)}
                        onToggleStatus={handleToggleStatus}
                        onToggleTeachBack={handleToggleTeachBack}
                        onOpenSummary={handleOpenSummary}
                      />
                    )}

                  {/* File a new chapter into this sprint */}
                  <form
                    onSubmit={(e) => handleCreatePart(sprint.id, e)}
                    className="mt-4 flex flex-wrap items-end gap-2 border-t border-archive-rule pt-4"
                  >
                    <div className="flex flex-col gap-1.5">
                      <Label
                        htmlFor={`new-part-name-${sprint.id}`}
                        className="font-mono text-[10px] uppercase tracking-label text-archive-dim"
                      >
                        New chapter
                      </Label>
                      <Input
                        id={`new-part-name-${sprint.id}`}
                        value={getDraft(sprint.id).name}
                        onChange={(e) =>
                          updateDraft(sprint.id, { name: e.target.value })
                        }
                        placeholder="Chapter name"
                        className="w-56 font-mono text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label
                        htmlFor={`new-part-date-${sprint.id}`}
                        className="font-mono text-[10px] uppercase tracking-label text-archive-dim"
                      >
                        Planned
                      </Label>
                      <Input
                        id={`new-part-date-${sprint.id}`}
                        type="date"
                        value={getDraft(sprint.id).date}
                        onChange={(e) =>
                          updateDraft(sprint.id, { date: e.target.value })
                        }
                        className="font-mono text-xs"
                      />
                    </div>
                    <Button type="submit" variant="outline" size="sm">
                      File chapter
                    </Button>
                  </form>
                </Folder>
              </div>
            );
          })}
        </div>
      )}

      {/* New sprint */}
      <div className="mt-8">
        {showSprintForm ? (
          <form
            onSubmit={handleCreateSprint}
            className="flex flex-wrap items-end gap-3 border border-archive-rule bg-archive-raised p-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="new-sprint-name"
                className="font-mono text-[10px] uppercase tracking-label text-archive-dim"
              >
                Sprint name
              </Label>
              <Input
                id="new-sprint-name"
                value={newSprintName}
                onChange={(e) => setNewSprintName(e.target.value)}
                placeholder="Sprint name"
                className="w-64 font-mono text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="new-sprint-start"
                className="font-mono text-[10px] uppercase tracking-label text-archive-dim"
              >
                Planned start
              </Label>
              <Input
                id="new-sprint-start"
                type="date"
                value={newSprintStart}
                onChange={(e) => setNewSprintStart(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="new-sprint-end"
                className="font-mono text-[10px] uppercase tracking-label text-archive-dim"
              >
                Planned end
              </Label>
              <Input
                id="new-sprint-end"
                type="date"
                value={newSprintEnd}
                onChange={(e) => setNewSprintEnd(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <Button type="submit" size="sm">
              Add sprint
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowSprintForm(false)}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSprintForm(true)}
          >
            + New sprint folder
          </Button>
        )}
      </div>
    </main>
  );
}

/** Compact per-chapter progress. Paired with a text count, never colour alone. */
function ProgressTicks({ total, done }: { total: number; done: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex gap-[3px]"
        role="img"
        aria-label={`${done} of ${total} chapters completed`}
      >
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 w-1.5",
              i < done ? "bg-folder-current" : "bg-archive-rule",
            )}
          />
        ))}
      </div>
      <span className="font-mono text-[10px] tabular-nums text-archive-dim">
        {done}/{total}
      </span>
    </div>
  );
}

/** The chapter documents filed inside an open sprint folder. */
function ChapterRail({
  parts,
  openPartId,
  notesByPart,
  onSelect,
}: {
  parts: Part[];
  openPartId: string | null;
  notesByPart: Map<string, string>;
  onSelect: (id: string) => void;
}) {
  if (parts.length === 0) {
    return (
      <p className="font-mono text-xs text-archive-dim">
        No chapters filed in this folder yet.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5 border-b border-archive-rule pb-0">
      {parts.map((part) => (
        <FolderTab
          key={part.id}
          size="chapter"
          label={part.name}
          active={openPartId === part.id}
          expanded={openPartId === part.id}
          leading={part.status === "completed" ? "✓" : "○"}
          meta={notesByPart.has(part.id) ? "▤" : undefined}
          onClick={() => onSelect(part.id)}
          className="max-w-[15rem]"
        />
      ))}
    </div>
  );
}

/**
 * An opened chapter: metadata rail on one side, the filed summary
 * note's prose on the other.
 */
function CaseFile({
  part,
  note,
  noteLoading,
  hasNote,
  onToggleStatus,
  onToggleTeachBack,
  onOpenSummary,
}: {
  part: Part;
  note: Note | null;
  noteLoading: boolean;
  hasNote: boolean;
  onToggleStatus: (part: Part) => void;
  onToggleTeachBack: (part: Part) => void;
  onOpenSummary: (part: Part) => void;
}) {
  const isOpenStatus = part.status === "open";

  return (
    <PaperPanel
      as="article"
      edge="left"
      tooth
      className="mt-4 grid gap-6 p-4 sm:p-6 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]"
    >
      {/* Metadata rail */}
      <div className="flex flex-col gap-4 md:border-r md:border-paper-edge md:pr-5">
        <div className="flex flex-wrap gap-2">
          <StatusStamp
            surface="paper"
            status={part.status}
            statuses={PART_STATUSES}
          />
          <StatusStamp
            surface="paper"
            status={part.teach_back_done ? "done" : "pending"}
            statuses={TEACH_BACK_STATUSES}
          />
        </div>

        <MetadataLabel
          surface="paper"
          label="Planned"
          value={part.planned_completion_date}
        />
        <MetadataLabel
          surface="paper"
          label="Completed"
          value={part.actual_completion_date}
        />
        <MetadataLabel
          surface="paper"
          label="Summary note"
          value={hasNote ? "Filed" : "None"}
        />

        <div className="flex flex-col gap-2 pt-1">
          {/*
           * Primary action reflects the chapter's state, but the
           * summary is always reachable: a summary can be drafted
           * while the chapter is still open, independently of both
           * completion and teach-back.
           */}
          {isOpenStatus && (
            <Button size="sm" onClick={() => onToggleStatus(part)}>
              Mark completed
            </Button>
          )}

          <Button
            size="sm"
            variant={isOpenStatus ? "outline" : "default"}
            onClick={() => onOpenSummary(part)}
          >
            {hasNote ? "Open summary" : "Start Teach-Back"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleTeachBack(part)}
          >
            {part.teach_back_done ? "Undo teach-back" : "Mark taught back"}
          </Button>

          {!isOpenStatus && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleStatus(part)}
            >
              Reopen chapter
            </Button>
          )}

          {hasNote && (
            <Link
              href={`/workspace/notes?partId=${part.id}`}
              className="no-paper-link font-mono text-[11px] uppercase tracking-label text-ink underline underline-offset-4"
            >
              Edit in index →
            </Link>
          )}
        </div>
      </div>

      {/* The filed paper itself */}
      <div className="min-w-0">
        <h3 className="font-display text-2xl uppercase leading-tight sm:text-3xl">
          {part.name}
        </h3>

        {noteLoading ? (
          <p className="mt-4 font-mono text-xs text-ink-soft">
            Retrieving filed paper…
          </p>
        ) : note && note.body.trim() ? (
          <div className="paper-prose has-dropcap mt-4 whitespace-pre-wrap text-[15px]">
            {note.body}
          </div>
        ) : (
          <p className="mt-4 text-sm italic text-ink-soft">
            {hasNote
              ? "This summary is filed but still blank."
              : "No summary filed for this chapter yet."}
          </p>
        )}
      </div>
    </PaperPanel>
  );
}
