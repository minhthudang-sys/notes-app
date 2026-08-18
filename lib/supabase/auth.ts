import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Verifies the caller has an active Supabase session, server-side, and
 * redirects to /login on failure. Call this at the top of every page
 * under /workspace — see CLAUDE.md's "Auth: Signed-In Pages Must Verify
 * Server-Side" rule.
 *
 * Deliberately called per-page rather than once in a shared layout: per
 * node_modules/next/dist/docs/01-app/02-guides/authentication.md
 * ("Layouts and auth checks"), a layout doesn't re-run on client-side
 * navigation between sibling routes and doesn't block the rest of the
 * route from rendering, so a layout-only check is not a reliable gate.
 */
export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  return data.claims;
}
