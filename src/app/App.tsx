import { useCallback, useState } from "react";
import { SinglePlayerGame } from "@/components/game/SinglePlayerGame";
import { VsComputerGame } from "@/components/game/VsComputerGame";
import { Heading } from "@nuka-ui/core";
import { cn } from "@/lib/cn";
import {
  GameStatus,
  VsComputerGameStatus,
  PlacementScreen,
} from "@/battleship/components";
import type { Difficulty, HeaderGameStatus, Ship } from "@/battleship/types";

type Mode = "single" | "vsComputer";
type VsComputerPhase = "placement" | "battle";

export function App() {
  const [mode, setMode] = useState<Mode>("single");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [headerGameStatus, setHeaderGameStatus] =
    useState<HeaderGameStatus | null>(null);
  const [vsComputerPhase, setVsComputerPhase] =
    useState<VsComputerPhase>("placement");
  const [confirmedPlayerShips, setConfirmedPlayerShips] = useState<
    Ship[] | null
  >(null);

  const handleModeChange = useCallback((newMode: Mode) => {
    setMode(newMode);
    setHeaderGameStatus(null);
    setVsComputerPhase("placement");
    setConfirmedPlayerShips(null);
  }, []);

  const handleDifficultyChange = useCallback((newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    setHeaderGameStatus(null);
    setVsComputerPhase("placement");
    setConfirmedPlayerShips(null);
  }, []);

  const handleSingleStatusChange = useCallback(
    (status: HeaderGameStatus & { mode: "single" }) => {
      setHeaderGameStatus(status);
    },
    [],
  );

  const handleVsComputerStatusChange = useCallback(
    (status: HeaderGameStatus & { mode: "vsComputer" }) => {
      setHeaderGameStatus(status);
    },
    [],
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="flex items-center justify-between gap-4 px-4 py-2 max-w-screen-xl mx-auto w-full flex-wrap">
          <Heading
            as="h1"
            size="xl"
            weight="semibold"
            className="tracking-wide"
          >
            Battleship
          </Heading>

          <div className="flex-1 flex justify-center px-4 min-w-0">
            {headerGameStatus?.mode === "single" && (
              <GameStatus
                isGameOver={headerGameStatus.isGameOver}
                shotCount={headerGameStatus.shotCount}
              />
            )}
            {headerGameStatus?.mode === "vsComputer" && (
              <VsComputerGameStatus
                winner={headerGameStatus.winner}
                activeTurn={headerGameStatus.activeTurn}
                isAiThinking={headerGameStatus.isAiThinking}
              />
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-2">
              <button
                type="button"
                aria-pressed={mode === "single"}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded border transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                  mode === "single"
                    ? "border-yellow-400 text-yellow-400"
                    : "border-slate-500 text-slate-400 hover:border-slate-300 hover:text-slate-300",
                )}
                onClick={() => {
                  handleModeChange("single");
                }}
              >
                Single player
              </button>
              <button
                type="button"
                aria-pressed={mode === "vsComputer"}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded border transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                  mode === "vsComputer"
                    ? "border-yellow-400 text-yellow-400"
                    : "border-slate-500 text-slate-400 hover:border-slate-300 hover:text-slate-300",
                )}
                onClick={() => {
                  handleModeChange("vsComputer");
                }}
              >
                vs Computer
              </button>
            </div>

            <div className="w-px h-4 bg-slate-600" aria-hidden="true" />

            {/* Difficulty selector: role="group" provides announced context so
                "Easy / Moderate / Hard" are not ambiguous in isolation. */}
            <div role="group" aria-label="Difficulty" className="flex gap-2">
              <button
                type="button"
                aria-pressed={difficulty === "easy"}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded border transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                  difficulty === "easy"
                    ? "border-yellow-400 text-yellow-400"
                    : "border-slate-500 text-slate-400 hover:border-slate-300 hover:text-slate-300",
                )}
                onClick={() => {
                  handleDifficultyChange("easy");
                }}
              >
                Easy
              </button>
              <button
                type="button"
                aria-pressed={difficulty === "moderate"}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded border transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                  difficulty === "moderate"
                    ? "border-yellow-400 text-yellow-400"
                    : "border-slate-500 text-slate-400 hover:border-slate-300 hover:text-slate-300",
                )}
                onClick={() => {
                  handleDifficultyChange("moderate");
                }}
              >
                Moderate
              </button>
              <button
                type="button"
                aria-pressed={difficulty === "hard"}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded border transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                  difficulty === "hard"
                    ? "border-yellow-400 text-yellow-400"
                    : "border-slate-500 text-slate-400 hover:border-slate-300 hover:text-slate-300",
                )}
                onClick={() => {
                  handleDifficultyChange("hard");
                }}
              >
                Hard
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start pt-6 pb-8 px-2 sm:px-4">
        {mode === "single" && (
          <SinglePlayerGame
            key={`${mode}-${difficulty}`}
            difficulty={difficulty}
            onStatusChange={handleSingleStatusChange}
          />
        )}
        {mode === "vsComputer" && vsComputerPhase === "placement" && (
          <PlacementScreen
            difficulty={difficulty}
            onConfirm={(ships) => {
              setConfirmedPlayerShips(ships);
              setVsComputerPhase("battle");
            }}
            onRandomise={() => {
              setConfirmedPlayerShips(null);
              setVsComputerPhase("battle");
            }}
          />
        )}
        {mode === "vsComputer" && vsComputerPhase === "battle" && (
          <VsComputerGame
            key={`${mode}-${difficulty}`}
            difficulty={difficulty}
            playerShips={confirmedPlayerShips ?? undefined}
            onStatusChange={handleVsComputerStatusChange}
          />
        )}
      </main>
    </div>
  );
}
