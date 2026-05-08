import { useLayoutEffect, useState } from "react";
import { Board } from "@/components/board";
import {
  Button,
  Container,
  Eyebrow,
  Section,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@nuka-ui/core";
import { ShipStatusList, ShotResultAnnouncer } from "@/battleship/components";
import { useVsComputerGame } from "@/battleship/hooks/useVsComputerGame";
import { useShotToast } from "@/battleship/hooks/useShotToast";
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
 * below it receives plain props and emits callbacks. No child is aware the
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

  const [activeBoard, setActiveBoard] = useState<"player" | "enemy">("player");
  const [prevActiveTurn, setPrevActiveTurn] = useState(activeTurn);

  // Surface the board the player needs to act on. Uses the render-time
  // state adjustment pattern (not useEffect) to avoid the cascading render
  // lint violation while still responding to activeTurn changes.
  if (activeTurn !== prevActiveTurn) {
    setPrevActiveTurn(activeTurn);
    if (activeTurn === "player" && !gameOver) {
      setActiveBoard("enemy");
    }
  }

  useLayoutEffect(() => {
    onStatusChange({ mode: "vsComputer", winner, activeTurn, isAiThinking });
  }, [winner, activeTurn, isAiThinking, onStatusChange]);

  useShotToast(playerLastResult);
  useShotToast(computerLastResult, "computer");

  function handleValueChange(value: string) {
    setActiveBoard(value as "player" | "enemy");
  }

  return (
    <>
      {/* Announcers: outside both branches so live regions persist across layout changes */}
      <ShotResultAnnouncer
        result={computerLastResult}
        announceKey={board.player.shots.size}
        actor="computer"
      />
      <ShotResultAnnouncer
        result={playerLastResult}
        announceKey={board.computer.shots.size}
      />

      {/* Mobile: tabs (hidden at xl+) */}
      <Container padded={false} className="block xl:hidden max-w-lg">
        <Tabs value={activeBoard} onValueChange={handleValueChange}>
          <TabsList variant="pill" className="mb-4">
            <TabsTrigger value="player">Your fleet</TabsTrigger>
            <TabsTrigger value="enemy">Enemy fleet</TabsTrigger>
          </TabsList>

          <TabsContent value="player">
            <Board
              boardSize={boardSize}
              columnLabels={columnLabels}
              shots={board.player.shots}
              disabled
            />
            <ShipStatusList
              ships={board.player.ships}
              sunkShipIds={board.player.sunkShipIds}
              hitCounts={playerShipHitCounts}
            />
          </TabsContent>

          <TabsContent value="enemy">
            <Board
              boardSize={boardSize}
              columnLabels={columnLabels}
              shots={board.computer.shots}
              onFire={(coord: CoordinateKey) => {
                playerFireShot(coord);
              }}
              disabled={activeTurn !== "player" || gameOver}
            />
            <ShipStatusList
              ships={board.computer.ships}
              sunkShipIds={board.computer.sunkShipIds}
              hitCounts={computerShipHitCounts}
            />
          </TabsContent>
        </Tabs>
      </Container>

      {/* Desktop: side by side (visible at xl+) */}
      {/* jsdom does not match min-width: 1280px so tests only see the mobile branch above */}
      <Container
        padded={false}
        className="hidden xl:grid xl:grid-cols-2 xl:gap-6 max-w-[68rem]"
      >
        <Section as="section" spacing="none">
          <Eyebrow
            as="p"
            weight="semibold"
            color="muted"
            className="mb-2 text-xs uppercase tracking-widest"
          >
            Your fleet
          </Eyebrow>
          <div className="max-w-[32rem]">
            <Board
              boardSize={boardSize}
              columnLabels={columnLabels}
              shots={board.player.shots}
              disabled
            />
          </div>
          <ShipStatusList
            ships={board.player.ships}
            sunkShipIds={board.player.sunkShipIds}
            hitCounts={playerShipHitCounts}
          />
        </Section>

        <Section as="section" spacing="none">
          <Eyebrow
            as="p"
            weight="semibold"
            color="muted"
            className="mb-2 text-xs uppercase tracking-widest"
          >
            Enemy fleet
          </Eyebrow>
          <div className="max-w-[32rem]">
            <Board
              boardSize={boardSize}
              columnLabels={columnLabels}
              shots={board.computer.shots}
              onFire={(coord: CoordinateKey) => {
                playerFireShot(coord);
              }}
              disabled={activeTurn !== "player" || gameOver}
            />
          </div>
          <ShipStatusList
            ships={board.computer.ships}
            sunkShipIds={board.computer.sunkShipIds}
            hitCounts={computerShipHitCounts}
          />
        </Section>
      </Container>

      <div className="w-full flex justify-center mt-6">
        <Button variant="outline" onClick={reset}>
          {gameOver ? "Play again" : "Restart"}
        </Button>
      </div>
    </>
  );
}
