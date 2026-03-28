import { useEffect, useReducer, useCallback, useMemo } from "react";
import { SHIPS } from "@/features/battleship/data";
import type {
  BoardState,
  CoordinateKey,
  PlayerId,
  SessionBoards,
  SessionState,
  ShipType,
  ShotResult,
} from "@/features/battleship/types";
import {
  buildPositionIndex,
  applyShotToBoard,
} from "@/features/battleship/services/engine";
import { chooseRandomUnfiredCoordinate } from "@/features/battleship/services/ai";

const COMPUTER_POSITION_INDEX = buildPositionIndex(SHIPS);
const PLAYER_POSITION_INDEX = buildPositionIndex(SHIPS);
export const AI_SHOT_DELAY_MS = 1000;

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

export interface UseBattleshipSessionReturn {
  board: SessionBoards;
  activeTurn: PlayerId;
  winner: PlayerId | null;
  isAiThinking: boolean;
  playerLastResult: ShotResult | null;
  computerLastResult: ShotResult | null;
  playerShipHitCounts: ReadonlyMap<ShipType, number>;
  computerShipHitCounts: ReadonlyMap<ShipType, number>;
  playerFireShot: (coordinate: CoordinateKey) => void;
  reset: () => void;
}

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

function reducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "PLAYER_FIRE": {
      // Guard: ignore if it's not the player's turn or the session is already over.
      if (state.activeTurn !== "player" || state.winner !== null) {
        return state;
      }

      const { board: nextComputerBoard, result } = applyShotToBoard(
        action.coordinate,
        state.board.computer,
        COMPUTER_POSITION_INDEX,
      );

      return {
        ...state,
        board: { ...state.board, computer: nextComputerBoard },
        // Player keeps their turn on a hit — computer only gets to fire on a miss.
        activeTurn: result.outcome === "miss" ? "computer" : "player",
        winner: nextComputerBoard.isGameOver ? "player" : null,
        // AI thinking begins only if the turn switched to the computer.
        isAiThinking:
          result.outcome === "miss" && !nextComputerBoard.isGameOver,
      };
    }
    case "COMPUTER_FIRE": {
      // Guard: ignore if it's not the computer's turn or the session is already over.
      if (state.activeTurn !== "computer" || state.winner !== null) {
        return state;
      }

      const { board: nextPlayerBoard, result } = applyShotToBoard(
        action.coordinate,
        state.board.player,
        PLAYER_POSITION_INDEX,
      );

      return {
        ...state,
        board: { ...state.board, player: nextPlayerBoard },
        activeTurn: result.outcome === "miss" ? "player" : "computer",
        winner: nextPlayerBoard.isGameOver ? "computer" : null,
        isAiThinking: result.outcome !== "miss" && !nextPlayerBoard.isGameOver,
      };
    }
    case "RESET": {
      return buildInitialSessionState();
    }
    default:
      return state;
  }
}

/**
 * Orchestrates a two-board session.
 *
 * Stub — wire up when two-player mode is in scope.
 * The engine (resolveShot, isGameOver) is board-local and pure; call it once
 * per board independently. Session logic (turn switching, game-over guard)
 * lives here and nowhere else.
 */
export function useBattleshipSessionGame(): UseBattleshipSessionReturn {
  const [state, dispatch] = useReducer(reducer, buildInitialSessionState());

  const playerFireShot = useCallback(
    (coordinate: CoordinateKey) => {
      if (state.activeTurn !== "player" || state.winner !== null) return;
      dispatch({ type: "PLAYER_FIRE", coordinate });
    },
    [state.activeTurn, state.winner],
  );

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const playerShipHitCounts = useMemo<ReadonlyMap<ShipType, number>>(() => {
    const counts = new Map<ShipType, number>();
    for (const ship of PLAYER_SHIPS) {
      counts.set(
        ship.id,
        ship.coordinates.filter((key) => state.board.player.shots.has(key))
          .length,
      );
    }
    return counts;
  }, [state.board.player.shots]);

  const computerShipHitCounts = useMemo<ReadonlyMap<ShipType, number>>(() => {
    const counts = new Map<ShipType, number>();
    for (const ship of COMPUTER_SHIPS) {
      counts.set(
        ship.id,
        ship.coordinates.filter((key) => state.board.computer.shots.has(key))
          .length,
      );
    }
    return counts;
  }, [state.board.computer.shots]);

  useEffect(() => {
    if (state.activeTurn !== "computer" || state.winner !== null) return;

    const coordinate = chooseRandomUnfiredCoordinate(state.board.player.shots);
    if (coordinate === null) return;

    const timeout = setTimeout(() => {
      dispatch({ type: "COMPUTER_FIRE", coordinate });
    }, AI_SHOT_DELAY_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [state.activeTurn, state.winner, state.board.player.shots]);

  return {
    board: {
      player: state.board.player,
      computer: state.board.computer,
    },
    activeTurn: state.activeTurn,
    winner: state.winner,
    isAiThinking: state.isAiThinking,
    playerLastResult: state.board.player.lastResult,
    computerLastResult: state.board.computer.lastResult,
    playerShipHitCounts,
    computerShipHitCounts,
    playerFireShot,
    reset,
  };
}
