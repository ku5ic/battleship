import { Tooltip, TooltipContent, TooltipTrigger } from "@nuka-ui/core";
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
    <Tooltip side="top" delay={200}>
      <TooltipTrigger asChild>
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
            "relative flex items-center justify-center",
            "w-full aspect-square",
            "border border-slate-600",
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
            status === "untouched" &&
              !disabled &&
              "bg-slate-700 hover:bg-slate-600 cursor-pointer",
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
        </button>
      </TooltipTrigger>
      {isFireable && <TooltipContent>{displayCoord}</TooltipContent>}
    </Tooltip>
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
