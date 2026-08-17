"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const AREAS = [
  { href: "/tracker", label: "Archive", hint: "Sprints & chapters" },
  { href: "/notes", label: "Index", hint: "All notes" },
];

/**
 * The archive's chrome. Keeps the two functional areas — the sprint
 * archive and the notes index — legible as one application.
 */
export function ArchiveHeader() {
  const pathname = usePathname();

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
            const active = pathname.startsWith(area.href);
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
