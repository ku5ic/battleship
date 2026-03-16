import type { SessionState } from "@/features/battleship/types";

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
