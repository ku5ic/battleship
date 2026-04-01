import { describe, it, expect } from "vitest";
import { parseLayout } from "@/battleship/data/layout";
import type { RawGameConfig } from "@/battleship/types";

const validConfig: RawGameConfig = {
  shipTypes: {
    carrier: { size: 5, count: 1 },
    battleship: { size: 4, count: 1 },
    cruiser: { size: 3, count: 1 },
    submarine: { size: 3, count: 1 },
    destroyer: { size: 2, count: 1 },
  },
  layout: [
    {
      ship: "carrier",
      positions: [
        [2, 9],
        [3, 9],
        [4, 9],
        [5, 9],
        [6, 9],
      ],
    },
    {
      ship: "battleship",
      positions: [
        [5, 2],
        [5, 3],
        [5, 4],
        [5, 5],
      ],
    },
    {
      ship: "cruiser",
      positions: [
        [8, 1],
        [8, 2],
        [8, 3],
      ],
    },
    {
      ship: "submarine",
      positions: [
        [3, 0],
        [3, 1],
        [3, 2],
      ],
    },
    {
      ship: "destroyer",
      positions: [
        [0, 0],
        [1, 0],
      ],
    },
  ],
};

describe("parseLayout — valid config", () => {
  it("parses without throwing", () => {
    expect(() => parseLayout(validConfig, 10)).not.toThrow();
  });

  it("returns one Ship per layout entry", () => {
    expect(parseLayout(validConfig, 10)).toHaveLength(5);
  });

  it("maps coordinates correctly", () => {
    const ships = parseLayout(validConfig, 10);
    const destroyer = ships.find((s) => s.id === "destroyer");

    expect(destroyer).toBeDefined();
    expect(destroyer?.coordinates).toEqual(["0,0", "1,0"]);
    expect(destroyer?.size).toBe(2);
    expect(destroyer?.orientation).toBe("horizontal");
  });

  it("derives vertical orientation for the battleship", () => {
    const ships = parseLayout(validConfig, 10);
    const battleship = ships.find((s) => s.id === "battleship");

    expect(battleship).toBeDefined();
    expect(battleship?.orientation).toBe("vertical");
  });
});

describe("parseLayout — invalid configs", () => {
  function withReplacedShip(
    targetShip: string,
    override: Partial<(typeof validConfig.layout)[number]>,
  ): RawGameConfig {
    return {
      ...validConfig,
      layout: validConfig.layout.map((entry) =>
        entry.ship === targetShip ? { ...entry, ...override } : entry,
      ),
    };
  }

  it("throws when a ship has no positions", () => {
    expect(() =>
      parseLayout(withReplacedShip("destroyer", { positions: [] }), 10),
    ).toThrow(/no positions/);
  });

  it("throws when position count does not match declared size", () => {
    expect(() =>
      parseLayout(
        withReplacedShip("destroyer", {
          positions: [
            [0, 0],
            [1, 0],
            [2, 0],
          ],
        }),
        10,
      ),
    ).toThrow(/expected 2/);
  });

  it("throws on an out-of-bounds position", () => {
    expect(() =>
      parseLayout(
        withReplacedShip("destroyer", {
          positions: [
            [10, 0],
            [11, 0],
          ],
        }),
        10,
      ),
    ).toThrow(/out-of-bounds/);
  });

  it("throws on overlapping ships", () => {
    expect(() =>
      parseLayout(
        withReplacedShip("destroyer", {
          positions: [
            [3, 0],
            [3, 1],
          ],
        }),
        10,
      ),
    ).toThrow(/overlaps/);
  });

  it("throws on diagonal placement", () => {
    expect(() =>
      parseLayout(
        withReplacedShip("destroyer", {
          positions: [
            [0, 0],
            [1, 1],
          ],
        }),
        10,
      ),
    ).toThrow(/not aligned/);
  });

  it("throws on non-contiguous positions (gap)", () => {
    expect(() =>
      parseLayout(
        withReplacedShip("destroyer", {
          positions: [
            [0, 0],
            [2, 0],
          ],
        }),
        10,
      ),
    ).toThrow(/gap/);
  });
});
