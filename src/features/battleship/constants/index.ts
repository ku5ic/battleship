import type { ShipType } from "@/features/battleship/types";

export const BOARD_SIZE = 10 as const;

/** Column labels rendered along the top axis of the board. */
export const COLUMN_LABELS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
] as const;

/** Human-readable display names for each ship type. */
export const SHIP_DISPLAY_NAMES: Record<ShipType, string> = {
  carrier: "Carrier",
  battleship: "Battleship",
  cruiser: "Cruiser",
  submarine: "Submarine",
  destroyer: "Destroyer",
};

/** Announced to screen readers via aria-live when a shot is fired. */
export const SHOT_OUTCOME_LABELS: Record<string, string> = {
  hit: "Hit!",
  miss: "Miss.",
  sunk: "Ship sunk!",
  "already-fired": "You already fired here.",
};
