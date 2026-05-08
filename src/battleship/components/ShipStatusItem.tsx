import { Badge, Chip } from "@nuka-ui/core";
import { cn } from "@/lib/cn";
import { SHIP_DISPLAY_NAMES } from "@/battleship/constants";
import type { ShipType } from "@/battleship/types";

export interface ShipStatusItemProps {
  id: ShipType;
  size: number;
  hitCount: number;
  isSunk: boolean;
  /** Placement mode: true when the ship has been placed on the board. */
  isPlaced?: boolean;
  /** Placement mode: true when this ship is the pending selection. */
  isSelected?: boolean;
  /** When provided, renders as a <button> instead of a <div>. */
  onClick?: () => void;
}

function buildShipStatusLabel(
  name: string,
  size: number,
  hitCount: number,
  isSunk: boolean,
  onClick: (() => void) | undefined,
  isPlaced: boolean | undefined,
  isSelected: boolean | undefined,
): string {
  // Game mode: onClick absent
  if (onClick === undefined) {
    return isSunk
      ? `${name}: sunk`
      : `${name}: ${String(hitCount)} of ${String(size)} hit`;
  }
  // Placement mode: placed
  if (isPlaced) {
    return `${name}: placed. Click to re-place.`;
  }
  // Placement mode: selected or awaiting selection
  return isSelected
    ? `${name}, ${String(size)} cells. Selected.`
    : `${name}, ${String(size)} cells. Select to place.`;
}

/**
 * Renders one ship row in the fleet status panel.
 *
 * In game mode (onClick absent), displays hit pips and sunk state.
 * In placement mode (onClick present), displays placed/selected state
 * and renders as an interactive button.
 */
export function ShipStatusItem({
  id,
  size,
  hitCount,
  isSunk,
  isPlaced,
  isSelected,
  onClick,
}: ShipStatusItemProps) {
  const name = SHIP_DISPLAY_NAMES[id];
  const label = buildShipStatusLabel(
    name,
    size,
    hitCount,
    isSunk,
    onClick,
    isPlaced,
    isSelected,
  );

  const showPips = !isPlaced;
  const showPlacedBadge = isPlaced === true;
  const isMuted = isSunk || isPlaced;

  const content = (
    <>
      <span
        className={cn(
          "w-24 text-sm font-medium",
          isMuted ? "text-slate-400 line-through" : "text-slate-200",
        )}
      >
        {name}
      </span>

      {showPips && (
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
      )}

      {isSunk && (
        <Badge variant="subtle" intent="danger" size="sm">
          Sunk
        </Badge>
      )}

      {showPlacedBadge && (
        <Badge variant="subtle" intent="success" size="sm">
          Placed
        </Badge>
      )}
    </>
  );

  const baseClassName = cn(
    "flex items-center gap-3 py-2",
    isMuted && "opacity-50",
  );

  if (onClick !== undefined) {
    return (
      <Chip
        variant="subtle"
        intent="default"
        selected={isSelected ?? false}
        className={cn(baseClassName, "w-full px-2 text-left")}
        aria-label={label}
        onClick={onClick}
      >
        {content}
      </Chip>
    );
  }

  return <div className={baseClassName}>{content}</div>;
}
