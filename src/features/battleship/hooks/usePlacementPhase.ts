import { useReducer, useCallback, useMemo } from "react";
import type {
  CoordinateKey,
  Difficulty,
  PendingShip,
  PlacementCellStatus,
  Ship,
  ShipType,
} from "@/features/battleship/types";
import { DIFFICULTY_CONFIG } from "@/features/battleship/constants";
import { RAW_GAME_CONFIG } from "@/features/battleship/data/config";
import {
  computeShipPreview,
  generateRandomLayout,
} from "@/features/battleship/services/placement";
import { toKey } from "@/features/battleship/utils/coordinates";

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

interface PlacementState {
  placedShips: Ship[];
  pendingShip: PendingShip | null;
  hoverCoord: CoordinateKey | null;
}

type PlacementAction =
  | { type: "SELECT_SHIP"; shipType: ShipType }
  | { type: "TOGGLE_ORIENTATION" }
  | { type: "SET_HOVER"; coord: CoordinateKey | null }
  | {
      type: "PLACE_SHIP";
      coords: CoordinateKey[];
      ship: Ship;
      nextPending: PendingShip | null;
    }
  | { type: "REMOVE_SHIP"; shipType: ShipType }
  | { type: "RANDOMISE"; ships: Ship[] }
  | { type: "RESET" };

const INITIAL_STATE: PlacementState = {
  placedShips: [],
  pendingShip: null,
  hoverCoord: null,
};

