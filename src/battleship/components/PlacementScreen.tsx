import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Button, Heading, Text } from "@nuka-ui/core";
import { SHIP_DISPLAY_NAMES } from "@/battleship/constants";
import { ShipStatusItem } from "@/battleship/components/ShipStatusItem";
import { useGridNavigation } from "@/components/board/useGridNavigation";
import { usePlacementPhase } from "@/battleship/hooks/usePlacementPhase";
import { RAW_GAME_CONFIG } from "@/battleship/data/config";
import { fromKey } from "@/battleship/utils/coordinates";
import type {
  CoordinateKey,
  Difficulty,
  PlacementCellStatus,
  Ship,
  ShipType,
} from "@/battleship/types";

interface PlacementScreenProps {
  difficulty: Difficulty;
  onConfirm: (ships: Ship[]) => void;
  onRandomise: () => void;
}

export function PlacementScreen({
  difficulty,
  onConfirm,
  onRandomise,
}: PlacementScreenProps) {
  const {
    boardSize,
    columnLabels,
    placedShips,
    pendingShip,
    remainingShipTypes,
    isComplete,
    cellStatusMap,
    selectShip,
    toggleOrientation,
    setHover,
    placeShip,
    removeShip,
    confirm,
  } = usePlacementPhase(difficulty);

  const {
    gridRef,
    focusedCoord,
    handleKeyDown: handleGridKeyDown,
  } = useGridNavigation(boardSize);

  // aria-live announcements: key-remount drives re-announcement

  const [announcement, setAnnouncement] = useState("");
  const [announcementKey, setAnnouncementKey] = useState(0);

  function announce(message: string) {
    setAnnouncement(message);
    setAnnouncementKey((k) => k + 1);
  }

  // Handlers

  function handlePlaceShip(coord: CoordinateKey) {
    const previewStatus = cellStatusMap.get(coord);
    const isPreviewCell =
      previewStatus === "preview-valid" || previewStatus === "preview-invalid";

    placeShip(coord);

    if (isPreviewCell && previewStatus === "preview-valid" && pendingShip) {
      const name = SHIP_DISPLAY_NAMES[pendingShip.type];
      const { col, row } = fromKey(coord);
      const colLabel = columnLabels[col];
      announce(`${name} placed at ${colLabel}${String(row + 1)}`);
    } else if (isPreviewCell && previewStatus === "preview-invalid") {
      announce("Invalid position");
    }
  }

  function handleRemoveShip(type: ShipType) {
    const name = SHIP_DISPLAY_NAMES[type];
    removeShip(type);
    announce(`${name} removed. Select it to re-place.`);
  }

  const handleOrientationToggle = useCallback(() => {
    if (pendingShip === null) return;
    const newOrientation =
      pendingShip.orientation === "horizontal" ? "vertical" : "horizontal";
    toggleOrientation();
    announce(`Orientation set to ${newOrientation}`);
  }, [pendingShip, toggleOrientation]);

  function handleConfirm() {
    if (!isComplete) return;
    const ships = confirm();
    onConfirm(ships);
  }

  // R key shortcut for orientation toggle

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "r" || e.key === "R") {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) {
          return;
        }
        handleOrientationToggle();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleOrientationToggle]);

  // Render

  const gridTemplateColumns = `repeat(${String(boardSize)}, 1fr)`;
  const orientationLabel = pendingShip
    ? `Rotate ship (currently ${pendingShip.orientation})`
    : "Rotate ship (no ship selected)";

  return (
    <div className="flex flex-col md:flex-row md:items-start gap-y-4 md:gap-x-6 w-full">
      {/* aria-live region for placement announcements */}
      <div
        key={`${announcement}-${String(announcementKey)}`}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Placement grid */}
      <section aria-label="Place your fleet" className="w-full">
        <Heading
          as="h2"
          weight="semibold"
          color="muted"
          className="mb-2 text-xs uppercase tracking-widest"
        >
          Place your fleet
        </Heading>
        <div
          ref={gridRef}
          role="grid"
          aria-label="Place your fleet. Use arrow keys to navigate."
          aria-rowcount={boardSize}
          aria-colcount={boardSize}
          onKeyDown={handleGridKeyDown}
          className="grid w-full"
          style={{ gridTemplateColumns }}
          tabIndex={-1}
        >
          {Array.from(cellStatusMap.entries()).map(([coord, status]) => (
            <PlacementCell
              key={coord}
              coord={coord}
              status={status}
              columnLabels={columnLabels}
              tabIndex={focusedCoord === coord ? 0 : -1}
              onFocus={() => {
                setHover(coord);
              }}
              onPointerEnter={() => {
                setHover(coord);
              }}
              onPointerLeave={() => {
                setHover(null);
              }}
              onClick={() => {
                handlePlaceShip(coord);
              }}
            />
          ))}
        </div>
      </section>

      {/* Ship palette + controls */}
      <section aria-label="Your fleet" className="w-full md:w-auto">
        <Heading
          as="h2"
          weight="semibold"
          color="muted"
          className="mb-2 text-xs uppercase tracking-widest"
        >
          Your fleet
        </Heading>
        <ul
          aria-label="Select a ship to place"
          className="divide-y divide-slate-700/50"
        >
          {/* Unplaced ships: selectable */}
          {remainingShipTypes.map((type) => (
            <li key={type}>
              <ShipStatusItem
                id={type}
                size={RAW_GAME_CONFIG.shipTypes[type].size}
                hitCount={0}
                isSunk={false}
                isPlaced={false}
                isSelected={pendingShip?.type === type}
                onClick={() => {
                  selectShip(type);
                }}
              />
            </li>
          ))}
          {/* Placed ships: re-placeable */}
          {placedShips.map((ship) => (
            <li key={ship.id}>
              <ShipStatusItem
                id={ship.id}
                size={ship.size}
                hitCount={0}
                isSunk={false}
                isPlaced={true}
                onClick={() => {
                  handleRemoveShip(ship.id);
                }}
              />
            </li>
          ))}
        </ul>

        {/* Orientation toggle */}
        <div className="mt-4">
          <Button
            variant="outline"
            disabled={pendingShip === null}
            onClick={handleOrientationToggle}
          >
            {orientationLabel}
          </Button>
          <Text
            as="p"
            size="xs"
            weight="semibold"
            color="muted"
            className="mt-1 uppercase tracking-widest"
          >
            Press R to rotate
          </Text>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex flex-col gap-2">
          <Button variant="outline" onClick={onRandomise}>
            Randomise for me
          </Button>
          <Button
            variant="outline"
            disabled={!isComplete}
            onClick={handleConfirm}
          >
            Start game
          </Button>
          {!isComplete && (
            <Text
              as="p"
              size="xs"
              weight="semibold"
              color="muted"
              className="uppercase tracking-widest"
            >
              Place all ships to continue
            </Text>
          )}
        </div>
      </section>
    </div>
  );
}

