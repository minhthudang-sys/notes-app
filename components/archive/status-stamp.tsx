import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Visual weight of a stamp. Deliberately decoupled from any one
 * workflow: a tone describes how "settled" a status is, not what
 * the status means.
 */
export type StampTone = "filed" | "active" | "pending" | "attention";

export type StatusDefinition = {
  /** Human-readable text. Always rendered — never colour alone. */
  label: string;
  tone: StampTone;
  /** Optional marker glyph rendered before the label. */
  glyph?: string;
};

/**
 * An arbitrary set of statuses, keyed by the value stored in the
 * database. Callers own the set; this component owns the rendering.
 */
export type StatusSet<TStatus extends string = string> = Record<
  TStatus,
  StatusDefinition
>;

/**
 * Parts have exactly two statuses and always will.
 * See docs in components/archive/README.md before adding a third.
 */
export const PART_STATUSES = {
  open: { label: "Open", tone: "pending", glyph: "○" },
  completed: { label: "Completed", tone: "filed", glyph: "✓" },
} as const satisfies StatusSet<"open" | "completed">;

/** Teach-back is its own small two-value domain, not a part status. */
export const TEACH_BACK_STATUSES = {
  pending: { label: "Teach-back due", tone: "pending", glyph: "○" },
  done: { label: "Taught back", tone: "filed", glyph: "✓" },
} as const satisfies StatusSet<"pending" | "done">;

const toneOnDark: Record<StampTone, string> = {
  filed: "border-folder-current/70 bg-folder-current/20 text-archive-bright",
  active: "border-ring/70 bg-ring/15 text-archive-bright",
  pending: "border-archive-rule bg-archive-raised text-archive-dim",
  attention: "border-destructive/70 bg-destructive/20 text-archive-bright",
};

const toneOnPaper: Record<StampTone, string> = {
  filed: "border-folder-current/70 bg-folder-current/15 text-ink",
  active: "border-ink/40 bg-ink/10 text-ink",
  pending: "border-ink/25 bg-transparent text-ink-soft",
  attention: "border-destructive/60 bg-destructive/15 text-ink",
};

export type StatusStampProps = {
  /** The raw status value, e.g. `part.status`. */
  status: string;
  /** The set this status belongs to. */
  statuses: StatusSet;
  /** Which surface the stamp sits on, so contrast stays correct. */
  surface?: "dark" | "paper";
  size?: "sm" | "md";
  className?: string;
};

/**
 * A filed/completed/in-progress style marker.
 *
 * The status *set* is a prop, so this renders any workflow: today
 * the two-value part status, later a review lifecycle
 * (submitted → in_review → corrections → passed) with no change here.
 * An unrecognised value degrades to a neutral stamp showing the raw
 * value rather than rendering nothing.
 */
export function StatusStamp({
  status,
  statuses,
  surface = "dark",
  size = "sm",
  className,
}: StatusStampProps) {
  const definition: StatusDefinition = statuses[status] ?? {
    label: status,
    tone: "pending",
  };
  const tones = surface === "paper" ? toneOnPaper : toneOnDark;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border font-mono uppercase tracking-label",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
        tones[definition.tone],
        className,
      )}
    >
      {definition.glyph && (
        <span aria-hidden="true" className="leading-none">
          {definition.glyph}
        </span>
      )}
      {definition.label}
    </span>
  );
}
