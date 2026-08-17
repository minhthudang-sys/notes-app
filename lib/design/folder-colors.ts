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
  "teal",
] as const;

export type FolderColor = (typeof FOLDER_COLORS)[number];

/**
 * Resolves a stable folder colour from a sprint record, so a newly
 * created sprint picks up a colour automatically. Deterministic:
 * the same id always yields the same colour, across reloads and
 * across devices, without storing the colour in the database.
 */
export function folderColorForSprint(sprint: { id: string }): FolderColor {
  // FNV-1a, not a `hash*31 + c` roll: with a 5-entry palette, 31 ≡ 1
  // (mod 5), so every power of 31 collapses to 1 and the polynomial
  // hash degenerates into "sum of character codes" — order stops
  // mattering and same-length, same-alphabet ids (like our UUIDs)
  // pile into a couple of buckets instead of spreading across five.
  let hash = 0x811c9dc5;
  for (let i = 0; i < sprint.id.length; i++) {
    hash ^= sprint.id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return FOLDER_COLORS[(hash >>> 0) % FOLDER_COLORS.length];
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
