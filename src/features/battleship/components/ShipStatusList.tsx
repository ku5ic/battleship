import type { CellStatus, CoordinateKey, Ship, ShipType } from "../types";
import { ShipStatusItem } from "./ShipStatusItem";

interface ShipStatusListProps {
  ships: readonly Ship[];
  shots: ReadonlyMap<CoordinateKey, CellStatus>;
  sunkShipIds: ReadonlySet<ShipType>;
}

/**
 * Renders the full fleet status panel.
 *
 * Derives hit counts here — ShipStatusItem receives only display-ready values
 * and does no rule evaluation itself.
 */
export function ShipStatusList({
  ships,
  shots,
  sunkShipIds,
}: ShipStatusListProps) {
  return (
    <section aria-label="Fleet status">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
        Fleet
      </h2>
      <ul
        className="divide-y divide-slate-700/50"
        aria-label={`${String(sunkShipIds.size)} of ${String(ships.length)} ships sunk`}
      >
        {ships.map((ship) => {
          const hitCount = ship.coordinates.filter((key) =>
            shots.has(key),
          ).length;

          return (
            <li key={ship.id}>
              <ShipStatusItem
                id={ship.id}
                size={ship.size}
                hitCount={hitCount}
                isSunk={sunkShipIds.has(ship.id)}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
