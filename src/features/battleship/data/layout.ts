import { rawToKey, deriveOrientation, isInBounds } from "../utils/coordinates";
import type { RawGameConfig, Ship } from "../types";

/**
 * Parses and validates the raw layout config into typed Ship records.
 *
 * Throws on invalid input — this runs once at startup, and a misconfigured
 * layout should surface immediately rather than fail silently mid-game.
 */
export function parseLayout(config: RawGameConfig): Ship[] {
  return config.layout.map((entry) => {
    if (entry.positions.length === 0) {
      throw new Error(`Ship "${entry.ship}" has no positions.`);
    }

    const coordinates = entry.positions.map((pos) => {
      const [col, row] = pos;
      if (!isInBounds(col, row)) {
        throw new Error(
          `Ship "${entry.ship}" has out-of-bounds position [${String(col)}, ${String(row)}].`,
        );
      }
      return rawToKey(pos);
    });

    const shipTypeConfig = config.shipTypes[entry.ship];

    if (coordinates.length !== shipTypeConfig.size) {
      throw new Error(
        `Ship "${entry.ship}" has ${String(coordinates.length)} positions but expected ${String(shipTypeConfig.size)}.`,
      );
    }

    return {
      id: entry.ship,
      size: shipTypeConfig.size,
      coordinates,
      orientation: deriveOrientation(coordinates),
    } satisfies Ship;
  });
}
