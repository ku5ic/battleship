interface GameStatusProps {
  isGameOver: boolean;
  shotCount: number;
}

/**
 * Displays persistent game progress: shot count while playing, victory
 * message once all ships are sunk.
 *
 * The game-over container uses role="status" (aria-live="polite" + aria-atomic)
 * so the victory message is announced when it replaces the shot count. This is
 * intentionally separate from ShotResultAnnouncer: that region announces
 * transient shot events; this one announces stable game state.
 */
export function GameStatus({ isGameOver, shotCount }: GameStatusProps) {
  if (isGameOver) {
    return (
      <div
        role="status"
        aria-atomic="true"
        className="rounded border border-green-700 bg-green-950/60 px-4 py-3 text-center"
      >
        <p className="text-green-400 font-semibold">All ships sunk!</p>
        <p className="text-slate-400 text-sm mt-0.5">
          Finished in {shotCount} shot{shotCount === 1 ? "" : "s"}.
        </p>
      </div>
    );
  }

  return (
    <p className="text-sm text-slate-400 text-center">
      {shotCount === 0
        ? "Select a cell to fire."
        : [shotCount, " shot", shotCount === 1 ? "" : "s", " fired."].join("")}
    </p>
  );
}
