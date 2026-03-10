import {
  rawToKey,
  deriveOrientation,
  isInBounds,
  fromKey,
} from "@/features/battleship/utils/coordinates";
import type {
  RawGameConfig,
  Ship,
  CoordinateKey,
} from "@/features/battleship/types";

/**
 * Parses and validates the raw layout config into typed Ship records.
 *
 * Validates:
 * - All positions are within board bounds
 * - Position count matches declared ship size
 * - No two ships share a coordinate (overlap)
 * - Each ship's positions form a straight, contiguous line
 *
 * Throws on any violation — runs once at startup so failures surface immediately.
 */
export function parseLayout(config: RawGameConfig): Ship[] {
  const occupied = new Set<CoordinateKey>();
  const ships: Ship[] = [];

  for (const entry of config.layout) {
    if (entry.positions.length === 0) {
      throw new Error(`Ship "${entry.ship}" has no positions.`);
    }

    const coordinates = entry.positions.map((pos) => {
      const [col, row] = pos;
      if (!isInBounds(col, row)) {
        throw new Error(
          `Ship "${entry.ship}" has out-of-bounds position [${String(col)}, ${String(row)}].`,
        );
      }
      return rawToKey(pos);
    });

    const shipTypeConfig = config.shipTypes[entry.ship];

    if (coordinates.length !== shipTypeConfig.size) {
      throw new Error(
        `Ship "${entry.ship}" has ${String(coordinates.length)} positions but expected ${String(shipTypeConfig.size)}.`,
      );
    }

    for (const key of coordinates) {
      if (occupied.has(key)) {
        throw new Error(
          `Ship "${entry.ship}" overlaps another ship at position ${key}.`,
        );
      }
    }

    assertAligned(entry.ship, coordinates);

    for (const key of coordinates) {
      occupied.add(key);
    }

    ships.push({
      id: entry.ship,
      size: shipTypeConfig.size,
      coordinates,
      orientation: deriveOrientation(coordinates),
    } satisfies Ship);
  }

  return ships;
}

/**
 * Asserts that a ship's coordinates form a straight horizontal or vertical
 * line with no gaps. This is a domain invariant — diagonal or discontinuous
 * placement is illegal regardless of how the data is structured.
 */
function assertAligned(shipId: string, coordinates: CoordinateKey[]): void {
  const coords = coordinates.map(fromKey);
  const cols = coords.map((c) => c.col);
  const rows = coords.map((c) => c.row);

  const uniformCol = cols.every((c) => c === cols[0]);
  const uniformRow = rows.every((r) => r === rows[0]);

  if (!uniformCol && !uniformRow) {
    throw new Error(
      `Ship "${shipId}" is not aligned — positions must be horizontal or vertical.`,
    );
  }

  const axis = uniformCol ? rows : cols;
  const sorted = [...axis].sort((a, b) => a - b);

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      throw new Error(
        `Ship "${shipId}" has a gap between positions — all cells must be contiguous.`,
      );
    }
  }
}
