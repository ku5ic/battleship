import type {
  Difficulty,
  DifficultyConfig,
  ShipType,
  ShotOutcome,
} from "@/battleship/types";

export const DIFFICULTY_CONFIG = {
  easy: {
    boardSize: 10,
    columnLabels: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
    label: "Easy",
  },
  moderate: {
    boardSize: 15,
    columnLabels: [
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
      "K",
      "L",
      "M",
      "N",
      "O",
    ],
    label: "Moderate",
  },
  hard: {
    boardSize: 20,
    columnLabels: [
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
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "Q",
      "R",
      "S",
      "T",
    ],
    label: "Hard",
  },
} satisfies Record<Difficulty, DifficultyConfig>;

/** Human-readable display names for each ship type. */
export const SHIP_DISPLAY_NAMES: Record<ShipType, string> = {
  carrier: "Carrier",
  battleship: "Battleship",
  cruiser: "Cruiser",
  submarine: "Submarine",
  destroyer: "Destroyer",
};

/** Announced to screen readers via aria-live when a shot is fired. */
export const SHOT_OUTCOME_LABELS: Record<ShotOutcome, string> = {
  hit: "Hit!",
  miss: "Miss.",
  sunk: "Ship sunk!",
  "already-fired": "You already fired here.",
};
