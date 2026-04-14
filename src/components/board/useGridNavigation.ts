import { useCallback, useMemo, useRef, useState } from "react";
import { allBoardKeys, fromKey, toKey } from "@/battleship/utils/coordinates";
import type { CoordinateKey } from "@/battleship/types";

const ARROW_DELTAS: Partial<Record<string, [number, number]>> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

export interface UseGridNavigationReturn {
  gridRef: React.RefObject<HTMLDivElement | null>;
  focusedCoord: CoordinateKey;
  setFocusedCoord: React.Dispatch<React.SetStateAction<CoordinateKey>>;
  allKeys: CoordinateKey[];
  handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

export function useGridNavigation(boardSize: number): UseGridNavigationReturn {
  const [focusedCoord, setFocusedCoord] = useState<CoordinateKey>("0,0");
  const gridRef = useRef<HTMLDivElement>(null);

  const allKeys = useMemo(() => allBoardKeys(boardSize), [boardSize]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const delta = ARROW_DELTAS[e.key];
      if (!delta) return;

      const target = e.target as HTMLElement;
      const raw = target.dataset.coord;
      if (!raw) return;

      e.preventDefault();

      const { col, row } = fromKey(raw as CoordinateKey);
      const [dc, dr] = delta;
      const nextCol = Math.min(boardSize - 1, Math.max(0, col + dc));
      const nextRow = Math.min(boardSize - 1, Math.max(0, row + dr));
      const nextCoord = toKey(nextCol, nextRow);

      setFocusedCoord(nextCoord);
      gridRef.current
        ?.querySelector<HTMLElement>(`[data-coord="${nextCoord}"]`)
        ?.focus();
    },
    [boardSize],
  );

  return { gridRef, focusedCoord, setFocusedCoord, allKeys, handleKeyDown };
}
