import { describe, it, expect } from "vitest";
import {
  buildPositionIndex,
  computeShipHitCounts,
  isGameOver,
  isShipSunk,
  nextUnfiredCoordinate,
  outcomeToStatus,
  resolveShot,
} from "@/battleship/services/engine";
import { allBoardKeys } from "@/battleship/utils/coordinates";
import type { CellStatus, CoordinateKey, Ship } from "@/battleship/types";

// Fixtures
//
// Minimal fleet that exercises all code paths without carrying the full 5-ship
// game layout into every test. Ships are typed as the real Ship interface so
// we catch any future type drift immediately.

const destroyer: Ship = {
  id: "destroyer",
  size: 2,
  coordinates: ["0,0", "1,0"],
  orientation: "horizontal",
};

const submarine: Ship = {
  id: "submarine",
  size: 3,
  coordinates: ["3,0", "3,1", "3,2"],
  orientation: "vertical",
};

const carrier: Ship = {
  id: "carrier",
  size: 5,
  coordinates: ["2,9", "3,9", "4,9", "5,9", "6,9"],
  orientation: "horizontal",
};

const fleet: readonly Ship[] = [destroyer, submarine, carrier];
const index = buildPositionIndex(fleet);

/** Returns a ReadonlyMap with the given keys set to "hit". */
function shotsMap(
  keys: CoordinateKey[],
  status: CellStatus = "hit",
): ReadonlyMap<CoordinateKey, CellStatus> {
  return new Map(keys.map((k) => [k, status]));
}

describe("buildPositionIndex", () => {
  it("maps every ship coordinate to its ship", () => {
    expect(index.get("0,0")).toBe(destroyer);
    expect(index.get("1,0")).toBe(destroyer);
    expect(index.get("3,0")).toBe(submarine);
    expect(index.get("3,2")).toBe(submarine);
    expect(index.get("2,9")).toBe(carrier);
    expect(index.get("6,9")).toBe(carrier);
  });

  it("returns undefined for an empty cell", () => {
    expect(index.get("9,9" as CoordinateKey)).toBeUndefined();
  });

  it("contains exactly as many entries as total ship cells", () => {
    const expectedSize = fleet.reduce((sum, s) => sum + s.size, 0);
    expect(index.size).toBe(expectedSize);
  });

  it("returns an empty map for an empty fleet", () => {
    expect(buildPositionIndex([]).size).toBe(0);
  });
});

describe("resolveShot", () => {
  it("returns 'miss' for an empty cell", () => {
    const result = resolveShot("9,9", new Map(), index);
    expect(result.outcome).toBe("miss");
    expect(result.coordinate).toBe("9,9");
    expect(result.sunkShipId).toBeUndefined();
  });

  it("returns 'hit' when a ship cell is struck but the ship is not sunk", () => {
    const result = resolveShot("0,0", new Map(), index);
    expect(result.outcome).toBe("hit");
    expect(result.sunkShipId).toBeUndefined();
  });

  it("returns 'sunk' when the shot completes a ship", () => {
    // destroyer: ["0,0", "1,0"], first cell already hit
    const shots = shotsMap(["0,0"]);
    const result = resolveShot("1,0", shots, index);
    expect(result.outcome).toBe("sunk");
    expect(result.sunkShipId).toBe("destroyer");
  });

  it("returns 'already-fired' when the coordinate was previously targeted", () => {
    const shots = shotsMap(["9,9"], "miss");
    const result = resolveShot("9,9", shots, index);
    expect(result.outcome).toBe("already-fired");
    expect(result.sunkShipId).toBeUndefined();
  });

  it("returns 'already-fired' for a previously hit ship cell too", () => {
    const shots = shotsMap(["0,0"]);
    const result = resolveShot("0,0", shots, index);
    expect(result.outcome).toBe("already-fired");
  });

  it("does not mutate the shots map passed in", () => {
    const shots = new Map<CoordinateKey, CellStatus>([["0,0", "hit"]]);
    const sizeBefore = shots.size;
    resolveShot("1,0", shots, index);
    expect(shots.size).toBe(sizeBefore);
  });

  it("returns the coordinate in every outcome", () => {
    const empty = new Map<CoordinateKey, CellStatus>();
    expect(resolveShot("9,9", empty, index).coordinate).toBe("9,9");
    expect(resolveShot("0,0", empty, index).coordinate).toBe("0,0");
    expect(resolveShot("0,0", shotsMap(["0,0"]), index).coordinate).toBe("0,0");
  });

  it("sinks a 3-cell ship when the final cell is hit", () => {
    const shots = shotsMap(["3,0", "3,1"]);
    const result = resolveShot("3,2", shots, index);
    expect(result.outcome).toBe("sunk");
    expect(result.sunkShipId).toBe("submarine");
  });

  it("does not sink when only the first cell of a 5-cell ship is hit", () => {
    const result = resolveShot("2,9", new Map(), index);
    expect(result.outcome).toBe("hit");
    expect(result.sunkShipId).toBeUndefined();
  });
});

