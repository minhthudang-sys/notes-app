import { describe, expect, it } from "vitest";
import {
  addDays,
  elapsedDays,
  projectCourse,
  projectSprints,
  type ProjectionPart,
  type ProjectionSprint,
} from "./projection";

function part(
  kind: ProjectionPart["kind"],
  status: ProjectionPart["status"],
  actual_completion_date: string | null = null,
): ProjectionPart {
  return { kind, status, actual_completion_date };
}

describe("elapsedDays", () => {
  it("is 1, not 0, when today equals start_date", () => {
    expect(elapsedDays("2026-08-17", "2026-08-17")).toBe(1);
  });

  it("is 1, not negative, when today is before start_date", () => {
    expect(elapsedDays("2026-08-17", "2026-08-01")).toBe(1);
  });

  it("counts whole calendar days otherwise", () => {
    expect(elapsedDays("2026-08-01", "2026-08-11")).toBe(10);
  });
});

describe("projectCourse", () => {
  it("has zero pace and a null projectedCompletion when nothing is built yet", () => {
    const parts = [part("part", "open"), part("project", "open")];
    const result = projectCourse({
      parts,
      startDate: "2026-08-01",
      today: "2026-08-10",
      targetDate: "2026-09-01",
    });

    expect(result.builtUnits).toBe(0);
    expect(result.pace).toBe(0);
    expect(result.projectedCompletion).toBeNull();
    expect(result.buffer).toBeNull();
    expect(Number.isNaN(result.pace)).toBe(false);
  });

  it("falls back to the latest actual_completion_date when everything is built", () => {
    const parts = [
      part("part", "completed", "2026-08-05"),
      part("project", "completed", "2026-08-09"),
    ];
    const result = projectCourse({
      parts,
      startDate: "2026-08-01",
      today: "2026-08-10",
      targetDate: "2026-09-01",
    });

    expect(result.remainingUnits).toBe(0);
    expect(result.projectedCompletion).toBe("2026-08-09");
  });

  it("falls back to today when everything is built but no actual dates are set", () => {
    const parts = [part("part", "completed", null)];
    const result = projectCourse({
      parts,
      startDate: "2026-08-01",
      today: "2026-08-10",
      targetDate: null,
    });

    expect(result.remainingUnits).toBe(0);
    expect(result.projectedCompletion).toBe("2026-08-10");
  });

  it("reports a negative buffer when the target date has already been missed", () => {
    // 1 unit/day pace, 10 units remaining -> projected 10 days out.
    const parts = [
      ...Array.from({ length: 5 }, () =>
        part("part", "completed", "2026-08-05"),
      ),
      ...Array.from({ length: 10 }, () => part("part", "open")),
    ];
    const result = projectCourse({
      parts,
      startDate: "2026-08-01",
      today: "2026-08-06",
      targetDate: "2026-08-10",
    });

    expect(result.pace).toBe(1);
    expect(result.projectedCompletion).toBe(addDays("2026-08-06", 10));
    expect(result.buffer).toBeLessThan(0);
    expect(Number.isInteger(result.buffer)).toBe(true);
  });

  it("returns a null buffer, not a clamped zero, only when there's no projection or no target", () => {
    const result = projectCourse({
      parts: [part("part", "open")],
      startDate: "2026-08-01",
      today: "2026-08-10",
      targetDate: "2026-09-01",
    });
    expect(result.buffer).toBeNull();
  });
});

describe("projectSprints", () => {
  it("returns a defined result for every sprint", () => {
    const sprints: ProjectionSprint[] = [
      {
        id: "a",
        planned_start: "2026-08-01",
        planned_end: "2026-08-10",
        parts: [part("part", "completed", "2026-08-09")],
      },
      {
        id: "b",
        planned_start: "2026-08-11",
        planned_end: "2026-08-20",
        parts: [part("part", "open"), part("project", "open")],
      },
    ];
    const results = projectSprints(sprints, 1, "2026-08-10");
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.state === "done" || r.state === "projected")).toBe(
      true,
    );
  });

  it("marks an all-completed sprint done, using its latest actual date", () => {
    const sprints: ProjectionSprint[] = [
      {
        id: "a",
        planned_start: "2026-08-01",
        planned_end: "2026-08-10",
        parts: [
          part("part", "completed", "2026-08-03"),
          part("part", "completed", "2026-08-05"),
        ],
      },
    ];
    const results = projectSprints(sprints, 2, "2026-08-10");
    expect(results[0]).toEqual({ sprintId: "a", state: "done", end: "2026-08-05" });
  });

  it("chains sprint A's projected end into sprint B's start, in whole-day steps", () => {
    const sprints: ProjectionSprint[] = [
      {
        id: "a",
        planned_start: "2026-08-01",
        planned_end: null,
        // 2 units remaining at pace 1/day -> 2 build days.
        parts: [part("part", "open"), part("part", "open")],
      },
      {
        id: "b",
        planned_start: "2026-08-15",
        planned_end: null,
        // 3 units remaining at pace 1/day -> 3 build days.
        parts: [part("part", "open"), part("part", "open"), part("part", "open")],
      },
    ];
    const results = projectSprints(sprints, 1, "2026-08-10");

    expect(results[0]).toEqual({
      sprintId: "a",
      state: "projected",
      start: "2026-08-10",
      end: "2026-08-11", // today + 2 days - 1
    });
    expect(results[1]).toEqual({
      sprintId: "b",
      state: "projected",
      start: "2026-08-12", // sprint A's end + 1
      end: "2026-08-14",
    });
  });

  it("reports null end (not a broken date) for a not-done sprint when pace is 0", () => {
    const sprints: ProjectionSprint[] = [
      {
        id: "a",
        planned_start: "2026-08-01",
        planned_end: null,
        parts: [part("part", "open")],
      },
    ];
    const results = projectSprints(sprints, 0, "2026-08-10");
    expect(results[0]).toEqual({
      sprintId: "a",
      state: "projected",
      start: "2026-08-10",
      end: null,
    });
  });
});
