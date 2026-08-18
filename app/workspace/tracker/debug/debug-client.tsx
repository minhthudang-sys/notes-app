"use client";

// Bare debug view for the projection engine (lib/tracker/projection.ts).
// No styling, no dashboard — just the numbers, to check them against real
// data. The dashboard itself is a later prompt.

import { useEffect, useState } from "react";

import {
  getCourse,
  getParts,
  getSprints,
  type Part,
  type Sprint,
} from "@/lib/supabase/tracker";
import {
  formatUnits,
  formatWeeklyPace,
  projectCourse,
  projectSprints,
  type ProjectionSprint,
} from "@/lib/tracker/projection";

export default function TrackerDebugPage() {
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      try {
        const [sprints, parts, course] = await Promise.all([
          getSprints(),
          getParts(),
          getCourse(),
        ]);

        const today = new Date().toISOString().slice(0, 10);
        const startDate = sprints
          .map((s: Sprint) => s.planned_start)
          .filter((d): d is string => d !== null)
          .sort()[0];

        const course_ = projectCourse({
          parts,
          startDate,
          today,
          targetDate: course.target_date,
        });

        const sprintInputs: ProjectionSprint[] = sprints.map((s: Sprint) => ({
          id: s.id,
          planned_start: s.planned_start,
          planned_end: s.planned_end,
          parts: parts.filter((p: Part) => p.sprint_id === s.id),
        }));
        const perSprint = projectSprints(sprintInputs, course_.pace, today);

        const lines: string[] = [];
        lines.push(`today: ${today}`);
        lines.push(`startDate (min sprint.planned_start): ${startDate}`);
        lines.push(`target_date: ${course.target_date ?? "(not set)"}`);
        lines.push("");
        lines.push("-- course-level --");
        lines.push(`totalUnits: ${formatUnits(course_.totalUnits)}`);
        lines.push(`builtUnits: ${formatUnits(course_.builtUnits)}`);
        lines.push(`remainingUnits: ${formatUnits(course_.remainingUnits)}`);
        lines.push(`elapsedDays: ${course_.elapsedDays}`);
        lines.push(`pace: ${formatWeeklyPace(course_.pace)} units/week`);
        lines.push(
          `projectedCompletion: ${course_.projectedCompletion ?? "null (not enough data yet)"}`,
        );
        lines.push(
          `buffer: ${course_.buffer === null ? "null" : `${course_.buffer} days`}`,
        );
        lines.push("");
        lines.push("-- per-sprint --");
        for (const sp of perSprint) {
          const sprint = sprints.find((s: Sprint) => s.id === sp.sprintId);
          if (sp.state === "done") {
            lines.push(`${sprint?.name}: done, end=${sp.end}`);
          } else {
            lines.push(
              `${sprint?.name}: projected, start=${sp.start}, end=${sp.end ?? "null (not enough data)"}`,
            );
          }
        }

        const text = lines.join("\n");
        setOutput(text);
        console.log(text);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    run();
  }, []);

  if (error) return <pre>Error: {error}</pre>;
  if (!output) return <pre>Loading…</pre>;
  return <pre>{output}</pre>;
}
