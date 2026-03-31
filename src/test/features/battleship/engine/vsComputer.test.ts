import { describe, expect, it } from "vitest";
import { parseLayout } from "@/features/battleship/data/layout";
import { RAW_GAME_CONFIG } from "@/features/battleship/data/config";
import { buildPositionIndex } from "@/features/battleship/services/engine";
import {
  createVsComputerInitialState,
  createVsComputerReducer,
  selectWinner,
} from "@/features/battleship/engine/vsComputer";
import type { CoordinateKey, Ship } from "@/features/battleship/types";

// ---------------------------------------------------------------------------
// Deterministic fleet from the static config. Both boards use the same
// layout so that coordinate assertions are predictable.
//
//   destroyer:  [0,0] [1,0]
//   submarine:  [3,0] [3,1] [3,2]
//   cruiser:    [8,1] [8,2] [8,3]
//   battleship: [5,2] [5,3] [5,4] [5,5]
//   carrier:    [2,9] [3,9] [4,9] [5,9] [6,9]
// ---------------------------------------------------------------------------

const ships: Ship[] = parseLayout(RAW_GAME_CONFIG, 10);
const positionIndex = buildPositionIndex(ships);

// Both boards share the same position index for test simplicity.
const reducer = createVsComputerReducer(positionIndex, positionIndex);

// ---------------------------------------------------------------------------
// createVsComputerInitialState
// ---------------------------------------------------------------------------

describe("createVsComputerInitialState", () => {
  it("returns empty maps, null results, and player turn", () => {
    const state = createVsComputerInitialState();
    expect(state.playerShots.size).toBe(0);
    expect(state.computerShots.size).toBe(0);
    expect(state.playerLastResult).toBeNull();
    expect(state.computerLastResult).toBeNull();
    expect(state.activeTurn).toBe("player");
  });

  it("returns a new object on each call", () => {
    const a = createVsComputerInitialState();
    const b = createVsComputerInitialState();
    expect(a).not.toBe(b);
    expect(a.playerShots).not.toBe(b.playerShots);
    expect(a.computerShots).not.toBe(b.computerShots);
  });
});

// ---------------------------------------------------------------------------
// createVsComputerReducer — PLAYER_FIRE
// ---------------------------------------------------------------------------

