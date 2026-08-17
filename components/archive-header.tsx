"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const AREAS = [
  { href: "/tracker", label: "Archive", hint: "Sprints & chapters" },
  { href: "/tracker/dashboard", label: "Dashboard", hint: "Progress & timeline" },
  { href: "/notes", label: "Index", hint: "All notes" },
];

/**
 * The archive's chrome. Keeps the functional areas — the sprint
 * archive, the dashboard and the notes index — legible as one
 * application.
 */
export function ArchiveHeader() {
  const pathname = usePathname();

  // Longest-prefix match, so nested routes (e.g. /tracker/dashboard)
  // highlight only their own tab, not "Archive" too.
  const activeHref = [...AREAS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((area) => pathname === area.href || pathname.startsWith(area.href + "/"))
    ?.href;

  return (
    <header className="border-b border-archive-rule bg-archive-deep">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="font-display text-sm uppercase tracking-label text-archive-bright"
        >
          Study Archive
        </Link>

        <nav aria-label="Archive areas" className="flex items-center gap-1">
          {AREAS.map((area) => {
            const active = area.href === activeHref;
            return (
              <Link
                key={area.href}
                href={area.href}
                aria-current={active ? "page" : undefined}
                title={area.hint}
                className={cn(
                  "archive-motion border px-3 py-1 font-mono text-[11px] uppercase tracking-label",
                  active
                    ? "border-folder-mustard bg-folder-mustard/20 text-archive-bright"
                    : "border-transparent text-archive-dim hover:border-archive-rule hover:text-archive-bright",
                )}
              >
                {area.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
