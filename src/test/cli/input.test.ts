import { describe, expect, it } from "vitest";
import { parseCoordinateInput } from "@/cli/input";
import { DIFFICULTY_CONFIG } from "@/battleship/constants";

const COLUMN_LABELS = DIFFICULTY_CONFIG.easy.columnLabels;
const boardSize = 10;
const moderateLabels = DIFFICULTY_CONFIG.moderate.columnLabels;

describe("parseCoordinateInput", () => {
  it("parses A1 to 0,0", () => {
    expect(parseCoordinateInput("A1", COLUMN_LABELS, boardSize)).toBe("0,0");
  });

  it("parses j10 (lowercase) to 9,9", () => {
    expect(parseCoordinateInput("j10", COLUMN_LABELS, boardSize)).toBe("9,9");
  });

  it("parses B5 to 1,4", () => {
    expect(parseCoordinateInput("B5", COLUMN_LABELS, boardSize)).toBe("1,4");
  });

  it("accepts lowercase input", () => {
    expect(parseCoordinateInput("a1", COLUMN_LABELS, boardSize)).toBe("0,0");
  });

  it("trims surrounding whitespace", () => {
    expect(parseCoordinateInput(" A1 ", COLUMN_LABELS, boardSize)).toBe("0,0");
  });

  it("returns null for empty string", () => {
    expect(parseCoordinateInput("", COLUMN_LABELS, boardSize)).toBeNull();
  });

  it("returns null for unknown column letter", () => {
    expect(parseCoordinateInput("Z1", COLUMN_LABELS, boardSize)).toBeNull();
  });

  it("returns null for row zero", () => {
    expect(parseCoordinateInput("A0", COLUMN_LABELS, boardSize)).toBeNull();
  });

  it("returns null for row exceeding board size", () => {
    expect(parseCoordinateInput("A11", COLUMN_LABELS, boardSize)).toBeNull();
  });

  it("returns null for missing row digits", () => {
    expect(parseCoordinateInput("A", COLUMN_LABELS, boardSize)).toBeNull();
  });

  it("returns null for reversed format (digits before letter)", () => {
    expect(parseCoordinateInput("1A", COLUMN_LABELS, boardSize)).toBeNull();
  });

  it("returns null for trailing junk characters", () => {
    expect(parseCoordinateInput("A1X", COLUMN_LABELS, boardSize)).toBeNull();
  });

  it("accepts a column beyond J when labels allow it", () => {
    expect(parseCoordinateInput("K5", moderateLabels, 15)).toBe("10,4");
  });

  it("rejects a column beyond the provided labels", () => {
    expect(parseCoordinateInput("K5", COLUMN_LABELS, boardSize)).toBeNull();
  });
});