describe("createVsComputerReducer — PLAYER_FIRE", () => {
  it("records a miss and switches turn to computer", () => {
    const state = reducer(createVsComputerInitialState(), {
      type: "PLAYER_FIRE",
      coordinate: "9,9",
    });

    expect(state.playerShots.get("9,9")).toBe("miss");
    expect(state.playerLastResult?.outcome).toBe("miss");
    expect(state.activeTurn).toBe("computer");
  });

  it("records a hit and keeps the player's turn", () => {
    const state = reducer(createVsComputerInitialState(), {
      type: "PLAYER_FIRE",
      coordinate: "0,0", // destroyer
    });

    expect(state.playerShots.get("0,0")).toBe("hit");
    expect(state.playerLastResult?.outcome).toBe("hit");
    expect(state.activeTurn).toBe("player");
  });

  it("surfaces already-fired without adding a duplicate entry", () => {
    let state = createVsComputerInitialState();
    state = reducer(state, { type: "PLAYER_FIRE", coordinate: "0,0" });
    const sizeAfterFirst = state.playerShots.size;

    state = reducer(state, { type: "PLAYER_FIRE", coordinate: "0,0" });

    expect(state.playerLastResult?.outcome).toBe("already-fired");
    expect(state.playerShots.size).toBe(sizeAfterFirst);
  });

  it("is ignored when activeTurn is computer", () => {
    // Miss to cede the turn.
    let state = reducer(createVsComputerInitialState(), {
      type: "PLAYER_FIRE",
      coordinate: "9,9",
    });
    expect(state.activeTurn).toBe("computer");

    const before = state;
    state = reducer(state, { type: "PLAYER_FIRE", coordinate: "9,8" });

    expect(state).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// createVsComputerReducer — COMPUTER_FIRE
// ---------------------------------------------------------------------------

describe("createVsComputerReducer — COMPUTER_FIRE", () => {
  // Helper: put the reducer into computer's turn.
  function computerTurnState() {
    return reducer(createVsComputerInitialState(), {
      type: "PLAYER_FIRE",
      coordinate: "9,9", // miss → turn switches
    });
  }

  it("records a miss and switches turn to player", () => {
    const state = reducer(computerTurnState(), {
      type: "COMPUTER_FIRE",
      coordinate: "9,8", // empty cell
    });

    expect(state.computerShots.get("9,8")).toBe("miss");
    expect(state.computerLastResult?.outcome).toBe("miss");
    expect(state.activeTurn).toBe("player");
  });

  it("records a hit and keeps the computer's turn", () => {
    const state = reducer(computerTurnState(), {
      type: "COMPUTER_FIRE",
      coordinate: "0,0", // destroyer
    });

    expect(state.computerShots.get("0,0")).toBe("hit");
    expect(state.computerLastResult?.outcome).toBe("hit");
    expect(state.activeTurn).toBe("computer");
  });

  it("is ignored when activeTurn is player", () => {
    const before = createVsComputerInitialState();
    const after = reducer(before, {
      type: "COMPUTER_FIRE",
      coordinate: "9,9",
    });

    expect(after).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// createVsComputerReducer — RESET
// ---------------------------------------------------------------------------

describe("createVsComputerReducer — RESET", () => {
  it("returns a fresh initial state", () => {
    let state = createVsComputerInitialState();
    state = reducer(state, { type: "PLAYER_FIRE", coordinate: "0,0" });
    state = reducer(state, { type: "RESET" });

    expect(state.playerShots.size).toBe(0);
    expect(state.computerShots.size).toBe(0);
    expect(state.playerLastResult).toBeNull();
    expect(state.computerLastResult).toBeNull();
    expect(state.activeTurn).toBe("player");
  });
});

// ---------------------------------------------------------------------------
// createVsComputerReducer — immutability
// ---------------------------------------------------------------------------

describe("createVsComputerReducer — immutability", () => {
  it("does not mutate the previous state on PLAYER_FIRE", () => {
    const before = createVsComputerInitialState();
    reducer(before, { type: "PLAYER_FIRE", coordinate: "9,9" });

    expect(before.playerShots.size).toBe(0);
    expect(before.playerLastResult).toBeNull();
    expect(before.activeTurn).toBe("player");
  });

  it("does not mutate the previous state on COMPUTER_FIRE", () => {
    // Get into computer's turn first.
    const computerTurn = reducer(createVsComputerInitialState(), {
      type: "PLAYER_FIRE",
      coordinate: "9,9",
    });
    const before = {
      ...computerTurn,
      computerShots: new Map(computerTurn.computerShots),
    };
    reducer(computerTurn, { type: "COMPUTER_FIRE", coordinate: "9,8" });

    expect(computerTurn.computerShots.size).toBe(before.computerShots.size);
    expect(computerTurn.computerLastResult).toBe(before.computerLastResult);
  });
});

// ---------------------------------------------------------------------------
// createVsComputerReducer — sunk outcome
// ---------------------------------------------------------------------------

describe("createVsComputerReducer — sunk outcome", () => {
  it("records a sunk outcome when the last cell of a ship is hit", () => {
    let state = createVsComputerInitialState();
    state = reducer(state, { type: "PLAYER_FIRE", coordinate: "0,0" });
    state = reducer(state, { type: "PLAYER_FIRE", coordinate: "1,0" });

    expect(state.playerLastResult).toEqual({
      coordinate: "1,0",
      outcome: "sunk",
      sunkShipId: "destroyer",
    });
  });
});

// ---------------------------------------------------------------------------
// createVsComputerReducer — full game
// ---------------------------------------------------------------------------

describe("createVsComputerReducer — game-over guard is external", () => {
  it("reducer does not block shots after all ships are sunk (guard lives in hook)", () => {
    const allPositions: CoordinateKey[] = [
      "2,9",
      "3,9",
      "4,9",
      "5,9",
      "6,9", // carrier
      "5,2",
      "5,3",
      "5,4",
      "5,5", // battleship
      "8,1",
      "8,2",
      "8,3", // cruiser
      "3,0",
      "3,1",
      "3,2", // submarine
      "0,0",
      "1,0", // destroyer
    ];

    let state = createVsComputerInitialState();
    for (const coord of allPositions) {
      state = reducer(state, { type: "PLAYER_FIRE", coordinate: coord });
    }

    // All hits keep the player's turn, so we can still fire.
    // The reducer itself does NOT guard game-over — that's the hook's job.
    const shotsAtEnd = state.playerShots.size;
    state = reducer(state, { type: "PLAYER_FIRE", coordinate: "9,9" });

    expect(state.playerShots.size).toBe(shotsAtEnd + 1);
  });
});

// ---------------------------------------------------------------------------
// selectWinner
// ---------------------------------------------------------------------------

describe("selectWinner", () => {
  it("returns null when neither player has won", () => {
    expect(selectWinner(false, false)).toBeNull();
  });

  it("returns 'player' when the player has sunk all computer ships", () => {
    expect(selectWinner(true, false)).toBe("player");
  });

  it("returns 'computer' when the computer has sunk all player ships", () => {
    expect(selectWinner(false, true)).toBe("computer");
  });

  it("returns 'player' when both flags are true (player checked first)", () => {
    expect(selectWinner(true, true)).toBe("player");
  });
});
