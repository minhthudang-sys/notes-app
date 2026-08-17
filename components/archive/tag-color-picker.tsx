import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TAG_COLORS, tagColorVars, type TagColor } from "@/lib/design/folder-colors";

export type TagColorPickerProps = {
  value: TagColor;
  onChange: (color: TagColor) => void;
  className?: string;
};

function colorLabel(color: TagColor): string {
  return color[0].toUpperCase() + color.slice(1);
}

/**
 * A dropdown over the fixed TAG_COLORS palette — never a freeform
 * colour input. Swatch + name per row, a checkmark on the current
 * colour; closes on picking one or on outside click/Escape (Radix
 * DropdownMenu's built-in behaviour).
 */
export function TagColorPicker({
  value,
  onChange,
  className,
}: TagColorPickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Tag colour: ${colorLabel(value)}`}
          className={cn("px-2", className)}
        >
          <span
            aria-hidden="true"
            style={tagColorVars(value)}
            className="h-3.5 w-3.5 shrink-0 rounded-sm bg-tag-current"
          />
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Colours</DropdownMenuLabel>
        {TAG_COLORS.map((color) => (
          <DropdownMenuItem key={color} onSelect={() => onChange(color)}>
            <span
              aria-hidden="true"
              style={tagColorVars(color)}
              className="h-3.5 w-3.5 shrink-0 rounded-sm bg-tag-current"
            />
            {colorLabel(color)}
            {value === color && (
              <Check aria-hidden="true" className="ml-auto h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
