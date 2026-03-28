import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShipStatusList } from "@/features/battleship/components/ShipStatusList";
import type { Ship, ShipType } from "@/features/battleship/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const twoShipFleet: readonly Ship[] = [
  {
    id: "destroyer",
    size: 2,
    coordinates: ["0,0", "1,0"],
    orientation: "horizontal",
  },
  {
    id: "submarine",
    size: 3,
    coordinates: ["3,0", "3,1", "3,2"],
    orientation: "vertical",
  },
];

const zeroCounts = new Map<ShipType, number>([
  ["destroyer", 0],
  ["submarine", 0],
]);

describe("ShipStatusList", () => {
  // ---------------------------------------------------------------------------
  // Structure
  // ---------------------------------------------------------------------------

  it("renders a labelled section for fleet status", () => {
    render(
      <ShipStatusList
        ships={twoShipFleet}
        hitCounts={zeroCounts}
        sunkShipIds={new Set()}
      />,
    );
    expect(
      screen.getByRole("region", { name: /Fleet status/i }),
    ).toBeInTheDocument();
  });

  it("renders one item per ship", () => {
    render(
      <ShipStatusList
        ships={twoShipFleet}
        hitCounts={zeroCounts}
        sunkShipIds={new Set()}
      />,
    );
    expect(screen.getByText("Destroyer")).toBeInTheDocument();
    expect(screen.getByText("Submarine")).toBeInTheDocument();
  });

  it("renders an empty list when the fleet is empty", () => {
    render(
      <ShipStatusList
        ships={[]}
        hitCounts={new Map()}
        sunkShipIds={new Set()}
      />,
    );
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // List accessible label — sunk count
  // ---------------------------------------------------------------------------

  it("labels the list with zero sunk ships initially", () => {
    render(
      <ShipStatusList
        ships={twoShipFleet}
        hitCounts={zeroCounts}
        sunkShipIds={new Set()}
      />,
    );
    expect(
      screen.getByRole("list", { name: "0 of 2 ships sunk" }),
    ).toBeInTheDocument();
  });

  it("updates the list label when one ship is sunk", () => {
    render(
      <ShipStatusList
        ships={twoShipFleet}
        hitCounts={zeroCounts}
        sunkShipIds={new Set(["destroyer"])}
      />,
    );
    expect(
      screen.getByRole("list", { name: "1 of 2 ships sunk" }),
    ).toBeInTheDocument();
  });

  it("updates the list label when all ships are sunk", () => {
    render(
      <ShipStatusList
        ships={twoShipFleet}
        hitCounts={zeroCounts}
        sunkShipIds={new Set(["destroyer", "submarine"])}
      />,
    );
    expect(
      screen.getByRole("list", { name: "2 of 2 ships sunk" }),
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Hit count display
  // ---------------------------------------------------------------------------

  it("shows zero hit count when provided", () => {
    render(
      <ShipStatusList
        ships={twoShipFleet}
        hitCounts={zeroCounts}
        sunkShipIds={new Set()}
      />,
    );
    expect(screen.getByLabelText("Destroyer: 0 of 2 hit")).toBeInTheDocument();
  });

  it("shows a partial hit count when provided", () => {
    const counts = new Map<ShipType, number>([
      ["destroyer", 1],
      ["submarine", 0],
    ]);
    render(
      <ShipStatusList
        ships={twoShipFleet}
        hitCounts={counts}
        sunkShipIds={new Set()}
      />,
    );
    expect(screen.getByLabelText("Destroyer: 1 of 2 hit")).toBeInTheDocument();
  });

  it("renders each ship's hit count independently", () => {
    const counts = new Map<ShipType, number>([
      ["destroyer", 0],
      ["submarine", 2],
    ]);
    render(
      <ShipStatusList
        ships={twoShipFleet}
        hitCounts={counts}
        sunkShipIds={new Set()}
      />,
    );
    expect(screen.getByLabelText("Destroyer: 0 of 2 hit")).toBeInTheDocument();
    expect(screen.getByLabelText("Submarine: 2 of 3 hit")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Sunk state propagation
  // ---------------------------------------------------------------------------

  it("marks a ship as sunk when its id is in sunkShipIds", () => {
    render(
      <ShipStatusList
        ships={twoShipFleet}
        hitCounts={zeroCounts}
        sunkShipIds={new Set(["destroyer"])}
      />,
    );
    expect(screen.getByLabelText("Destroyer: sunk")).toBeInTheDocument();
    // The other ship should still reflect normal hit state
    expect(screen.getByLabelText("Submarine: 0 of 3 hit")).toBeInTheDocument();
  });
});
