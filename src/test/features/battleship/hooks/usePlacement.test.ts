import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePlacement } from "@/features/battleship/hooks/usePlacement";
import { toKey } from "@/features/battleship/utils/coordinates";

vi.mock("@/features/battleship/services/placement", async () => {
  const { computeShipPreview } =
    await import("@/features/battleship/services/placement");
  const { parseLayout } = await import("@/features/battleship/data/layout");
  const { RAW_GAME_CONFIG } = await import("@/features/battleship/data/config");
  return {
    computeShipPreview,
    generateRandomLayout: vi.fn(() => parseLayout(RAW_GAME_CONFIG, 10)),
  };
});

// Ship config sizes: carrier=5, battleship=4, cruiser=3, submarine=3, destroyer=2
// remainingShipTypes should be ordered largest-first.

describe("usePlacement", () => {
  it("has correct initial state", () => {
    const { result } = renderHook(() => usePlacement("easy"));

    expect(result.current.placedShips).toHaveLength(0);
    expect(result.current.pendingShip).toBeNull();
    expect(result.current.isComplete).toBe(false);
    expect(result.current.remainingShipTypes).toEqual([
      "carrier",
      "battleship",
      "cruiser",
      "submarine",
      "destroyer",
    ]);
  });

  it("selectShip sets pendingShip with default horizontal orientation", () => {
    const { result } = renderHook(() => usePlacement("easy"));

    act(() => {
      result.current.selectShip("destroyer");
    });

    expect(result.current.pendingShip).toEqual({
      type: "destroyer",
      orientation: "horizontal",
    });
  });

  it("toggleOrientation flips orientation on pendingShip", () => {
    const { result } = renderHook(() => usePlacement("easy"));

    act(() => {
      result.current.selectShip("destroyer");
    });
    act(() => {
      result.current.toggleOrientation();
    });

    expect(result.current.pendingShip?.orientation).toBe("vertical");
  });

  it("toggleOrientation is a no-op when pendingShip is null", () => {
    const { result } = renderHook(() => usePlacement("easy"));

    act(() => {
      result.current.toggleOrientation();
    });

    expect(result.current.pendingShip).toBeNull();
  });

  it("setHover updates hoverCoord and reflects in cellStatusMap", () => {
    const { result } = renderHook(() => usePlacement("easy"));

    act(() => {
      result.current.selectShip("destroyer");
    });
    act(() => {
      result.current.setHover(toKey(0, 0));
    });

    expect(result.current.cellStatusMap.get(toKey(0, 0))).toBe("preview-valid");
    expect(result.current.cellStatusMap.get(toKey(1, 0))).toBe("preview-valid");
  });

  it("placeShip adds to placedShips and auto-selects next type", () => {
    const { result } = renderHook(() => usePlacement("easy"));

    act(() => {
      result.current.selectShip("carrier");
    });
    act(() => {
      result.current.setHover(toKey(0, 0));
    });
    act(() => {
      result.current.placeShip(toKey(0, 0));
    });

    expect(result.current.placedShips).toHaveLength(1);
    expect(result.current.placedShips[0].id).toBe("carrier");
    expect(result.current.placedShips[0].coordinates).toHaveLength(5);
    // Auto-selects next largest unplaced type
    expect(result.current.pendingShip?.type).toBe("battleship");
  });

  it("placeShip is a no-op when preview is out of bounds", () => {
    const { result } = renderHook(() => usePlacement("easy"));

    act(() => {
      result.current.selectShip("carrier");
    });
    // col 8 + size 5 = 13 > 10, out of bounds
    act(() => {
      result.current.setHover(toKey(8, 0));
    });
    act(() => {
      result.current.placeShip(toKey(8, 0));
    });

    expect(result.current.placedShips).toHaveLength(0);
  });

  it("placeShip is a no-op when preview overlaps an existing ship", () => {
    const { result } = renderHook(() => usePlacement("easy"));

    // Place carrier at row 0, cols 0-4
    act(() => {
      result.current.selectShip("carrier");
    });
    act(() => {
      result.current.setHover(toKey(0, 0));
    });
    act(() => {
      result.current.placeShip(toKey(0, 0));
    });

    // Try to place battleship overlapping at col 3, row 0
    act(() => {
      result.current.selectShip("battleship");
    });
    act(() => {
      result.current.setHover(toKey(3, 0));
    });
    act(() => {
      result.current.placeShip(toKey(3, 0));
    });

    expect(result.current.placedShips).toHaveLength(1);
    expect(result.current.placedShips[0].id).toBe("carrier");
  });

  it("placeShip on last ship sets isComplete and clears pendingShip", () => {
    const { result } = renderHook(() => usePlacement("easy"));

    // Place all 5 ships in non-overlapping positions
    const placements: [string, number, number][] = [
      ["carrier", 0, 0], // size 5, cols 0-4
      ["battleship", 0, 1], // size 4, cols 0-3
      ["cruiser", 0, 2], // size 3, cols 0-2
      ["submarine", 0, 3], // size 3, cols 0-2
      ["destroyer", 0, 4], // size 2, cols 0-1
    ];

    for (const [shipType, col, row] of placements) {
      act(() => {
        result.current.selectShip(
          shipType as Parameters<typeof result.current.selectShip>[0],
        );
      });
      act(() => {
        result.current.setHover(toKey(col, row));
      });
      act(() => {
        result.current.placeShip(toKey(col, row));
      });
    }

    expect(result.current.placedShips).toHaveLength(5);
    expect(result.current.isComplete).toBe(true);
    expect(result.current.pendingShip).toBeNull();
  });

  it("removeShip removes from placedShips and sets pendingShip to that type", () => {
    const { result } = renderHook(() => usePlacement("easy"));

    act(() => {
      result.current.selectShip("destroyer");
    });
    act(() => {
      result.current.setHover(toKey(0, 0));
    });
    act(() => {
      result.current.placeShip(toKey(0, 0));
    });

    expect(result.current.placedShips).toHaveLength(1);

    act(() => {
      result.current.removeShip("destroyer");
    });

    expect(result.current.placedShips).toHaveLength(0);
    expect(result.current.pendingShip).toEqual({
      type: "destroyer",
      orientation: "horizontal",
    });
  });

  it("randomise places all ships and clears pendingShip", () => {
    const { result } = renderHook(() => usePlacement("easy"));

    act(() => {
      result.current.randomise();
    });

    expect(result.current.placedShips).toHaveLength(5);
    expect(result.current.isComplete).toBe(true);
    expect(result.current.pendingShip).toBeNull();
  });

  it("reset returns to exact initial state", () => {
    const { result } = renderHook(() => usePlacement("easy"));

    act(() => {
      result.current.selectShip("carrier");
    });
    act(() => {
      result.current.setHover(toKey(0, 0));
    });
    act(() => {
      result.current.placeShip(toKey(0, 0));
    });
    act(() => {
      result.current.reset();
    });

    expect(result.current.placedShips).toHaveLength(0);
    expect(result.current.pendingShip).toBeNull();
    expect(result.current.isComplete).toBe(false);
  });

  it("confirm returns placedShips when isComplete", () => {
    const { result } = renderHook(() => usePlacement("easy"));

    act(() => {
      result.current.randomise();
    });

    let ships: unknown;
    act(() => {
      ships = result.current.confirm();
    });

    expect(ships).toHaveLength(5);
  });

  it("confirm throws when not isComplete", () => {
    const { result } = renderHook(() => usePlacement("easy"));

    expect(() => result.current.confirm()).toThrow(/fleet is not complete/);
  });
});
