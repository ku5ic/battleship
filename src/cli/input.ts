import type { CoordinateKey } from "@/features/battleship/types";
import { toKey } from "@/features/battleship/utils/coordinates";

/** Minimal subset of readline.Interface needed by promptCoordinate. */
export interface LineReader {
  question: (query: string, callback: (answer: string) => void) => void;
}

// ---------------------------------------------------------------------------
// Coordinate parser
// ---------------------------------------------------------------------------

const COORDINATE_RE = /^([A-Z])(\d+)$/;

/**
 * Parses a human-entered coordinate string (e.g. "A1", "j10") into a
 * canonical CoordinateKey. Returns null for any invalid input.
 *
 * The column letter is matched against `columnLabels`; the row number is
 * 1-indexed in the input and converted to 0-indexed internally.
 */
export function parseCoordinateInput(
  input: string,
  columnLabels: readonly string[],
  boardSize: number,
): CoordinateKey | null {
  const match = COORDINATE_RE.exec(input.trim().toUpperCase());
  if (!match) return null;

  const letter = match[1];
  const rowStr = match[2];

  const col = columnLabels.indexOf(letter);
  if (col === -1) return null;

  const row1 = Number(rowStr);
  const row = row1 - 1;
  if (row < 0 || row >= boardSize) return null;

  return toKey(col, row);
}

// ---------------------------------------------------------------------------
// Readline prompt loop
// ---------------------------------------------------------------------------

/**
 * Prompts the user for a valid coordinate, retrying on bad input.
 * Resolves once the user enters a parseable coordinate.
 */
export function promptCoordinate(
  rl: LineReader,
  columnLabels: readonly string[],
  boardSize: number,
): Promise<CoordinateKey> {
  return new Promise((resolve) => {
    const ask = (): void => {
      rl.question("Enter target (e.g. A1): ", (answer: string) => {
        const key = parseCoordinateInput(answer, columnLabels, boardSize);
        if (key !== null) {
          resolve(key);
          return;
        }
        console.log("Invalid coordinate. Try again.");
        ask();
      });
    };
    ask();
  });
}
