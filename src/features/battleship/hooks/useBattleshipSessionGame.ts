import { useEffect, useReducer, useCallback, useMemo } from "react";
import { generateRandomLayout } from "@/features/battleship/services/placement";
import { RAW_GAME_CONFIG } from "@/features/battleship/data/config";
import type {
  CellStatus,
  CoordinateKey,
  Difficulty,
  PlayerId,
  SessionBoards,
  ShipType,
  ShotResult,
} from "@/features/battleship/types";
import { DIFFICULTY_CONFIG } from "@/features/battleship/constants";
import {
  buildPositionIndex,
  computeShipHitCounts,
  isGameOver,
  isShipSunk,
  outcomeToStatus,
  resolveShot,
} from "@/features/battleship/services/engine";
import { chooseRandomUnfiredCoordinate } from "@/features/battleship/services/ai";

export const AI_SHOT_DELAY_MS = 1000;

// ---------------------------------------------------------------------------
// Naming legend
//
//   playerShots    = coordinates the PLAYER fired at the COMPUTER's board
//   computerShots  = coordinates the COMPUTER fired at the PLAYER's board
//   playerShips    = the PLAYER's fleet (computer fires at these)
//   computerShips  = the COMPUTER's fleet (player fires at these)
//
// Board assembly for the UI:
//
//   "Your fleet" panel:
//     ships = playerShips, shots = computerShots,
//     sunkShipIds = computerSunkShipIds, isGameOver = computerIsGameOver
//
//   "Enemy fleet" panel:
//     ships = computerShips, shots = playerShots,
//     sunkShipIds = playerSunkShipIds, isGameOver = playerIsGameOver
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Reducer state — persists only the irreducible minimum.
// Everything else (sunkShipIds, isGameOver, winner, isAiThinking) is derived
// via useMemo in the hook body.
// ---------------------------------------------------------------------------

interface SessionReducerState {
  playerShots: Map<CoordinateKey, CellStatus>;
  computerShots: Map<CoordinateKey, CellStatus>;
  playerLastResult: ShotResult | null;
  computerLastResult: ShotResult | null;
  activeTurn: PlayerId;
}

const INITIAL_SESSION_STATE: SessionReducerState = {
  playerShots: new Map(),
  computerShots: new Map(),
  playerLastResult: null,
  computerLastResult: null,
  activeTurn: "player",
};

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
  boardSize: number;
  columnLabels: readonly string[];
  playerLastResult: ShotResult | null;
  computerLastResult: ShotResult | null;
  playerShipHitCounts: ReadonlyMap<ShipType, number>;
  computerShipHitCounts: ReadonlyMap<ShipType, number>;
  playerFireShot: (coordinate: CoordinateKey) => void;
  reset: () => void;
}

/**
 * Orchestrates a two-board session.
 *
 * The engine (resolveShot, isGameOver) is board-local and pure; call it once
 * per board independently. Session logic (turn switching, game-over guard)
 * lives here and nowhere else.
 */
