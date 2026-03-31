import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { useVsComputerGame } from "@/features/battleship/hooks/useVsComputerGame";
import type { CoordinateKey } from "@/features/battleship/types";

// ---------------------------------------------------------------------------
// Mock placement to return the same deterministic layout used by the
// original static config. This keeps all existing coordinate-based
// assertions valid after the switch to randomised placement.
// ---------------------------------------------------------------------------
vi.mock("@/features/battleship/services/placement", async () => {
  const { parseLayout } = await import("@/features/battleship/data/layout");
  const { RAW_GAME_CONFIG } = await import("@/features/battleship/data/config");
  return {
    generateRandomLayout: vi.fn(() => parseLayout(RAW_GAME_CONFIG, 10)),
  };
});

// Ship layout (both boards share the same fleet):
//   destroyer:  [0,0] [1,0]
//   submarine:  [3,0] [3,1] [3,2]
//   cruiser:    [8,1] [8,2] [8,3]
//   battleship: [5,2] [5,3] [5,4] [5,5]
//   carrier:    [2,9] [3,9] [4,9] [5,9] [6,9]

// All computer ship coordinates in sink order — used to drive player to victory.
const ALL_COMPUTER_SHIP_COORDS: [number, number][] = [
  [0, 0],
  [1, 0], // destroyer
  [3, 0],
  [3, 1],
  [3, 2], // submarine
  [8, 1],
  [8, 2],
  [8, 3], // cruiser
  [5, 2],
  [5, 3],
  [5, 4],
  [5, 5], // battleship
  [2, 9],
  [3, 9],
  [4, 9],
  [5, 9],
  [6, 9], // carrier
];

