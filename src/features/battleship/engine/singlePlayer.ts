import type {
  CellStatus,
  CoordinateKey,
  Ship,
  ShipType,
  ShotResult,
} from "@/features/battleship/types";
import {
  isGameOver,
  isShipSunk,
  outcomeToStatus,
  resolveShot,
} from "@/features/battleship/services/engine";

// ---------------------------------------------------------------------------
// State shape
//
// Only the two values that change over time are persisted. Everything else
// (sunkShipIds, isGameOver) is derived from shots alone via selectors.
// ---------------------------------------------------------------------------

export interface SinglePlayerState {
  shots: Map<CoordinateKey, CellStatus>;
  lastResult: ShotResult | null;
}

export type SinglePlayerAction =
  | { type: "FIRE"; coordinate: CoordinateKey }
  | { type: "RESET" };

/**
 * Returns a fresh initial state. A factory is used instead of a shared
 * constant because the Map inside the state is mutable — returning a new
 * object on each call prevents cross-contamination between hook mounts.
 */
export function createSinglePlayerInitialState(): SinglePlayerState {
  return { shots: new Map(), lastResult: null };
}

// ---------------------------------------------------------------------------
// Reducer factory
//
// Accepts the fleet and position index that the reducer needs for shot
// resolution and game-over guards. The returned function has the standard
// (state, action) => state signature expected by React's useReducer.
// ---------------------------------------------------------------------------

export function createSinglePlayerReducer(
  ships: readonly Ship[],
  positionIndex: ReadonlyMap<CoordinateKey, Ship>,
) {
  return function reducer(
    state: SinglePlayerState,
    action: SinglePlayerAction,
  ): SinglePlayerState {
    switch (action.type) {
      case "FIRE": {
        // Guard: ignore shots after all ships are sunk.
        const sunk = new Set<ShipType>(
          ships.filter((s) => isShipSunk(s, state.shots)).map((s) => s.id),
        );
        if (isGameOver(ships, sunk)) return state;

        const result = resolveShot(
          action.coordinate,
          state.shots,
          positionIndex,
        );

        if (result.outcome === "already-fired") {
          // Surface the duplicate feedback without touching shots.
          return { ...state, lastResult: result };
        }

        const status = outcomeToStatus(result.outcome);
        if (status === null) return state; // unreachable given the guard above

        const shots = new Map(state.shots);
        shots.set(action.coordinate, status);

        return { shots, lastResult: result };
      }

      case "RESET":
        return createSinglePlayerInitialState();
    }
  };
}

// ---------------------------------------------------------------------------
// Selectors — pure derivations from persisted state + fleet constants.
// ---------------------------------------------------------------------------

/**
 * Computes which ships have been fully sunk from the current shots map.
 */
export function selectSunkShipIds(
  ships: readonly Ship[],
  shots: ReadonlyMap<CoordinateKey, CellStatus>,
): ReadonlySet<ShipType> {
  return new Set<ShipType>(
    ships.filter((s) => isShipSunk(s, shots)).map((s) => s.id),
  );
}
