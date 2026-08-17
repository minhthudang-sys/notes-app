import * as React from "react";

import { cn } from "@/lib/utils";
import { tagColorVars, type TagColor } from "@/lib/design/folder-colors";

export type TagBadgeProps = {
  name: string;
  color: TagColor;
  surface?: "dark" | "paper";
  className?: string;
};

/**
 * A tag's name with a small colour dot — never a colour-blocked
 * surface, so it can't be mistaken for a folder. See TAG_COLORS in
 * lib/design/folder-colors.ts for why the palette itself is shared
 * with folders while the rendering stays deliberately different.
 */
export function TagBadge({
  name,
  color,
  surface = "dark",
  className,
}: TagBadgeProps) {
  return (
    <span
      style={tagColorVars(color)}
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px]",
        surface === "paper"
          ? "border-dashed border-ink/40 text-ink-soft"
          : "border-archive-rule bg-archive-raised text-archive-dim",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-tag-current"
      />
      #{name}
    </span>
  );
}
