import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BattleshipGame } from "@/components/game/BattleshipGame";
import type { UserEvent } from "@testing-library/user-event";

// Known ship positions from RAW_GAME_CONFIG — these coordinates are stable
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

// All 17 ship cells in order — used by game-over tests.
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

describe("BattleshipGame", () => {
  // ---------------------------------------------------------------------------
  // Difficulty — grid dimensions
  // ---------------------------------------------------------------------------

  it("renders a 15×15 grid for moderate difficulty", () => {
    render(<BattleshipGame difficulty="moderate" />);
    const grid = screen.getByRole("grid", { name: /Battleship board/i });
    expect(grid).toHaveAttribute("aria-rowcount", "15");
    expect(grid).toHaveAttribute("aria-colcount", "15");
    expect(screen.getAllByRole("button")).toHaveLength(225);
  });

  // ---------------------------------------------------------------------------
  // Initial render
  // ---------------------------------------------------------------------------

  it("renders the game heading", () => {
    render(<BattleshipGame difficulty="easy" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Battleship" }),
    ).toBeInTheDocument();
  });

  it("shows the initial instruction before any shots are fired", () => {
    render(<BattleshipGame difficulty="easy" />);
    expect(screen.getByText("Select a cell to fire.")).toBeInTheDocument();
  });

  it("renders the game board", () => {
    render(<BattleshipGame difficulty="easy" />);
    expect(
      screen.getByRole("grid", { name: /Battleship board/i }),
    ).toBeInTheDocument();
  });

  it("renders the fleet status panel", () => {
    render(<BattleshipGame difficulty="easy" />);
    expect(
      screen.getByRole("region", { name: /Fleet status/i }),
    ).toBeInTheDocument();
  });

  it("does not render the Play again button before the game is over", () => {
    render(<BattleshipGame difficulty="easy" />);
    expect(
      screen.queryByRole("button", { name: /Play again/i }),
    ).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Miss
  // ---------------------------------------------------------------------------

  it("marks an empty cell as miss after firing", async () => {
    const user = userEvent.setup();
    render(<BattleshipGame difficulty="easy" />);
    // J10 (9,9) has no ship
    await user.click(cellByCoord("9,9"));
    expect(cellByCoord("9,9")).toBeDisabled();
    expect(cellByCoord("9,9")).toHaveAccessibleName(/miss/i);
  });

  it("increments the shot count after a miss", async () => {
    const user = userEvent.setup();
    render(<BattleshipGame difficulty="easy" />);
    await user.click(cellByCoord("9,9"));
    expect(screen.getByText("1 shot fired.")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Hit
  // ---------------------------------------------------------------------------

  it("marks a ship cell as hit after firing", async () => {
    const user = userEvent.setup();
    render(<BattleshipGame difficulty="easy" />);
    // A1 (0,0) — destroyer bow
    await user.click(cellByCoord("0,0"));
    expect(cellByCoord("0,0")).toBeDisabled();
    expect(cellByCoord("0,0")).toHaveAccessibleName(/hit/i);
  });

  it("increments the shot count after a hit", async () => {
    const user = userEvent.setup();
    render(<BattleshipGame difficulty="easy" />);
    await user.click(cellByCoord("0,0"));
    expect(screen.getByText("1 shot fired.")).toBeInTheDocument();
  });

  it("updates the fleet status hit count after a hit", async () => {
    const user = userEvent.setup();
    render(<BattleshipGame difficulty="easy" />);
    await user.click(cellByCoord("0,0"));
    expect(screen.getByLabelText(/Destroyer: 1 of 2 hit/i)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Sunk ship
  // ---------------------------------------------------------------------------

  it("marks a ship as sunk once all its cells are hit", async () => {
    const user = userEvent.setup();
    render(<BattleshipGame difficulty="easy" />);
    await fireCoords(user, ["0,0", "1,0"]); // destroyer
    expect(screen.getByLabelText(/Destroyer: sunk/i)).toBeInTheDocument();
    expect(screen.getByText("Sunk")).toBeInTheDocument();
  });

  it("does not mark a partially hit ship as sunk", async () => {
    const user = userEvent.setup();
    render(<BattleshipGame difficulty="easy" />);
    await user.click(cellByCoord("0,0")); // one of two destroyer cells
    expect(screen.queryByText("Sunk")).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Game over
  // ---------------------------------------------------------------------------

  it("shows the game-over message after all ships are sunk", async () => {
    const user = userEvent.setup();
    render(<BattleshipGame difficulty="easy" />);
    await fireCoords(user, ALL_SHIP_COORDS);
    expect(screen.getByText("All ships sunk!")).toBeInTheDocument();
  });

  it("shows the Play again button after all ships are sunk", async () => {
    const user = userEvent.setup();
    render(<BattleshipGame difficulty="easy" />);
    await fireCoords(user, ALL_SHIP_COORDS);
    expect(
      screen.getByRole("button", { name: /Play again/i }),
    ).toBeInTheDocument();
  });

  it("resets the board when Play again is clicked", async () => {
    const user = userEvent.setup();
    render(<BattleshipGame difficulty="easy" />);
    await fireCoords(user, ALL_SHIP_COORDS);
    await user.click(screen.getByRole("button", { name: /Play again/i }));
    expect(screen.getByText("Select a cell to fire.")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button").filter((b) => !b.hasAttribute("disabled")),
    ).toHaveLength(100);
  });
});
