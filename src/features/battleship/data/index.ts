import { parseLayout } from "./layout";
import { RAW_GAME_CONFIG } from "./config";
import type { Ship } from "../types";

/**
 * Parsed and validated ship layout. Computed once at module load time.
 * All consumers import from here — nothing should call parseLayout() directly.
 */
export const SHIPS: readonly Ship[] = parseLayout(RAW_GAME_CONFIG);
