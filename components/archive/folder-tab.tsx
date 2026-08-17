"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import {
  folderColorVars,
  type FolderColor,
} from "@/lib/design/folder-colors";

export type FolderTabProps = {
  /** The text printed on the tab. */
  label: React.ReactNode;
  /** Small trailing metadata, e.g. "5/8" or a StatusStamp. */
  meta?: React.ReactNode;
  /** Leading marker, e.g. a status glyph or index number. */
  leading?: React.ReactNode;
  /**
   * Sets this tab's own colour. Omit to inherit `--folder-current`
   * from an enclosing Folder — which is what chapter tabs want.
   */
  color?: FolderColor;
  active?: boolean;
  /** `sprint` = large folder tab, `chapter` = document tab inside. */
  size?: "sprint" | "chapter";
  onClick?: () => void;
  /** Renders an anchor instead of a button. */
  href?: string;
  /** id of the region this tab reveals. */
  controls?: string;
  expanded?: boolean;
  className?: string;
};

/**
 * A labelled tab. Used for both sprint folder tabs and the chapter
 * documents inside an open folder.
 *
 * Always a real <button> or <a> — never a div with a click handler —
 * so keyboard focus and activation work without extra wiring.
 */
export function FolderTab({
  label,
  meta,
  leading,
  color,
  active = false,
  size = "sprint",
  onClick,
  href,
  controls,
  expanded,
  className,
}: FolderTabProps) {
  const classes = cn(
    "archive-motion group inline-flex max-w-full items-center gap-2 rounded-t-[3px] border border-b-0 text-left",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    size === "sprint"
      ? "px-4 py-2.5 font-display text-sm uppercase tracking-label sm:text-base"
      : "px-3 py-1.5 font-mono text-[11px] sm:text-xs",
    active
      ? "border-folder-current bg-folder-current text-archive-bright"
      : "border-archive-rule bg-archive-raised text-archive-dim hover:border-folder-current/60 hover:text-archive-bright",
    className,
  );

  const content = (
    <>
      {leading && (
        <span aria-hidden="true" className="shrink-0 opacity-80">
          {leading}
        </span>
      )}
      <span className="truncate">{label}</span>
      {meta && (
        <span
          className={cn(
            "ml-auto shrink-0 pl-1 font-mono text-[10px] tabular-nums",
            active ? "text-archive-bright/85" : "text-archive-dim",
          )}
        >
          {meta}
        </span>
      )}
    </>
  );

  const style = color ? folderColorVars(color) : undefined;

  if (href) {
    return (
      <Link href={href} className={classes} style={style}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-controls={controls}
      aria-expanded={expanded}
      className={classes}
      style={style}
    >
      {content}
    </button>
  );
}
