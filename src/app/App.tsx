import { useState } from "react";
import { BattleshipGame } from "@/components/game/BattleshipGame";
import { BattleshipMultiplayerGame } from "@/components/game/BattleshipMultiplayerGame";

type Mode = "single" | "multiplayer";

export function App() {
  const [mode, setMode] = useState<Mode>("single");

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4 p-2 sm:p-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("single");
          }}
          aria-pressed={mode === "single"}
          className={`px-3 py-1.5 text-sm font-medium rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
            mode === "single"
              ? "border-yellow-400 text-yellow-400"
              : "border-slate-500 text-slate-400 hover:border-slate-300 hover:text-slate-300"
          }`}
        >
          Single player
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("multiplayer");
          }}
          aria-pressed={mode === "multiplayer"}
          className={`px-3 py-1.5 text-sm font-medium rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
            mode === "multiplayer"
              ? "border-yellow-400 text-yellow-400"
              : "border-slate-500 text-slate-400 hover:border-slate-300 hover:text-slate-300"
          }`}
        >
          vs Computer
        </button>
      </div>

      {mode === "single" ? <BattleshipGame /> : <BattleshipMultiplayerGame />}
    </main>
  );
}