describe("isShipSunk", () => {
  it("returns false when no shots have been fired", () => {
    expect(isShipSunk(destroyer, new Map())).toBe(false);
  });

  it("returns false when only some cells are hit", () => {
    expect(isShipSunk(destroyer, shotsMap(["0,0"]))).toBe(false);
  });

  it("returns true when all cells of the ship are in shots", () => {
    expect(isShipSunk(destroyer, shotsMap(["0,0", "1,0"]))).toBe(true);
  });

  it("does not consider hits on other ships", () => {
    // Hit all submarine cells, not destroyer
    const shots = shotsMap(["3,0", "3,1", "3,2"]);
    expect(isShipSunk(destroyer, shots)).toBe(false);
    expect(isShipSunk(submarine, shots)).toBe(true);
  });
});

describe("isGameOver", () => {
  it("returns false when no ships are sunk", () => {
    expect(isGameOver(fleet, new Set())).toBe(false);
  });

  it("returns false when only some ships are sunk", () => {
    expect(isGameOver(fleet, new Set(["destroyer"]))).toBe(false);
  });

  it("returns true when all ships are sunk", () => {
    const sunkIds = new Set(fleet.map((s) => s.id));
    expect(isGameOver(fleet, sunkIds)).toBe(true);
  });

  it("returns false for an empty fleet", () => {
    expect(isGameOver([], new Set())).toBe(false);
  });
});

describe("outcomeToStatus", () => {
  it("maps 'hit' to 'hit'", () => {
    expect(outcomeToStatus("hit")).toBe("hit");
  });

  it("maps 'sunk' to 'hit'", () => {
    // CellStatus does not have a 'sunk' value; sunk state is tracked via sunkShipIds
    expect(outcomeToStatus("sunk")).toBe("hit");
  });

  it("maps 'miss' to 'miss'", () => {
    expect(outcomeToStatus("miss")).toBe("miss");
  });

  it("returns null for 'already-fired'", () => {
    expect(outcomeToStatus("already-fired")).toBeNull();
  });
});

describe("computeShipHitCounts", () => {
  it("returns zero for every ship when no shots have been fired", () => {
    const counts = computeShipHitCounts(fleet, new Map());
    expect(counts.get("destroyer")).toBe(0);
    expect(counts.get("submarine")).toBe(0);
    expect(counts.get("carrier")).toBe(0);
  });

  it("counts partial hits on one ship while others remain at zero", () => {
    const counts = computeShipHitCounts(fleet, shotsMap(["0,0"]));
    expect(counts.get("destroyer")).toBe(1);
    expect(counts.get("submarine")).toBe(0);
    expect(counts.get("carrier")).toBe(0);
  });

  it("counts all coordinates when every cell of a ship is hit", () => {
    const counts = computeShipHitCounts(fleet, shotsMap(["0,0", "1,0"]));
    expect(counts.get("destroyer")).toBe(destroyer.size);
  });

  it("ignores misses that do not land on any ship", () => {
    const shots = new Map<CoordinateKey, CellStatus>([
      ["9,9", "miss"],
      ["8,8", "miss"],
      ["0,0", "hit"],
    ]);
    const counts = computeShipHitCounts(fleet, shots);
    expect(counts.get("destroyer")).toBe(1);
    expect(counts.get("submarine")).toBe(0);
    expect(counts.get("carrier")).toBe(0);
  });

  it("returns an empty map for an empty fleet", () => {
    const counts = computeShipHitCounts([], shotsMap(["0,0"]));
    expect(counts.size).toBe(0);
  });
});

describe("nextUnfiredCoordinate", () => {
  const keys = allBoardKeys(3); // 9 keys: "0,0" through "2,2"

  it("returns the next unfired key after fromIndex", () => {
    const shots = shotsMap(["0,0"]); // index 0 is fired
    expect(nextUnfiredCoordinate(keys, shots, 0)).toBe("1,0");
  });

  it("wraps around when no unfired key exists after fromIndex", () => {
    // Fire all keys after index 4 ("1,1"), leave "0,0" unfired
    const fired: CoordinateKey[] = [
      "1,0",
      "2,0",
      "0,1",
      "1,1",
      "2,1",
      "0,2",
      "1,2",
      "2,2",
    ];
    const shots = shotsMap(fired);
    expect(nextUnfiredCoordinate(keys, shots, 4)).toBe("0,0");
  });

  it("returns null when all keys are fired", () => {
    const shots = shotsMap(keys);
    expect(nextUnfiredCoordinate(keys, shots, 0)).toBeNull();
  });

  it("returns the first unfired key before fromIndex when tail is exhausted", () => {
    // Fire everything except "0,1" (index 3), search from last index
    const fired = keys.filter((k) => k !== "0,1");
    const shots = shotsMap(fired);
    expect(nextUnfiredCoordinate(keys, shots, 8)).toBe("0,1");
  });

  it("returns the next key when fromIndex is 0 and subsequent keys are unfired", () => {
    expect(nextUnfiredCoordinate(keys, new Map(), 0)).toBe("1,0");
  });
});
