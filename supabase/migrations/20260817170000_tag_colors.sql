-- Tag colour: a token key constrained to the shared archive palette
-- (TAG_COLORS in lib/design/folder-colors.ts), not a raw hex value or
-- freeform text — colour stays fixed to the palette, no custom picker.
-- `not null default 'blue'` backfills every existing tag in the same
-- statement, so nothing is left null.
alter table tags
  add column color text not null default 'blue'
    check (color in ('blue', 'red', 'olive', 'mustard', 'purple', 'teal'));
