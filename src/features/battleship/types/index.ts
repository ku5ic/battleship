export type ShipType =
  | "carrier"
  | "battleship"
  | "cruiser"
  | "submarine"
  | "destroyer";

export type Orientation = "horizontal" | "vertical";

/**
 * A single [col, row] coordinate as it appears in the raw layout data.
 * 0-indexed, range [0, 9].
 */
export type RawCoordinate = [col: number, row: number];

/**
 * Stable string key used as the canonical coordinate identity throughout
 * the app. Format: "col,row". Never use raw tuples as Map/Set keys.
 */
export type CoordinateKey = `${number},${number}`;

export interface Coordinate {
  col: number;
  row: number;
}

export interface Ship {
  id: ShipType;
  size: number;
  coordinates: readonly CoordinateKey[];
  orientation: Orientation;
}

export interface RawShipTypeEntry {
  size: number;
  count: number;
}

export interface RawLayoutEntry {
  ship: ShipType;
  positions: RawCoordinate[];
}

export interface RawGameConfig {
  shipTypes: Record<ShipType, RawShipTypeEntry>;
  layout: RawLayoutEntry[];
}

/**
 * What a player knows about a given cell at any point in the game.
 * "untouched" is the default — no shot has been fired here yet.
 */
export type CellStatus = "untouched" | "miss" | "hit";

export type ShotOutcome = "miss" | "hit" | "sunk" | "already-fired";

export interface ShotResult {
  coordinate: CoordinateKey;
  outcome: ShotOutcome;
  /** Populated when outcome is "sunk". */
  sunkShipId?: ShipType;
}

export interface GameState {
  ships: readonly Ship[];
  /**
   * Every coordinate that has been fired at. Keyed for O(1) lookup.
   * Value is the resolved CellStatus for that coordinate.
   */
  shots: ReadonlyMap<CoordinateKey, CellStatus>;
  sunkShipIds: ReadonlySet<ShipType>;
  isGameOver: boolean;
  lastResult: ShotResult | null;
}

// ---------------------------------------------------------------------------
// Two-board session model
//
// PlayerId identifies which player owns which board. "player" fires at the
// "opponent" board; the hook decides whose turn it is and which board to
// resolve shots against.
//
// BoardState is a semantic alias for GameState — the two types are
// structurally identical. The alias signals "this is one player's board"
// without duplicating the definition or introducing an inheritance hierarchy.
//
// The session hook's internal reducer state is private to the hook file.
// The public view types below (BoardState, SessionBoards) are what
// components consume — assembled from derived values by the hook.
// ---------------------------------------------------------------------------

export type PlayerId = "player" | "computer";

/** One player's board as seen by their opponent. Structurally identical to GameState. */
export type BoardState = GameState;

export interface SessionBoards {
  player: BoardState;
  computer: BoardState;
}

export type Difficulty = "easy" | "moderate" | "hard";

export interface DifficultyConfig {
  boardSize: number;
  columnLabels: readonly string[];
  label: string;
}
