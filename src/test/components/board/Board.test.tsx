import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Board } from "@/components/board/Board";
import type { CellStatus, CoordinateKey } from "@/features/battleship/types";

const noShots = new Map<CoordinateKey, CellStatus>();

describe("Board", () => {
  // ---------------------------------------------------------------------------
  // Structure
  // ---------------------------------------------------------------------------

  it("renders a grid element", () => {
    render(<Board shots={noShots} onFire={vi.fn()} isGameOver={false} />);
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("has an accessible name that describes keyboard navigation", () => {
    render(<Board shots={noShots} onFire={vi.fn()} isGameOver={false} />);
    expect(
      screen.getByRole("grid", { name: /Battleship board/i }),
    ).toBeInTheDocument();
  });

  it("renders exactly 100 cell buttons", () => {
    render(<Board shots={noShots} onFire={vi.fn()} isGameOver={false} />);
    expect(screen.getAllByRole("button")).toHaveLength(100);
  });

  it("renders 10 row groups", () => {
    render(<Board shots={noShots} onFire={vi.fn()} isGameOver={false} />);
    // The column header row carries aria-hidden="true" so it is excluded from
    // the accessibility tree. Only the 10 data rows are visible to the query.
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(10);
  });

  // ---------------------------------------------------------------------------
  // Cell state reflection
  // ---------------------------------------------------------------------------

  it("renders all cells as untouched (not disabled) on an empty shot map", () => {
    render(<Board shots={noShots} onFire={vi.fn()} isGameOver={false} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.every((b) => !b.hasAttribute("disabled"))).toBe(true);
  });

  it("disables a cell that has been hit", () => {
    const shots = new Map<CoordinateKey, CellStatus>([["0,0", "hit"]]);
    render(<Board shots={shots} onFire={vi.fn()} isGameOver={false} />);
    expect(screen.getByRole("button", { name: /A1.*hit/i })).toBeDisabled();
  });

  it("disables a cell that has been missed", () => {
    const shots = new Map<CoordinateKey, CellStatus>([["9,9", "miss"]]);
    render(<Board shots={shots} onFire={vi.fn()} isGameOver={false} />);
    expect(screen.getByRole("button", { name: /J10.*miss/i })).toBeDisabled();
  });

  it("leaves unfired cells enabled when some cells have been fired", () => {
    const shots = new Map<CoordinateKey, CellStatus>([["0,0", "hit"]]);
    render(<Board shots={shots} onFire={vi.fn()} isGameOver={false} />);
    // B1 (1,0) has not been fired.
    // The comma anchor prevents /B1/ from also matching "B10, not fired…".
    expect(screen.getByRole("button", { name: /B1,/i })).not.toBeDisabled();
  });

  // ---------------------------------------------------------------------------
  // Firing
  // ---------------------------------------------------------------------------

  it("calls onFire with the cell coordinate when a cell is clicked", async () => {
    const user = userEvent.setup();
    const onFire = vi.fn();
    render(<Board shots={noShots} onFire={onFire} isGameOver={false} />);
    // Use /A1,/ — /A1/i alone also matches "A10, not fired…".
    await user.click(screen.getByRole("button", { name: /A1,/i }));
    expect(onFire).toHaveBeenCalledWith("0,0");
  });

  it("calls onFire with the correct coordinate for a non-origin cell", async () => {
    const user = userEvent.setup();
    const onFire = vi.fn();
    render(<Board shots={noShots} onFire={onFire} isGameOver={false} />);
    // J10 = col 9, row 9
    await user.click(screen.getByRole("button", { name: /J10.*not fired/i }));
    expect(onFire).toHaveBeenCalledWith("9,9");
  });

  it("does not call onFire when a fired cell is clicked", async () => {
    const user = userEvent.setup();
    const onFire = vi.fn();
    const shots = new Map<CoordinateKey, CellStatus>([["0,0", "hit"]]);
    render(<Board shots={shots} onFire={onFire} isGameOver={false} />);
    await user.click(screen.getByRole("button", { name: /A1.*hit/i }));
    expect(onFire).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Game over state
  // ---------------------------------------------------------------------------

  it("sets aria-readonly to true when game is over", () => {
    render(<Board shots={noShots} onFire={vi.fn()} isGameOver={true} />);
    expect(screen.getByRole("grid")).toHaveAttribute("aria-readonly", "true");
  });

  it("sets aria-readonly to false when game is in progress", () => {
    render(<Board shots={noShots} onFire={vi.fn()} isGameOver={false} />);
    expect(screen.getByRole("grid")).toHaveAttribute("aria-readonly", "false");
  });
});
