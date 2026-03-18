import { describe, it, expect } from "vitest";
import {
  toKey,
  fromKey,
  rawToKey,
  isInBounds,
  deriveOrientation,
  allBoardKeys,
} from "@/features/battleship/utils/coordinates";

describe("toKey", () => {
  it("produces a stable col,row string", () => {
    expect(toKey(0, 0)).toBe("0,0");
    expect(toKey(3, 9)).toBe("3,9");
    expect(toKey(9, 9)).toBe("9,9");
  });
});

describe("fromKey", () => {
  it("parses a key back into a Coordinate", () => {
    expect(fromKey("0,0")).toEqual({ col: 0, row: 0 });
    expect(fromKey("3,9")).toEqual({ col: 3, row: 9 });
  });

  it("round-trips with toKey", () => {
    expect(fromKey(toKey(5, 7))).toEqual({ col: 5, row: 7 });
  });
});

describe("rawToKey", () => {
  it("converts a RawCoordinate tuple", () => {
    expect(rawToKey([2, 9])).toBe("2,9");
  });
});

describe("isInBounds", () => {
  it("accepts valid board positions", () => {
    expect(isInBounds(0, 0)).toBe(true);
    expect(isInBounds(9, 9)).toBe(true);
    expect(isInBounds(5, 5)).toBe(true);
  });

  it("rejects negative values", () => {
    expect(isInBounds(-1, 0)).toBe(false);
    expect(isInBounds(0, -1)).toBe(false);
  });

  it("rejects values >= BOARD_SIZE", () => {
    expect(isInBounds(10, 0)).toBe(false);
    expect(isInBounds(0, 10)).toBe(false);
  });
});

describe("deriveOrientation", () => {
  it("returns vertical when all cols are the same", () => {
    expect(deriveOrientation(["5,2", "5,3", "5,4", "5,5"])).toBe("vertical");
  });

  it("returns horizontal when all rows are the same", () => {
    expect(deriveOrientation(["2,9", "3,9", "4,9", "5,9", "6,9"])).toBe(
      "horizontal",
    );
  });

  it("defaults to horizontal for a single coordinate", () => {
    expect(deriveOrientation(["3,3"])).toBe("horizontal");
  });
});

describe("allBoardKeys", () => {
  it("returns 100 keys for a 10x10 board", () => {
    expect(allBoardKeys()).toHaveLength(100);
  });

  it("starts at 0,0 and ends at 9,9", () => {
    const keys = allBoardKeys();
    expect(keys[0]).toBe("0,0");
    expect(keys[99]).toBe("9,9");
  });

  it("iterates row-major (row increments before col)", () => {
    const keys = allBoardKeys();
    // row 0: col 0–9, row 1: col 0–9 ...
    expect(keys[0]).toBe("0,0");
    expect(keys[1]).toBe("1,0");
    expect(keys[10]).toBe("0,1");
  });
});
