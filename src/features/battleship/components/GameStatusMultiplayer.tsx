import type { PlayerId } from "@/features/battleship/types";

interface GameStatusMultiplayerProps {
  winner: PlayerId | null;
  activeTurn: PlayerId;
  isAiThinking: boolean;
}

/**
 * Displays session-level turn and outcome state for a two-board game.
 *
 * Uses role="status" so transitions are announced to screen readers as
 * stable state changes — same pattern as the single-board GameStatus.
 * Kept separate from GameStatus because the session has distinct states
 * (winner, activeTurn, isAiThinking) that don't map onto single-board props.
 */
export function GameStatusMultiplayer({
  winner,
  activeTurn,
  isAiThinking,
}: GameStatusMultiplayerProps) {
  function buildMessage(): string {
    if (winner === "player") return "You win! All enemy ships sunk.";
    if (winner === "computer") return "Defeated. All your ships were sunk.";
    if (isAiThinking) return "Computer is thinking…";
    if (activeTurn === "player") return "Your turn — select a cell to fire.";
    return "Waiting for computer…";
  }

  const isOver = winner !== null;

  return (
    <p
      role="status"
      aria-atomic="true"
      className={
        isOver
          ? winner === "player"
            ? "text-sm font-semibold text-green-400 text-center"
            : "text-sm font-semibold text-red-400 text-center"
          : "text-sm text-slate-400 text-center"
      }
    >
      {buildMessage()}
    </p>
  );
}
