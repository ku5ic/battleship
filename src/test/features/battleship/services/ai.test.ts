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
    const result = chooseRandomUnfiredCoordinate(shots, 10);
    expect(result).not.toBeNull();

    if (result !== null) {
      expect(shots.has(result)).toBe(false);
    }
  });

  it("returns a valid board coordinate", () => {
    const result = chooseRandomUnfiredCoordinate(new Map(), 10);
    expect(allBoardKeys(10)).toContain(result);
  });

  it("returns null when every cell has been fired at", () => {
    const shots = shotsMap(allBoardKeys(10));
    expect(chooseRandomUnfiredCoordinate(shots, 10)).toBeNull();
  });

  it("returns the only remaining coordinate when one cell is left", () => {
    const allKeys = allBoardKeys(10);
    const lastKey: CoordinateKey = "9,9";
    const shots = shotsMap(allKeys.filter((k) => k !== lastKey));
    expect(chooseRandomUnfiredCoordinate(shots, 10)).toBe(lastKey);
  });

  it("returns null for an empty board is not triggered — full board returns null", () => {
    // Sanity check: empty shots means all 100 cells are available.
    const result = chooseRandomUnfiredCoordinate(new Map(), 10);
    expect(result).not.toBeNull();
  });

  it("returns a valid coordinate for boardSize 15", () => {
    const result = chooseRandomUnfiredCoordinate(new Map(), 15);
    expect(result).not.toBeNull();
    expect(allBoardKeys(15)).toContain(result);
  });

  it("returns null when all 225 cells are fired for boardSize 15", () => {
    const shots = shotsMap(allBoardKeys(15));
    expect(chooseRandomUnfiredCoordinate(shots, 15)).toBeNull();
  });
});
