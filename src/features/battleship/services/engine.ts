import type {
  CoordinateKey,
  Ship,
  ShipType,
  CellStatus,
  ShotOutcome,
  ShotResult,
} from "@/features/battleship/types";

// ---------------------------------------------------------------------------
// Position index
//
// Built on demand by the functions that need O(1) coordinate → ship lookup.
// Callers that fire many shots in sequence should build it once externally
// and pass it in; the hook layer is the natural place to do that.
// ---------------------------------------------------------------------------

/**
 * Builds a flat Map from every occupied coordinate to the ship that owns it.
 * This is the only place ship coordinate arrays are traversed for lookup —
 * nothing else in the engine iterates ships directly to find an owner.
 */
export function buildPositionIndex(
  ships: readonly Ship[],
): Map<CoordinateKey, Ship> {
  const index = new Map<CoordinateKey, Ship>();
  for (const ship of ships) {
    for (const key of ship.coordinates) {
      index.set(key, ship);
    }
  }
  return index;
}

// ---------------------------------------------------------------------------
// Shot resolution
// ---------------------------------------------------------------------------

/**
 * Resolves a single shot and returns everything the caller needs to update
 * state and inform the UI.
 *
 * Outcome priority:
 *   1. "already-fired" — coordinate is already in shots; no state change needed
 *   2. "sunk"          — hit lands on a ship and sinks it completely
 *   3. "hit"           — hit lands on a ship but it is not yet sunk
 *   4. "miss"          — no ship occupies this coordinate
 *
 * The caller is responsible for mutating game state after receiving the result.
 * This function is pure — it does not mutate shots or ships.
 *
 * @param coordinate    The targeted cell.
 * @param shots         All coordinates fired at so far (Map value is CellStatus).
 * @param positionIndex Pre-built coordinate → ship lookup from buildPositionIndex.
 */
export function resolveShot(
  coordinate: CoordinateKey,
  shots: ReadonlyMap<CoordinateKey, CellStatus>,
  positionIndex: ReadonlyMap<CoordinateKey, Ship>,
): ShotResult {
  if (shots.has(coordinate)) {
    return { coordinate, outcome: "already-fired" };
  }

  const ship = positionIndex.get(coordinate);

  if (!ship) {
    return { coordinate, outcome: "miss" };
  }

  // Determine whether this shot sinks the ship by checking that every other
  // coordinate is already in shots. We do not mutate shots here — the caller
  // applies the result after receiving it.
  const sunk = ship.coordinates.every(
    (key) => key === coordinate || shots.has(key),
  );

  if (sunk) {
    return { coordinate, outcome: "sunk", sunkShipId: ship.id };
  }

  return { coordinate, outcome: "hit" };
}

// ---------------------------------------------------------------------------
// Predicate helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when every coordinate of the ship has been fired at.
 * Pure — safe to call any number of times with the same inputs.
 */
export function isShipSunk(
  ship: Ship,
  shots: ReadonlyMap<CoordinateKey, CellStatus>,
): boolean {
  return ship.coordinates.every((key) => shots.has(key));
}

/**
 * Returns true when every ship in the fleet has been sunk.
 * Guards against an empty fleet — zero ships is not game over.
 */
export function isGameOver(
  ships: readonly Ship[],
  sunkShipIds: ReadonlySet<ShipType>,
): boolean {
  return ships.length > 0 && ships.every((ship) => sunkShipIds.has(ship.id));
}

// ---------------------------------------------------------------------------
// Outcome classification helpers
// ---------------------------------------------------------------------------

/**
 * Maps a ShotOutcome to the CellStatus stored in game state.
 * "sunk" resolves to "hit" because the cell-level status does not track
 * whether the broader ship is sunk — that is derived separately via sunkShipIds.
 */
export function outcomeToStatus(outcome: ShotOutcome): CellStatus | null {
  switch (outcome) {
    case "hit":
    case "sunk":
      return "hit";
    case "miss":
      return "miss";
    case "already-fired":
      return null;
  }
}
