import { Board } from "@/components/board";
import {
  GameStatus,
  ShipStatusList,
  ShotResultAnnouncer,
} from "@/features/battleship/components";
import { useBattleshipGame } from "@/features/battleship/hooks/useBattleshipGame";
import type { CoordinateKey } from "@/features/battleship/types";
import { fromKey } from "@/features/battleship/utils/coordinates";

/**
 * Wires the game hook to the presentational layer.
 *
 * This is the only component that calls useBattleshipGame. Everything below
 * it receives plain props and emits callbacks — no child is aware the hook
 * exists.
 */
export function BattleshipGame() {
  const {
    ships,
    shots,
    sunkShipIds,
    isGameOver,
    lastResult,
    shipHitCounts,
    fireShot,
    resetGame,
  } = useBattleshipGame();

  function handleFire(coord: CoordinateKey) {
    const { col, row } = fromKey(coord);
    fireShot(col, row);
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold tracking-wide text-slate-100">
        Battleship
      </h1>

      {/*
        ShotResultAnnouncer is visually hidden and announces transient shot
        events (hit, miss, sunk, already-fired) via aria-live="polite".
        GameStatus announces the stable game-over state via role="status".
        Keeping them separate prevents the live region from being clobbered
        mid-sequence and ensures each concern has one clear owner.
      */}
      <ShotResultAnnouncer result={lastResult} />
      <GameStatus isGameOver={isGameOver} shotCount={shots.size} />

      {/*
        On large screens the board and fleet panel sit side-by-side, with the
        fleet aligned to the top of the board. On smaller screens they stack
        vertically, with the fleet centered below the board.
      */}
      <div className="flex flex-col items-center gap-4 sm:gap-6 lg:flex-row lg:items-start lg:gap-8">
        <Board shots={shots} onFire={handleFire} isGameOver={isGameOver} />

        <div className="w-full max-w-xs lg:w-48 lg:shrink-0">
          <ShipStatusList
            ships={ships}
            sunkShipIds={sunkShipIds}
            hitCounts={shipHitCounts}
          />
        </div>
      </div>

      {isGameOver && (
        <button
          type="button"
          onClick={resetGame}
          className="px-4 py-2 text-sm font-medium rounded border border-slate-500 text-slate-300 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          Play again
        </button>
      )}
    </div>
  );
}
