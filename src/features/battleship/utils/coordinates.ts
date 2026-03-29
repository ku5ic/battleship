import { BOARD_SIZE } from "@/features/battleship/constants";
import type {
  Coordinate,
  CoordinateKey,
  RawCoordinate,
} from "@/features/battleship/types";

/**
 * Converts a [col, row] tuple from the raw layout data into the canonical
 * string key used throughout the app. This is the single point where raw
 * input is normalized — nothing outside this module should produce keys
 * by hand.
 */
export function toKey(col: number, row: number): CoordinateKey {
  return `${String(col)},${String(row)}` as CoordinateKey;
}

/** Parses a CoordinateKey back into a structured Coordinate. */
export function fromKey(key: CoordinateKey): Coordinate {
  const [col, row] = key.split(",").map(Number);
  return { col, row };
}

/** Converts a raw [col, row] tuple from the layout JSON. */
export function rawToKey([col, row]: RawCoordinate): CoordinateKey {
  return toKey(col, row);
}

/** Returns true if the coordinate falls within the valid board bounds. */
export function isInBounds(
  col: number,
  row: number,
  boardSize: number = BOARD_SIZE,
): boolean {
  return col >= 0 && col < boardSize && row >= 0 && row < boardSize;
}

/**
 * Derives the orientation of a ship from its coordinate list.
 * Ships with all the same col value are vertical; otherwise horizontal.
 * Requires at least two coordinates to determine orientation reliably;
 * single-cell ships (size 1) default to horizontal.
 */
export function deriveOrientation(
  keys: readonly CoordinateKey[],
): "horizontal" | "vertical" {
  if (keys.length < 2) return "horizontal";
  const coords = keys.map(fromKey);
  return coords[0].col === coords[1].col ? "vertical" : "horizontal";
}

/**
 * Generates every CoordinateKey on the board in row-major order.
 * Useful for rendering the full grid without coupling board logic
 * to React render loops.
 */
export function allBoardKeys(boardSize: number = BOARD_SIZE): CoordinateKey[] {
  const keys: CoordinateKey[] = [];
  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      keys.push(toKey(col, row));
    }
  }
  return keys;
}
