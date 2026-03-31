import { useMemo, useRef, useState } from "react";
import { nextUnfiredCoordinate } from "@/features/battleship/services/engine";
import {
  allBoardKeys,
  fromKey,
  toKey,
} from "@/features/battleship/utils/coordinates";
import type { CellStatus, CoordinateKey } from "@/features/battleship/types";

const ARROW_DELTAS: Partial<Record<string, [number, number]>> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

export function useBoardNavigation(
  boardSize: number,
  shots: ReadonlyMap<CoordinateKey, CellStatus>,
  onFire: ((coord: CoordinateKey) => void) | undefined,
): {
  boardRef: React.RefObject<HTMLDivElement | null>;
  focusedCoord: CoordinateKey;
  allKeys: CoordinateKey[];
  handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  handleCellFire: (fired: CoordinateKey) => void;
} {
  const [focusedCoord, setFocusedCoord] = useState<CoordinateKey>("0,0");
  const boardRef = useRef<HTMLDivElement>(null);

  // ALL_KEYS depends on boardSize. In practice boardSize is stable for the
  // hook's lifetime; the component is remounted via key when difficulty changes.
  const allKeys = useMemo(() => allBoardKeys(boardSize), [boardSize]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
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
    boardRef.current
      ?.querySelector<HTMLElement>(`[data-coord="${nextCoord}"]`)
      ?.focus();
  }

  /**
   * Fires the shot then immediately advances keyboard focus to the next unfired
   * cell in row-major order.
   *
   * requestAnimationFrame defers the focus call until after React has flushed
   * the render that marks the fired cell as disabled. Without this, the browser
   * may focus a button that is about to become disabled and silently drop focus.
   */
  function handleCellFire(fired: CoordinateKey) {
    onFire?.(fired);

    const firedIndex = allKeys.indexOf(fired);
    const next = nextUnfiredCoordinate(allKeys, shots, firedIndex);

    if (next === null) return;

    setFocusedCoord(next);
    requestAnimationFrame(() => {
      boardRef.current
        ?.querySelector<HTMLElement>(`[data-coord="${next}"]`)
        ?.focus();
    });
  }

  return { boardRef, focusedCoord, allKeys, handleKeyDown, handleCellFire };
}
