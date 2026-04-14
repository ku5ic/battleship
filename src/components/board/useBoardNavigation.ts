import { nextUnfiredCoordinate } from "@/battleship/services/engine";
import type { CellStatus, CoordinateKey } from "@/battleship/types";
import { useGridNavigation } from "@/components/board/useGridNavigation";

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
  const { gridRef, focusedCoord, setFocusedCoord, allKeys, handleKeyDown } =
    useGridNavigation(boardSize);

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
      gridRef.current
        ?.querySelector<HTMLElement>(`[data-coord="${next}"]`)
        ?.focus();
    });
  }

  return {
    boardRef: gridRef,
    focusedCoord,
    allKeys,
    handleKeyDown,
    handleCellFire,
  };
}
