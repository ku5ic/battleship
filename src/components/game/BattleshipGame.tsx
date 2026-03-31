import { Board } from "@/components/board";
import { Button, Stack, Text } from "@/components/ui";
import {
  GameStatus,
  ShipStatusList,
  ShotResultAnnouncer,
} from "@/features/battleship/components";
import { useBattleshipGame } from "@/features/battleship/hooks/useBattleshipGame";
import type { Difficulty } from "@/features/battleship/types";

interface BattleshipGameProps {
  difficulty: Difficulty;
}

/**
 * Wires the game hook to the presentational layer.
 *
 * This is the only component that calls useBattleshipGame. Everything below
 * it receives plain props and emits callbacks — no child is aware the hook
 * exists.
 */
export function BattleshipGame({ difficulty }: BattleshipGameProps) {
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
  } = useBattleshipGame(difficulty);

  return (
    <Stack className="w-full max-w-3xl mx-auto">
      <Text as="h1" variant="title">
        Battleship
      </Text>

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
      <div className="w-full flex flex-col items-center gap-4 sm:gap-6 lg:flex-row lg:items-start lg:gap-8">
        <Board
          boardSize={boardSize}
          columnLabels={columnLabels}
          shots={shots}
          onFire={fireShot}
          isGameOver={isGameOver}
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
