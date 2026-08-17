import * as React from "react";

import { cn } from "@/lib/utils";

export type MetadataLabelProps = {
  /** Short caption, e.g. "Planned", "Deadline", "Chapters". */
  label: string;
  /** Rendered value. Falls back to an em dash when empty. */
  value?: React.ReactNode;
  surface?: "dark" | "paper";
  /** `stack` for a metadata rail, `inline` for a dense row. */
  layout?: "stack" | "inline";
  className?: string;
};

/**
 * A monospaced label + value pair — dates, deadlines, counts.
 * The building block of every metadata rail in the archive.
 */
export function MetadataLabel({
  label,
  value,
  surface = "dark",
  layout = "stack",
  className,
}: MetadataLabelProps) {
  const labelColor = surface === "paper" ? "text-ink-soft" : "text-archive-dim";
  const valueColor = surface === "paper" ? "text-ink" : "text-archive-bright";

  return (
    <div
      className={cn(
        "font-mono",
        layout === "stack"
          ? "flex flex-col gap-0.5"
          : "flex flex-wrap items-baseline gap-x-2",
        className,
      )}
    >
      <span
        className={cn("text-[10px] uppercase tracking-label", labelColor)}
      >
        {label}
      </span>
      <span className={cn("text-xs tabular-nums", valueColor)}>
        {value ?? <span aria-label="not set">—</span>}
      </span>
    </div>
  );
}
