import type { Metadata } from "next";
import { Archivo_Narrow, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { Suspense } from "react";
import { ArchiveHeader } from "@/components/archive-header";
import { ArchiveAuthStatus } from "@/components/archive-auth-status";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Study Archive",
  description: "A personal archive of course sprints, chapters and notes",
};

/*
 * Type tokens. These feed --font-display / --font-body / --font-mono,
 * which tailwind.config.ts maps to font-display / font-body / font-mono.
 * Swap a family here to restyle the whole archive's typography.
 */
const display = Archivo_Narrow({
  variable: "--font-display",
  display: "swap",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const body = Source_Serif_4({
  variable: "--font-body",
  display: "swap",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /*
     * One intentional look — dark chrome, warm paper. next-themes was
     * removed rather than left as a toggle that would invert the paper
     * surfaces and break the metaphor.
     */
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} min-h-screen bg-archive font-body text-archive-bright antialiased`}
      >
        <ArchiveHeader
          authSlot={
            <Suspense>
              <ArchiveAuthStatus />
            </Suspense>
          }
        />
        {children}
      </body>
    </html>
  );
}
