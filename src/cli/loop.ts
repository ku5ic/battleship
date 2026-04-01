import type {
  BoardState,
  CellStatus,
  CoordinateKey,
  Ship,
  ShotResult,
  VsComputerBoards,
} from "@/battleship/types";
import {
  buildPositionIndex,
  isGameOver,
  selectSunkShipIds,
} from "@/battleship/services/engine";
import {
  createSinglePlayerInitialState,
  createSinglePlayerReducer,
} from "@/battleship/engine/singlePlayer";
import {
  createVsComputerInitialState,
  createVsComputerReducer,
  selectWinner,
} from "@/battleship/engine/vsComputer";
import { chooseRandomUnfiredCoordinate } from "@/battleship/services/ai";
import {
  renderBoard,
  renderGameOver,
  renderLegend,
  renderShotResult,
  renderVsComputerBoards,
  renderVsComputerGameOver,
} from "@/cli/renderer";
import { promptCoordinate } from "@/cli/input";
import type { LineReader } from "@/cli/input";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Assembles a BoardState view from raw persisted state and the fleet.
 * Derives sunkShipIds and isGameOver so the renderer receives a complete
 * snapshot without the loop needing to track those values separately.
 */
function toBoardState(
  ships: readonly Ship[],
  shots: ReadonlyMap<CoordinateKey, CellStatus>,
  lastResult: ShotResult | null,
): BoardState {
  const sunkShipIds = selectSunkShipIds(ships, shots);
  return {
    ships,
    shots,
    sunkShipIds,
    isGameOver: isGameOver(ships, sunkShipIds),
    lastResult,
  };
}

// ---------------------------------------------------------------------------
// Single-player loop
// ---------------------------------------------------------------------------

/**
 * Runs a complete single-player game. The loop renders the board, prompts
 * for a coordinate, dispatches a FIRE action, and repeats until all ships
 * are sunk.
 */
export async function runSinglePlayer(
  rl: LineReader,
  ships: readonly Ship[],
  columnLabels: readonly string[],
  boardSize: number,
): Promise<void> {
  const positionIndex = buildPositionIndex(ships);
  const reducer = createSinglePlayerReducer(ships, positionIndex);
  let state = createSinglePlayerInitialState();

  for (;;) {
    const sunkShipIds = selectSunkShipIds(ships, state.shots);
    if (isGameOver(ships, sunkShipIds)) break;

    const board = toBoardState(ships, state.shots, state.lastResult);
    console.log(renderBoard(board, columnLabels, boardSize, true));
    console.log("\n" + renderLegend());
    const shotMsg = renderShotResult(state.lastResult, columnLabels);
    if (shotMsg) console.log(shotMsg);

    const coordinate = await promptCoordinate(rl, columnLabels, boardSize);
    state = reducer(state, { type: "FIRE", coordinate });
  }

  // Final render after game over.
  const finalBoard = toBoardState(ships, state.shots, state.lastResult);
  console.log(renderBoard(finalBoard, columnLabels, boardSize, true));
  console.log("\n" + renderLegend());
  const lastShotMsg = renderShotResult(state.lastResult, columnLabels);
  if (lastShotMsg) console.log(lastShotMsg);
  console.log(renderGameOver(state.shots.size));
}

// ---------------------------------------------------------------------------
// Vs-computer loop
// ---------------------------------------------------------------------------

/**
 * Runs a complete vs-computer game. The player and computer alternate
 * turns; the player is prompted for coordinates while the computer
 * selects randomly from unfired cells.
 */
export async function runVsComputer(
  rl: LineReader,
  playerShips: readonly Ship[],
  computerShips: readonly Ship[],
  columnLabels: readonly string[],
  boardSize: number,
): Promise<void> {
  const playerPositionIndex = buildPositionIndex(playerShips);
  const computerPositionIndex = buildPositionIndex(computerShips);
  const reducer = createVsComputerReducer(
    playerPositionIndex,
    computerPositionIndex,
  );
  let state = createVsComputerInitialState();

  for (;;) {
    const playerSunkIds = selectSunkShipIds(computerShips, state.playerShots);
    const computerSunkIds = selectSunkShipIds(playerShips, state.computerShots);
    const winner = selectWinner(
      isGameOver(computerShips, playerSunkIds),
      isGameOver(playerShips, computerSunkIds),
    );
    if (winner !== null) {
      // Final render.
      const finalBoards = buildVsComputerBoards(
        playerShips,
        computerShips,
        state.computerShots,
        state.playerShots,
        state.playerLastResult,
        state.computerLastResult,
      );
      console.log(renderVsComputerBoards(finalBoards, columnLabels, boardSize));
      console.log(renderVsComputerGameOver(winner));
      return;
    }

    const boards = buildVsComputerBoards(
      playerShips,
      computerShips,
      state.computerShots,
      state.playerShots,
      state.playerLastResult,
      state.computerLastResult,
    );
    console.log(renderVsComputerBoards(boards, columnLabels, boardSize));

    if (state.activeTurn === "player") {
      const shotMsg = renderShotResult(state.playerLastResult, columnLabels);
      if (shotMsg) console.log(shotMsg);

      const coordinate = await promptCoordinate(rl, columnLabels, boardSize);
      state = reducer(state, { type: "PLAYER_FIRE", coordinate });
    } else {
      const shotMsg = renderShotResult(state.computerLastResult, columnLabels);
      if (shotMsg) console.log(shotMsg);

      // AI_SHOT_DELAY_MS is intentionally omitted in the CLI.
      // The delay is a UI affordance for the React frontend — it gives the
      // player time to register the computer's turn visually. In a terminal
      // the shot result is printed synchronously and no delay is needed.
      const coordinate = chooseRandomUnfiredCoordinate(
        state.computerShots,
        boardSize,
      );
      if (coordinate === null) return;
      state = reducer(state, { type: "COMPUTER_FIRE", coordinate });
    }
  }
}

/**
 * Assembles the two-board view. The player board shows the player's ships
 * hit by computer shots; the computer board shows computer's ships hit by
 * player shots.
 */
function buildVsComputerBoards(
  playerShips: readonly Ship[],
  computerShips: readonly Ship[],
  computerShots: ReadonlyMap<CoordinateKey, CellStatus>,
  playerShots: ReadonlyMap<CoordinateKey, CellStatus>,
  playerLastResult: ShotResult | null,
  computerLastResult: ShotResult | null,
): VsComputerBoards {
  return {
    player: toBoardState(playerShips, computerShots, computerLastResult),
    computer: toBoardState(computerShips, playerShots, playerLastResult),
  };
}
