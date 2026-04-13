import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { VsComputerGame } from "@/components/game/VsComputerGame";

vi.mock("@nuka-ui/core", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...(actual as Record<string, unknown>), toast: vi.fn() };
});
import { AI_SHOT_DELAY_MS } from "@/battleship/hooks/useVsComputerGame";

// Mock placement to return the same deterministic layout used by the
// original static config. This keeps all existing coordinate-based
// assertions valid after the switch to randomised placement.
vi.mock("@/battleship/services/placement", async () => {
  const { parseLayout } = await import("@/battleship/data/layout");
  const { RAW_GAME_CONFIG } = await import("@/battleship/data/config");
  return {
    generateRandomLayout: vi.fn(() => parseLayout(RAW_GAME_CONFIG, 10)),
  };
});

// Mock the AI service so the computer always fires at a known empty cell
// and the shot is deterministic across all tests.
//
// "9,8" is used: it is never a ship coordinate in either fleet, so it will
// always be a miss, returning the turn to the player after the delay.
vi.mock("@/battleship/services/ai", () => ({
  chooseRandomUnfiredCoordinate: vi.fn(() => "9,8" as const),
}));

// Ship positions, identical on both boards (shared fleet):
//   destroyer:  [0,0] [1,0]
//   submarine:  [3,0] [3,1] [3,2]
//   cruiser:    [8,1] [8,2] [8,3]
//   battleship: [5,2] [5,3] [5,4] [5,5]
//   carrier:    [2,9] [3,9] [4,9] [5,9] [6,9]

const ALL_COMPUTER_SHIP_COORDS = [
  "0,0",
  "1,0",
  "3,0",
  "3,1",
  "3,2",
  "8,1",
  "8,2",
  "8,3",
  "5,2",
  "5,3",
  "5,4",
  "5,5",
  "2,9",
  "3,9",
  "4,9",
  "5,9",
  "6,9",
];

function yourBoard() {
  return screen.getByRole("region", { name: "Your board" });
}

function opponentBoard() {
  return screen.getByRole("region", { name: "Opponent's board" });
}

function cellIn(section: HTMLElement, coord: string): HTMLElement {
  const el = section.querySelector<HTMLElement>(`[data-coord="${coord}"]`);
  if (!el) throw new Error(`No cell with data-coord="${coord}" in section`);
  return el;
}

// Timer strategy
//
// The vs-computer hook's AI turn fires after a real setTimeout(AI_SHOT_DELAY_MS).
// Using vi.useFakeTimers() with shouldAdvanceTime: true lets the fake clock
// track wall-clock time so userEvent's internal delays resolve naturally,
// while still allowing manual advancement via vi.advanceTimersByTime() to
// flush the AI timer deterministically without waiting the full 1000ms.

