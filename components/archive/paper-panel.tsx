import * as React from "react";

import { cn } from "@/lib/utils";

export type PaperPanelProps = {
  children: React.ReactNode;
  /** Draw a thick folder-coloured edge, like a filed document. */
  edge?: "none" | "left" | "top";
  /** Slightly darker stock, for secondary papers behind the main one. */
  tone?: "paper" | "shade";
  /** Near-invisible paper tooth. Off by default. */
  tooth?: boolean;
  /** Render as a different element, e.g. "article" or "li". */
  as?: React.ElementType;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "children">;

/**
 * The warm off-white content surface — the paper everything in the
 * archive is printed on. Sets ink colours for its subtree, so text
 * inside never inherits the dark-chrome foreground.
 *
 * The edge picks up `--folder-current`, so a panel rendered inside a
 * `Folder` is automatically filed in that sprint's colour.
 */
export function PaperPanel({
  children,
  edge = "none",
  tone = "paper",
  tooth = false,
  as,
  className,
  ...rest
}: PaperPanelProps) {
  const Component = as ?? "div";

  return (
    <Component
      className={cn(
        "paper-surface border border-paper-edge",
        tone === "shade" && "bg-paper-shade",
        tooth && "paper-tooth",
        edge === "left" && "border-l-4 border-l-folder-current",
        edge === "top" && "border-t-4 border-t-folder-current",
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
