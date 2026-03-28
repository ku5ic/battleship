import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type TextVariant = "title" | "label";
type TextElement = "h1" | "h2" | "h3" | "p" | "span";

interface TextProps {
  as?: TextElement;
  variant: TextVariant;
  className?: string;
  children: ReactNode;
}

const variantClasses: Record<TextVariant, string> = {
  title: "text-xl font-semibold tracking-wide text-slate-100",
  label: "text-xs font-semibold uppercase tracking-widest text-slate-400",
};

/** Typed text variant for consistently styled headings and labels. */
export function Text({
  as: Tag = "span",
  variant,
  className,
  children,
}: TextProps) {
  return (
    <Tag className={cn(variantClasses[variant], className)}>{children}</Tag>
  );
}
