import type {
  CoordinateKey,
  Orientation,
  RawGameConfig,
  RawShipTypeEntry,
  Ship,
  ShipType,
} from "@/features/battleship/types";
import { toKey } from "@/features/battleship/utils/coordinates";

const MAX_ATTEMPTS = 100;

/**
 * Generates a valid random fleet layout for the given config and board size.
 * Places ships largest-first. Restarts from scratch on exhaustion.
 * Throws after MAX_ATTEMPTS full restarts — this signals a programming error
 * (e.g. board too small for the fleet), not a runtime condition.
 */
export function generateRandomLayout(
  config: RawGameConfig,
  boardSize: number,
): Ship[] {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const result = tryPlaceAll(config, boardSize);
    if (result !== null) return result;
  }
  throw new Error(
    `generateRandomLayout: failed to place all ships after ${String(MAX_ATTEMPTS)} attempts.`,
  );
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function tryPlaceAll(config: RawGameConfig, boardSize: number): Ship[] | null {
  const entries = (
    Object.entries(config.shipTypes) as [ShipType, RawShipTypeEntry][]
  ).sort(([, a], [, b]) => b.size - a.size);

  const occupied = new Set<CoordinateKey>();
  const ships: Ship[] = [];

  for (const [id, { size, count }] of entries) {
    for (let i = 0; i < count; i++) {
      const ship = placeShip(id, size, boardSize, occupied);
      if (ship === null) return null;
      for (const key of ship.coordinates) {
        occupied.add(key);
      }
      ships.push(ship);
    }
  }

  return ships;
}

function placeShip(
  id: ShipType,
  size: number,
  boardSize: number,
  occupied: ReadonlySet<CoordinateKey>,
): Ship | null {
  const candidates: { col: number; row: number; orientation: Orientation }[] =
    [];

  const orientations: Orientation[] = ["horizontal", "vertical"];

  for (const orientation of orientations) {
    const maxCol = orientation === "horizontal" ? boardSize - size : boardSize;
    const maxRow = orientation === "vertical" ? boardSize - size : boardSize;

    for (let row = 0; row < maxRow; row++) {
      for (let col = 0; col < maxCol; col++) {
        const coords = buildCandidateCoordinates(col, row, size, orientation);
        if (!hasOverlap(coords, occupied)) {
          candidates.push({ col, row, orientation });
        }
      }
    }
  }

  if (candidates.length === 0) return null;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const coordinates = buildCandidateCoordinates(
    pick.col,
    pick.row,
    size,
    pick.orientation,
  );

  return { id, size, coordinates, orientation: pick.orientation };
}

function buildCandidateCoordinates(
  col: number,
  row: number,
  size: number,
  orientation: Orientation,
): CoordinateKey[] {
  const coords: CoordinateKey[] = [];
  for (let i = 0; i < size; i++) {
    if (orientation === "horizontal") {
      coords.push(toKey(col + i, row));
    } else {
      coords.push(toKey(col, row + i));
    }
  }
  return coords;
}

function hasOverlap(
  coordinates: readonly CoordinateKey[],
  occupied: ReadonlySet<CoordinateKey>,
): boolean {
  return coordinates.some((key) => occupied.has(key));
}
