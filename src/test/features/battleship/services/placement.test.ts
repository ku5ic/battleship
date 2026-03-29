import { describe, expect, it } from "vitest";
import { generateRandomLayout } from "@/features/battleship/services/placement";
import { RAW_GAME_CONFIG } from "@/features/battleship/data/config";
import { fromKey } from "@/features/battleship/utils/coordinates";
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
