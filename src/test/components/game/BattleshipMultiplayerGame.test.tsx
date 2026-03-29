import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { BattleshipMultiplayerGame } from "@/components/game/BattleshipMultiplayerGame";

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

// ---------------------------------------------------------------------------
// Mock the AI service so the computer always fires at a known empty cell
// and the shot is deterministic across all tests.
//
// "9,8" is used — it is never a ship coordinate in either fleet, so it will
// always be a miss, returning the turn to the player after the delay.
// ---------------------------------------------------------------------------
vi.mock("@/features/battleship/services/ai", () => ({
  chooseRandomUnfiredCoordinate: vi.fn(() => "9,8" as const),
}));

// ---------------------------------------------------------------------------
// Mock the session hook module to set AI_SHOT_DELAY_MS to 0.
// This avoids fake timers entirely — the setTimeout fires in the same
// event loop tick so tests don't need to manually advance time.
// ---------------------------------------------------------------------------
vi.mock("@/features/battleship/hooks/useBattleshipSessionGame", async () => {
  const actual = await vi.importActual(
    "@/features/battleship/hooks/useBattleshipSessionGame",
  );
  return { ...actual, AI_SHOT_DELAY_MS: 0 };
});

// Ship positions — identical on both boards (shared fleet):
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

describe("BattleshipMultiplayerGame", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Initial render
  // ---------------------------------------------------------------------------

  it("renders the heading", () => {
    render(<BattleshipMultiplayerGame difficulty="easy" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Battleship" }),
    ).toBeInTheDocument();
  });

  it("renders both board sections", () => {
    render(<BattleshipMultiplayerGame difficulty="easy" />);
    expect(yourBoard()).toBeInTheDocument();
    expect(opponentBoard()).toBeInTheDocument();
  });

  it("renders two fleet status panels", () => {
    render(<BattleshipMultiplayerGame difficulty="easy" />);
    expect(
      screen.getAllByRole("region", { name: /Fleet status/i }),
    ).toHaveLength(2);
  });

  it("shows the player turn prompt on load", () => {
    render(<BattleshipMultiplayerGame difficulty="easy" />);
    expect(
      screen.getByText("Your turn — select a cell to fire."),
    ).toBeInTheDocument();
  });

  it("renders the Restart button on load", () => {
    render(<BattleshipMultiplayerGame difficulty="easy" />);
    expect(screen.getByRole("button", { name: "Restart" })).toBeInTheDocument();
  });

  it("all player board cells are disabled on load", () => {
    render(<BattleshipMultiplayerGame difficulty="easy" />);
    const grid = within(yourBoard()).getByRole("grid");
    const buttons = within(grid).getAllByRole("button");
    expect(buttons.every((b) => b.hasAttribute("disabled"))).toBe(true);
  });

  it("opponent board cells are enabled on the player's turn", () => {
    render(<BattleshipMultiplayerGame difficulty="easy" />);
    const buttons = within(opponentBoard()).getAllByRole("button");
    expect(buttons.some((b) => !b.hasAttribute("disabled"))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Player fires — hit (keeps turn)
  // ---------------------------------------------------------------------------

  it("marks the opponent cell as hit when the player hits a ship", async () => {
    const user = userEvent.setup();
    render(<BattleshipMultiplayerGame difficulty="easy" />);

    await user.click(cellIn(opponentBoard(), "0,0")); // destroyer

    expect(cellIn(opponentBoard(), "0,0")).toHaveAccessibleName(/hit/i);
  });

  it("keeps the player's turn after a hit", async () => {
    const user = userEvent.setup();
    render(<BattleshipMultiplayerGame difficulty="easy" />);

    await user.click(cellIn(opponentBoard(), "0,0"));

    expect(
      screen.getByText("Your turn — select a cell to fire."),
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Player fires — miss (hands turn to computer)
  // ---------------------------------------------------------------------------

  it("marks the opponent cell as miss when the player fires at empty water", async () => {
    const user = userEvent.setup();
    render(<BattleshipMultiplayerGame difficulty="easy" />);

    await user.click(cellIn(opponentBoard(), "9,9"));

    expect(cellIn(opponentBoard(), "9,9")).toHaveAccessibleName(/miss/i);
  });

  it("shows the computer thinking status immediately after a player miss", async () => {
    const user = userEvent.setup();
    render(<BattleshipMultiplayerGame difficulty="easy" />);

    await user.click(cellIn(opponentBoard(), "9,9"));

    expect(screen.getByText("Computer is thinking…")).toBeInTheDocument();
  });

  it("disables all opponent board cells while the computer is thinking", async () => {
    const user = userEvent.setup();
    render(<BattleshipMultiplayerGame difficulty="easy" />);

    await user.click(cellIn(opponentBoard(), "9,9"));

    const grid = within(opponentBoard()).getByRole("grid");
    const buttons = within(grid).getAllByRole("button");
    expect(buttons.every((b) => b.hasAttribute("disabled"))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Computer fires (AI_SHOT_DELAY_MS = 0, coordinate = "9,8")
  // ---------------------------------------------------------------------------

  it("computer fires on the player board after the delay", async () => {
    const user = userEvent.setup();
    render(<BattleshipMultiplayerGame difficulty="easy" />);

    await user.click(cellIn(opponentBoard(), "9,9")); // miss

    // With delay=0 the shot fires in the next tick.
    await waitFor(() => {
      expect(cellIn(yourBoard(), "9,8")).toHaveAccessibleName(/miss/i);
    });
  });

  it("returns the turn to the player after the computer misses", async () => {
    const user = userEvent.setup();
    render(<BattleshipMultiplayerGame difficulty="easy" />);

    await user.click(cellIn(opponentBoard(), "9,9"));

    await waitFor(
      () => {
        expect(
          screen.getByText("Your turn — select a cell to fire."),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  // ---------------------------------------------------------------------------
  // Sunk ship on opponent board
  // ---------------------------------------------------------------------------

  it("marks the destroyer as sunk after both cells are hit", async () => {
    const user = userEvent.setup();
    render(<BattleshipMultiplayerGame difficulty="easy" />);

    await user.click(cellIn(opponentBoard(), "0,0"));
    await user.click(cellIn(opponentBoard(), "1,0"));

    expect(
      within(opponentBoard()).getByLabelText(/Destroyer: sunk/i),
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Player wins
  // ---------------------------------------------------------------------------

  it("shows the win message after all opponent ships are sunk", async () => {
    const user = userEvent.setup();
    render(<BattleshipMultiplayerGame difficulty="easy" />);

    for (const coord of ALL_COMPUTER_SHIP_COORDS) {
      await user.click(cellIn(opponentBoard(), coord));
    }

    expect(
      screen.getByText("You win! All enemy ships sunk."),
    ).toBeInTheDocument();
  });

  it("disables all opponent cells after the player wins", async () => {
    const user = userEvent.setup();
    render(<BattleshipMultiplayerGame difficulty="easy" />);

    for (const coord of ALL_COMPUTER_SHIP_COORDS) {
      await user.click(cellIn(opponentBoard(), coord));
    }

    const buttons = within(opponentBoard()).getAllByRole("button");
    expect(buttons.every((b) => b.hasAttribute("disabled"))).toBe(true);
  });

  it("shows Play again button after the player wins", async () => {
    const user = userEvent.setup();
    render(<BattleshipMultiplayerGame difficulty="easy" />);

    for (const coord of ALL_COMPUTER_SHIP_COORDS) {
      await user.click(cellIn(opponentBoard(), coord));
    }

    expect(
      screen.getByRole("button", { name: "Play again" }),
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  it("resets both boards when Restart is clicked", async () => {
    const user = userEvent.setup();
    render(<BattleshipMultiplayerGame difficulty="easy" />);

    await user.click(cellIn(opponentBoard(), "0,0"));
    await user.click(screen.getByRole("button", { name: "Restart" }));

    expect(
      screen.getByText("Your turn — select a cell to fire."),
    ).toBeInTheDocument();
    expect(cellIn(opponentBoard(), "0,0")).toHaveAccessibleName(/not fired/i);
  });

  it("cancels the pending AI shot on reset", async () => {
    const user = userEvent.setup();
    render(<BattleshipMultiplayerGame difficulty="easy" />);

    await user.click(cellIn(opponentBoard(), "9,9")); // miss — AI timer starts
    await user.click(screen.getByRole("button", { name: "Restart" }));

    // Give the event loop a tick — if the timer weren't cancelled the AI
    // shot would land here.
    await waitFor(() => {
      expect(
        screen.getByText("Your turn — select a cell to fire."),
      ).toBeInTheDocument();
    });

    const firedOnPlayerBoard = within(yourBoard())
      .getAllByRole("button")
      .filter((b) => /hit|miss/i.test(b.getAttribute("aria-label") ?? ""));

    expect(firedOnPlayerBoard).toHaveLength(0);
  });
});
