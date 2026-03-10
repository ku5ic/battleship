import { cn } from "@/lib/cn";
import { SHIP_DISPLAY_NAMES } from "@/features/battleship/constants";
import type { ShipType } from "@/features/battleship/types";

export interface ShipStatusItemProps {
  id: ShipType;
  size: number;
  hitCount: number;
  isSunk: boolean;
}

/**
 * Renders one ship row in the fleet status panel.
 *
 * Hit state is communicated both visually (filled pips, strikethrough name)
 * and via the accessible aria-label — not through color alone.
 */
export function ShipStatusItem({
  id,
  size,
  hitCount,
  isSunk,
}: ShipStatusItemProps) {
  const name = SHIP_DISPLAY_NAMES[id];
  const label = isSunk
    ? `${name}: sunk`
    : `${name}: ${String(hitCount)} of ${String(size)} hit`;

  return (
    <div
      className={cn("flex items-center gap-3 py-2", isSunk && "opacity-50")}
      aria-label={label}
    >
      <span
        className={cn(
          "w-24 text-sm font-medium",
          isSunk ? "text-slate-400 line-through" : "text-slate-200",
        )}
      >
        {name}
      </span>

      <div className="flex gap-0.5" aria-hidden="true">
        {Array.from({ length: size }, (_, i) => (
          <div
            key={i}
            className={cn(
              "w-4 h-4 border",
              i < hitCount
                ? "bg-red-700 border-red-500"
                : "bg-slate-700 border-slate-500",
            )}
          />
        ))}
      </div>

      {isSunk && (
        <span className="text-xs text-red-400 font-semibold uppercase tracking-wider">
          Sunk
        </span>
      )}
    </div>
  );
}
