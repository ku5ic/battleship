import type {
  BoardState,
  CellStatus,
  CoordinateKey,
  PlayerId,
  Ship,
  ShotResult,
  VsComputerBoards,
} from "@/battleship/types";
import { fromKey, toKey } from "@/battleship/utils/coordinates";
import { SHIP_DISPLAY_NAMES } from "@/battleship/constants";

// Cell symbols

export type CellSymbol = "~" | "■" | "X" | "○";

/**
 * Resolves the display symbol for a single cell.
 *
 * Priority: shot outcome first (hit/miss), then ship presence (gated by
 * hideShips), then water.
 */
export function cellSymbol(
  key: CoordinateKey,
  shots: ReadonlyMap<CoordinateKey, CellStatus>,
  shipCoordinates: ReadonlySet<CoordinateKey>,
  hideShips: boolean,
): CellSymbol {
  const status = shots.get(key);
  if (status === "hit") return "X";
  if (status === "miss") return "○";

  if (!hideShips && shipCoordinates.has(key)) return "■";
  return "~";
}

// Board rendering

function buildShipCoordinateSet(
  ships: readonly Ship[],
): ReadonlySet<CoordinateKey> {
  const set = new Set<CoordinateKey>();
  for (const ship of ships) {
    for (const key of ship.coordinates) {
      set.add(key);
    }
  }
  return set;
}

/**
 * Renders a single board as a multi-line string with column headers and
 * 1-indexed row numbers.
 *
 * @param hideShips When true, unfired ship cells render as water. Use for
 *                  the opponent's board in vs-computer mode.
 */
export function renderBoard(
  board: BoardState,
  columnLabels: readonly string[],
  boardSize: number,
  hideShips = false,
): string {
  const shipCoords = buildShipCoordinateSet(board.ships);
  const gutterWidth = String(boardSize).length + 1;

  // Header row
  const header =
    " ".repeat(gutterWidth) +
    columnLabels
      .slice(0, boardSize)
      .map((l) => `  ${l} `)
      .join("");

  const rows: string[] = [header];

  for (let row = 0; row < boardSize; row++) {
    const rowLabel = String(row + 1).padStart(gutterWidth);
    const cells: string[] = [];
    for (let col = 0; col < boardSize; col++) {
      const key = toKey(col, row);
      const sym = cellSymbol(key, board.shots, shipCoords, hideShips);
      cells.push(`  ${sym} `);
    }
    rows.push(rowLabel + cells.join(""));
  }

  return rows.join("\n");
}

// Symbol legend

/**
 * Returns a compact legend explaining board symbols.
 */
export function renderLegend(): string {
  return ["~  Water", "■  Ship (your fleet only)", "X  Hit", "○  Miss"].join(
    "\n",
  );
}

// Vs-computer two-board rendering

/**
 * Renders both boards stacked vertically with section headers.
 * Player board shows ships; computer board hides them.
 */
export function renderVsComputerBoards(
  boards: VsComputerBoards,
  columnLabels: readonly string[],
  boardSize: number,
): string {
  const playerBoard = renderBoard(
    boards.player,
    columnLabels,
    boardSize,
    false,
  );
  const computerBoard = renderBoard(
    boards.computer,
    columnLabels,
    boardSize,
    true,
  );

  return [
    "--- YOUR FLEET ---",
    playerBoard,
    "",
    renderLegend(),
    "",
    "--- ENEMY FLEET ---",
    computerBoard,
  ].join("\n");
}

// Shot result formatting

/**
 * Formats a shot result as a human-readable string.
 * Returns "" for null input.
 */
export function renderShotResult(
  result: ShotResult | null,
  columnLabels: readonly string[],
): string {
  if (result === null) return "";

  const { col, row } = fromKey(result.coordinate);
  const label = `${columnLabels[col]}${String(row + 1)}`;

  switch (result.outcome) {
    case "hit":
      return `${label}: Hit!`;
    case "miss":
      return `${label}: Miss.`;
    case "sunk": {
      const shipName = result.sunkShipId
        ? SHIP_DISPLAY_NAMES[result.sunkShipId]
        : "Unknown";
      return `${label}: Sunk ${shipName}!`;
    }
    case "already-fired":
      return `${label}: Already fired.`;
  }
}

// Game-over formatting

/**
 * Returns a game-over message for single-player mode.
 * The caller only invokes this when the game is already over.
 */
export function renderGameOver(shotCount: number): string {
  return `Game over! All ships sunk in ${String(shotCount)} shots.`;
}

/**
 * Returns a game-over message for vs-computer mode.
 * Returns "" when no winner yet.
 */
export function renderVsComputerGameOver(winner: PlayerId | null): string {
  if (winner === null) return "";
  return winner === "player" ? "You win!" : "Computer wins!";
}