export function useBattleshipSessionGame(
  difficulty: Difficulty = "easy",
): UseBattleshipSessionReturn {
  const { boardSize, columnLabels } = DIFFICULTY_CONFIG[difficulty];

  // Each player gets an independent random layout. Position indexes are
  // derived once and stable for this hook's lifetime.
  const {
    playerShips,
    computerShips,
    playerPositionIndex,
    computerPositionIndex,
  } = useMemo(() => {
    const pShips = generateRandomLayout(RAW_GAME_CONFIG, boardSize);
    const cShips = generateRandomLayout(RAW_GAME_CONFIG, boardSize);
    return {
      playerShips: pShips,
      computerShips: cShips,
      playerPositionIndex: buildPositionIndex(pShips),
      computerPositionIndex: buildPositionIndex(cShips),
    };
  }, [boardSize]);

  // The reducer is defined here to close over the position indexes. Both are
  // from useMemo([boardSize]) and never change within a mount, so the closure
  // is behaviourally identical to a module-scope definition.
  function reducer(
    state: SessionReducerState,
    action: SessionAction,
  ): SessionReducerState {
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
        return INITIAL_SESSION_STATE;
      default:
        return state;
    }
  }

  const [state, dispatch] = useReducer(reducer, INITIAL_SESSION_STATE);

  // ---------------------------------------------------------------------------
  // Derivation chain — declared in dependency order so each useMemo can
  // reference the previous result.
  // ---------------------------------------------------------------------------

  // 1. Sunk ship IDs — which ships each player has destroyed
  const playerSunkShipIds = useMemo<ReadonlySet<ShipType>>(() => {
    const sunk = new Set<ShipType>();
    for (const ship of computerShips) {
      if (isShipSunk(ship, state.playerShots)) sunk.add(ship.id);
    }
    return sunk;
  }, [computerShips, state.playerShots]);

  const computerSunkShipIds = useMemo<ReadonlySet<ShipType>>(() => {
    const sunk = new Set<ShipType>();
    for (const ship of playerShips) {
      if (isShipSunk(ship, state.computerShots)) sunk.add(ship.id);
    }
    return sunk;
  }, [playerShips, state.computerShots]);

  // 2. Game-over flags
  const playerIsGameOver = useMemo(
    () => isGameOver(computerShips, playerSunkShipIds),
    [computerShips, playerSunkShipIds],
  );

  const computerIsGameOver = useMemo(
    () => isGameOver(playerShips, computerSunkShipIds),
    [playerShips, computerSunkShipIds],
  );

  // 3. Session-level derived values
  const winner = useMemo<PlayerId | null>(() => {
    if (playerIsGameOver) return "player";
    if (computerIsGameOver) return "computer";
    return null;
  }, [playerIsGameOver, computerIsGameOver]);

  const isAiThinking = state.activeTurn === "computer" && winner === null;

  // 4. Hit counts
  const playerShipHitCounts = useMemo(
    () => computeShipHitCounts(playerShips, state.computerShots),
    [playerShips, state.computerShots],
  );

  const computerShipHitCounts = useMemo(
    () => computeShipHitCounts(computerShips, state.playerShots),
    [computerShips, state.playerShots],
  );

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------

  const playerFireShot = useCallback(
    (coordinate: CoordinateKey) => {
      if (winner !== null) return;
      dispatch({ type: "PLAYER_FIRE", coordinate });
    },
    [winner],
  );

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  // ---------------------------------------------------------------------------
  // AI turn — fires after a delay when it is the computer's turn.
  // winner must be fully resolved above before this effect runs.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (state.activeTurn !== "computer" || winner !== null) return;

    const coordinate = chooseRandomUnfiredCoordinate(
      state.computerShots,
      boardSize,
    );
    if (coordinate === null) return;

    const timeout = setTimeout(() => {
      dispatch({ type: "COMPUTER_FIRE", coordinate });
    }, AI_SHOT_DELAY_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [state.activeTurn, winner, state.computerShots, boardSize]);

  // ---------------------------------------------------------------------------
  // Return value — assemble BoardState views from derived values.
  // See naming legend at top of file for the cross-wiring rationale.
  // ---------------------------------------------------------------------------

  return {
    board: {
      // "Your fleet" panel: player's ships, shots the computer fired at them
      player: {
        ships: playerShips,
        shots: state.computerShots,
        sunkShipIds: computerSunkShipIds,
        isGameOver: computerIsGameOver,
        lastResult: state.computerLastResult,
      },
      // "Enemy fleet" panel: computer's ships, shots the player fired at them
      computer: {
        ships: computerShips,
        shots: state.playerShots,
        sunkShipIds: playerSunkShipIds,
        isGameOver: playerIsGameOver,
        lastResult: state.playerLastResult,
      },
    },
    activeTurn: state.activeTurn,
    winner,
    isAiThinking,
    boardSize,
    columnLabels,
    playerLastResult: state.playerLastResult,
    computerLastResult: state.computerLastResult,
    playerShipHitCounts,
    computerShipHitCounts,
    playerFireShot,
    reset,
  };
}
