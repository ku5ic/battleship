import { useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { BOARD_SIZE, COLUMN_LABELS } from "../../features/battleship/constants";
import type {
  CellStatus,
  CoordinateKey,
} from "../../features/battleship/types";
import { allBoardKeys } from "../../features/battleship/utils/coordinates";
import { Cell } from "./Cell";

interface BoardProps {
  shots: ReadonlyMap<CoordinateKey, CellStatus>;
  onFire: (coord: CoordinateKey) => void;
  isGameOver: boolean;
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
 */
export function Board({ shots, onFire, isGameOver }: BoardProps) {
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

  const rows = groupByRow(allBoardKeys());

  return (
    <div
      ref={boardRef}
      role="grid"
      aria-label="Battleship board. Use arrow keys to navigate cells."
      aria-readonly={isGameOver}
      onKeyDown={handleKeyDown}
      className="inline-block select-none"
      tabIndex={0}
    >
      {/* Column headers */}
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
        <div key={rowIndex} role="row" className="flex items-center mb-px">
          <div
            aria-hidden="true"
            className="w-6 sm:w-8 shrink-0 text-right pr-1.5 text-xs text-slate-400 font-mono"
          >
            {rowIndex + 1}
          </div>

          {rowKeys.map((coord) => (
            <Cell
              key={coord}
              coord={coord}
              status={shots.get(coord) ?? "untouched"}
              onFire={onFire}
              disabled={isGameOver}
              tabIndex={coord === focusedCoord ? 0 : -1}
            />
          ))}
        </div>
      ))}
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
