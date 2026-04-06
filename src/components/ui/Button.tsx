import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "outline" | "toggle";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant: "outline" for action buttons, "toggle" for mode selectors. */
  variant?: ButtonVariant;
  /** Active state for the "toggle" variant; ignored for other variants. */
  active?: boolean;
  children: ReactNode;
}

/** Styled button with a shared focus ring and font treatment. Forwards ref. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "outline", active, className, children, ...props },
    ref,
  ) {
    return (
      <button
        type="button"
        ref={ref}
        className={cn(
          "text-sm font-medium rounded border",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
          variant === "outline" && [
            "px-4 py-2",
            "border-slate-500 text-slate-300 hover:bg-slate-700",
          ],
          variant === "toggle" && [
            "px-3 py-1.5 transition-colors",
            active
              ? "border-yellow-400 text-yellow-400"
              : "border-slate-500 text-slate-400 hover:border-slate-300 hover:text-slate-300",
          ],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
