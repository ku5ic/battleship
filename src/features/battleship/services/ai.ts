import { allBoardKeys } from "@/features/battleship/utils/coordinates";
import type { CellStatus, CoordinateKey } from "@/features/battleship/types";

/**
 * Returns a random coordinate that has not yet been fired at.
 * Returns null if every cell has been fired at (game should be over by then).
 */
export function chooseRandomUnfiredCoordinate(
  shotsReceived: ReadonlyMap<CoordinateKey, CellStatus>,
): CoordinateKey | null {
  const unfired = allBoardKeys().filter((key) => !shotsReceived.has(key));
  if (unfired.length === 0) return null;
  return unfired[Math.floor(Math.random() * unfired.length)] ?? null;
}
