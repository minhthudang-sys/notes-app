import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/*
 * Token wiring. The actual values live in app/globals.css (`:root`);
 * this file only exposes them to Tailwind utilities. To restyle the
 * archive, edit globals.css — not this file and not the components.
 */
export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* The dark archive workspace */
        archive: {
          DEFAULT: "hsl(var(--archive) / <alpha-value>)",
          deep: "hsl(var(--archive-deep) / <alpha-value>)",
          raised: "hsl(var(--archive-raised) / <alpha-value>)",
          rule: "hsl(var(--archive-rule) / <alpha-value>)",
          dim: "hsl(var(--archive-dim) / <alpha-value>)",
          bright: "hsl(var(--archive-bright) / <alpha-value>)",
        },
        /* Warm paper surfaces + the ink printed on them */
        paper: {
          DEFAULT: "hsl(var(--paper) / <alpha-value>)",
          shade: "hsl(var(--paper-shade) / <alpha-value>)",
          edge: "hsl(var(--paper-edge) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "hsl(var(--ink) / <alpha-value>)",
          soft: "hsl(var(--ink-soft) / <alpha-value>)",
        },
        /*
         * `folder-current` resolves whichever folder colour the
         * nearest ancestor set via folderColorVars(). That keeps
         * class names static while the colour stays data-driven.
         */
        folder: {
          current: "hsl(var(--folder-current) / <alpha-value>)",
          blue: "hsl(var(--folder-blue) / <alpha-value>)",
          red: "hsl(var(--folder-red) / <alpha-value>)",
          olive: "hsl(var(--folder-olive) / <alpha-value>)",
          mustard: "hsl(var(--folder-mustard) / <alpha-value>)",
          purple: "hsl(var(--folder-purple) / <alpha-value>)",
        },

        /* shadcn/ui contract — see globals.css */
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        /* Condensed sans for large editorial headings */
        display: ["var(--font-display)", "ui-sans-serif", "sans-serif"],
        /* Readable serif for body + case-file prose */
        body: ["var(--font-body)", "ui-serif", "Georgia", "serif"],
        /* Monospaced for dates, deadlines, counts, labels */
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius))",
        sm: "calc(var(--radius))",
      },
      letterSpacing: {
        label: "0.12em",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
