import { Board } from "@/components/board";
import { Button, Stack, Text } from "@/components/ui";
import {
  GameStatusMultiplayer,
  ShipStatusList,
  ShotResultAnnouncer,
} from "@/features/battleship/components";
import { useBattleshipSessionGame } from "@/features/battleship/hooks/useBattleshipSessionGame";
import type { Difficulty, CoordinateKey } from "@/features/battleship/types";

interface BattleshipMultiplayerGameProps {
  difficulty: Difficulty;
}

/**
 * Wires the session hook to the presentational layer.
 *
 * This is the only component that calls useBattleshipSessionGame. Everything
 * below it receives plain props and emits callbacks — no child is aware the
 * hook exists.
 */
export function BattleshipMultiplayerGame({
  difficulty,
}: BattleshipMultiplayerGameProps) {
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
  } = useBattleshipSessionGame(difficulty);

  const sessionOver = winner !== null;

  return (
    <Stack className="w-full max-w-5xl mx-auto">
      <Text as="h1" variant="title">
        Battleship
      </Text>

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
          <Text as="h2" variant="label" className="mb-2">
            Your fleet
          </Text>
          <Board
            boardSize={boardSize}
            columnLabels={columnLabels}
            shots={board.player.shots}
            isGameOver={board.player.isGameOver}
            isReadOnly
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
        <section aria-label="Opponent's board">
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
            isGameOver={board.computer.isGameOver}
            isReadOnly={activeTurn !== "player" || sessionOver}
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
      <Button onClick={reset}>{sessionOver ? "Play again" : "Restart"}</Button>
    </Stack>
  );
}
