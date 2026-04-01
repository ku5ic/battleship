import { describe, expect, it } from "vitest";
import { parseLayout } from "@/battleship/data/layout";
import { RAW_GAME_CONFIG } from "@/battleship/data/config";
import { COLUMN_LABELS } from "@/battleship/constants";
import { selectSunkShipIds } from "@/battleship/services/engine";
import type {
  BoardState,
  CellStatus,
  CoordinateKey,
  Ship,
  ShotResult,
  VsComputerBoards,
} from "@/battleship/types";
import {
  cellSymbol,
  renderBoard,
  renderGameOver,
  renderLegend,
  renderShotResult,
  renderVsComputerBoards,
  renderVsComputerGameOver,
} from "@/cli/renderer";

// ---------------------------------------------------------------------------
// Deterministic fleet from the static config.
//
//   destroyer:  [0,0] [1,0]
//   submarine:  [3,0] [3,1] [3,2]
//   cruiser:    [8,1] [8,2] [8,3]
//   battleship: [5,2] [5,3] [5,4] [5,5]
//   carrier:    [2,9] [3,9] [4,9] [5,9] [6,9]
// ---------------------------------------------------------------------------

const ships: Ship[] = parseLayout(RAW_GAME_CONFIG, 10);
const columnLabels = COLUMN_LABELS;
const boardSize = 10;

function buildShipCoordSet(fleet: readonly Ship[]): ReadonlySet<CoordinateKey> {
  const set = new Set<CoordinateKey>();
  for (const ship of fleet) {
    for (const key of ship.coordinates) {
      set.add(key);
    }
  }
  return set;
}

const shipCoords = buildShipCoordSet(ships);