describe("VsComputerGame", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders both board sections", () => {
    render(<VsComputerGame difficulty="easy" onStatusChange={vi.fn()} />);
    expect(yourBoard()).toBeInTheDocument();
    expect(opponentBoard()).toBeInTheDocument();
  });

  it("renders two fleet status panels", () => {
    render(<VsComputerGame difficulty="easy" onStatusChange={vi.fn()} />);
    expect(
      screen.getAllByRole("region", { name: /Fleet status/i }),
    ).toHaveLength(2);
  });

  it("renders the Restart button on load", () => {
    render(<VsComputerGame difficulty="easy" onStatusChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Restart" })).toBeInTheDocument();
  });

  it("all player board cells are disabled on load", () => {
    render(<VsComputerGame difficulty="easy" onStatusChange={vi.fn()} />);
    const grid = within(yourBoard()).getByRole("grid");
    const buttons = within(grid).getAllByRole("button");
    expect(buttons.every((b) => b.hasAttribute("disabled"))).toBe(true);
  });

  it("opponent board cells are enabled on the player's turn", () => {
    render(<VsComputerGame difficulty="easy" onStatusChange={vi.fn()} />);
    const buttons = within(opponentBoard()).getAllByRole("button");
    expect(buttons.some((b) => !b.hasAttribute("disabled"))).toBe(true);
  });

  it("marks the opponent cell as hit when the player hits a ship", async () => {
    const user = userEvent.setup();
    render(<VsComputerGame difficulty="easy" onStatusChange={vi.fn()} />);

    await user.click(cellIn(opponentBoard(), "0,0")); // destroyer

    expect(cellIn(opponentBoard(), "0,0")).toHaveAccessibleName(/hit/i);
  });

  it("marks the opponent cell as miss when the player fires at empty water", async () => {
    const user = userEvent.setup();
    render(<VsComputerGame difficulty="easy" onStatusChange={vi.fn()} />);

    await user.click(cellIn(opponentBoard(), "9,9"));

    expect(cellIn(opponentBoard(), "9,9")).toHaveAccessibleName(/miss/i);
  });

  it("disables all opponent board cells while the computer is thinking", async () => {
    const user = userEvent.setup();
    render(<VsComputerGame difficulty="easy" onStatusChange={vi.fn()} />);

    await user.click(cellIn(opponentBoard(), "9,9"));

    const grid = within(opponentBoard()).getByRole("grid");
    const buttons = within(grid).getAllByRole("button");
    expect(buttons.every((b) => b.hasAttribute("disabled"))).toBe(true);
  });

  it("computer fires on the player board after the delay", async () => {
    const user = userEvent.setup();
    render(<VsComputerGame difficulty="easy" onStatusChange={vi.fn()} />);

    await user.click(cellIn(opponentBoard(), "9,9")); // miss

    act(() => {
      vi.advanceTimersByTime(AI_SHOT_DELAY_MS);
    });

    expect(cellIn(yourBoard(), "9,8")).toHaveAccessibleName(/miss/i);
  });

  it("marks the destroyer as sunk after both cells are hit", async () => {
    const user = userEvent.setup();
    render(<VsComputerGame difficulty="easy" onStatusChange={vi.fn()} />);

    await user.click(cellIn(opponentBoard(), "0,0"));
    await user.click(cellIn(opponentBoard(), "1,0"));

    expect(
      within(opponentBoard()).getByLabelText(/Destroyer: sunk/i),
    ).toBeInTheDocument();
  });

  it("disables all opponent cells after the player wins", async () => {
    const user = userEvent.setup();
    render(<VsComputerGame difficulty="easy" onStatusChange={vi.fn()} />);

    for (const coord of ALL_COMPUTER_SHIP_COORDS) {
      await user.click(cellIn(opponentBoard(), coord));
    }

    const buttons = within(opponentBoard()).getAllByRole("button");
    expect(buttons.every((b) => b.hasAttribute("disabled"))).toBe(true);
  }, 15000);

  it("shows Play again button after the player wins", async () => {
    const user = userEvent.setup();
    render(<VsComputerGame difficulty="easy" onStatusChange={vi.fn()} />);

    for (const coord of ALL_COMPUTER_SHIP_COORDS) {
      await user.click(cellIn(opponentBoard(), coord));
    }

    expect(
      screen.getByRole("button", { name: "Play again" }),
    ).toBeInTheDocument();
  }, 15000);

  it("resets both boards when Restart is clicked", async () => {
    const user = userEvent.setup();
    render(<VsComputerGame difficulty="easy" onStatusChange={vi.fn()} />);

    await user.click(cellIn(opponentBoard(), "0,0"));
    await user.click(screen.getByRole("button", { name: "Restart" }));

    expect(cellIn(opponentBoard(), "0,0")).toHaveAccessibleName(/not fired/i);
  });

  it("cancels the pending AI shot on reset", async () => {
    const user = userEvent.setup();
    render(<VsComputerGame difficulty="easy" onStatusChange={vi.fn()} />);

    await user.click(cellIn(opponentBoard(), "9,9")); // miss, AI timer starts
    await user.click(screen.getByRole("button", { name: "Restart" }));

    // Flush the cancelled timer: if the timeout weren't cleared by reset,
    // the AI shot would land and mark a cell on the player board.
    act(() => {
      vi.advanceTimersByTime(AI_SHOT_DELAY_MS);
    });

    const firedOnPlayerBoard = within(yourBoard())
      .getAllByRole("button")
      .filter((b) => /hit|miss/i.test(b.getAttribute("aria-label") ?? ""));

    expect(firedOnPlayerBoard).toHaveLength(0);
  });

  it("calls onStatusChange with initial vs-computer status on mount", () => {
    const onStatusChange = vi.fn();
    render(
      <VsComputerGame difficulty="easy" onStatusChange={onStatusChange} />,
    );
    expect(onStatusChange.mock.lastCall).toEqual([
      {
        mode: "vsComputer",
        winner: null,
        activeTurn: "player",
        isAiThinking: false,
      },
    ]);
  });

  it("calls onStatusChange with isAiThinking: true after a player miss", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    render(
      <VsComputerGame difficulty="easy" onStatusChange={onStatusChange} />,
    );

    await user.click(cellIn(opponentBoard(), "9,9")); // miss, triggers AI turn

    expect(onStatusChange.mock.lastCall).toEqual([
      {
        mode: "vsComputer",
        winner: null,
        activeTurn: "computer",
        isAiThinking: true,
      },
    ]);
  });

  it("uses provided playerShips on the player board", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    // Custom layout: single destroyer at 9,8, exactly where the AI fires
    const customPlayerShips = [
      {
        id: "carrier" as const,
        size: 5,
        coordinates: ["0,0", "1,0", "2,0", "3,0", "4,0"] as const,
        orientation: "horizontal" as const,
      },
      {
        id: "battleship" as const,
        size: 4,
        coordinates: ["0,1", "1,1", "2,1", "3,1"] as const,
        orientation: "horizontal" as const,
      },
      {
        id: "cruiser" as const,
        size: 3,
        coordinates: ["0,2", "1,2", "2,2"] as const,
        orientation: "horizontal" as const,
      },
      {
        id: "submarine" as const,
        size: 3,
        coordinates: ["0,3", "1,3", "2,3"] as const,
        orientation: "horizontal" as const,
      },
      {
        id: "destroyer" as const,
        size: 2,
        coordinates: ["9,8", "9,9"] as const,
        orientation: "vertical" as const,
      },
    ];

    render(
      <VsComputerGame
        difficulty="easy"
        playerShips={customPlayerShips}
        onStatusChange={vi.fn()}
      />,
    );

    // Fire a miss to trigger the AI turn
    await user.click(cellIn(opponentBoard(), "9,9"));

    // Advance past AI delay
    act(() => {
      vi.advanceTimersByTime(AI_SHOT_DELAY_MS);
    });

    // The AI fires at "9,8" (our mocked AI target), which is a destroyer
    // coordinate in our custom layout, so it should register as a hit
    const cell = cellIn(yourBoard(), "9,8");
    expect(cell).toBeDisabled();
  });
});
