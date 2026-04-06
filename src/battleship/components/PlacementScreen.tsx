import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Button, Text } from "@/components/ui";
import { SHIP_DISPLAY_NAMES } from "@/battleship/constants";
import { ShipStatusItem } from "@/battleship/components/ShipStatusItem";
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

  function handleOrientationToggle() {
    if (pendingShip === null) return;
    const newOrientation =
      pendingShip.orientation === "horizontal" ? "vertical" : "horizontal";
    toggleOrientation();
    announce(`Orientation set to ${newOrientation}`);
  }

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
  });

  // Render

  const gridTemplateColumns = `repeat(${String(boardSize)}, 1fr)`;
  const orientationLabel = pendingShip
    ? `Rotate ship (currently ${pendingShip.orientation})`
    : "Rotate ship (no ship selected)";

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      {/* aria-live region for placement announcements */}
      <div
        key={`${announcement}-${String(announcementKey)}`}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <div className="w-full flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
        {/* Placement grid */}
        <section aria-label="Place your fleet" className="w-full lg:flex-1">
          <Text as="h2" variant="label" className="mb-2">
            Place your fleet
          </Text>
          <div className="grid w-full" style={{ gridTemplateColumns }}>
            {Array.from(cellStatusMap.entries()).map(([coord, status]) => (
              <PlacementCell
                key={coord}
                coord={coord}
                status={status}
                columnLabels={columnLabels}
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
        <section aria-label="Your fleet" className="w-full lg:w-72">
          <Text as="h2" variant="label" className="mb-2">
            Your fleet
          </Text>
          <div
            role="listbox"
            aria-label="Select a ship to place"
            className="divide-y divide-slate-700/50"
          >
            {/* Unplaced ships: selectable */}
            {remainingShipTypes.map((type) => (
              <div
                key={type}
                role="option"
                aria-selected={pendingShip?.type === type}
              >
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
              </div>
            ))}
            {/* Placed ships: re-placeable */}
            {placedShips.map((ship) => (
              <div key={ship.id} role="option" aria-selected={false}>
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
              </div>
            ))}
          </div>

          {/* Orientation toggle */}
          <div className="mt-4">
            <Button
              aria-disabled={pendingShip === null}
              onClick={handleOrientationToggle}
            >
              {orientationLabel}
            </Button>
            <Text
              as="p"
              variant="label"
              className="mt-1 text-xs text-slate-400"
            >
              Press R to rotate
            </Text>
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex flex-col gap-2">
            <Button onClick={onRandomise}>Randomise for me</Button>
            <Button aria-disabled={!isComplete} onClick={handleConfirm}>
              Start game
            </Button>
            {!isComplete && (
              <Text as="p" variant="label" className="text-xs text-slate-400">
                Place all ships to continue
              </Text>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// Placement cell: inline sub-component, single consumer

interface PlacementCellProps {
  coord: CoordinateKey;
  status: PlacementCellStatus;
  columnLabels: readonly string[];
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
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
      className={cn(
        "w-full aspect-square border",
        "focus-visible:outline-none focus-visible:ring-2",
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
