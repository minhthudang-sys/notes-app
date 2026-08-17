import Link from "next/link";

import { PaperPanel } from "@/components/archive";
import { folderColorVars } from "@/lib/design/folder-colors";

const ENTRANCES = [
  {
    href: "/tracker",
    color: "mustard" as const,
    label: "The Archive",
    body: "Sprints as folders, chapters as filed documents. Mark chapters complete, log teach-backs.",
  },
  {
    href: "/notes",
    color: "blue" as const,
    label: "The Index",
    body: "Every note in the archive. Filter by collection, tag, sprint or chapter, or search the full text.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="font-mono text-[11px] uppercase tracking-label text-archive-dim">
        Personal study archive
      </p>
      <h1 className="mt-3 max-w-2xl font-display text-4xl uppercase leading-[1.05] tracking-tight text-archive-bright sm:text-6xl">
        Building with AI Agents
      </h1>
      <p className="mt-4 max-w-xl text-archive-dim">
        A record of what has been studied, what has been understood, and what
        is still open.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {ENTRANCES.map((entrance) => (
          <Link
            key={entrance.href}
            href={entrance.href}
            style={folderColorVars(entrance.color)}
            className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <div className="h-2.5 w-32 rounded-t-[3px] bg-folder-current" />
            <PaperPanel
              edge="left"
              tooth
              className="archive-motion p-5 group-hover:-translate-y-0.5"
            >
              <h2 className="font-display text-xl uppercase tracking-label">
                {entrance.label}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {entrance.body}
              </p>
              <span className="mt-4 inline-block font-mono text-[11px] uppercase tracking-label text-ink">
                Open →
              </span>
            </PaperPanel>
          </Link>
        ))}
      </div>
    </main>
  );
}
