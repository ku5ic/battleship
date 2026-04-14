import { useEffect } from "react";
import { Board } from "@/components/board";
import { Button } from "@nuka-ui/core";
import { ShipStatusList, ShotResultAnnouncer } from "@/battleship/components";
import { useSinglePlayerGame } from "@/battleship/hooks/useSinglePlayerGame";
import { useShotToast } from "@/battleship/hooks/useShotToast";
import type { Difficulty, HeaderGameStatus } from "@/battleship/types";

interface SinglePlayerGameProps {
  difficulty: Difficulty;
  onStatusChange: (status: HeaderGameStatus & { mode: "single" }) => void;
}

/**
 * Wires the game hook to the presentational layer.
 *
 * This is the only component that calls useSinglePlayerGame. Everything below
 * it receives plain props and emits callbacks. No child is aware the hook
 * exists.
 */
export function SinglePlayerGame({
  difficulty,
  onStatusChange,
}: SinglePlayerGameProps) {
  const {
    ships,
    shots,
    sunkShipIds,
    isGameOver,
    lastResult,
    shipHitCounts,
    boardSize,
    columnLabels,
    fireShot,
    reset,
  } = useSinglePlayerGame(difficulty);

  useEffect(() => {
    onStatusChange({ mode: "single", isGameOver, shotCount: shots.size });
  }, [isGameOver, shots.size, onStatusChange]);

  useShotToast(lastResult);

  return (
    <div className="flex flex-col md:flex-row md:items-start gap-y-4 md:gap-x-6 w-full">
      {/*
        ShotResultAnnouncer is visually hidden and announces transient shot
        events (hit, miss, sunk, already-fired) via aria-live="polite".
      */}
      <ShotResultAnnouncer result={lastResult} announceKey={shots.size} />

      {/*
        On large screens the board and fleet panel sit side-by-side, with the
        fleet aligned to the top of the board. On smaller screens they stack
        vertically, with the fleet centered below the board.
      */}
      <section className="w-full">
        <Board
          boardSize={boardSize}
          columnLabels={columnLabels}
          shots={shots}
          onFire={fireShot}
          disabled={isGameOver}
        />
      </section>

      <section className="w-full md:w-auto">
        <ShipStatusList
          ships={ships}
          sunkShipIds={sunkShipIds}
          hitCounts={shipHitCounts}
        />
      </section>

      {isGameOver && (
        <div className="w-full flex justify-center mt-6">
          <Button variant="outline" onClick={reset}>
            Play again
          </Button>
        </div>
      )}
    </div>
  );
}
