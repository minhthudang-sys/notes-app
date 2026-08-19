"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * Flips a `.light` class on <html>, which app/globals.css uses to
 * override the archive chrome tokens (paper stays paper either way).
 * No persistence by design — resets to system preference each load,
 * so this never needs `cookies()` in the root layout.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Seed once from system preference on mount. No live-update listener —
  // this reads the OS setting once, it doesn't track it continuously.
  useEffect(() => {
    if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      setTheme("light");
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
      aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
      className="archive-motion text-archive-dim hover:text-archive-bright"
    >
      {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}
