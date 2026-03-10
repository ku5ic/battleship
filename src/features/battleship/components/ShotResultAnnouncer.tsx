import { SHIP_DISPLAY_NAMES, SHOT_OUTCOME_LABELS } from "../constants";
import type { ShotResult } from "../types";

interface ShotResultAnnouncerProps {
  result: ShotResult | null;
}

function buildAnnouncement(result: ShotResult | null): string {
  if (!result) return "";

  if (result.outcome === "sunk") {
    const shipName = result.sunkShipId
      ? SHIP_DISPLAY_NAMES[result.sunkShipId]
      : "Ship";
    return `Hit! You sunk the ${shipName}!`;
  }

  return SHOT_OUTCOME_LABELS[result.outcome] ?? "";
}

/**
 * Visually hidden aria-live region that announces each shot result to
 * screen readers. Kept separate from GameStatus so layout changes never
 * affect announcement timing.
 */
export function ShotResultAnnouncer({ result }: ShotResultAnnouncerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {buildAnnouncement(result)}
    </div>
  );
}
