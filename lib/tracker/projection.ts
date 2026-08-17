// Pure projection engine: units built vs. remaining, pace, projected
// completion, buffer against the target date, and a per-sprint timeline.
// No I/O here — callers (the debug page today, a dashboard later) fetch data
// and pass it in as plain objects.
//
// Dates in and out are plain "YYYY-MM-DD" strings, always parsed as UTC
// calendar dates so a local timezone can't shift which day "today" is.

import { KIND_WEIGHTS, type PartKind } from "./weights";

export type ProjectionPartStatus = "open" | "completed";

export interface ProjectionPart {
  kind: PartKind;
  status: ProjectionPartStatus;
  actual_completion_date: string | null;
}

export interface ProjectionSprint {
  id: string;
  planned_start: string | null;
  planned_end: string | null;
  parts: ProjectionPart[];
}

// ---- Date helpers ----

function parseDateUTC(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Whole calendar days from `from` to `to`. Negative if `to` is earlier. */
export function wholeCalendarDays(from: string, to: string): number {
  return Math.round((parseDateUTC(to) - parseDateUTC(from)) / 86_400_000);
}

export function addDays(date: string, days: number): string {
  return new Date(parseDateUTC(date) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

function maxDate(dates: string[]): string {
  return dates.reduce((max, d) => (d > max ? d : max));
}

// ---- Units ----

export function weightForKind(kind: PartKind): number {
  return KIND_WEIGHTS[kind];
}

export function sumUnits(parts: ProjectionPart[]): number {
  return parts.reduce((total, p) => total + weightForKind(p.kind), 0);
}

export function builtUnitsOf(parts: ProjectionPart[]): number {
  return sumUnits(parts.filter((p) => p.status === "completed"));
}

// ---- Elapsed days & pace ----

/** Never zero, never negative — clamped at 1 even if today <= startDate. */
export function elapsedDays(startDate: string, today: string): number {
  return Math.max(1, wholeCalendarDays(startDate, today));
}

/** Units per day. 0 when nothing is built yet — never divides by zero. */
export function computePace(builtUnits: number, elapsed: number): number {
  return builtUnits / elapsed;
}

// ---- Course-level projection ----

export interface CourseProjectionInput {
  parts: ProjectionPart[];
  startDate: string;
  today: string;
  targetDate: string | null;
}

export interface CourseProjection {
  totalUnits: number;
  builtUnits: number;
  remainingUnits: number;
  elapsedDays: number;
  pace: number;
  /** null = not enough data yet (nothing built, work remaining). */
  projectedCompletion: string | null;
  /** target_date - projectedCompletion, in whole days. Negative = late. */
  buffer: number | null;
}

export function projectCourse({
  parts,
  startDate,
  today,
  targetDate,
}: CourseProjectionInput): CourseProjection {
  const totalUnits = sumUnits(parts);
  const builtUnits = builtUnitsOf(parts);
  const remainingUnits = totalUnits - builtUnits;
  const elapsed = elapsedDays(startDate, today);
  const pace = computePace(builtUnits, elapsed);

  let projectedCompletion: string | null;
  if (remainingUnits === 0) {
    const actualDates = parts
      .map((p) => p.actual_completion_date)
      .filter((d): d is string => d !== null);
    projectedCompletion =
      actualDates.length > 0 ? maxDate(actualDates) : today;
  } else if (pace === 0) {
    projectedCompletion = null;
  } else {
    projectedCompletion = addDays(today, Math.ceil(remainingUnits / pace));
  }

  const buffer =
    projectedCompletion !== null && targetDate !== null
      ? wholeCalendarDays(projectedCompletion, targetDate)
      : null;

  return {
    totalUnits,
    builtUnits,
    remainingUnits,
    elapsedDays: elapsed,
    pace,
    projectedCompletion,
    buffer,
  };
}

// ---- Per-sprint projection ----

export type SprintProjectionResult =
  | { sprintId: string; state: "done"; end: string }
  | { sprintId: string; state: "projected"; start: string; end: string | null };

/**
 * Walks sprints in planned_start order. Done sprints report their actual (or
 * planned) end. Each not-done sprint is projected back-to-back starting from
 * today, using the same course-level pace for all of them.
 *
 * If a sprint's buildDays can't be computed (pace == 0), its end is null and
 * the cursor is left where it was — pace == 0 means every later not-done
 * sprint will be null too, so there's no length estimate to advance by.
 */
export function projectSprints(
  sprints: ProjectionSprint[],
  pace: number,
  today: string,
): SprintProjectionResult[] {
  const ordered = [...sprints].sort((a, b) =>
    (a.planned_start ?? "").localeCompare(b.planned_start ?? ""),
  );

  const results: SprintProjectionResult[] = [];
  let cursor: string | null = null;

  for (const sprint of ordered) {
    const allCompleted = sprint.parts.every((p) => p.status === "completed");

    if (allCompleted) {
      const actualDates = sprint.parts
        .map((p) => p.actual_completion_date)
        .filter((d): d is string => d !== null);
      const end =
        actualDates.length > 0
          ? maxDate(actualDates)
          : (sprint.planned_end ?? today);
      results.push({ sprintId: sprint.id, state: "done", end });
      continue;
    }

    if (cursor === null) cursor = today;

    const remainingUnitsInSprint = sumUnits(
      sprint.parts.filter((p) => p.status !== "completed"),
    );
    const buildDays =
      pace > 0 ? Math.ceil(remainingUnitsInSprint / pace) : null;
    const start = cursor;
    const end = buildDays !== null ? addDays(start, buildDays - 1) : null;

    results.push({ sprintId: sprint.id, state: "projected", start, end });

    if (end !== null) cursor = addDays(end, 1);
  }

  return results;
}

// ---- Display-layer formatting (never used internally — see rounding note
// in the prompt: totals/pace are rounded only for display, dates/day counts
// stay exact integers throughout the engine) ----

export function formatUnits(units: number): string {
  return units.toFixed(1);
}

export function formatWeeklyPace(dailyPace: number): string {
  return (dailyPace * 7).toFixed(1);
}