// Placement cell: inline sub-component, single consumer

interface PlacementCellProps {
  coord: CoordinateKey;
  status: PlacementCellStatus;
  columnLabels: readonly string[];
  tabIndex: number;
  onFocus: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onClick: () => void;
}

const STATUS_LABEL: Record<PlacementCellStatus, string> = {
  empty: "empty",
  occupied: "ship placed",
  "preview-valid": "valid placement",
  "preview-invalid": "invalid placement",
};

function PlacementCell({
  coord,
  status,
  columnLabels,
  tabIndex,
  onFocus,
  onPointerEnter,
  onPointerLeave,
  onClick,
}: PlacementCellProps) {
  const { col, row } = fromKey(coord);
  const colLabel = columnLabels[col];
  const label = `${colLabel}${String(row + 1)}, ${STATUS_LABEL[status]}`;

  return (
    <button
      type="button"
      data-coord={coord}
      aria-label={label}
      tabIndex={tabIndex}
      onFocus={onFocus}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
      className={cn(
        "w-full aspect-square border",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:z-10",
        "focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
        status === "empty" &&
          "bg-slate-700 border-slate-600 hover:bg-slate-600",
        status === "occupied" && "bg-blue-800 border-blue-600",
        status === "preview-valid" &&
          "bg-green-900/50 border-dashed border-green-400",
        status === "preview-invalid" &&
          "bg-red-900/50 border-dashed border-red-400",
      )}
    >
      {status === "occupied" && <ShipIcon />}
      {status === "preview-valid" && <ValidIcon />}
      {status === "preview-invalid" && <InvalidIcon />}
    </button>
  );
}

function ShipIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="w-3 h-3 text-blue-300 mx-auto"
      fill="currentColor"
    >
      <rect x="3" y="6" width="10" height="4" rx="1" />
    </svg>
  );
}

function ValidIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="w-3 h-3 text-green-400 mx-auto"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3,8 7,12 13,4" />
    </svg>
  );
}

function InvalidIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="w-3 h-3 text-red-400 mx-auto"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
    >
      <line x1="4" y1="4" x2="12" y2="12" />
      <line x1="12" y1="4" x2="4" y2="12" />
    </svg>
  );
}
