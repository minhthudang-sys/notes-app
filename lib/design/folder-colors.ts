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
 * Resolves a stable folder colour from any entity with a stable id.
 * Deterministic: the same id always yields the same colour, across
 * reloads and across devices, without storing the colour in the
 * database. Shared by folderColorForSprint/folderColorForCollection.
 */
function folderColorForId(entity: { id: string }): FolderColor {
  // FNV-1a, not a `hash*31 + c` roll: with a 5-entry palette, 31 ≡ 1
  // (mod 5), so every power of 31 collapses to 1 and the polynomial
  // hash degenerates into "sum of character codes" — order stops
  // mattering and same-length, same-alphabet ids (like our UUIDs)
  // pile into a couple of buckets instead of spreading across five.
  let hash = 0x811c9dc5;
  for (let i = 0; i < entity.id.length; i++) {
    hash ^= entity.id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return FOLDER_COLORS[(hash >>> 0) % FOLDER_COLORS.length];
}

/** So a newly created sprint picks up a colour automatically. */
export function folderColorForSprint(sprint: { id: string }): FolderColor {
  return folderColorForId(sprint);
}

/** So a newly created collection picks up a colour automatically. */
export function folderColorForCollection(collection: {
  id: string;
}): FolderColor {
  return folderColorForId(collection);
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

/**
 * The tag palette. Deliberately the *same* fixed hues as
 * FOLDER_COLORS, not a separate one-off set — a tag colour and a
 * sprint folder colour are drawn from one restrained archive
 * palette, so they read as the same visual language. They stay
 * distinguishable in context, not by hue: a folder colour-blocks a
 * whole card, while a tag colour only ever shows as a small dot or
 * pill (see `TagBadge`), never a full surface.
 */
export const TAG_COLORS = FOLDER_COLORS;

export type TagColor = FolderColor;

export const DEFAULT_TAG_COLOR: TagColor = "blue";

/**
 * Inline style that points `--tag-current` at one palette entry —
 * same convention as `folderColorVars`, kept as its own CSS variable
 * (rather than reusing `--folder-current`) so a tag badge nested
 * inside a folder-coloured card doesn't clobber the card's colour.
 */
export function tagColorVars(color: TagColor): CSSProperties {
  return { "--tag-current": `var(--folder-${color})` } as CSSProperties;
}
