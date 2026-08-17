import * as React from "react";

import { cn } from "@/lib/utils";
import { TAG_COLORS, tagColorVars, type TagColor } from "@/lib/design/folder-colors";

export type TagColorPickerProps = {
  value: TagColor;
  onChange: (color: TagColor) => void;
  className?: string;
};

/**
 * A swatch picker over the fixed TAG_COLORS palette — never a
 * freeform colour input. One round button per palette entry; the
 * selected one gets a ring.
 */
export function TagColorPicker({
  value,
  onChange,
  className,
}: TagColorPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Tag colour"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      {TAG_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={color}
          onClick={() => onChange(color)}
          style={tagColorVars(color)}
          className={cn(
            "h-5 w-5 shrink-0 rounded-full bg-tag-current transition-shadow",
            value === color
              ? "ring-2 ring-ring ring-offset-2 ring-offset-archive-raised"
              : "opacity-70 hover:opacity-100",
          )}
        />
      ))}
    </div>
  );
}
