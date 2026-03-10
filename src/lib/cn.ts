import { clsx, type ClassValue } from "clsx";

/**
 * Utility for composing conditional Tailwind class strings.
 * Thin wrapper around clsx — keeps component JSX readable without inline ternaries.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(...inputs);
}
