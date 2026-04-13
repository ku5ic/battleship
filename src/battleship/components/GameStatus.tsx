import { Card, Heading, Text } from "@nuka-ui/core";

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
      <Card role="status" aria-atomic="true" className="px-4 py-3 text-center">
        <Heading as="h2" size="xl" weight="semibold" color="success">
          All ships sunk!
        </Heading>
        <Text as="p" size="sm" color="muted" className="mt-0.5">
          Finished in {shotCount} shot{shotCount === 1 ? "" : "s"}.
        </Text>
      </Card>
    );
  }

  return (
    <Text as="p" size="sm" color="muted" align="center">
      {shotCount === 0
        ? "Select a cell to fire."
        : [shotCount, " shot", shotCount === 1 ? "" : "s", " fired."].join("")}
    </Text>
  );
}
