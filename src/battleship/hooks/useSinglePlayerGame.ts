import { useCallback, useMemo, useReducer } from "react";
import { generateRandomLayout } from "@/battleship/services/placement";
import { RAW_GAME_CONFIG } from "@/battleship/data/config";
import {
  buildPositionIndex,
  computeShipHitCounts,
  isGameOver,
  selectSunkShipIds,
} from "@/battleship/services/engine";
import { DIFFICULTY_CONFIG } from "@/battleship/constants";
import {
  createSinglePlayerInitialState,
  createSinglePlayerReducer,
} from "@/battleship/engine/singlePlayer";
import type {
  CoordinateKey,
  Difficulty,
  GameState,
  ShipType,
} from "@/battleship/types";

// ---------------------------------------------------------------------------
// Public interface
//
// GameState carries the read-only view of the world. The two action callbacks
// are added alongside it so consumers get everything from one hook call.
// ---------------------------------------------------------------------------

export interface UseSinglePlayerGameReturn extends GameState {
  boardSize: number;
  columnLabels: readonly string[];
  shipHitCounts: ReadonlyMap<ShipType, number>;
  fireShot: (coordinate: CoordinateKey) => void;
  reset: () => void;
}

export function useSinglePlayerGame(
  difficulty: Difficulty = "easy",
): UseSinglePlayerGameReturn {
  const { boardSize, columnLabels } = DIFFICULTY_CONFIG[difficulty];

  // Ships and their position index are stable for this hook's lifetime —
  // difficulty changes are handled by remounting the hook via key prop.
  const { ships, positionIndex } = useMemo(() => {
    const generated = generateRandomLayout(RAW_GAME_CONFIG, boardSize);
    return { ships: generated, positionIndex: buildPositionIndex(generated) };
  }, [boardSize]);

  const reducer = useMemo(
    () => createSinglePlayerReducer(ships, positionIndex),
    [ships, positionIndex],
  );

  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    createSinglePlayerInitialState,
  );

  const sunkShipIds = useMemo(
    () => selectSunkShipIds(ships, state.shots),
    [ships, state.shots],
  );

  const gameOver = useMemo(
    () => isGameOver(ships, sunkShipIds),
    [ships, sunkShipIds],
  );

  const shipHitCounts = useMemo(
    () => computeShipHitCounts(ships, state.shots),
    [ships, state.shots],
  );

  const fireShot = useCallback((coordinate: CoordinateKey): void => {
    dispatch({ type: "FIRE", coordinate });
  }, []);

  const reset = useCallback((): void => {
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
    reset,
  };
}
