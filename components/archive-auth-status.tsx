import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { ArchiveSignOutButton } from "@/components/archive-sign-out-button";

/**
 * The header's account status — email + sign-out when signed in, Sign
 * in/Sign up links otherwise. A Server Component (reads the session via
 * getClaims(), the current Supabase-recommended way to protect
 * server-rendered content — see lib/supabase/auth.ts), rendered into
 * ArchiveHeader's authSlot prop from app/layout.tsx.
 */
export async function ArchiveAuthStatus() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="archive-motion font-mono text-[11px] uppercase tracking-label text-archive-dim underline-offset-4 hover:text-archive-bright hover:underline"
        >
          Sign in
        </Link>
        <Link
          href="/auth/sign-up"
          className="archive-motion font-mono text-[11px] uppercase tracking-label text-archive-dim underline-offset-4 hover:text-archive-bright hover:underline"
        >
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span
        title={user.email}
        className="hidden max-w-[12rem] truncate font-mono text-[11px] uppercase tracking-label text-archive-dim sm:inline"
      >
        {user.email}
      </span>
      <ArchiveSignOutButton />
    </div>
  );
}
