import { useEffect } from "react";
import { Board } from "@/components/board";
import { Button, Stack } from "@/components/ui";
import { ShipStatusList, ShotResultAnnouncer } from "@/battleship/components";
import { useSinglePlayerGame } from "@/battleship/hooks/useSinglePlayerGame";
import type { Difficulty, HeaderGameStatus } from "@/battleship/types";

interface SinglePlayerGameProps {
  difficulty: Difficulty;
  onStatusChange: (status: HeaderGameStatus & { mode: "single" }) => void;
}

/**
 * Wires the game hook to the presentational layer.
 *
 * This is the only component that calls useSinglePlayerGame. Everything below
 * it receives plain props and emits callbacks — no child is aware the hook
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

  return (
    <Stack className="w-full max-w-3xl mx-auto">
      {/*
        ShotResultAnnouncer is visually hidden and announces transient shot
        events (hit, miss, sunk, already-fired) via aria-live="polite".
      */}
      <ShotResultAnnouncer result={lastResult} />

      {/*
        On large screens the board and fleet panel sit side-by-side, with the
        fleet aligned to the top of the board. On smaller screens they stack
        vertically, with the fleet centered below the board.
      */}
      <div className="w-full flex flex-col items-center gap-4 sm:gap-6 lg:flex-row lg:items-start lg:gap-8">
        <Board
          boardSize={boardSize}
          columnLabels={columnLabels}
          shots={shots}
          onFire={fireShot}
          disabled={isGameOver}
        />

        <div className="w-full max-w-xs lg:w-48 lg:shrink-0">
          <ShipStatusList
            ships={ships}
            sunkShipIds={sunkShipIds}
            hitCounts={shipHitCounts}
          />
        </div>
      </div>

      {isGameOver && <Button onClick={reset}>Play again</Button>}
    </Stack>
  );
}
