import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type StackGap = "sm" | "md" | "lg";
type StackAlign = "start" | "center";

interface StackProps {
  gap?: StackGap;
  align?: StackAlign;
  className?: string;
  children: ReactNode;
}

const gapClasses: Record<StackGap, string> = {
  sm: "gap-2",
  md: "gap-4 sm:gap-6",
  lg: "gap-8",
};

const alignClasses: Record<StackAlign, string> = {
  start: "items-start",
  center: "items-center",
};

/** Vertical flex column with a consistent gap between children. */
export function Stack({
  gap = "md",
  align = "center",
  className,
  children,
}: StackProps) {
  return (
    <div
      className={cn(
        "flex flex-col",
        gapClasses[gap],
        alignClasses[align],
        className,
      )}
    >
      {children}
    </div>
  );
}
