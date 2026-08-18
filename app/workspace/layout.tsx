// Every page under /workspace calls requireUser() (lib/supabase/auth.ts),
// which reads cookies() per request and can never produce a static shell.
// `instant = false` opts this whole segment out of Cache Components'
// static-shell validation in one place — see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/instant.md
// ("Disabling static shell validation").
//
// This is config only, not an auth check: per node_modules/next/dist/docs/
// 01-app/02-guides/authentication.md ("Layouts and auth checks"), a layout
// is not a reliable place to *gate* access, so the actual requireUser()
// calls stay in each page, not here.
export const instant = false;

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
