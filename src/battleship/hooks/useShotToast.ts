import { useEffect, useRef } from "react";
import { toast } from "@nuka-ui/core";
import { SHIP_DISPLAY_NAMES } from "@/battleship/constants";
import type { ShotResult } from "@/battleship/types";

type Actor = "player" | "computer";

/**
 * Fires a toast notification when a shot result changes.
 *
 * Guards against stale toasts on unmount: if the component unmounts
 * mid-game (mode switch, difficulty change), the final result change
 * does not produce a toast into the surviving Toaster portal.
 */
export function useShotToast(
  result: ShotResult | null,
  actor: Actor = "player",
): void {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isMounted.current) return;
    if (!result) return;
    if (result.outcome === "already-fired") return;

    const isComputer = actor === "computer";
    const intent = isComputer ? "danger" : "success";

    if (result.outcome === "sunk") {
      const name = result.sunkShipId
        ? SHIP_DISPLAY_NAMES[result.sunkShipId]
        : "Ship";
      const message = isComputer
        ? `Computer sunk your ${name}!`
        : `Hit! You sunk the ${name}!`;
      toast(message, { intent, duration: 3000 });
    } else if (result.outcome === "hit") {
      toast(isComputer ? "Computer hit!" : "Hit!", { intent, duration: 2000 });
    } else {
      toast(isComputer ? "Computer missed." : "Miss.", { duration: 2000 });
    }
  }, [result, actor]);
}
