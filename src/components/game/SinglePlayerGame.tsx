import { useLayoutEffect } from "react";
import { Board } from "@/components/board";
import { Button, Container, Section, SplitLayout } from "@nuka-ui/core";
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

  useLayoutEffect(() => {
    onStatusChange({ mode: "single", isGameOver, shotCount: shots.size });
  }, [isGameOver, shots.size, onStatusChange]);

  useShotToast(lastResult);

  return (
    <Container padded={false} className="max-w-[56rem]">
      <ShotResultAnnouncer result={lastResult} announceKey={shots.size} />

      <SplitLayout sidebar="right" sideWidth="md" stackBelow="md" gap="md">
        <Section as="section" className="w-full max-w-[32rem]">
          <Board
            boardSize={boardSize}
            columnLabels={columnLabels}
            shots={shots}
            onFire={fireShot}
            disabled={isGameOver}
          />
        </Section>

        <Section as="section" className="w-full">
          <ShipStatusList
            ships={ships}
            sunkShipIds={sunkShipIds}
            hitCounts={shipHitCounts}
          />
        </Section>
      </SplitLayout>

      {isGameOver && (
        <div className="w-full flex justify-center mt-6">
          <Button variant="outline" onClick={reset}>
            Play again
          </Button>
        </div>
      )}
    </Container>
  );
}