function makeBoardState(overrides: Partial<BoardState> = {}): BoardState {
  return {
    ships,
    shots: new Map(),
    sunkShipIds: new Set(),
    isGameOver: false,
    lastResult: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// cellSymbol
// ---------------------------------------------------------------------------

describe("cellSymbol", () => {
  it("returns ~ for an untouched cell with no ship", () => {
    expect(cellSymbol("9,9", new Map(), shipCoords, false)).toBe("~");
  });

  it("returns ■ for an untouched cell with a ship (hideShips=false)", () => {
    expect(cellSymbol("0,0", new Map(), shipCoords, false)).toBe("■");
  });

  it("returns ~ for an untouched cell with a ship (hideShips=true)", () => {
    expect(cellSymbol("0,0", new Map(), shipCoords, true)).toBe("~");
  });

  it("returns X for a hit cell", () => {
    const shots = new Map<CoordinateKey, CellStatus>([["0,0", "hit"]]);
    expect(cellSymbol("0,0", shots, shipCoords, false)).toBe("X");
  });

  it("returns X for a hit cell even when hideShips=true", () => {
    const shots = new Map<CoordinateKey, CellStatus>([["0,0", "hit"]]);
    expect(cellSymbol("0,0", shots, shipCoords, true)).toBe("X");
  });

  it("returns ○ for a miss cell", () => {
    const shots = new Map<CoordinateKey, CellStatus>([["9,9", "miss"]]);
    expect(cellSymbol("9,9", shots, shipCoords, false)).toBe("○");
  });
});

// ---------------------------------------------------------------------------
// renderBoard
// ---------------------------------------------------------------------------

describe("renderBoard", () => {
  it("renders an empty board with ships visible", () => {
    const board = makeBoardState();
    const output = renderBoard(board, columnLabels, boardSize);
    const lines = output.split("\n");

    // Header + 10 rows
    expect(lines).toHaveLength(11);

    // Header contains column labels
    expect(lines[0]).toContain("A");
    expect(lines[0]).toContain("J");

    // Row 1 shows ships at [0,0] and [1,0] (destroyer)
    expect(lines[1]).toContain("■");

    // Row numbers are right-aligned
    expect(lines[1]).toMatch(/^\s*1/);
    expect(lines[10]).toMatch(/^\s*10/);
  });

  it("renders an empty board with ships hidden", () => {
    const board = makeBoardState();
    const output = renderBoard(board, columnLabels, boardSize, true);

    // No ship symbols should appear
    expect(output).not.toContain("■");
  });

  it("renders hits and misses", () => {
    const shots = new Map<CoordinateKey, CellStatus>([
      ["0,0", "hit"],
      ["9,9", "miss"],
    ]);
    const board = makeBoardState({ shots });
    const output = renderBoard(board, columnLabels, boardSize);

    expect(output).toContain("X");
    expect(output).toContain("○");
  });

  it("hit is visible even when hideShips=true", () => {
    const shots = new Map<CoordinateKey, CellStatus>([["0,0", "hit"]]);
    const board = makeBoardState({ shots });
    const output = renderBoard(board, columnLabels, boardSize, true);

    expect(output).toContain("X");
    expect(output).not.toContain("■");
  });

  it("renders a deterministic snapshot for a known shot pattern", () => {
    // Fire at destroyer [0,0] hit, [1,0] hit, and [9,9] miss
    const shots = new Map<CoordinateKey, CellStatus>([
      ["0,0", "hit"],
      ["1,0", "hit"],
      ["9,9", "miss"],
    ]);
    const sunkShipIds = selectSunkShipIds(ships, shots);
    const board = makeBoardState({ shots, sunkShipIds });
    const output = renderBoard(board, columnLabels, boardSize);
    const lines = output.split("\n");

    // Row 1 (index 1): col A and B should be X (hits on destroyer)
    const row1 = lines[1];
    // Extract cell symbols from the row — after the row label
    const row1Cells = row1.trimStart().replace(/^\d+/, "").trim();
    expect(row1Cells).toMatch(/^X\s+X/);

    // Row 10 (index 10): col J should be ○ (miss)
    const row10 = lines[10];
    expect(row10).toContain("○");
  });
});

// ---------------------------------------------------------------------------
// renderVsComputerBoards
// ---------------------------------------------------------------------------

describe("renderVsComputerBoards", () => {
  it("renders both boards with section headers", () => {
    const boards: VsComputerBoards = {
      player: makeBoardState(),
      computer: makeBoardState(),
    };
    const output = renderVsComputerBoards(boards, columnLabels, boardSize);

    expect(output).toContain("--- YOUR FLEET ---");
    expect(output).toContain("--- ENEMY FLEET ---");
  });

  it("shows ships on the player board and hides them on the enemy board", () => {
    const boards: VsComputerBoards = {
      player: makeBoardState(),
      computer: makeBoardState(),
    };
    const output = renderVsComputerBoards(boards, columnLabels, boardSize);
    const [playerSection, enemySection] = output.split("--- ENEMY FLEET ---");

    expect(playerSection).toContain("■");
    expect(enemySection).not.toContain("■");
  });

  it("includes the legend in the player section only", () => {
    const boards: VsComputerBoards = {
      player: makeBoardState(),
      computer: makeBoardState(),
    };
    const output = renderVsComputerBoards(boards, columnLabels, boardSize);
    const [playerSection, enemySection] = output.split("--- ENEMY FLEET ---");

    expect(playerSection).toContain("~  Water");
    expect(playerSection).toContain("■  Ship (your fleet only)");
    expect(enemySection).not.toContain("~  Water");
  });
});

// ---------------------------------------------------------------------------
// renderLegend
// ---------------------------------------------------------------------------

describe("renderLegend", () => {
  it("contains all four symbol explanations", () => {
    const legend = renderLegend();

    expect(legend).toContain("~  Water");
    expect(legend).toContain("■  Ship (your fleet only)");
    expect(legend).toContain("X  Hit");
    expect(legend).toContain("○  Miss");
  });

  it("returns exactly four lines", () => {
    const lines = renderLegend().split("\n");
    expect(lines).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// renderShotResult
// ---------------------------------------------------------------------------

describe("renderShotResult", () => {
  it("returns empty string for null", () => {
    expect(renderShotResult(null, columnLabels)).toBe("");
  });

  it("formats a hit", () => {
    const result: ShotResult = { coordinate: "0,0", outcome: "hit" };
    expect(renderShotResult(result, columnLabels)).toBe("A1: Hit!");
  });

  it("formats a miss", () => {
    const result: ShotResult = { coordinate: "9,9", outcome: "miss" };
    expect(renderShotResult(result, columnLabels)).toBe("J10: Miss.");
  });

  it("formats a sunk ship", () => {
    const result: ShotResult = {
      coordinate: "1,0",
      outcome: "sunk",
      sunkShipId: "destroyer",
    };
    expect(renderShotResult(result, columnLabels)).toBe("B1: Sunk Destroyer!");
  });

  it("formats already-fired", () => {
    const result: ShotResult = {
      coordinate: "4,5",
      outcome: "already-fired",
    };
    expect(renderShotResult(result, columnLabels)).toBe("E6: Already fired.");
  });
});

// ---------------------------------------------------------------------------
// renderGameOver
// ---------------------------------------------------------------------------

describe("renderGameOver", () => {
  it("returns a game-over message with the shot count", () => {
    expect(renderGameOver(42)).toBe("Game over! All ships sunk in 42 shots.");
  });

  it("handles a shot count of 17 (minimum possible)", () => {
    expect(renderGameOver(17)).toBe("Game over! All ships sunk in 17 shots.");
  });
});

// ---------------------------------------------------------------------------
// renderVsComputerGameOver
// ---------------------------------------------------------------------------

describe("renderVsComputerGameOver", () => {
  it("returns empty string when no winner", () => {
    expect(renderVsComputerGameOver(null)).toBe("");
  });

  it("returns player win message", () => {
    expect(renderVsComputerGameOver("player")).toBe("You win!");
  });

  it("returns computer win message", () => {
    expect(renderVsComputerGameOver("computer")).toBe("Computer wins!");
  });
});
