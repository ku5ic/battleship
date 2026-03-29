import { useState } from "react";
import { BattleshipGame } from "@/components/game/BattleshipGame";
import { BattleshipMultiplayerGame } from "@/components/game/BattleshipMultiplayerGame";
import { Button } from "@/components/ui";
import type { Difficulty } from "@/features/battleship/types";

type Mode = "single" | "multiplayer";

export function App() {
  const [mode, setMode] = useState<Mode>("single");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4 p-2 sm:p-4">
      <div className="flex gap-2">
        <Button
          variant="toggle"
          active={mode === "single"}
          aria-pressed={mode === "single"}
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
          onClick={() => {
            setMode("multiplayer");
          }}
        >
          vs Computer
        </Button>
      </div>

      {/* Difficulty selector — role="group" provides announced context so
          "Easy / Moderate / Hard" are not ambiguous in isolation. */}
      <div role="group" aria-label="Difficulty" className="flex gap-2">
        <Button
          variant="toggle"
          active={difficulty === "easy"}
          aria-pressed={difficulty === "easy"}
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
          onClick={() => {
            setDifficulty("hard");
          }}
        >
          Hard
        </Button>
      </div>

      {mode === "single" ? (
        <BattleshipGame key={`${mode}-${difficulty}`} difficulty={difficulty} />
      ) : (
        <BattleshipMultiplayerGame
          key={`${mode}-${difficulty}`}
          difficulty={difficulty}
        />
      )}
    </main>
  );
}
