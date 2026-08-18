"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ArchiveSignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    // scope: "local" signs out only this session — supabase.auth.signOut()'s
    // default ("global") would sign the user out of every device.
    await supabase.auth.signOut({ scope: "local" });
    router.push("/login");
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="archive-motion font-mono text-[11px] uppercase tracking-label text-archive-dim underline-offset-4 hover:text-archive-bright hover:underline"
    >
      Sign out
    </button>
  );
}
