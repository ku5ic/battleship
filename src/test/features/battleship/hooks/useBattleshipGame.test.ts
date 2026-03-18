import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useBattleshipGame } from "@/features/battleship/hooks/useBattleshipGame";

// The full layout is known, so tests target specific coordinates with confidence.
//   destroyer:  [0,0] [1,0]
//   submarine:  [3,0] [3,1] [3,2]
//   cruiser:    [8,1] [8,2] [8,3]
//   battleship: [5,2] [5,3] [5,4] [5,5]
//   carrier:    [2,9] [3,9] [4,9] [5,9] [6,9]

describe("useBattleshipGame", () => {
  it("starts with an empty board and no result", () => {
    const { result } = renderHook(() => useBattleshipGame());
    expect(result.current.shots.size).toBe(0);
    expect(result.current.lastResult).toBeNull();
    expect(result.current.isGameOver).toBe(false);
    expect(result.current.sunkShipIds.size).toBe(0);
  });

  it("exposes all five ships", () => {
    const { result } = renderHook(() => useBattleshipGame());
    expect(result.current.ships).toHaveLength(5);
  });

  it("records a miss on an empty cell", () => {
    const { result } = renderHook(() => useBattleshipGame());

    act(() => {
      result.current.fireShot(9, 9);
    });

    expect(result.current.shots.get("9,9")).toBe("miss");
    expect(result.current.lastResult?.outcome).toBe("miss");
  });

  it("records a hit on an occupied cell", () => {
    const { result } = renderHook(() => useBattleshipGame());

    act(() => {
      result.current.fireShot(0, 0);
    }); // destroyer col=0, row=0

    expect(result.current.shots.get("0,0")).toBe("hit");
    expect(result.current.lastResult?.outcome).toBe("hit");
    expect(result.current.sunkShipIds.has("destroyer")).toBe(false);
  });

  it("sinks a ship after all its cells are hit", () => {
    const { result } = renderHook(() => useBattleshipGame());

    act(() => {
      result.current.fireShot(0, 0);
    });
    act(() => {
      result.current.fireShot(1, 0);
    });

    expect(result.current.lastResult?.outcome).toBe("sunk");
    expect(result.current.lastResult?.sunkShipId).toBe("destroyer");
    expect(result.current.sunkShipIds.has("destroyer")).toBe(true);
  });

  it("surfaces already-fired without adding a duplicate entry to shots", () => {
    const { result } = renderHook(() => useBattleshipGame());

    act(() => {
      result.current.fireShot(0, 0);
    });
    const sizeAfterFirst = result.current.shots.size;

    act(() => {
      result.current.fireShot(0, 0);
    });

    expect(result.current.lastResult?.outcome).toBe("already-fired");
    expect(result.current.shots.size).toBe(sizeAfterFirst);
  });

  it("does not fire after the game is over", () => {
    const { result } = renderHook(() => useBattleshipGame());

    const allPositions: [number, number][] = [
      [2, 9],
      [3, 9],
      [4, 9],
      [5, 9],
      [6, 9], // carrier
      [5, 2],
      [5, 3],
      [5, 4],
      [5, 5], // battleship
      [8, 1],
      [8, 2],
      [8, 3], // cruiser
      [3, 0],
      [3, 1],
      [3, 2], // submarine
      [0, 0],
      [1, 0], // destroyer
    ];

    for (const [col, row] of allPositions) {
      act(() => {
        result.current.fireShot(col, row);
      });
    }

    expect(result.current.isGameOver).toBe(true);
    const shotsAtGameOver = result.current.shots.size;

    act(() => {
      result.current.fireShot(9, 9);
    });

    expect(result.current.shots.size).toBe(shotsAtGameOver);
  });

  it("resets all state cleanly", () => {
    const { result } = renderHook(() => useBattleshipGame());

    act(() => {
      result.current.fireShot(0, 0);
    });
    act(() => {
      result.current.resetGame();
    });

    expect(result.current.shots.size).toBe(0);
    expect(result.current.lastResult).toBeNull();
    expect(result.current.sunkShipIds.size).toBe(0);
    expect(result.current.isGameOver).toBe(false);
  });
});