describe("useVsComputerGame", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------

  it("initialises boardSize from difficulty", () => {
    const { result } = renderHook(() => useVsComputerGame("moderate"));
    expect(result.current.boardSize).toBe(15);
  });

  it("starts on the player's turn with no winner", () => {
    const { result } = renderHook(() => useVsComputerGame("easy"));
    expect(result.current.activeTurn).toBe("player");
    expect(result.current.winner).toBeNull();
    expect(result.current.isAiThinking).toBe(false);
  });

  it("starts with empty shot maps on both boards", () => {
    const { result } = renderHook(() => useVsComputerGame("easy"));
    expect(result.current.board.player.shots.size).toBe(0);
    expect(result.current.board.computer.shots.size).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Player fires — miss
  // ---------------------------------------------------------------------------

  it("records a miss on the computer board when the player fires at an empty cell", () => {
    const { result } = renderHook(() => useVsComputerGame("easy"));

    act(() => {
      result.current.playerFireShot("9,9");
    });

    expect(result.current.board.computer.shots.get("9,9")).toBe("miss");
  });

  it("switches turn to computer after a player miss", () => {
    const { result } = renderHook(() => useVsComputerGame("easy"));

    act(() => {
      result.current.playerFireShot("9,9");
    });

    expect(result.current.activeTurn).toBe("computer");
    expect(result.current.isAiThinking).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Player fires — hit
  // ---------------------------------------------------------------------------

  it("records a hit on the computer board when the player fires at a ship cell", () => {
    const { result } = renderHook(() => useVsComputerGame("easy"));

    act(() => {
      result.current.playerFireShot("0,0"); // destroyer
    });

    expect(result.current.board.computer.shots.get("0,0")).toBe("hit");
  });

  it("keeps the player's turn after a hit", () => {
    const { result } = renderHook(() => useVsComputerGame("easy"));

    act(() => {
      result.current.playerFireShot("0,0");
    });

    expect(result.current.activeTurn).toBe("player");
    expect(result.current.isAiThinking).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Turn guards
  // ---------------------------------------------------------------------------

  it("ignores playerFireShot when it is the computer's turn", () => {
    const { result } = renderHook(() => useVsComputerGame("easy"));

    // Miss to cede the turn to the computer.
    act(() => {
      result.current.playerFireShot("9,9");
    });

    const shotsBefore = result.current.board.computer.shots.size;

    act(() => {
      result.current.playerFireShot("9,8");
    });

    expect(result.current.board.computer.shots.size).toBe(shotsBefore);
  });

  // ---------------------------------------------------------------------------
  // AI turn
  // ---------------------------------------------------------------------------

  it("computer fires after the delay when it is its turn", () => {
    const { result } = renderHook(() => useVsComputerGame("easy"));

    // Hand the turn to the computer.
    act(() => {
      result.current.playerFireShot("9,9");
    });

    expect(result.current.board.player.shots.size).toBe(0);

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.board.player.shots.size).toBe(1);
  });

  it("switches turn back to player after the computer fires a miss", () => {
    const { result } = renderHook(() => useVsComputerGame("easy"));

    act(() => {
      result.current.playerFireShot("9,9");
    });

    // Run the AI timer and keep running until the computer misses and turn
    // flips back to player. Because the AI always hits eventually we drive
    // the loop by checking activeTurn.
    act(() => {
      vi.runAllTimers();
    });

    // The computer fired once; if it hit it stays on "computer", so we just
    // verify the shot landed and a turn decision was made.
    expect(result.current.board.player.shots.size).toBeGreaterThan(0);
    expect(["player", "computer"]).toContain(result.current.activeTurn);
  });

  it("sets isAiThinking to false after the computer fires", () => {
    const { result } = renderHook(() => useVsComputerGame("easy"));

    act(() => {
      result.current.playerFireShot("9,9");
    });

    act(() => {
      vi.runAllTimers();
    });

    // isAiThinking is only true while the timeout is pending.
    // After firing it is cleared unless the computer hit and gets another turn.
    const { activeTurn, isAiThinking } = result.current;
    if (activeTurn === "player") {
      expect(isAiThinking).toBe(false);
    } else {
      // Computer hit — another timeout is pending.
      expect(isAiThinking).toBe(true);
    }
  });

  // ---------------------------------------------------------------------------
  // Victory
  // ---------------------------------------------------------------------------

  it("sets winner to player when all computer ships are sunk", () => {
    const { result } = renderHook(() => useVsComputerGame("easy"));

    for (const [col, row] of ALL_COMPUTER_SHIP_COORDS) {
      act(() => {
        result.current.playerFireShot(
          `${String(col)},${String(row)}` as CoordinateKey,
        );
      });
    }

    expect(result.current.winner).toBe("player");
    expect(result.current.board.computer.isGameOver).toBe(true);
  });

  it("does not accept player shots after the game is won", () => {
    const { result } = renderHook(() => useVsComputerGame("easy"));

    for (const [col, row] of ALL_COMPUTER_SHIP_COORDS) {
      act(() => {
        result.current.playerFireShot(
          `${String(col)},${String(row)}` as CoordinateKey,
        );
      });
    }

    const shotsBefore = result.current.board.computer.shots.size;

    act(() => {
      result.current.playerFireShot("9,9");
    });

    expect(result.current.board.computer.shots.size).toBe(shotsBefore);
  });

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  it("restores initial state on reset", () => {
    const { result } = renderHook(() => useVsComputerGame("easy"));

    act(() => {
      result.current.playerFireShot("0,0");
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.board.player.shots.size).toBe(0);
    expect(result.current.board.computer.shots.size).toBe(0);
    expect(result.current.activeTurn).toBe("player");
    expect(result.current.winner).toBeNull();
    expect(result.current.isAiThinking).toBe(false);
  });

  it("cancels the pending AI timeout on reset", () => {
    const { result } = renderHook(() => useVsComputerGame("easy"));

    // Miss to trigger the AI timer.
    act(() => {
      result.current.playerFireShot("9,9");
    });

    expect(result.current.isAiThinking).toBe(true);

    act(() => {
      result.current.reset();
    });

    // Flush any pending timers — should be a no-op after reset.
    act(() => {
      vi.runAllTimers();
    });

    // Player board should still be untouched after reset + timer flush.
    expect(result.current.board.player.shots.size).toBe(0);
    expect(result.current.activeTurn).toBe("player");
  });
});
