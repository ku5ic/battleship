import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Board } from "@/components/board/Board";
import type { CellStatus, CoordinateKey } from "@/battleship/types";

const noShots = new Map<CoordinateKey, CellStatus>();

const LABELS_10 = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const LABELS_15 = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
];
const LABELS_3 = ["A", "B", "C"];

describe("Board", () => {
  // ---------------------------------------------------------------------------
  // Structure
  // ---------------------------------------------------------------------------

  it("renders a grid element", () => {
    render(
      <Board
        boardSize={10}
        columnLabels={LABELS_10}
        shots={noShots}
        onFire={vi.fn()}
      />,
    );
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("has an accessible name that describes keyboard navigation", () => {
    render(
      <Board
        boardSize={10}
        columnLabels={LABELS_10}
        shots={noShots}
        onFire={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("grid", { name: /Battleship board/i }),
    ).toBeInTheDocument();
  });

  it("renders exactly 100 cell buttons", () => {
    render(
      <Board
        boardSize={10}
        columnLabels={LABELS_10}
        shots={noShots}
        onFire={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(100);
  });

  it("renders 10 row groups", () => {
    render(
      <Board
        boardSize={10}
        columnLabels={LABELS_10}
        shots={noShots}
        onFire={vi.fn()}
      />,
    );
    // The column header row carries aria-hidden="true" so it is excluded from
    // the accessibility tree. Only the 10 data rows are visible to the query.
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(10);
  });

  it("renders a 15×15 grid when boardSize is 15", () => {
    render(
      <Board
        boardSize={15}
        columnLabels={LABELS_15}
        shots={noShots}
        onFire={vi.fn()}
      />,
    );
    const grid = screen.getByRole("grid");
    expect(grid).toHaveAttribute("aria-rowcount", "15");
    expect(grid).toHaveAttribute("aria-colcount", "15");
    expect(screen.getAllByRole("button")).toHaveLength(225);
    expect(screen.getAllByRole("row")).toHaveLength(15);
  });

  // ---------------------------------------------------------------------------
  // Cell state reflection
  // ---------------------------------------------------------------------------

  it("renders all cells as untouched (not disabled) on an empty shot map", () => {
    render(
      <Board
        boardSize={10}
        columnLabels={LABELS_10}
        shots={noShots}
        onFire={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons.every((b) => !b.hasAttribute("disabled"))).toBe(true);
  });

  it("disables a cell that has been hit", () => {
    const shots = new Map<CoordinateKey, CellStatus>([["0,0", "hit"]]);
    render(
      <Board
        boardSize={10}
        columnLabels={LABELS_10}
        shots={shots}
        onFire={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /A1.*hit/i })).toBeDisabled();
  });

  it("disables a cell that has been missed", () => {
    const shots = new Map<CoordinateKey, CellStatus>([["9,9", "miss"]]);
    render(
      <Board
        boardSize={10}
        columnLabels={LABELS_10}
        shots={shots}
        onFire={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /J10.*miss/i })).toBeDisabled();
  });

  it("leaves unfired cells enabled when some cells have been fired", () => {
    const shots = new Map<CoordinateKey, CellStatus>([["0,0", "hit"]]);
    render(
      <Board
        boardSize={10}
        columnLabels={LABELS_10}
        shots={shots}
        onFire={vi.fn()}
      />,
    );
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
    render(
      <Board
        boardSize={10}
        columnLabels={LABELS_10}
        shots={noShots}
        onFire={onFire}
      />,
    );
    // Use /A1,/ — /A1/i alone also matches "A10, not fired…".
    await user.click(screen.getByRole("button", { name: /A1,/i }));
    expect(onFire).toHaveBeenCalledWith("0,0");
  });

  it("calls onFire with the correct coordinate for a non-origin cell", async () => {
    const user = userEvent.setup();
    const onFire = vi.fn();
    render(
      <Board
        boardSize={10}
        columnLabels={LABELS_10}
        shots={noShots}
        onFire={onFire}
      />,
    );
    // J10 = col 9, row 9
    await user.click(screen.getByRole("button", { name: /J10.*not fired/i }));
    expect(onFire).toHaveBeenCalledWith("9,9");
  });

  it("does not call onFire when a fired cell is clicked", async () => {
    const user = userEvent.setup();
    const onFire = vi.fn();
    const shots = new Map<CoordinateKey, CellStatus>([["0,0", "hit"]]);
    render(
      <Board
        boardSize={10}
        columnLabels={LABELS_10}
        shots={shots}
        onFire={onFire}
      />,
    );
    await user.click(screen.getByRole("button", { name: /A1.*hit/i }));
    expect(onFire).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Disabled state
  // ---------------------------------------------------------------------------

  it("sets aria-readonly to true when disabled", () => {
    render(
      <Board
        boardSize={10}
        columnLabels={LABELS_10}
        shots={noShots}
        onFire={vi.fn()}
        disabled
      />,
    );
    expect(screen.getByRole("grid")).toHaveAttribute("aria-readonly", "true");
  });

  it("sets aria-readonly to false when not disabled", () => {
    render(
      <Board
        boardSize={10}
        columnLabels={LABELS_10}
        shots={noShots}
        onFire={vi.fn()}
      />,
    );
    expect(screen.getByRole("grid")).toHaveAttribute("aria-readonly", "false");
  });

  // ---------------------------------------------------------------------------
  // Keyboard navigation
  // ---------------------------------------------------------------------------

  it("moves focus right on ArrowRight", async () => {
    const user = userEvent.setup();
    render(
      <Board
        boardSize={10}
        columnLabels={LABELS_10}
        shots={noShots}
        onFire={vi.fn()}
      />,
    );
    // Focus directly to avoid triggering handleCellFire via click.
    screen.getByRole("button", { name: /A1,/i }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: /B1,/i })).toHaveFocus();
  });

  it("clamps at the right edge of the board", async () => {
    const user = userEvent.setup();
    render(
      <Board
        boardSize={10}
        columnLabels={LABELS_10}
        shots={noShots}
        onFire={vi.fn()}
      />,
    );
    screen.getByRole("button", { name: /J1,/i }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: /J1,/i })).toHaveFocus();
  });

  it("moves focus down on ArrowDown", async () => {
    const user = userEvent.setup();
    render(
      <Board
        boardSize={10}
        columnLabels={LABELS_10}
        shots={noShots}
        onFire={vi.fn()}
      />,
    );
    screen.getByRole("button", { name: /A1,/i }).focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: /A2,/i })).toHaveFocus();
  });

  it("clamps at the top edge of the board", async () => {
    const user = userEvent.setup();
    render(
      <Board
        boardSize={10}
        columnLabels={LABELS_10}
        shots={noShots}
        onFire={vi.fn()}
      />,
    );
    screen.getByRole("button", { name: /A1,/i }).focus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("button", { name: /A1,/i })).toHaveFocus();
  });

  // ---------------------------------------------------------------------------
  // Focus advancement
  // ---------------------------------------------------------------------------

  it("advances focus to the next unfired cell after firing", async () => {
    const user = userEvent.setup();
    // "0,0" is already in shots so the hook's search skips it correctly.
    // Click "1,0" (B1) — the first enabled cell. Focus should advance to "2,0" (C1).
    const shots = new Map<CoordinateKey, CellStatus>([["0,0", "hit"]]);
    render(
      <Board
        boardSize={3}
        columnLabels={LABELS_3}
        shots={shots}
        onFire={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /B1,/i }));
    // Flush the requestAnimationFrame that defers focus advancement.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
    expect(screen.getByRole("button", { name: /C1,/i })).toHaveFocus();
  });

  it("wraps focus to the first unfired cell when firing near the end", async () => {
    const user = userEvent.setup();
    // All cells fired except "0,0" (A1) and "2,2" (C3).
    // Click "2,2" — focus should wrap to "0,0".
    const shots = new Map<CoordinateKey, CellStatus>([
      ["1,0", "miss"],
      ["2,0", "miss"],
      ["0,1", "miss"],
      ["1,1", "miss"],
      ["2,1", "miss"],
      ["0,2", "miss"],
      ["1,2", "miss"],
    ]);
    render(
      <Board
        boardSize={3}
        columnLabels={LABELS_3}
        shots={shots}
        onFire={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /C3,/i }));
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
    expect(screen.getByRole("button", { name: /A1,/i })).toHaveFocus();
  });
});
