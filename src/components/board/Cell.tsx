import { cn } from "@/lib/cn";
import { COLUMN_LABELS } from "@/features/battleship/constants";
import type { CellStatus, CoordinateKey } from "@/features/battleship/types";
import { fromKey } from "@/features/battleship/utils/coordinates";

interface CellProps {
  coord: CoordinateKey;
  status: CellStatus;
  onFire: (coord: CoordinateKey) => void;
  disabled?: boolean;
  tabIndex?: number;
}

function buildAriaLabel(
  coord: CoordinateKey,
  status: CellStatus,
  isFireable: boolean,
): string {
  const { col, row } = fromKey(coord);
  const colLabel = COLUMN_LABELS[col];
  const rowLabel = String(row + 1);

  const statusLabel: Record<CellStatus, string> = {
    untouched: "not fired",
    hit: "hit",
    miss: "miss",
  };

  const base = `${colLabel}${rowLabel}, ${statusLabel[status]}`;
  // Append a brief activation hint only for fireable cells — this supplements
  // the board-level instruction without duplicating it on every already-fired cell.
  return isFireable ? `${base}. Press Space to fire` : base;
}

export function Cell({
  coord,
  status,
  onFire,
  disabled = false,
  tabIndex = -1,
}: CellProps) {
  const isFired = status !== "untouched";
  const isDisabled = isFired || disabled;
  const isFireable = !isDisabled;

  return (
    <button
      type="button"
      data-coord={coord}
      disabled={isDisabled}
      tabIndex={isDisabled ? undefined : tabIndex}
      aria-label={buildAriaLabel(coord, status, isFireable)}
      onClick={() => {
        onFire(coord);
      }}
      className={cn(
        "relative flex items-center justify-center",
        // w-full fills the grid cell; aspect-square keeps it square when space
        // allows; min-h-[44px] ensures the touch target meets WCAG 2.5.5 even
        // when cell width is narrower than 44px on dense grids.
        "w-full aspect-square min-h-[44px]",
        "border border-slate-600",
        // Focus ring: yellow to stand out against the dark board at any state.
        // ring-offset-2 gives a small gap so the ring doesn't blend with neighbors.
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
        "focus-visible:z-10",
        status === "untouched" &&
          !disabled &&
          "bg-slate-700 hover:bg-slate-600 cursor-pointer",
        status === "untouched" && disabled && "bg-slate-700 cursor-default",
        status === "hit" && "bg-red-800 border-red-600",
        status === "miss" && "bg-slate-600 border-slate-500",
      )}
    >
      {status === "hit" && <HitMarker />}
      {status === "miss" && <MissMarker />}
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
