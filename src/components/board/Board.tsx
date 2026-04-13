import { cn } from "@/lib/cn";
import type { CellStatus, CoordinateKey } from "@/battleship/types";
import { Cell } from "@/components/board/Cell";
import { useBoardNavigation } from "@/components/board/useBoardNavigation";

interface BoardProps {
  boardSize: number;
  columnLabels: readonly string[];
  shots: ReadonlyMap<CoordinateKey, CellStatus>;
  onFire?: (coord: CoordinateKey) => void;
  disabled?: boolean;
}

/**
 * Renders the game board with column and row labels sized by boardSize.
 *
 * Keyboard navigation uses a roving tabindex pattern: only the active cell
 * sits in the tab sequence. Arrow keys move focus within the grid without
 * forcing users to tab through all cells.
 *
 * Each cell button is wrapped in role="gridcell" so the grid → row → gridcell
 * ownership chain is spec-compliant. The button retains its implicit role.
 *
 * Layout: CSS grid with a dynamic template so the board fills its container
 * at every difficulty. Tailwind cannot generate grid-template-columns for
 * arbitrary runtime values, so the template is set via inline style, the one
 * justified exception to the no-inline-style rule.
 *
 * The first column (1.5rem) holds the row number label; the remaining N columns
 * are equal-width cells. role="row" divs act directly as the grid containers so
 * the ARIA ownership chain (grid, row, gridcell) is preserved without an
 * ARIA-transparent wrapper.
 */
export function Board({
  boardSize,
  columnLabels,
  shots,
  onFire,
  disabled,
}: BoardProps) {
  const { boardRef, focusedCoord, allKeys, handleKeyDown, handleCellFire } =
    useBoardNavigation(boardSize, shots, onFire);

  const rows = groupByRow(allKeys, boardSize);

  // Inline style is justified: Tailwind cannot generate grid-template-columns
  // for arbitrary runtime values. The 1.5rem first track holds the row label.
  const gridTemplateColumns = `1.5rem repeat(${String(boardSize)}, 1fr)`;

  return (
    <div
      ref={boardRef}
      role="grid"
      aria-label="Battleship board. Use arrow keys to navigate, Space or Enter to fire."
      aria-rowcount={boardSize}
      aria-colcount={boardSize}
      aria-readonly={!!disabled}
      onKeyDown={handleKeyDown}
      className="w-full select-none"
      tabIndex={0}
    >
      {/* Column headers: decorative; cell aria-labels encode position */}
      <div
        className="grid mb-0.5"
        style={{ gridTemplateColumns }}
        aria-hidden="true"
      >
        {/* Placeholder for the row-label column */}
        <div />
        {columnLabels.map((label) => (
          <div
            key={label}
            className="text-center text-xs text-slate-400 font-mono"
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
          className={cn("grid items-center mb-px")}
          style={{ gridTemplateColumns }}
        >
          {/* Row number label: decorative; position is in each cell's aria-label */}
          <div
            aria-hidden="true"
            className="text-right pr-1 text-xs text-slate-400 font-mono"
          >
            {rowIndex + 1}
          </div>

          {rowKeys.map((coord, colIndex) => (
            // role="gridcell" sits here so the grid ownership chain is correct:
            // grid > row > gridcell > button. The button retains its implicit role.
            <div key={coord} role="gridcell" aria-colindex={colIndex + 1}>
              <Cell
                coord={coord}
                columnLabel={columnLabels[colIndex]}
                status={shots.get(coord) ?? "untouched"}
                onFire={handleCellFire}
                disabled={disabled}
                tabIndex={coord === focusedCoord ? 0 : -1}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function groupByRow(
  keys: CoordinateKey[],
  boardSize: number,
): CoordinateKey[][] {
  const rows: CoordinateKey[][] = [];
  for (let r = 0; r < boardSize; r++) {
    rows.push(keys.slice(r * boardSize, (r + 1) * boardSize));
  }
  return rows;
}
