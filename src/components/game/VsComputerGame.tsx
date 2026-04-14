import { useEffect, useState } from "react";
import { Board } from "@/components/board";
import {
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@nuka-ui/core";
import { ShipStatusList, ShotResultAnnouncer } from "@/battleship/components";
import { SHIP_DISPLAY_NAMES } from "@/battleship/constants";
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

  useEffect(() => {
    onStatusChange({ mode: "vsComputer", winner, activeTurn, isAiThinking });
  }, [winner, activeTurn, isAiThinking, onStatusChange]);

  useEffect(() => {
    if (!playerLastResult) return;
    if (playerLastResult.outcome === "already-fired") return;
    if (playerLastResult.outcome === "sunk") {
      const name = playerLastResult.sunkShipId
        ? SHIP_DISPLAY_NAMES[playerLastResult.sunkShipId]
        : "Ship";
      toast(`Hit! You sunk the ${name}!`, {
        intent: "success",
        duration: 3000,
      });
    } else if (playerLastResult.outcome === "hit") {
      toast("Hit!", { intent: "success", duration: 2000 });
    } else {
      toast("Miss.", { duration: 2000 });
    }
  }, [playerLastResult]);

  useEffect(() => {
    if (!computerLastResult) return;
    if (computerLastResult.outcome === "already-fired") return;
    if (computerLastResult.outcome === "sunk") {
      const name = computerLastResult.sunkShipId
        ? SHIP_DISPLAY_NAMES[computerLastResult.sunkShipId]
        : "Ship";
      toast(`Computer sunk your ${name}!`, {
        intent: "danger",
        duration: 3000,
      });
    } else if (computerLastResult.outcome === "hit") {
      toast("Computer hit!", { intent: "danger", duration: 2000 });
    } else {
      toast("Computer missed.", { duration: 2000 });
    }
  }, [computerLastResult]);

  function handleValueChange(value: string) {
    setActiveBoard(value as "player" | "enemy");
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Announcers: outside tabs so live regions persist across tab switches */}
      <ShotResultAnnouncer
        result={computerLastResult}
        announceKey={board.player.shots.size}
        actor="computer"
      />
      <ShotResultAnnouncer
        result={playerLastResult}
        announceKey={board.computer.shots.size}
      />

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

      <div className="w-full flex justify-center mt-6">
        <Button variant="outline" onClick={reset}>
          {gameOver ? "Play again" : "Restart"}
        </Button>
      </div>
    </div>
  );
}
