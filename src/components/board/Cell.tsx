import { cn } from "@/lib/cn";
import type { CellStatus, CoordinateKey } from "@/battleship/types";
import { fromKey } from "@/battleship/utils/coordinates";

interface CellProps {
  coord: CoordinateKey;
  columnLabel: string;
  status: CellStatus;
  onFire: (coord: CoordinateKey) => void;
  disabled?: boolean;
  tabIndex?: number;
}

function buildAriaLabel(
  columnLabel: string,
  row: number,
  status: CellStatus,
  isFireable: boolean,
): string {
  const rowLabel = String(row + 1);

  const statusLabel: Record<CellStatus, string> = {
    untouched: "not fired",
    hit: "hit",
    miss: "miss",
  };

  const base = `${columnLabel}${rowLabel}, ${statusLabel[status]}`;
  // Append a brief activation hint only for fireable cells. This supplements
  // the board-level instruction without duplicating it on every already-fired cell.
  return isFireable ? `${base}. Press Space to fire` : base;
}

export function Cell({
  coord,
  columnLabel,
  status,
  onFire,
  disabled = false,
  tabIndex = -1,
}: CellProps) {
  const { row } = fromKey(coord);
  const isFired = status !== "untouched";
  const isDisabled = isFired || disabled;
  const isFireable = !isDisabled;

  const displayCoord = `${columnLabel}${String(row + 1)}`;

  return (
    <button
      type="button"
      data-coord={coord}
      disabled={isDisabled}
      tabIndex={isDisabled ? undefined : tabIndex}
      aria-label={buildAriaLabel(columnLabel, row, status, isFireable)}
      onClick={() => {
        onFire(coord);
      }}
      className={cn(
        "group relative flex items-center justify-center",
        // Touch targets on mobile are met by the scale-up on hover/focus
        // (scale-125), not by minimum height. aspect-square keeps cells
        // square at all breakpoints without causing overflow on dense grids.
        "w-full aspect-square",
        "border border-slate-600",
        // Focus ring: yellow to stand out against the dark board at any state.
        // ring-offset-2 gives a small gap so the ring doesn't blend with neighbors.
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
        status === "untouched" &&
          !disabled &&
          "bg-slate-700 hover:bg-slate-600 cursor-pointer",
        // Scale and z-index are only meaningful for fireable targets. Disabled
        // and already-fired buttons cannot receive focus, so the guard is
        // structurally redundant but makes the intent explicit.
        status === "untouched" &&
          !disabled && [
            "hover:scale-125 focus-visible:scale-125",
            "hover:z-10 focus-visible:z-10",
            "motion-safe:transition-transform motion-safe:duration-100",
          ],
        status === "untouched" && disabled && "bg-slate-700 cursor-default",
        status === "hit" && "bg-red-800 border-red-600",
        status === "miss" && "bg-slate-600 border-slate-500",
      )}
    >
      {status === "hit" && <HitMarker />}
      {status === "miss" && <MissMarker />}
      {/* Coordinate tooltip: purely visual; the accessible name already
          encodes the position. Known limitation: on row 0 the tooltip may
          clip above the column header since it always renders above the cell. */}
      {isFireable && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1",
            "z-20 rounded bg-gray-900 px-1 text-xs font-mono text-white",
            "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
            "motion-safe:transition-opacity motion-safe:duration-100",
          )}
        >
          {displayCoord}
        </span>
      )}
    </button>
  );
}

function HitMarker() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-300"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
    >
      <line x1="3" y1="3" x2="13" y2="13" />
      <line x1="13" y1="3" x2="3" y2="13" />
    </svg>
  );
}

function MissMarker() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-slate-400"
      fill="currentColor"
    >
      <circle cx="8" cy="8" r="3" />
    </svg>
  );
}
