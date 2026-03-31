import { describe, expect, it } from "vitest";
import {
  computeShipPreview,
  generateRandomLayout,
} from "@/features/battleship/services/placement";
import { RAW_GAME_CONFIG } from "@/features/battleship/data/config";
import { fromKey, toKey } from "@/features/battleship/utils/coordinates";
import type { CoordinateKey } from "@/features/battleship/types";

const RUNS = 20;
const BOARD_SIZES = [10, 15, 20] as const;

describe("generateRandomLayout", () => {
  for (const boardSize of BOARD_SIZES) {
    describe(`boardSize=${String(boardSize)}`, () => {
      it("ship count matches config", () => {
        for (let i = 0; i < RUNS; i++) {
          const ships = generateRandomLayout(RAW_GAME_CONFIG, boardSize);
          expect(ships).toHaveLength(
            Object.keys(RAW_GAME_CONFIG.shipTypes).length,
          );
        }
      });

      it("each ship coordinate count and size match config", () => {
        for (let i = 0; i < RUNS; i++) {
          const ships = generateRandomLayout(RAW_GAME_CONFIG, boardSize);
          for (const ship of ships) {
            const expected = RAW_GAME_CONFIG.shipTypes[ship.id].size;
            expect(ship.size).toBe(expected);
            expect(ship.coordinates).toHaveLength(expected);
          }
        }
      });

      it("no coordinate appears in more than one ship", () => {
        for (let i = 0; i < RUNS; i++) {
          const ships = generateRandomLayout(RAW_GAME_CONFIG, boardSize);
          const all = new Set<CoordinateKey>();
          for (const ship of ships) {
            for (const key of ship.coordinates) {
              expect(all.has(key)).toBe(false);
              all.add(key);
            }
          }
        }
      });

      it("all coordinates are within board bounds", () => {
        for (let i = 0; i < RUNS; i++) {
          const ships = generateRandomLayout(RAW_GAME_CONFIG, boardSize);
          for (const ship of ships) {
            for (const key of ship.coordinates) {
              const { col, row } = fromKey(key);
              expect(col).toBeGreaterThanOrEqual(0);
              expect(col).toBeLessThan(boardSize);
              expect(row).toBeGreaterThanOrEqual(0);
              expect(row).toBeLessThan(boardSize);
            }
          }
        }
      });

      it("each ship orientation is horizontal or vertical", () => {
        for (let i = 0; i < RUNS; i++) {
          const ships = generateRandomLayout(RAW_GAME_CONFIG, boardSize);
          for (const ship of ships) {
            expect(["horizontal", "vertical"]).toContain(ship.orientation);
          }
        }
      });

      it("each ship coordinates form a straight contiguous line", () => {
        for (let i = 0; i < RUNS; i++) {
          const ships = generateRandomLayout(RAW_GAME_CONFIG, boardSize);
          for (const ship of ships) {
            const coords = ship.coordinates.map(fromKey);
            const cols = coords.map((c) => c.col);
            const rows = coords.map((c) => c.row);

            const uniformCol = cols.every((c) => c === cols[0]);
            const uniformRow = rows.every((r) => r === rows[0]);

            // At least one axis must be uniform (straight line).
            expect(uniformCol || uniformRow).toBe(true);

            // The varying axis must be contiguous with no gaps.
            const axis = uniformCol ? rows : cols;
            const sorted = [...axis].sort((a, b) => a - b);
            for (let j = 1; j < sorted.length; j++) {
              expect(sorted[j]).toBe(sorted[j - 1] + 1);
            }
          }
        }
      });
    });
  }

  it("throws when the board is too small to fit the fleet", () => {
    expect(() => generateRandomLayout(RAW_GAME_CONFIG, 2)).toThrow(
      /failed to place all ships/,
    );
  });
});

describe("computeShipPreview", () => {
  it("returns correct keys for in-bounds horizontal placement", () => {
    const result = computeShipPreview(toKey(2, 3), 3, "horizontal", 10);
    expect(result).toEqual([toKey(2, 3), toKey(3, 3), toKey(4, 3)]);
  });

  it("returns correct keys for in-bounds vertical placement", () => {
    const result = computeShipPreview(toKey(5, 1), 4, "vertical", 10);
    expect(result).toEqual([
      toKey(5, 1),
      toKey(5, 2),
      toKey(5, 3),
      toKey(5, 4),
    ]);
  });

  it("returns null when anchor at right edge overflows horizontally", () => {
    const result = computeShipPreview(toKey(8, 0), 3, "horizontal", 10);
    expect(result).toBeNull();
  });

  it("returns null when anchor at bottom edge overflows vertically", () => {
    const result = computeShipPreview(toKey(0, 9), 2, "vertical", 10);
    expect(result).toBeNull();
  });

  it("returns one key for a single-cell ship", () => {
    const result = computeShipPreview(toKey(4, 4), 1, "horizontal", 10);
    expect(result).toEqual([toKey(4, 4)]);
  });

  it("returns boardSize keys for full-width ship at col 0 horizontal", () => {
    const result = computeShipPreview(toKey(0, 0), 10, "horizontal", 10);
    expect(result).toHaveLength(10);
    expect(result?.[0]).toBe(toKey(0, 0));
    expect(result?.[9]).toBe(toKey(9, 0));
  });

  it("returns boardSize keys for full-height ship at row 0 vertical", () => {
    const result = computeShipPreview(toKey(0, 0), 10, "vertical", 10);
    expect(result).toHaveLength(10);
    expect(result?.[0]).toBe(toKey(0, 0));
    expect(result?.[9]).toBe(toKey(0, 9));
  });
});
