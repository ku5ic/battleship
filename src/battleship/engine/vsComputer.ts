import type {
  CellStatus,
  CoordinateKey,
  PlayerId,
  Ship,
  ShotResult,
} from "@/battleship/types";
import { outcomeToStatus, resolveShot } from "@/battleship/services/engine";

// ---------------------------------------------------------------------------
// State shape
//
// Persists only the irreducible minimum for two boards. Everything else
// (sunkShipIds, isGameOver, winner, isAiThinking) is derived via selectors
// or inline in the hook body.
// ---------------------------------------------------------------------------

export interface VsComputerState {
  playerShots: Map<CoordinateKey, CellStatus>;
  computerShots: Map<CoordinateKey, CellStatus>;
  playerLastResult: ShotResult | null;
  computerLastResult: ShotResult | null;
  activeTurn: PlayerId;
}

export type VsComputerAction =
  | { type: "PLAYER_FIRE"; coordinate: CoordinateKey }
  | { type: "COMPUTER_FIRE"; coordinate: CoordinateKey }
  | { type: "RESET" };

/**
 * Returns a fresh initial state. A factory is used instead of a shared
 * constant because the state contains mutable Maps — returning a new
 * object on each call prevents cross-contamination between hook mounts.
 */
export function createVsComputerInitialState(): VsComputerState {
  return {
    playerShots: new Map(),
    computerShots: new Map(),
    playerLastResult: null,
    computerLastResult: null,
    activeTurn: "player",
  };
}

// ---------------------------------------------------------------------------
// Reducer factory
//
// Accepts the two position indexes the reducer needs for shot resolution.
// The returned function has the standard (state, action) => state signature
// expected by React's useReducer.
//
// Unlike the single-player reducer, no game-over guard lives here — that
// check is in the hook's playerFireShot callback, which gates on the
// derived winner value.
// ---------------------------------------------------------------------------

export function createVsComputerReducer(
  playerPositionIndex: ReadonlyMap<CoordinateKey, Ship>,
  computerPositionIndex: ReadonlyMap<CoordinateKey, Ship>,
) {
  return function reducer(
    state: VsComputerState,
    action: VsComputerAction,
  ): VsComputerState {
    switch (action.type) {
      case "PLAYER_FIRE": {
        if (state.activeTurn !== "player") return state;

        const result = resolveShot(
          action.coordinate,
          state.playerShots,
          computerPositionIndex,
        );

        if (result.outcome === "already-fired") {
          return { ...state, playerLastResult: result };
        }

        const status = outcomeToStatus(result.outcome);
        if (status === null) return state;

        const playerShots = new Map(state.playerShots);
        playerShots.set(action.coordinate, status);

        return {
          ...state,
          playerShots,
          playerLastResult: result,
          // Player keeps their turn on a hit — computer only fires on a miss.
          activeTurn: result.outcome === "miss" ? "computer" : "player",
        };
      }
      case "COMPUTER_FIRE": {
        if (state.activeTurn !== "computer") return state;

        const result = resolveShot(
          action.coordinate,
          state.computerShots,
          playerPositionIndex,
        );

        if (result.outcome === "already-fired") {
          return { ...state, computerLastResult: result };
        }

        const status = outcomeToStatus(result.outcome);
        if (status === null) return state;

        const computerShots = new Map(state.computerShots);
        computerShots.set(action.coordinate, status);

        return {
          ...state,
          computerShots,
          computerLastResult: result,
          activeTurn: result.outcome === "miss" ? "player" : "computer",
        };
      }
      case "RESET":
        return createVsComputerInitialState();
      default:
        return state;
    }
  };
}

// ---------------------------------------------------------------------------
// Selectors — pure derivations from derived game-over flags.
// ---------------------------------------------------------------------------

/**
 * Determines the winner from the two game-over flags. Returns null when
 * neither player has sunk the opponent's entire fleet.
 */
export function selectWinner(
  playerIsGameOver: boolean,
  computerIsGameOver: boolean,
): PlayerId | null {
  if (playerIsGameOver) return "player";
  if (computerIsGameOver) return "computer";
  return null;
}
