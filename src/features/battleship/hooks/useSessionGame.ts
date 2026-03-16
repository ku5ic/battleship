import { SHIPS } from "@/features/battleship/data";
import type {
  BoardState,
  CoordinateKey,
  SessionState,
} from "@/features/battleship/types";

// ---------------------------------------------------------------------------
// Session action union
//
// PLAYER_FIRE  — player targets a coordinate on the opponent's board.
// COMPUTER_FIRE — computer targets a coordinate on the player's board.
//                 The coordinate is resolved by the AI service before dispatch,
//                 so the reducer treats it identically to a player shot.
// RESET        — restores both boards to their initial state.
// ---------------------------------------------------------------------------

export type SessionAction =
  | { type: "PLAYER_FIRE"; coordinate: CoordinateKey }
  | { type: "COMPUTER_FIRE"; coordinate: CoordinateKey }
  | { type: "RESET" };

// ---------------------------------------------------------------------------
// Both players share the same fleet layout for now. When distinct layouts
// are needed, swap out the argument passed to each createBoardState call.
// ---------------------------------------------------------------------------

const PLAYER_SHIPS = SHIPS;
const COMPUTER_SHIPS = SHIPS;

function createBoardState(ships: typeof SHIPS): BoardState {
  return {
    ships,
    shots: new Map(),
    sunkShipIds: new Set(),
    isGameOver: false,
    lastResult: null,
  };
}

export function buildInitialSessionState(): SessionState {
  return {
    board: {
      player: createBoardState(PLAYER_SHIPS),
      computer: createBoardState(COMPUTER_SHIPS),
    },
    activeTurn: "player",
    winner: null,
    isAiThinking: false,
  };
}

/**
 * Orchestrates a two-board session.
 *
 * Stub — wire up when two-player mode is in scope.
 * The engine (resolveShot, isGameOver) is board-local and pure; call it once
 * per board independently. Session logic (turn switching, game-over guard)
 * lives here and nowhere else.
 */
export function useSessionGame(): SessionState {
  throw new Error("useSessionGame is not yet implemented");
}
