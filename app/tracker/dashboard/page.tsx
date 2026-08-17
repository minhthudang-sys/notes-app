"use client";

import { useEffect, useMemo, useState } from "react";

import {
  MetadataLabel,
  PaperPanel,
  StatusStamp,
  TEACH_BACK_STATUSES,
  type StatusSet,
} from "@/components/archive";
import {
  folderColorForSprint,
  folderColorVars,
} from "@/lib/design/folder-colors";
import { cn } from "@/lib/utils";
import {
  getCourse,
  getParts,
  getSprints,
  getTodos,
  type Course,
  type Part,
  type Sprint,
  type Todo,
} from "@/lib/supabase/tracker";
import {
  builtUnitsOf,
  formatUnits,
  formatWeeklyPace,
  projectCourse,
  projectSprints,
  sumUnits,
  wholeCalendarDays,
  type ProjectionSprint,
  type SprintProjectionResult,
} from "@/lib/tracker/projection";

/**
 * Course-level "am I on track" status. Derived from prompt 5's buffer,
 * not stored — same pattern as SPRINT_FOCUS_STATUSES on the archive page.
 */
const COURSE_STATUSES = {
  on_track: { label: "On track", tone: "filed", glyph: "✓" },
  behind: { label: "Behind target", tone: "attention", glyph: "!" },
  no_data: { label: "Not enough data yet", tone: "pending", glyph: "○" },
} as const satisfies StatusSet<"on_track" | "behind" | "no_data">;