function reducer(
  state: PlacementState,
  action: PlacementAction,
): PlacementState {
  switch (action.type) {
    case "SELECT_SHIP":
      return {
        ...state,
        pendingShip: {
          type: action.shipType,
          orientation: state.pendingShip?.orientation ?? "horizontal",
        },
      };
    case "TOGGLE_ORIENTATION":
      if (state.pendingShip === null) return state;
      return {
        ...state,
        pendingShip: {
          ...state.pendingShip,
          orientation:
            state.pendingShip.orientation === "horizontal"
              ? "vertical"
              : "horizontal",
        },
      };
    case "SET_HOVER":
      return { ...state, hoverCoord: action.coord };
    case "PLACE_SHIP":
      return {
        ...state,
        placedShips: [...state.placedShips, action.ship],
        pendingShip: action.nextPending,
        hoverCoord: null,
      };
    case "REMOVE_SHIP": {
      return {
        ...state,
        placedShips: state.placedShips.filter((s) => s.id !== action.shipType),
        pendingShip: { type: action.shipType, orientation: "horizontal" },
        hoverCoord: null,
      };
    }
    case "RANDOMISE":
      return {
        ...state,
        placedShips: action.ships,
        pendingShip: null,
        hoverCoord: null,
      };
    case "RESET":
      return INITIAL_STATE;
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UsePlacementPhaseReturn {
  boardSize: number;
  columnLabels: readonly string[];
  placedShips: readonly Ship[];
  pendingShip: PendingShip | null;
  remainingShipTypes: readonly ShipType[];
  isComplete: boolean;
  cellStatusMap: ReadonlyMap<CoordinateKey, PlacementCellStatus>;
  selectShip: (type: ShipType) => void;
  toggleOrientation: () => void;
  setHover: (coord: CoordinateKey | null) => void;
  placeShip: (coord: CoordinateKey) => void;
  removeShip: (type: ShipType) => void;
  randomise: () => void;
  reset: () => void;
  confirm: () => Ship[];
}

export function usePlacementPhase(
  difficulty: Difficulty,
): UsePlacementPhaseReturn {
  const { boardSize, columnLabels } = DIFFICULTY_CONFIG[difficulty];
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const occupiedCoords = useMemo(() => {
    const set = new Set<CoordinateKey>();
    for (const ship of state.placedShips) {
      for (const coord of ship.coordinates) {
        set.add(coord);
      }
    }
    return set;
  }, [state.placedShips]);

  const previewCoords = useMemo(() => {
    if (state.pendingShip === null || state.hoverCoord === null) {
      return new Set<CoordinateKey>();
    }
    const size = RAW_GAME_CONFIG.shipTypes[state.pendingShip.type].size;
    const coords = computeShipPreview(
      state.hoverCoord,
      size,
      state.pendingShip.orientation,
      boardSize,
    );
    return new Set(coords ?? []);
  }, [state.pendingShip, state.hoverCoord, boardSize]);

  const isPreviewValid = useMemo(() => {
    if (previewCoords.size === 0) return false;
    for (const coord of previewCoords) {
      if (occupiedCoords.has(coord)) return false;
    }
    return true;
  }, [previewCoords, occupiedCoords]);

  const remainingShipTypes = useMemo(() => {
    const placedIds = new Set(state.placedShips.map((s) => s.id));
    return (
      Object.entries(RAW_GAME_CONFIG.shipTypes) as [
        ShipType,
        { size: number; count: number },
      ][]
    )
      .filter(([id]) => !placedIds.has(id))
      .sort(([, a], [, b]) => b.size - a.size)
      .map(([id]) => id);
  }, [state.placedShips]);

  const isComplete = remainingShipTypes.length === 0;

  const cellStatusMap = useMemo(() => {
    const map = new Map<CoordinateKey, PlacementCellStatus>();
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const key = toKey(col, row);
        if (previewCoords.has(key)) {
          map.set(key, isPreviewValid ? "preview-valid" : "preview-invalid");
        } else if (occupiedCoords.has(key)) {
          map.set(key, "occupied");
        } else {
          map.set(key, "empty");
        }
      }
    }
    return map;
  }, [boardSize, previewCoords, isPreviewValid, occupiedCoords]);

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------

  const selectShip = useCallback((type: ShipType) => {
    dispatch({ type: "SELECT_SHIP", shipType: type });
  }, []);

  const toggleOrientation = useCallback(() => {
    dispatch({ type: "TOGGLE_ORIENTATION" });
  }, []);

  const setHover = useCallback((coord: CoordinateKey | null) => {
    dispatch({ type: "SET_HOVER", coord });
  }, []);

  const placeShipCb = useCallback(() => {
    if (!isPreviewValid || state.pendingShip === null) return;

    const coords = Array.from(previewCoords);
    const size = RAW_GAME_CONFIG.shipTypes[state.pendingShip.type].size;
    const ship: Ship = {
      id: state.pendingShip.type,
      size,
      coordinates: coords,
      orientation: state.pendingShip.orientation,
    };

    // Determine the next unplaced type after this placement
    const placedAfter = new Set(state.placedShips.map((s) => s.id));
    placedAfter.add(state.pendingShip.type);
    const nextTypes = (
      Object.entries(RAW_GAME_CONFIG.shipTypes) as [
        ShipType,
        { size: number; count: number },
      ][]
    )
      .filter(([id]) => !placedAfter.has(id))
      .sort(([, a], [, b]) => b.size - a.size);

    const nextPending: PendingShip | null =
      nextTypes.length > 0
        ? { type: nextTypes[0][0], orientation: state.pendingShip.orientation }
        : null;

    dispatch({ type: "PLACE_SHIP", coords, ship, nextPending });
  }, [isPreviewValid, state.pendingShip, previewCoords, state.placedShips]);

  const placeShipAtCoord = useCallback(
    (_coord: CoordinateKey) => {
      placeShipCb();
    },
    [placeShipCb],
  );

  const removeShip = useCallback((type: ShipType) => {
    dispatch({ type: "REMOVE_SHIP", shipType: type });
  }, []);

  const randomise = useCallback(() => {
    const ships = generateRandomLayout(RAW_GAME_CONFIG, boardSize);
    dispatch({ type: "RANDOMISE", ships });
  }, [boardSize]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const confirm = useCallback((): Ship[] => {
    if (!isComplete) {
      throw new Error("Cannot confirm placement: fleet is not complete.");
    }
    return [...state.placedShips];
  }, [isComplete, state.placedShips]);

  return {
    boardSize,
    columnLabels,
    placedShips: state.placedShips,
    pendingShip: state.pendingShip,
    remainingShipTypes,
    isComplete,
    cellStatusMap,
    selectShip,
    toggleOrientation,
    setHover,
    placeShip: placeShipAtCoord,
    removeShip,
    randomise,
    reset,
    confirm,
  };
}
