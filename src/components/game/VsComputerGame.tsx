import { useEffect } from "react";
import { Board } from "@/components/board";
import { Button, Stack, Text } from "@/components/ui";
import { cn } from "@/lib/cn";
import { ShipStatusList, ShotResultAnnouncer } from "@/battleship/components";
import { useVsComputerGame } from "@/battleship/hooks/useVsComputerGame";
import type {
  CoordinateKey,
  Difficulty,
  HeaderGameStatus,
  Ship,
} from "@/battleship/types";

interface VsComputerGameProps {
  difficulty: Difficulty;
  playerShips?: Ship[];
  onStatusChange: (status: HeaderGameStatus & { mode: "vsComputer" }) => void;
}

/**
 * Wires the vs-computer hook to the presentational layer.
 *
 * This is the only component that calls useVsComputerGame. Everything
 * below it receives plain props and emits callbacks — no child is aware the
 * hook exists.
 */
export function VsComputerGame({
  difficulty,
  playerShips,
  onStatusChange,
}: VsComputerGameProps) {
  const {
    board,
    activeTurn,
    winner,
    isAiThinking,
    playerLastResult,
    computerLastResult,
    playerShipHitCounts,
    computerShipHitCounts,
    boardSize,
    columnLabels,
    playerFireShot,
    reset,
  } = useVsComputerGame(difficulty, playerShips);

  const gameOver = winner !== null;

  useEffect(() => {
    onStatusChange({ mode: "vsComputer", winner, activeTurn, isAiThinking });
  }, [winner, activeTurn, isAiThinking, onStatusChange]);

  return (
    <Stack className="w-full max-w-5xl mx-auto">
      {/* Announcers — visually hidden, one per board so events don't collide */}
      <ShotResultAnnouncer result={computerLastResult} />
      <ShotResultAnnouncer result={playerLastResult} />

      {/* Boards */}
      {/* Side-by-side only at easy — moderate and hard grids are too wide
           to share a row without sub-pixel cells and unreadable labels. */}
      <div
        className={cn(
          "w-full flex flex-col items-center gap-8",
          difficulty === "easy" &&
            "lg:flex-row lg:justify-center lg:items-start",
        )}
      >
        {/* Player board — read-only, shows what the computer fired at */}
        <section
          aria-label="Your board"
          className={cn(
            "w-full",
            difficulty === "easy" && "lg:w-auto lg:flex-1",
          )}
        >
          <Text as="h2" variant="label" className="mb-2">
            Your fleet
          </Text>
          <Board
            boardSize={boardSize}
            columnLabels={columnLabels}
            shots={board.player.shots}
            disabled
          />
          <div className="mt-2">
            <ShipStatusList
              ships={board.player.ships}
              sunkShipIds={board.player.sunkShipIds}
              hitCounts={playerShipHitCounts}
            />
          </div>
        </section>

        {/* Opponent board — interactive, player fires here */}
        <section
          aria-label="Opponent's board"
          className={cn(
            "w-full",
            difficulty === "easy" && "lg:w-auto lg:flex-1",
          )}
        >
          <Text as="h2" variant="label" className="mb-2">
            Enemy fleet
          </Text>
          <Board
            boardSize={boardSize}
            columnLabels={columnLabels}
            shots={board.computer.shots}
            onFire={(coord: CoordinateKey) => {
              playerFireShot(coord);
            }}
            disabled={activeTurn !== "player" || gameOver}
          />
          <div className="mt-2">
            <ShipStatusList
              ships={board.computer.ships}
              sunkShipIds={board.computer.sunkShipIds}
              hitCounts={computerShipHitCounts}
            />
          </div>
        </section>
      </div>

      {/* Reset — always available */}
      <Button onClick={reset}>{gameOver ? "Play again" : "Restart"}</Button>
    </Stack>
  );
}
