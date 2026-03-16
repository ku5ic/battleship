import { describe, expect, it } from "vitest";
import { chooseRandomUnfiredCoordinate } from "@/features/battleship/services/ai";
import { allBoardKeys } from "@/features/battleship/utils/coordinates";
import type { CellStatus, CoordinateKey } from "@/features/battleship/types";

function shotsMap(
  keys: CoordinateKey[],
): ReadonlyMap<CoordinateKey, CellStatus> {
  return new Map(keys.map((k) => [k, "miss"]));
}

describe("chooseRandomUnfiredCoordinate", () => {
  it("returns a coordinate not present in shotsReceived", () => {
    const shots = shotsMap(["0,0", "1,0", "2,0"]);
    const result = chooseRandomUnfiredCoordinate(shots);
    expect(result).not.toBeNull();

    if (result !== null) {
      expect(shots.has(result)).toBe(false);
    }
  });

  it("returns a valid board coordinate", () => {
    const result = chooseRandomUnfiredCoordinate(new Map());
    expect(allBoardKeys()).toContain(result);
  });

  it("returns null when every cell has been fired at", () => {
    const shots = shotsMap(allBoardKeys());
    expect(chooseRandomUnfiredCoordinate(shots)).toBeNull();
  });

  it("returns the only remaining coordinate when one cell is left", () => {
    const allKeys = allBoardKeys();
    const lastKey: CoordinateKey = "9,9";
    const shots = shotsMap(allKeys.filter((k) => k !== lastKey));
    expect(chooseRandomUnfiredCoordinate(shots)).toBe(lastKey);
  });

  it("returns null for an empty board is not triggered — full board returns null", () => {
    // Sanity check: empty shots means all 100 cells are available.
    const result = chooseRandomUnfiredCoordinate(new Map());
    expect(result).not.toBeNull();
  });
});
