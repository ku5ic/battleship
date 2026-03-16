import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { BOARD_SIZE, COLUMN_LABELS } from "@/features/battleship/constants";
import type { CellStatus, CoordinateKey } from "@/features/battleship/types";
import { allBoardKeys } from "@/features/battleship/utils/coordinates";
import { Cell } from "@/components/board/Cell";

interface BoardProps {
  shots: ReadonlyMap<CoordinateKey, CellStatus>;
  onFire?: (coord: CoordinateKey) => void;
  isGameOver: boolean;
  isReadOnly?: boolean;
}

const ARROW_DELTAS: Partial<Record<string, [number, number]>> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

/**
 * Renders the 10×10 game board with column (A–J) and row (1–10) labels.
 *
 * Keyboard navigation uses a roving tabindex pattern: only the active cell
 * sits in the tab sequence. Arrow keys move focus within the grid without
 * forcing users to tab through all 100 cells.
 *
 * Each cell button is wrapped in role="gridcell" so the grid → row → gridcell
 * ownership chain is spec-compliant. The button retains its implicit role.
 *
 * Overflow: the board is wrapped in an overflow-x-auto container so that on
 * very narrow viewports (≥ 320px) the grid scrolls horizontally rather than
 * breaking the page layout.
 */
export function Board({ shots, onFire, isGameOver, isReadOnly }: BoardProps) {
  const [focusedCoord, setFocusedCoord] = useState<CoordinateKey>("0,0");
  const boardRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const delta = ARROW_DELTAS[e.key];
    if (!delta) return;

    const target = e.target as HTMLElement;
    const raw = target.dataset.coord;
    if (!raw) return;

    e.preventDefault();

    const [col, row] = raw.split(",").map(Number) as [number, number];
    const [dc, dr] = delta;
    const nextCol = Math.min(BOARD_SIZE - 1, Math.max(0, col + dc));
    const nextRow = Math.min(BOARD_SIZE - 1, Math.max(0, row + dr));
    const nextCoord = `${String(nextCol)},${String(nextRow)}` as CoordinateKey;

    setFocusedCoord(nextCoord);
    boardRef.current
      ?.querySelector<HTMLElement>(`[data-coord="${nextCoord}"]`)
      ?.focus();
  }

  // ALL_KEYS is stable — allBoardKeys() is pure and always returns the same
  // 100 keys, so memoising with [] avoids recreating the array on every render.
  const ALL_KEYS = useMemo(() => allBoardKeys(), []);

  /**
   * Fires the shot then immediately advances keyboard focus to the next unfired
   * cell in row-major order. `shots` hasn't updated yet at call time, so `fired`
   * is excluded manually when searching for the next target.
   *
   * requestAnimationFrame defers the focus call until after React has flushed
   * the render that marks the fired cell as disabled. Without this, the browser
   * may focus a button that is about to become disabled and silently drop focus.
   */
  function handleCellFire(fired: CoordinateKey) {
    onFire?.(fired);

    const firedIndex = ALL_KEYS.indexOf(fired);
    const next =
      ALL_KEYS.slice(firedIndex + 1).find((k) => !shots.has(k)) ??
      ALL_KEYS.slice(0, firedIndex).find((k) => !shots.has(k));

    if (!next) return; // every cell is now fired — game over

    setFocusedCoord(next);
    requestAnimationFrame(() => {
      boardRef.current
        ?.querySelector<HTMLElement>(`[data-coord="${next}"]`)
        ?.focus();
    });
  }

  const rows = groupByRow(ALL_KEYS);

  return (
    // Horizontal scroll container — keeps the board usable on narrow screens
    // without overflowing the page layout. The board itself never shrinks
    // below its natural width; it simply becomes scrollable.
    <div className="w-full overflow-x-auto">
      <div
        ref={boardRef}
        role="grid"
        aria-label="Battleship board. Use arrow keys to navigate, Space or Enter to fire."
        aria-rowcount={BOARD_SIZE}
        aria-colcount={BOARD_SIZE}
        aria-readonly={isGameOver}
        onKeyDown={handleKeyDown}
        className="inline-block select-none"
        tabIndex={0}
      >
        {/* Column headers — decorative; cell aria-labels encode position */}
        <div role="row" className="flex pl-6 sm:pl-8 mb-0.5" aria-hidden="true">
          {COLUMN_LABELS.map((label) => (
            <div
              key={label}
              className={cn(
                "w-7 sm:w-9 md:w-10 shrink-0",
                "text-center text-xs text-slate-400 font-mono",
              )}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Rows */}
        {rows.map((rowKeys, rowIndex) => (
          <div
            key={rowIndex}
            role="row"
            aria-rowindex={rowIndex + 1}
            className="flex items-center mb-px"
          >
            {/* Row number label — decorative; position is in each cell's aria-label */}
            <div
              aria-hidden="true"
              className="w-6 sm:w-8 shrink-0 text-right pr-1.5 text-xs text-slate-400 font-mono"
            >
              {rowIndex + 1}
            </div>

            {rowKeys.map((coord, colIndex) => (
              // role="gridcell" sits here so the grid ownership chain is correct:
              // grid → row → gridcell → button. The button retains its implicit role.
              <div key={coord} role="gridcell" aria-colindex={colIndex + 1}>
                <Cell
                  coord={coord}
                  status={shots.get(coord) ?? "untouched"}
                  onFire={handleCellFire}
                  disabled={isGameOver || isReadOnly}
                  tabIndex={coord === focusedCoord ? 0 : -1}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function groupByRow(keys: CoordinateKey[]): CoordinateKey[][] {
  const rows: CoordinateKey[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    rows.push(keys.slice(r * BOARD_SIZE, (r + 1) * BOARD_SIZE));
  }
  return rows;
}
