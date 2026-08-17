"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  folderColorVars,
  type FolderColor,
} from "@/lib/design/folder-colors";

/**
 * - `open`   — brought to the front, contents revealed
 * - `closed` — filed in the stack, spine visible, clickable
 * - `behind` — sitting further back; dimmed and pushed down
 */
export type FolderState = "open" | "closed" | "behind";

export type FolderProps = {
  /** Folder colour. Resolve it from the sprint via folderColorForSprint(). */
  color: FolderColor;
  state: FolderState;
  /** Accessible name for the folder region. */
  label: string;
  /** The tab that opens this folder — normally a <FolderTab>. */
  tab: React.ReactNode;
  /** Summary shown alongside the tab in every state (dates, counts). */
  meta?: React.ReactNode;
  /** Revealed only when `state` is "open". */
  children?: React.ReactNode;
  /** id of the revealed region, to pair with the tab's aria-controls. */
  contentId?: string;
  className?: string;
};

/**
 * A sprint container drawn as a physical folder: a tab on top, a
 * coloured body, and — once open — paper contents inside.
 *
 * The folder owns its open/closed/behind presentation; the parent
 * owns the stack layout (overlap on desktop, accordion on mobile).
 * It also publishes `--folder-current`, so any PaperPanel,
 * StatusStamp or FolderTab rendered inside picks up this sprint's
 * colour with no prop drilling.
 */
export function Folder({
  color,
  state,
  label,
  tab,
  meta,
  children,
  contentId,
  className,
}: FolderProps) {
  const isOpen = state === "open";

  return (
    <section
      aria-label={label}
      style={folderColorVars(color)}
      className={cn(
        "archive-motion relative",
        state === "behind" && "opacity-70 hover:opacity-90",
        isOpen && "z-10",
        className,
      )}
    >
      {/* Tab strip */}
      <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
        {tab}
        {meta && (
          <div className="min-w-0 flex-1 pb-1.5">{meta}</div>
        )}
      </div>

      {/* Folder body */}
      <div
        className={cn(
          "archive-motion border-t-[3px] border-folder-current bg-archive-raised",
          isOpen
            ? "border-x border-b border-x-archive-rule border-b-archive-rule shadow-[0_18px_40px_-24px_rgb(0_0_0/0.9)]"
            : "h-2.5 sm:h-3",
        )}
      >
        {isOpen && (
          <div id={contentId} className="p-3 sm:p-4">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
