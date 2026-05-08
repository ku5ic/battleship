import { VisuallyHidden } from "@nuka-ui/core";
import {
  SHIP_DISPLAY_NAMES,
  SHOT_OUTCOME_LABELS,
} from "@/battleship/constants";
import type { ShotResult } from "@/battleship/types";

type Actor = "player" | "computer";

interface ShotResultAnnouncerProps {
  result: ShotResult | null;
  /** Monotonic counter that forces a DOM remount so consecutive identical
   *  outcomes (e.g. two misses) are each re-announced by the live region. */
  announceKey: number;
  /** Who fired the shot. Defaults to "player". Controls the sunk message
   *  phrasing so screen readers attribute the action to the correct side. */
  actor?: Actor;
}

function buildAnnouncement(result: ShotResult | null, actor: Actor): string {
  if (!result) return "";

  if (result.outcome === "sunk") {
    const shipName = result.sunkShipId
      ? SHIP_DISPLAY_NAMES[result.sunkShipId]
      : "Ship";
    return actor === "computer"
      ? `Computer sunk your ${shipName}!`
      : `Hit! You sunk the ${shipName}!`;
  }

  return SHOT_OUTCOME_LABELS[result.outcome];
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
  actor = "player",
}: ShotResultAnnouncerProps) {
  return (
    <VisuallyHidden
      as="div"
      key={announceKey}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {buildAnnouncement(result, actor)}
    </VisuallyHidden>
  );
}
