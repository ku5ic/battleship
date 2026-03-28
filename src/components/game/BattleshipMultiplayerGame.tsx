import { Board } from "@/components/board";
import {
  GameStatusMultiplayer,
  ShipStatusList,
  ShotResultAnnouncer,
} from "@/features/battleship/components";
import { useBattleshipSessionGame } from "@/features/battleship/hooks/useBattleshipSessionGame";
import type { CoordinateKey } from "@/features/battleship/types";

/**
 * Wires the game hook to the presentational layer.
 *
 * This is the only component that calls useBattleshipGame. Everything below
 * it receives plain props and emits callbacks — no child is aware the hook
 * exists.
 */
export function BattleshipMultiplayerGame() {
  const {
    board,
    activeTurn,
    winner,
    isAiThinking,
    playerLastResult,
    computerLastResult,
    playerFireShot,
    reset,
  } = useBattleshipSessionGame();

  const sessionOver = winner !== null;

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold tracking-wide text-slate-100">
        Battleship
      </h1>

      {/* Announcers — visually hidden, one per board so events don't collide */}
      <ShotResultAnnouncer result={computerLastResult} />
      <ShotResultAnnouncer result={playerLastResult} />

      {/* Turn / winner status */}
      <GameStatusMultiplayer
        winner={winner}
        activeTurn={activeTurn}
        isAiThinking={isAiThinking}
      />

      {/* Boards */}
      <div className="flex flex-col items-start gap-8 lg:flex-row">
        {/* Player board — read-only, shows what the computer fired at */}
        <section aria-label="Your board">
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">
            Your fleet
          </h2>
          <Board
            shots={board.player.shots}
            isGameOver={board.player.isGameOver}
            isReadOnly
          />
          <div className="mt-2">
            <ShipStatusList
              ships={board.player.ships}
              shots={board.player.shots}
              sunkShipIds={board.player.sunkShipIds}
            />
          </div>
        </section>

        {/* Opponent board — interactive, player fires here */}
        <section aria-label="Opponent's board">
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">
            Enemy fleet
          </h2>
          <Board
            shots={board.computer.shots}
            onFire={(coord: CoordinateKey) => {
              playerFireShot(coord);
            }}
            isGameOver={board.computer.isGameOver}
            isReadOnly={activeTurn !== "player" || sessionOver}
          />
          <div className="mt-2">
            <ShipStatusList
              ships={board.computer.ships}
              shots={board.computer.shots}
              sunkShipIds={board.computer.sunkShipIds}
            />
          </div>
        </section>
      </div>

      {/* Reset — always available */}
      <button
        type="button"
        onClick={reset}
        className="px-4 py-2 text-sm font-medium rounded border border-slate-500 text-slate-300 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      >
        {sessionOver ? "Play again" : "Restart"}
      </button>
    </div>
  );
}
