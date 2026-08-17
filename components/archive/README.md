# Archive component library

The visual vocabulary of the study archive: a dark workspace holding
colour-coded folders, with warm paper documents filed inside them.

Import from the barrel:

```tsx
import { Folder, FolderTab, PaperPanel, MetadataLabel, StatusStamp } from "@/components/archive";
```

## Where the design lives

| Concern | File |
|---|---|
| Colour, type, radius tokens | `app/globals.css` (`:root`) |
| Exposing tokens to Tailwind | `tailwind.config.ts` |
| Folder palette + sprint → colour, tag palette | `lib/design/folder-colors.ts` |
| Fonts | `app/layout.tsx` (`next/font`) |

Restyle the app by editing `app/globals.css`. Components hardcode no
colours, fonts or radii.

### The `--folder-current` convention

`Folder` calls `folderColorVars(color)` and publishes
`--folder-current` to its subtree. Any descendant then uses the static
classes `bg-folder-current`, `border-folder-current`,
`text-folder-current` (opacity modifiers work: `bg-folder-current/20`)
and automatically renders in that sprint's colour. This keeps class
names static — required for Tailwind — while the colour stays fully
data-driven.

Sprint colours are derived, not stored: `folderColorForSprint(sprint)`
hashes `sprint.id` into the palette, so a new sprint gets a stable
colour with no schema change and no component edit.

### The `--tag-current` convention

Same idea, a separate variable: `TagBadge` and `TagColorPicker` call
`tagColorVars(color)`, which publishes `--tag-current` (not
`--folder-current`) so a tag badge nested inside a folder-coloured
card never clobbers the card's colour. `TAG_COLORS` is the *same*
fixed hues as `FOLDER_COLORS` — not a second one-off palette — kept
distinguishable from folder colours by how it's used: a folder
colour-blocks a whole card, a tag colour only ever shows as the small
dot in `TagBadge`/`TagColorPicker`. Unlike a sprint's folder colour, a
tag's colour is stored (`tags.color` in Supabase), since it's user-set
at creation and changeable afterward, not derived.

## Components

### `Folder`

A sprint container drawn as a physical folder. Owns its
open/closed/behind presentation; the parent owns stack layout.

| Prop | Type | Notes |
|---|---|---|
| `color` | `FolderColor` | From `folderColorForSprint()` |
| `state` | `"open" \| "closed" \| "behind"` | |
| `label` | `string` | Accessible name for the region |
| `tab` | `ReactNode` | Normally a `<FolderTab>` |
| `meta` | `ReactNode?` | Shown beside the tab in every state |
| `children` | `ReactNode?` | Rendered only when open |
| `contentId` | `string?` | Pair with the tab's `aria-controls` |

### `FolderTab`

A labelled tab, for both sprint folders and chapter documents. Renders
a real `<button>`, or an `<a>` when `href` is passed.

| Prop | Type | Notes |
|---|---|---|
| `label` | `ReactNode` | |
| `meta` | `ReactNode?` | Trailing metadata, e.g. `5/8` |
| `leading` | `ReactNode?` | Leading marker/glyph |
| `color` | `FolderColor?` | Omit to inherit the enclosing folder |
| `active` | `boolean` | |
| `size` | `"sprint" \| "chapter"` | |
| `onClick` / `href` | | `href` switches to a link |
| `controls` / `expanded` | | ARIA wiring |

### `PaperPanel`

The warm off-white surface. Sets ink colours for its subtree.

| Prop | Type | Notes |
|---|---|---|
| `edge` | `"none" \| "left" \| "top"` | Thick edge in `--folder-current` |
| `tone` | `"paper" \| "shade"` | `shade` for secondary papers |
| `tooth` | `boolean` | Near-invisible texture, off by default |
| `as` | `ElementType?` | e.g. `"article"`, `"li"` |

### `MetadataLabel`

Monospaced label + value pair — dates, deadlines, counts. Renders an
em dash when `value` is missing.

| Prop | Type | Notes |
|---|---|---|
| `label` | `string` | |
| `value` | `ReactNode?` | |
| `surface` | `"dark" \| "paper"` | Keeps contrast correct |
| `layout` | `"stack" \| "inline"` | |

### `StatusStamp`

A filed/completed/in-progress marker.

| Prop | Type | Notes |
|---|---|---|
| `status` | `string` | The raw stored value |
| `statuses` | `StatusSet` | **The set is a prop** |
| `surface` | `"dark" \| "paper"` | |
| `size` | `"sm" \| "md"` | |

**The status set is passed in, never hardcoded.** A `StatusSet` maps a
stored value to `{ label, tone, glyph? }`, where `tone` is one of
`filed | active | pending | attention` and describes how settled a
status is — not what it means. An unknown value degrades to a neutral
stamp showing the raw value.

Shipped sets: `PART_STATUSES` (`open`/`completed`) and
`TEACH_BACK_STATUSES` (`pending`/`done`).

### `TagBadge`

A tag's name with a small colour dot, never a colour-blocked surface.

| Prop | Type | Notes |
|---|---|---|
| `name` | `string` | Rendered as `#name` |
| `color` | `TagColor` | From `tags.color` |
| `surface` | `"dark" \| "paper"` | Keeps contrast correct |

### `TagColorPicker`

A swatch picker over the fixed `TAG_COLORS` palette — no freeform
colour input. Used both when creating a tag and when changing an
existing one's colour afterward.

| Prop | Type | Notes |
|---|---|---|
| `value` | `TagColor` | |
| `onChange` | `(color: TagColor) => void` | |

> Parts have exactly two statuses — `open` and `completed` — and that
> does not change. A richer review lifecycle for project/capstone work
> is a **separate record** with its own status set, not a third part
> status. Define it alongside the feature and pass it in:
>
> ```tsx
> const REVIEW_STATUSES = {
>   submitted:   { label: "Submitted",   tone: "active",    glyph: "→" },
>   in_review:   { label: "In review",   tone: "active",    glyph: "◐" },
>   corrections: { label: "Corrections", tone: "attention", glyph: "!" },
>   passed:      { label: "Passed",      tone: "filed",     glyph: "✓" },
> } as const satisfies StatusSet;
>
> <StatusStamp status={review.status} statuses={REVIEW_STATUSES} />
> ```
>
> No change to `StatusStamp` is required.

## Accessibility + motion

- Tabs are buttons/links; no hover-only interactions.
- Status is always conveyed by text (and a glyph), never colour alone.
- Focus is visible on both dark and paper surfaces (`:focus-visible`
  in `globals.css`).
- Transitions use `.archive-motion`; `prefers-reduced-motion: reduce`
  disables them globally.
