import { useState } from "react";
import { BattleshipGame } from "@/components/game/BattleshipGame";
import { BattleshipMultiplayerGame } from "@/components/game/BattleshipMultiplayerGame";
import { Button } from "@/components/ui";

type Mode = "single" | "multiplayer";

export function App() {
  const [mode, setMode] = useState<Mode>("single");

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

      {mode === "single" ? <BattleshipGame /> : <BattleshipMultiplayerGame />}
    </main>
  );
}
