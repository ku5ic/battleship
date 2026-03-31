import { useCallback, useState } from "react";
import { BattleshipGame } from "@/components/game/BattleshipGame";
import { BattleshipMultiplayerGame } from "@/components/game/BattleshipMultiplayerGame";
import { Button, Text } from "@/components/ui";
import {
  GameStatus,
  GameStatusMultiplayer,
} from "@/features/battleship/components";
import type { Difficulty, HeaderGameStatus } from "@/features/battleship/types";

type Mode = "single" | "multiplayer";

export function App() {
  const [mode, setMode] = useState<Mode>("single");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [headerGameStatus, setHeaderGameStatus] =
    useState<HeaderGameStatus | null>(null);

  const handleModeChange = useCallback((newMode: Mode) => {
    setMode(newMode);
    setHeaderGameStatus(null);
  }, []);

  const handleDifficultyChange = useCallback((newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    setHeaderGameStatus(null);
  }, []);

  const handleSingleStatusChange = useCallback(
    (status: HeaderGameStatus & { mode: "single" }) => {
      setHeaderGameStatus(status);
    },
    [],
  );

  const handleSessionStatusChange = useCallback(
    (status: HeaderGameStatus & { mode: "session" }) => {
      setHeaderGameStatus(status);
    },
    [],
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="flex items-center justify-between gap-4 px-4 py-2 max-w-screen-xl mx-auto w-full flex-wrap">
          <Text as="h1" variant="title">
            Battleship
          </Text>

          <div className="flex-1 flex justify-center px-4 min-w-0">
            {headerGameStatus?.mode === "single" && (
              <GameStatus
                isGameOver={headerGameStatus.isGameOver}
                shotCount={headerGameStatus.shotCount}
              />
            )}
            {headerGameStatus?.mode === "session" && (
              <GameStatusMultiplayer
                winner={headerGameStatus.winner}
                activeTurn={headerGameStatus.activeTurn}
                isAiThinking={headerGameStatus.isAiThinking}
              />
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-2">
              <Button
                variant="toggle"
                active={mode === "single"}
                aria-pressed={mode === "single"}
                className="py-1 px-3 text-sm"
                onClick={() => {
                  handleModeChange("single");
                }}
              >
                Single player
              </Button>
              <Button
                variant="toggle"
                active={mode === "multiplayer"}
                aria-pressed={mode === "multiplayer"}
                className="py-1 px-3 text-sm"
                onClick={() => {
                  handleModeChange("multiplayer");
                }}
              >
                vs Computer
              </Button>
            </div>

            <div className="w-px h-4 bg-slate-600" aria-hidden="true" />

            {/* Difficulty selector — role="group" provides announced context so
                "Easy / Moderate / Hard" are not ambiguous in isolation. */}
            <div role="group" aria-label="Difficulty" className="flex gap-2">
              <Button
                variant="toggle"
                active={difficulty === "easy"}
                aria-pressed={difficulty === "easy"}
                className="py-1 px-3 text-sm"
                onClick={() => {
                  handleDifficultyChange("easy");
                }}
              >
                Easy
              </Button>
              <Button
                variant="toggle"
                active={difficulty === "moderate"}
                aria-pressed={difficulty === "moderate"}
                className="py-1 px-3 text-sm"
                onClick={() => {
                  handleDifficultyChange("moderate");
                }}
              >
                Moderate
              </Button>
              <Button
                variant="toggle"
                active={difficulty === "hard"}
                aria-pressed={difficulty === "hard"}
                className="py-1 px-3 text-sm"
                onClick={() => {
                  handleDifficultyChange("hard");
                }}
              >
                Hard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start pt-6 pb-8 px-2 sm:px-4">
        {mode === "single" ? (
          <BattleshipGame
            key={`${mode}-${difficulty}`}
            difficulty={difficulty}
            onStatusChange={handleSingleStatusChange}
          />
        ) : (
          <BattleshipMultiplayerGame
            key={`${mode}-${difficulty}`}
            difficulty={difficulty}
            onStatusChange={handleSessionStatusChange}
          />
        )}
      </main>
    </div>
  );
}
