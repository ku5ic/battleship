import type { Ship, ShipType } from "@/features/battleship/types";
import { ShipStatusItem } from "@/features/battleship/components/ShipStatusItem";

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
    <section aria-label="Fleet status">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
        Fleet
      </h2>
      <ul
        className="divide-y divide-slate-700/50"
        aria-label={`${String(sunkShipIds.size)} of ${String(ships.length)} ships sunk`}
      >
        {ships.map((ship) => (
          <li key={ship.id}>
            <ShipStatusItem
              id={ship.id}
              size={ship.size}
              hitCount={hitCounts.get(ship.id) ?? 0}
              isSunk={sunkShipIds.has(ship.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
