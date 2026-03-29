import { useCallback, useMemo, useReducer } from "react";
import { generateRandomLayout } from "@/features/battleship/services/placement";
import { RAW_GAME_CONFIG } from "@/features/battleship/data/config";
import {
  buildPositionIndex,
  isGameOver,
  outcomeToStatus,
  resolveShot,
} from "@/features/battleship/services/engine";
import { DIFFICULTY_CONFIG } from "@/features/battleship/constants";
import type {
  CellStatus,
  CoordinateKey,
  Difficulty,
  GameState,
  ShipType,
  ShotResult,
} from "@/features/battleship/types";
import { toKey } from "@/features/battleship/utils/coordinates";

// ---------------------------------------------------------------------------
// State shape and reducer
//
// Only the two values that change over time are persisted. Everything else
// (sunkShipIds, isGameOver) is derived in the hook body from shots alone.
//
// A reducer is justified here because fireShot has a natural "guard then
// commit" shape that reads more clearly as an action than as sequential
// setters. It also makes the reset action trivial and keeps both state
// fields in sync without needing useEffect.
// ---------------------------------------------------------------------------

interface State {
  shots: Map<CoordinateKey, CellStatus>;
  lastResult: ShotResult | null;
}

type Action = { type: "FIRE"; coordinate: CoordinateKey } | { type: "RESET" };

const INITIAL_STATE: State = {
  shots: new Map(),
  lastResult: null,
};

// ---------------------------------------------------------------------------
// Public interface
//
// GameState carries the read-only view of the world. The two action callbacks
// are added alongside it so consumers get everything from one hook call.
// ---------------------------------------------------------------------------

export interface UseBattleshipGameReturn extends GameState {
  boardSize: number;
  columnLabels: readonly string[];
  shipHitCounts: ReadonlyMap<ShipType, number>;
  fireShot: (col: number, row: number) => void;
  resetGame: () => void;
}

export function useBattleshipGame(
  difficulty: Difficulty = "easy",
): UseBattleshipGameReturn {
  const { boardSize, columnLabels } = DIFFICULTY_CONFIG[difficulty];

  // Ships and their position index are stable for this hook's lifetime —
  // difficulty changes are handled by remounting the hook via key prop.
  const { ships, positionIndex } = useMemo(() => {
    const generated = generateRandomLayout(RAW_GAME_CONFIG, boardSize);
    return { ships: generated, positionIndex: buildPositionIndex(generated) };
  }, [boardSize]);

  // The reducer is defined here to close over positionIndex. Because positionIndex
  // is from useMemo([boardSize]) and never changes within a mount, the closure
  // is behaviourally identical to a module-scope definition.
  function reducer(state: State, action: Action): State {
    switch (action.type) {
      case "FIRE": {
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
        return INITIAL_STATE;
    }
  }

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const sunkShipIds = useMemo<ReadonlySet<ShipType>>(() => {
    const sunk = new Set<ShipType>();
    for (const ship of ships) {
      if (ship.coordinates.every((key) => state.shots.has(key))) {
        sunk.add(ship.id);
      }
    }
    return sunk;
  }, [ships, state.shots]);

  const gameOver = useMemo(
    () => isGameOver(ships, sunkShipIds),
    [ships, sunkShipIds],
  );

  const shipHitCounts = useMemo<ReadonlyMap<ShipType, number>>(() => {
    const counts = new Map<ShipType, number>();
    for (const ship of ships) {
      counts.set(
        ship.id,
        ship.coordinates.filter((key) => state.shots.has(key)).length,
      );
    }
    return counts;
  }, [ships, state.shots]);

  const fireShot = useCallback(
    (col: number, row: number): void => {
      if (gameOver) return;
      dispatch({ type: "FIRE", coordinate: toKey(col, row) });
    },
    [gameOver],
  );

  const resetGame = useCallback((): void => {
    dispatch({ type: "RESET" });
  }, []);

  return {
    ships,
    shots: state.shots,
    sunkShipIds,
    isGameOver: gameOver,
    lastResult: state.lastResult,
    boardSize,
    columnLabels,
    shipHitCounts,
    fireShot,
    resetGame,
  };
}
