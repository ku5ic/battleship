import { useEffect, useReducer, useCallback, useMemo, useRef } from "react";
import { generateRandomLayout } from "@/battleship/services/placement";
import { RAW_GAME_CONFIG } from "@/battleship/data/config";
import type {
  CoordinateKey,
  Difficulty,
  PlayerId,
  VsComputerBoards,
  Ship,
  ShipType,
  ShotResult,
} from "@/battleship/types";
import { DIFFICULTY_CONFIG } from "@/battleship/constants";
import {
  buildPositionIndex,
  computeShipHitCounts,
  isGameOver,
  selectSunkShipIds,
} from "@/battleship/services/engine";
import { chooseRandomUnfiredCoordinate } from "@/battleship/services/ai";
import {
  createVsComputerInitialState,
  createVsComputerReducer,
  selectWinner,
} from "@/battleship/engine/vsComputer";

export const AI_SHOT_DELAY_MS = 1000;

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

export interface UseVsComputerGameReturn {
  board: VsComputerBoards;
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
 * Orchestrates a two-board vs-computer game.
 *
 * The engine (resolveShot, isGameOver) is board-local and pure; call it once
 * per board independently. Vs-computer logic (turn switching, game-over guard)
 * lives here and nowhere else.
 */
export function useVsComputerGame(
  difficulty: Difficulty = "easy",
  playerShipsOverride?: Ship[],
): UseVsComputerGameReturn {
  const { boardSize, columnLabels } = DIFFICULTY_CONFIG[difficulty];

  // Incremented on reset to invalidate the ship-generation memo below.
  // Lives in a ref because it is orchestration state, not game state:
  // it never reaches the reducer or the return value.
  const generationRef = useRef(0);

  // Ships regenerate when boardSize changes (difficulty switch via key-remount),
  // when playerShipsOverride changes (placement phase), or when generationRef
  // advances (reset). When an override is provided, only computer ships
  // regenerate; the player's placed fleet is preserved.
  const {
    playerShips,
    computerShips,
    playerPositionIndex,
    computerPositionIndex,
  } = useMemo(() => {
    const pShips =
      playerShipsOverride ?? generateRandomLayout(RAW_GAME_CONFIG, boardSize);
    const cShips = generateRandomLayout(RAW_GAME_CONFIG, boardSize);
    return {
      playerShips: pShips,
      computerShips: cShips,
      playerPositionIndex: buildPositionIndex(pShips),
      computerPositionIndex: buildPositionIndex(cShips),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardSize, playerShipsOverride, generationRef.current]);

  const reducer = useMemo(
    () => createVsComputerReducer(playerPositionIndex, computerPositionIndex),
    [playerPositionIndex, computerPositionIndex],
  );

  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    createVsComputerInitialState,
  );

  // Derivation chain: declared in dependency order so each useMemo can
  // reference the previous result.

  // 1. Sunk ship IDs: which ships each player has destroyed
  const playerSunkShipIds = useMemo(
    () => selectSunkShipIds(computerShips, state.playerShots),
    [computerShips, state.playerShots],
  );

  const computerSunkShipIds = useMemo(
    () => selectSunkShipIds(playerShips, state.computerShots),
    [playerShips, state.computerShots],
  );

  // 2. Game-over flags
  const playerIsGameOver = useMemo(
    () => isGameOver(computerShips, playerSunkShipIds),
    [computerShips, playerSunkShipIds],
  );

  const computerIsGameOver = useMemo(
    () => isGameOver(playerShips, computerSunkShipIds),
    [playerShips, computerSunkShipIds],
  );

  // 3. Vs-computer-level derived values
  const winner = useMemo(
    () => selectWinner(playerIsGameOver, computerIsGameOver),
    [playerIsGameOver, computerIsGameOver],
  );

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

  // Callbacks

  const playerFireShot = useCallback(
    (coordinate: CoordinateKey) => {
      if (winner !== null) return;
      dispatch({ type: "PLAYER_FIRE", coordinate });
    },
    [winner],
  );

  const reset = useCallback(() => {
    generationRef.current += 1;
    dispatch({ type: "RESET" });
  }, []);

  // AI turn: fires after a delay when it is the computer's turn.
  // winner must be fully resolved above before this effect runs.

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

  // Return value: assemble BoardState views from derived values.
  // See naming legend at top of file for the cross-wiring rationale.

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
