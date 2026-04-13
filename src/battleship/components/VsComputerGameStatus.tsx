import { cn } from "@/lib/cn";
import type { PlayerId } from "@/battleship/types";

interface VsComputerGameStatusProps {
  winner: PlayerId | null;
  activeTurn: PlayerId;
  isAiThinking: boolean;
}

/**
 * Displays vs-computer turn and outcome state for a two-board game.
 *
 * Uses role="status" so transitions are announced to screen readers as
 * stable state changes, same pattern as the single-board GameStatus.
 * Kept separate from GameStatus because the vs-computer mode has distinct
 * states (winner, activeTurn, isAiThinking) that don't map onto single-board props.
 */
export function VsComputerGameStatus({
  winner,
  activeTurn,
  isAiThinking,
}: VsComputerGameStatusProps) {
  function buildMessage(): string {
    if (winner === "player") return "You win! All enemy ships sunk.";
    if (winner === "computer") return "Defeated. All your ships were sunk.";
    if (isAiThinking) return "Computer is thinking…";
    if (activeTurn === "player") return "Your turn: select a cell to fire.";
    return "Waiting for computer…";
  }

  const isOver = winner !== null;

  return (
    <p
      role="status"
      aria-atomic="true"
      className={cn(
        "text-sm text-center",
        isOver && "font-semibold",
        isOver && winner === "player" && "text-green-400",
        isOver && winner === "computer" && "text-red-400",
        !isOver && "text-slate-400",
      )}
    >
      {buildMessage()}
    </p>
  );
}
