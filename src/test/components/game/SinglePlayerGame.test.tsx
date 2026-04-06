import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SinglePlayerGame } from "@/components/game/SinglePlayerGame";
import type { UserEvent } from "@testing-library/user-event";

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

// Known ship positions from RAW_GAME_CONFIG: these coordinates are stable
// for the lifetime of the assignment. Using them directly keeps tests readable
// and avoids re-importing the raw config just to derive what we already know.
//
//   destroyer:  A1 (0,0)  B1 (1,0)
//   submarine:  D1 (3,0)  D2 (3,1)  D3 (3,2)
//   cruiser:    I2 (8,1)  I3 (8,2)  I4 (8,3)
//   battleship: F3 (5,2)  F4 (5,3)  F5 (5,4)  F6 (5,5)
//   carrier:    C10(2,9)  D10(3,9)  E10(4,9)  F10(5,9)  G10(6,9)
//
// Querying by data-coord is unambiguous and immune to aria-label wording
// changes. It also avoids the regex-ambiguity problem where /A1/ matches
// both "A1, not fired…" and "A10, not fired…".

function cellByCoord(coord: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-coord="${coord}"]`);
  if (!el) throw new Error(`No cell found with data-coord="${coord}"`);
  return el;
}

async function fireCoords(user: UserEvent, coords: string[]): Promise<void> {
  for (const coord of coords) {
    await user.click(cellByCoord(coord));
  }
}

// All 17 ship cells in order, used by game-over tests.
const ALL_SHIP_COORDS = [
  "0,0",
  "1,0", // destroyer
  "3,0",
  "3,1",
  "3,2", // submarine
  "8,1",
  "8,2",
  "8,3", // cruiser
  "5,2",
  "5,3",
  "5,4",
  "5,5", // battleship
  "2,9",
  "3,9",
  "4,9",
  "5,9",
  "6,9", // carrier
];

describe("SinglePlayerGame", () => {
  it("renders a 15×15 grid for moderate difficulty", () => {
    render(<SinglePlayerGame difficulty="moderate" onStatusChange={vi.fn()} />);
    const grid = screen.getByRole("grid", { name: /Battleship board/i });
    expect(grid).toHaveAttribute("aria-rowcount", "15");
    expect(grid).toHaveAttribute("aria-colcount", "15");
    expect(screen.getAllByRole("button")).toHaveLength(225);
  });

  it("renders the game board", () => {
    render(<SinglePlayerGame difficulty="easy" onStatusChange={vi.fn()} />);
    expect(
      screen.getByRole("grid", { name: /Battleship board/i }),
    ).toBeInTheDocument();
  });

  it("renders the fleet status panel", () => {
    render(<SinglePlayerGame difficulty="easy" onStatusChange={vi.fn()} />);
    expect(
      screen.getByRole("region", { name: /Fleet status/i }),
    ).toBeInTheDocument();
  });

  it("does not render the Play again button before the game is over", () => {
    render(<SinglePlayerGame difficulty="easy" onStatusChange={vi.fn()} />);
    expect(
      screen.queryByRole("button", { name: /Play again/i }),
    ).not.toBeInTheDocument();
  });

  it("marks an empty cell as miss after firing", async () => {
    const user = userEvent.setup();
    render(<SinglePlayerGame difficulty="easy" onStatusChange={vi.fn()} />);
    // J10 (9,9) has no ship
    await user.click(cellByCoord("9,9"));
    expect(cellByCoord("9,9")).toBeDisabled();
    expect(cellByCoord("9,9")).toHaveAccessibleName(/miss/i);
  });

  it("marks a ship cell as hit after firing", async () => {
    const user = userEvent.setup();
    render(<SinglePlayerGame difficulty="easy" onStatusChange={vi.fn()} />);
    // A1 (0,0): destroyer bow
    await user.click(cellByCoord("0,0"));
    expect(cellByCoord("0,0")).toBeDisabled();
    expect(cellByCoord("0,0")).toHaveAccessibleName(/hit/i);
  });

  it("updates the fleet status hit count after a hit", async () => {
    const user = userEvent.setup();
    render(<SinglePlayerGame difficulty="easy" onStatusChange={vi.fn()} />);
    await user.click(cellByCoord("0,0"));
    expect(screen.getByLabelText(/Destroyer: 1 of 2 hit/i)).toBeInTheDocument();
  });

  it("marks a ship as sunk once all its cells are hit", async () => {
    const user = userEvent.setup();
    render(<SinglePlayerGame difficulty="easy" onStatusChange={vi.fn()} />);
    await fireCoords(user, ["0,0", "1,0"]); // destroyer
    expect(screen.getByLabelText(/Destroyer: sunk/i)).toBeInTheDocument();
    expect(screen.getByText("Sunk")).toBeInTheDocument();
  });

  it("does not mark a partially hit ship as sunk", async () => {
    const user = userEvent.setup();
    render(<SinglePlayerGame difficulty="easy" onStatusChange={vi.fn()} />);
    await user.click(cellByCoord("0,0")); // one of two destroyer cells
    expect(screen.queryByText("Sunk")).not.toBeInTheDocument();
  });

  it("shows the Play again button after all ships are sunk", async () => {
    const user = userEvent.setup();
    render(<SinglePlayerGame difficulty="easy" onStatusChange={vi.fn()} />);
    await fireCoords(user, ALL_SHIP_COORDS);
    expect(
      screen.getByRole("button", { name: /Play again/i }),
    ).toBeInTheDocument();
  });

  it("resets the board when Play again is clicked", async () => {
    const user = userEvent.setup();
    render(<SinglePlayerGame difficulty="easy" onStatusChange={vi.fn()} />);
    await fireCoords(user, ALL_SHIP_COORDS);
    await user.click(screen.getByRole("button", { name: /Play again/i }));
    expect(
      screen.getAllByRole("button").filter((b) => !b.hasAttribute("disabled")),
    ).toHaveLength(100);
  });

  it("calls onStatusChange with initial status on mount", () => {
    const onStatusChange = vi.fn();
    render(
      <SinglePlayerGame difficulty="easy" onStatusChange={onStatusChange} />,
    );
    expect(onStatusChange.mock.lastCall).toEqual([
      { mode: "single", isGameOver: false, shotCount: 0 },
    ]);
  });

  it("calls onStatusChange with updated shotCount after a shot", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    render(
      <SinglePlayerGame difficulty="easy" onStatusChange={onStatusChange} />,
    );
    await user.click(cellByCoord("9,9"));
    expect(onStatusChange.mock.lastCall).toEqual([
      { mode: "single", isGameOver: false, shotCount: 1 },
    ]);
  });

  it("calls onStatusChange with isGameOver: true after all ships are sunk", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    render(
      <SinglePlayerGame difficulty="easy" onStatusChange={onStatusChange} />,
    );
    await fireCoords(user, ALL_SHIP_COORDS);
    expect(onStatusChange.mock.lastCall).toEqual([
      { mode: "single", isGameOver: true, shotCount: 17 },
    ]);
  });
});
