import * as React from "react";

import { cn } from "@/lib/utils";

export type SkeletonProps = {
  surface?: "dark" | "paper";
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

/**
 * A pulsing placeholder block for content that's still loading. Size it
 * with `className` (e.g. `h-5 w-2/3`) to draw title bars, text lines,
 * tag pills — whatever shape the real content will take.
 */
export function Skeleton({
  surface = "dark",
  className,
  ...rest
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse",
        surface === "paper" ? "bg-paper-edge" : "bg-archive-rule",
        className,
      )}
      {...rest}
    />
  );
}
