import { useState } from "react";
import { BattleshipGame } from "@/components/game/BattleshipGame";
import { BattleshipMultiplayerGame } from "@/components/game/BattleshipMultiplayerGame";
import { Button, Text } from "@/components/ui";
import type { Difficulty } from "@/features/battleship/types";

type Mode = "single" | "multiplayer";

export function App() {
  const [mode, setMode] = useState<Mode>("single");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="flex items-center justify-between gap-4 px-4 py-2 max-w-screen-xl mx-auto flex-wrap">
          <Text as="h1" variant="title">
            Battleship
          </Text>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-2">
              <Button
                variant="toggle"
                active={mode === "single"}
                aria-pressed={mode === "single"}
                className="py-1 px-3 text-sm"
                onClick={() => {
                  setMode("single");
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
                  setMode("multiplayer");
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
                  setDifficulty("easy");
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
                  setDifficulty("moderate");
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
                  setDifficulty("hard");
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
          />
        ) : (
          <BattleshipMultiplayerGame
            key={`${mode}-${difficulty}`}
            difficulty={difficulty}
          />
        )}
      </main>
    </div>
  );
}