export default function DashboardPage() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  // Read in an effect, not at render time — Next's prerender flags
  // `new Date()` reached during a client component's initial render.
  const [today, setToday] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getSprints(), getParts(), getTodos(), getCourse()])
      .then(([s, p, t, c]) => {
        setSprints(s);
        setParts(p);
        setTodos(t);
        setCourse(c);
        setToday(new Date().toISOString().slice(0, 10));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const startDate = useMemo(
    () =>
      sprints
        .map((s) => s.planned_start)
        .filter((d): d is string => d !== null)
        .sort()[0],
    [sprints],
  );

  const courseProjection = useMemo(() => {
    if (!course || !startDate || !today) return null;
    return projectCourse({
      parts,
      startDate,
      today,
      targetDate: course.target_date,
    });
  }, [parts, startDate, today, course]);

  const sprintProjections = useMemo(() => {
    if (!courseProjection || !today) return [];
    const inputs: ProjectionSprint[] = sprints.map((s) => ({
      id: s.id,
      planned_start: s.planned_start,
      planned_end: s.planned_end,
      parts: parts.filter((p) => p.sprint_id === s.id),
    }));
    return projectSprints(inputs, courseProjection.pace, today);
  }, [sprints, parts, courseProjection, today]);

  /** First open part of the first sprint that still has one — same
   * derivation the archive page uses for "what should I work on next". */
  const nextPart = useMemo(() => {
    const currentSprint = sprints.find((s) =>
      parts.some((p) => p.sprint_id === s.id && p.status === "open"),
    );
    if (!currentSprint) return null;
    return (
      parts.find(
        (p) => p.sprint_id === currentSprint.id && p.status === "open",
      ) ?? null
    );
  }, [sprints, parts]);

  const reviewQueue = useMemo(
    () => parts.filter((p) => p.status === "completed" && !p.teach_back_done),
    [parts],
  );

  const openTodos = useMemo(
    () =>
      [...todos]
        .filter((t) => !t.done)
        .sort((a, b) => (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99")),
    [todos],
  );

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="font-mono text-xs text-archive-dim">
          Loading dashboard…
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <p
          role="alert"
          className="border border-destructive/60 bg-destructive/15 p-3 font-mono text-xs text-archive-bright"
        >
          {error}
        </p>
      </main>
    );
  }

  const courseStatus: keyof typeof COURSE_STATUSES =
    courseProjection === null || courseProjection.buffer === null
      ? "no_data"
      : courseProjection.buffer < 0
        ? "behind"
        : "on_track";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-label text-archive-dim">
          Study archive
        </p>
        <h1 className="mt-2 font-display text-3xl uppercase tracking-tight text-archive-bright sm:text-5xl">
          Dashboard
        </h1>
      </header>

      {/* Headline: buffer / projected completion. Answers "Am I on track?" */}
      <PaperPanel edge="top" tooth className="mb-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
              Buffer to target
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-5xl leading-none sm:text-6xl">
                {courseProjection?.buffer == null
                  ? "—"
                  : `${courseProjection.buffer > 0 ? "+" : ""}${courseProjection.buffer}`}
              </span>
              {courseProjection?.buffer != null && (
                <span className="font-mono text-sm text-ink-soft">
                  {Math.abs(courseProjection.buffer) === 1 ? "day" : "days"}
                </span>
              )}
            </div>
            <div className="mt-3">
              <StatusStamp
                surface="paper"
                status={courseStatus}
                statuses={COURSE_STATUSES}
              />
            </div>
            <p className="mt-3 max-w-md text-xs leading-relaxed text-ink-soft">
              {courseProjection === null
                ? "Course settings aren't available yet."
                : courseProjection.projectedCompletion
                  ? `Projected finish ${courseProjection.projectedCompletion} at ${formatWeeklyPace(courseProjection.pace)} units/week — ${formatUnits(courseProjection.remainingUnits)} of ${formatUnits(courseProjection.totalUnits)} units left.`
                  : "Nothing built yet, so there's no pace to project a finish date from. Complete a part to get a projection."}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <MetadataLabel
              surface="paper"
              label="Target date"
              value={course?.target_date}
            />
            <MetadataLabel
              surface="paper"
              label="Built"
              value={
                courseProjection
                  ? `${formatUnits(courseProjection.builtUnits)} / ${formatUnits(courseProjection.totalUnits)} units`
                  : undefined
              }
            />
            <MetadataLabel
              surface="paper"
              label="Up next"
              value={nextPart ? nextPart.name : "Nothing open"}
            />
          </div>
        </div>
      </PaperPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Open to-dos */}
        <PaperPanel tooth className="p-5">
          <h2 className="font-display text-lg uppercase tracking-label">
            Open to-dos
          </h2>
          {openTodos.length === 0 ? (
            <p className="mt-3 text-xs text-ink-soft">Nothing pinned.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {openTodos.map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-baseline justify-between gap-3 border-t border-paper-edge pt-2 text-sm first:border-t-0 first:pt-0"
                >
                  <span className="min-w-0 truncate">{todo.text}</span>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-label text-ink-soft">
                    {todo.due_date ? `Due ${todo.due_date}` : ""}
                    {todo.due_date && todo.priority ? " · " : ""}
                    {todo.priority ?? ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PaperPanel>

        {/* Review queue: completed parts still waiting on a teach-back */}
        <PaperPanel tooth className="p-5">
          <h2 className="font-display text-lg uppercase tracking-label">
            Review queue
          </h2>
          <p className="mt-1 text-xs text-ink-soft">
            Completed parts still waiting on a teach-back.
          </p>
          {reviewQueue.length === 0 ? (
            <p className="mt-3 text-xs text-ink-soft">
              Nothing waiting — you&apos;re caught up.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {reviewQueue.map((part) => {
                const sprint = sprints.find((s) => s.id === part.sprint_id);
                return (
                  <li
                    key={part.id}
                    className="flex items-center justify-between gap-3 border-t border-paper-edge pt-2 text-sm first:border-t-0 first:pt-0"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{part.name}</span>
                      {sprint && (
                        <span className="block font-mono text-[10px] uppercase tracking-label text-ink-soft">
                          {sprint.name}
                        </span>
                      )}
                    </span>
                    <StatusStamp
                      surface="paper"
                      status="pending"
                      statuses={TEACH_BACK_STATUSES}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </PaperPanel>
      </div>

      {/* Sprint progress — weighted units, not raw part counts */}
      <PaperPanel tooth className="mt-6 p-5">
        <h2 className="font-display text-lg uppercase tracking-label">
          Progress by sprint
        </h2>
        <p className="mt-1 text-xs text-ink-soft">
          Weighted units completed out of weighted units total.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {sprints.map((sprint) => {
            const sprintParts = parts.filter(
              (p) => p.sprint_id === sprint.id,
            );
            const total = sumUnits(sprintParts);
            const built = builtUnitsOf(sprintParts);
            const pctDone = total > 0 ? Math.round((built / total) * 100) : 0;
            return (
              <div
                key={sprint.id}
                style={folderColorVars(folderColorForSprint(sprint))}
                className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5"
              >
                <SprintLabel name={sprint.name} />
                <span className="font-mono text-xs tabular-nums text-ink-soft">
                  {formatUnits(built)} / {formatUnits(total)}
                </span>
                {/* Fill is a fixed ink tone, not per-sprint colour —
                    width already encodes % complete. Identity is
                    carried by the folder-coloured square in
                    SprintLabel, not the bar. */}
                <div className="col-span-2 h-1.5 bg-paper-edge">
                  <div
                    className="h-full bg-ink"
                    style={{ width: `${pctDone}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </PaperPanel>

      {/* Timeline — perSprintProjection's output, used directly */}
      <PaperPanel tooth className="mt-6 p-5">
        <h2 className="font-display text-lg uppercase tracking-label">
          Timeline
        </h2>
        <p className="mt-1 text-xs text-ink-soft">
          Planned window vs. projected/actual completion, per sprint.
        </p>
        <Timeline sprints={sprints} projections={sprintProjections} />
      </PaperPanel>
    </main>
  );
}

/**
 * Small folder-coloured square before a sprint's name — the only
 * identity signal left in these two sections now that bar/fill
 * colours are state-based, not per-sprint. Lives outside any
 * `relative` bar-track container so it never affects pct() math.
 */
function SprintLabel({ name }: { name: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2 text-sm">
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 rounded-sm bg-folder-current"
      />
      <span className="min-w-0 truncate">{name}</span>
    </span>
  );
}

function Timeline({
  sprints,
  projections,
}: {
  sprints: Sprint[];
  projections: SprintProjectionResult[];
}) {
  if (projections.length === 0) {
    return <p className="mt-3 text-xs text-ink-soft">No sprints filed yet.</p>;
  }

  const allDates: string[] = [];
  for (const sprint of sprints) {
    if (sprint.planned_start) allDates.push(sprint.planned_start);
    if (sprint.planned_end) allDates.push(sprint.planned_end);
  }
  for (const proj of projections) {
    allDates.push(proj.state === "done" ? proj.end : proj.start);
    if (proj.state === "projected" && proj.end) allDates.push(proj.end);
  }
  const minDate = allDates.reduce((a, b) => (b < a ? b : a));
  const maxDate = allDates.reduce((a, b) => (b > a ? b : a));
  const span = Math.max(1, wholeCalendarDays(minDate, maxDate));
  const pct = (date: string) =>
    (wholeCalendarDays(minDate, date) / span) * 100;

  return (
    <div className="mt-4 flex flex-col gap-4">
      {projections.map((proj) => {
        const sprint = sprints.find((s) => s.id === proj.sprintId);
        if (!sprint) return null;

        const slackLabel = (() => {
          if (!sprint.planned_end) return null;
          const referenceEnd = proj.end;
          if (!referenceEnd) return null;
          const slack = wholeCalendarDays(sprint.planned_end, referenceEnd);
          return slack === 0
            ? "on schedule"
            : slack > 0
              ? `${slack}d late`
              : `${-slack}d early`;
        })();

        return (
          <div
            key={proj.sprintId}
            style={folderColorVars(folderColorForSprint(sprint))}
            className="flex flex-col gap-1.5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <SprintLabel name={sprint.name} />
              <span
                className={cn(
                  "shrink-0 font-mono text-[10px] uppercase tracking-label",
                  slackLabel?.endsWith("late")
                    ? "text-destructive"
                    : "text-ink-soft",
                )}
              >
                {proj.state === "done"
                  ? `Completed ${proj.end}`
                  : proj.end
                    ? `Projected ${proj.start} → ${proj.end}`
                    : "Not enough data yet"}
                {slackLabel ? ` · ${slackLabel}` : ""}
              </span>
            </div>

            {/* Bar colours are state-based, not per-sprint identity —
                matching docs/dashboard-template.html's gantt. Row
                identity is carried by the SprintLabel square above,
                not the bar. */}
            <div className="relative h-4">
              {sprint.planned_start && sprint.planned_end && (
                <div
                  className="absolute top-0 h-1.5 bg-ink-soft/30"
                  style={{
                    left: `${pct(sprint.planned_start)}%`,
                    width: `${Math.max(0.5, pct(sprint.planned_end) - pct(sprint.planned_start))}%`,
                  }}
                />
              )}
              {proj.state === "done" ? (
                <div
                  className="absolute top-2 h-1.5 w-1.5 -translate-x-1/2 bg-ink"
                  style={{ left: `${pct(proj.end)}%` }}
                />
              ) : proj.end ? (
                <div
                  className="absolute top-2 h-1.5 bg-ink"
                  style={{
                    left: `${pct(proj.start)}%`,
                    width: `${Math.max(0.5, pct(proj.end) - pct(proj.start))}%`,
                  }}
                />
              ) : (
                <div
                  className="absolute top-2 h-1.5 w-1.5 -translate-x-1/2 bg-ink-soft"
                  style={{ left: `${pct(proj.start)}%` }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
