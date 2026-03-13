import { useCallback, useMemo, useReducer } from "react";
import { SHIPS } from "@/features/battleship/data";
import {
  buildPositionIndex,
  isGameOver,
  outcomeToStatus,
  resolveShot,
} from "@/features/battleship/services/engine";
import type {
  CellStatus,
  CoordinateKey,
  GameState,
  ShipType,
  ShotResult,
} from "@/features/battleship/types";
import { toKey } from "@/features/battleship/utils/coordinates";

// ---------------------------------------------------------------------------
// Ships are static — parse and index once outside the hook so neither
// operation reruns on re-render. This is safe because the layout never
// changes during a session.
// ---------------------------------------------------------------------------

const POSITION_INDEX = buildPositionIndex(SHIPS);

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

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FIRE": {
      const result = resolveShot(
        action.coordinate,
        state.shots,
        POSITION_INDEX,
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

// ---------------------------------------------------------------------------
// Public interface
//
// GameState carries the read-only view of the world. The two action callbacks
// are added alongside it so consumers get everything from one hook call.
// ---------------------------------------------------------------------------

export interface UseBattleshipGameReturn extends GameState {
  fireShot: (col: number, row: number) => void;
  resetGame: () => void;
}

export function useBattleshipGame(): UseBattleshipGameReturn {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const sunkShipIds = useMemo<ReadonlySet<ShipType>>(() => {
    const sunk = new Set<ShipType>();
    for (const ship of SHIPS) {
      if (ship.coordinates.every((key) => state.shots.has(key))) {
        sunk.add(ship.id);
      }
    }
    return sunk;
  }, [state.shots]);

  const gameOver = useMemo(() => isGameOver(SHIPS, sunkShipIds), [sunkShipIds]);

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
    ships: SHIPS,
    shots: state.shots,
    sunkShipIds,
    isGameOver: gameOver,
    lastResult: state.lastResult,
    fireShot,
    resetGame,
  };
}
