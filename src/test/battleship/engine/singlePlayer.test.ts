import { describe, expect, it } from "vitest";
import { parseLayout } from "@/battleship/data/layout";
import { RAW_GAME_CONFIG } from "@/battleship/data/config";
import {
  buildPositionIndex,
  selectSunkShipIds,
} from "@/battleship/services/engine";
import {
  createSinglePlayerInitialState,
  createSinglePlayerReducer,
} from "@/battleship/engine/singlePlayer";
import type { CoordinateKey, Ship } from "@/battleship/types";

// Deterministic fleet from the static config.
//
//   destroyer:  [0,0] [1,0]
//   submarine:  [3,0] [3,1] [3,2]
//   cruiser:    [8,1] [8,2] [8,3]
//   battleship: [5,2] [5,3] [5,4] [5,5]
//   carrier:    [2,9] [3,9] [4,9] [5,9] [6,9]

const ships: Ship[] = parseLayout(RAW_GAME_CONFIG, 10);
const positionIndex = buildPositionIndex(ships);

describe("createSinglePlayerInitialState", () => {
  it("returns empty shots and null lastResult", () => {
    const state = createSinglePlayerInitialState();
    expect(state.shots.size).toBe(0);
    expect(state.lastResult).toBeNull();
  });

  it("returns a new object on each call", () => {
    const a = createSinglePlayerInitialState();
    const b = createSinglePlayerInitialState();
    expect(a).not.toBe(b);
    expect(a.shots).not.toBe(b.shots);
  });
});

describe("createSinglePlayerReducer", () => {
  const reducer = createSinglePlayerReducer(ships, positionIndex);

  it("records a miss on an empty cell", () => {
    const state = reducer(createSinglePlayerInitialState(), {
      type: "FIRE",
      coordinate: "9,9",
    });

    expect(state.shots.get("9,9")).toBe("miss");
    expect(state.lastResult).toEqual({ coordinate: "9,9", outcome: "miss" });
  });

  it("records a hit on an occupied cell", () => {
    const state = reducer(createSinglePlayerInitialState(), {
      type: "FIRE",
      coordinate: "0,0", // destroyer
    });

    expect(state.shots.get("0,0")).toBe("hit");
    expect(state.lastResult?.outcome).toBe("hit");
  });

  it("records a sunk outcome when the last cell of a ship is hit", () => {
    let state = createSinglePlayerInitialState();
    state = reducer(state, { type: "FIRE", coordinate: "0,0" });
    state = reducer(state, { type: "FIRE", coordinate: "1,0" });

    expect(state.lastResult).toEqual({
      coordinate: "1,0",
      outcome: "sunk",
      sunkShipId: "destroyer",
    });
  });

  it("surfaces already-fired without adding a duplicate entry to shots", () => {
    let state = createSinglePlayerInitialState();
    state = reducer(state, { type: "FIRE", coordinate: "0,0" });
    const sizeAfterFirst = state.shots.size;

    state = reducer(state, { type: "FIRE", coordinate: "0,0" });

    expect(state.lastResult?.outcome).toBe("already-fired");
    expect(state.shots.size).toBe(sizeAfterFirst);
  });

  it("does not mutate the previous state on FIRE", () => {
    const before = createSinglePlayerInitialState();
    reducer(before, { type: "FIRE", coordinate: "9,9" });

    expect(before.shots.size).toBe(0);
    expect(before.lastResult).toBeNull();
  });

  it("ignores shots after all ships are sunk", () => {
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

    let state = createSinglePlayerInitialState();
    for (const coord of allPositions) {
      state = reducer(state, { type: "FIRE", coordinate: coord });
    }

    const shotsAtGameOver = state.shots.size;
    state = reducer(state, { type: "FIRE", coordinate: "9,9" });

    expect(state.shots.size).toBe(shotsAtGameOver);
  });

  it("resets to a fresh initial state", () => {
    let state = createSinglePlayerInitialState();
    state = reducer(state, { type: "FIRE", coordinate: "0,0" });
    state = reducer(state, { type: "RESET" });

    expect(state.shots.size).toBe(0);
    expect(state.lastResult).toBeNull();
  });
});

describe("selectSunkShipIds", () => {
  it("returns an empty set when no shots have been fired", () => {
    const sunk = selectSunkShipIds(ships, new Map());
    expect(sunk.size).toBe(0);
  });

  it("does not include a ship that is only partially hit", () => {
    const shots = new Map<CoordinateKey, "hit">();
    shots.set("0,0", "hit"); // destroyer has [0,0] and [1,0]

    const sunk = selectSunkShipIds(ships, shots);
    expect(sunk.has("destroyer")).toBe(false);
  });

  it("includes a ship once all its cells are hit", () => {
    const shots = new Map<CoordinateKey, "hit">();
    shots.set("0,0", "hit");
    shots.set("1,0", "hit");

    const sunk = selectSunkShipIds(ships, shots);
    expect(sunk.has("destroyer")).toBe(true);
    expect(sunk.size).toBe(1);
  });

  it("includes multiple ships when all their cells are hit", () => {
    const shots = new Map<CoordinateKey, "hit">();
    // destroyer
    shots.set("0,0", "hit");
    shots.set("1,0", "hit");
    // submarine
    shots.set("3,0", "hit");
    shots.set("3,1", "hit");
    shots.set("3,2", "hit");

    const sunk = selectSunkShipIds(ships, shots);
    expect(sunk.has("destroyer")).toBe(true);
    expect(sunk.has("submarine")).toBe(true);
    expect(sunk.size).toBe(2);
  });
});
