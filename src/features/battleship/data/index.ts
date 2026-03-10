import { parseLayout } from "@/features/battleship/data/layout";
import { RAW_GAME_CONFIG } from "@/features/battleship/data/config";
import type { Ship } from "@/features/battleship/types";

/**
 * Parsed and validated ship layout. Computed once at module load time.
 * All consumers import from here — nothing should call parseLayout() directly.
 */
export const SHIPS: readonly Ship[] = parseLayout(RAW_GAME_CONFIG);
