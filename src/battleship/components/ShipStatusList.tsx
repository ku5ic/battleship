import { Eyebrow, Section } from "@nuka-ui/core";
import { SHIP_DISPLAY_NAMES } from "@/battleship/constants";
import type { Ship, ShipType } from "@/battleship/types";
import { ShipStatusItem } from "@/battleship/components/ShipStatusItem";

function buildGameModeLabel(
  name: string,
  size: number,
  hitCount: number,
  isSunk: boolean,
): string {
  return isSunk
    ? `${name}: sunk`
    : `${name}: ${String(hitCount)} of ${String(size)} hit`;
}

interface ShipStatusListProps {
  ships: readonly Ship[];
  sunkShipIds: ReadonlySet<ShipType>;
  hitCounts: ReadonlyMap<ShipType, number>;
}

/**
 * Renders the full fleet status panel.
 *
 * Hit counts are computed upstream (in the hook) and passed in as a Map.
 * ShipStatusItem receives only display-ready values and does no rule
 * evaluation itself.
 */
export function ShipStatusList({
  ships,
  sunkShipIds,
  hitCounts,
}: ShipStatusListProps) {
  return (
    <Section as="section" aria-label="Fleet status">
      <Eyebrow
        as="p"
        weight="semibold"
        color="muted"
        className="mb-2 text-xs uppercase tracking-widest"
      >
        Fleet
      </Eyebrow>
      <ul
        className="divide-y divide-slate-700/50"
        aria-label={`${String(sunkShipIds.size)} of ${String(ships.length)} ships sunk`}
      >
        {ships.map((ship) => {
          const hitCount = hitCounts.get(ship.id) ?? 0;
          const isSunk = sunkShipIds.has(ship.id);
          return (
            <li
              key={ship.id}
              aria-label={buildGameModeLabel(
                SHIP_DISPLAY_NAMES[ship.id],
                ship.size,
                hitCount,
                isSunk,
              )}
            >
              <ShipStatusItem
                id={ship.id}
                size={ship.size}
                hitCount={hitCount}
                isSunk={isSunk}
              />
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
