import {
  SHIP_DISPLAY_NAMES,
  SHOT_OUTCOME_LABELS,
} from "@/battleship/constants";
import type { ShotResult } from "@/battleship/types";

interface ShotResultAnnouncerProps {
  result: ShotResult | null;
  /** Monotonic counter that forces a DOM remount so consecutive identical
   *  outcomes (e.g. two misses) are each re-announced by the live region. */
  announceKey: number;
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
 *
 * The parent passes announceKey (typically shots.size) which increments on
 * every shot. Using it as the React key forces a fresh DOM mount, so the
 * screen reader re-announces even when consecutive texts are identical.
 */
export function ShotResultAnnouncer({
  result,
  announceKey,
}: ShotResultAnnouncerProps) {
  return (
    <div
      key={announceKey}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {buildAnnouncement(result)}
    </div>
  );
}
