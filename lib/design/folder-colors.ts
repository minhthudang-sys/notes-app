import type { CSSProperties } from "react";

/**
 * The restrained folder palette. To add a colour: define
 * `--folder-<name>` in app/globals.css, add it to the `folder`
 * colours in tailwind.config.ts, then list it here. Nothing in
 * component code needs to change.
 */
export const FOLDER_COLORS = [
  "blue",
  "red",
  "olive",
  "mustard",
  "purple",
] as const;

export type FolderColor = (typeof FOLDER_COLORS)[number];

/**
 * Resolves a stable folder colour from a sprint record, so a newly
 * created sprint picks up a colour automatically. Deterministic:
 * the same id always yields the same colour, across reloads and
 * across devices, without storing the colour in the database.
 */
export function folderColorForSprint(sprint: { id: string }): FolderColor {
  let hash = 0;
  for (let i = 0; i < sprint.id.length; i++) {
    hash = (hash * 31 + sprint.id.charCodeAt(i)) >>> 0;
  }
  return FOLDER_COLORS[hash % FOLDER_COLORS.length];
}

/**
 * Inline style that points `--folder-current` at one palette entry.
 * Spread onto any element; descendants can then use the static
 * classes `bg-folder-current`, `border-folder-current`,
 * `text-folder-current` (with opacity modifiers) and pick up the
 * right colour.
 */
export function folderColorVars(color: FolderColor): CSSProperties {
  return { "--folder-current": `var(--folder-${color})` } as CSSProperties;
}
