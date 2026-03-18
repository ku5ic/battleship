import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShipStatusList } from "@/features/battleship/components/ShipStatusList";
import type {
  CellStatus,
  CoordinateKey,
  Ship,
} from "@/features/battleship/types";

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

describe("ShipStatusList", () => {
  // ---------------------------------------------------------------------------
  // Structure
  // ---------------------------------------------------------------------------

  it("renders a labelled section for fleet status", () => {
    render(
      <ShipStatusList
        ships={twoShipFleet}
        shots={new Map()}
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
        shots={new Map()}
        sunkShipIds={new Set()}
      />,
    );
    expect(screen.getByText("Destroyer")).toBeInTheDocument();
    expect(screen.getByText("Submarine")).toBeInTheDocument();
  });

  it("renders an empty list when the fleet is empty", () => {
    render(
      <ShipStatusList ships={[]} shots={new Map()} sunkShipIds={new Set()} />,
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
        shots={new Map()}
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
        shots={new Map()}
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
        shots={new Map()}
        sunkShipIds={new Set(["destroyer", "submarine"])}
      />,
    );
    expect(
      screen.getByRole("list", { name: "2 of 2 ships sunk" }),
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Hit count derivation from shots map
  // ---------------------------------------------------------------------------

  it("derives a zero hit count from an empty shots map", () => {
    render(
      <ShipStatusList
        ships={twoShipFleet}
        shots={new Map()}
        sunkShipIds={new Set()}
      />,
    );
    expect(screen.getByLabelText("Destroyer: 0 of 2 hit")).toBeInTheDocument();
  });

  it("derives a partial hit count from the shots map", () => {
    const shots = new Map<CoordinateKey, CellStatus>([["0,0", "hit"]]);
    render(
      <ShipStatusList
        ships={twoShipFleet}
        shots={shots}
        sunkShipIds={new Set()}
      />,
    );
    expect(screen.getByLabelText("Destroyer: 1 of 2 hit")).toBeInTheDocument();
  });

  it("does not count hits on other ships toward a given ship's total", () => {
    // Only submarine coords are hit; destroyer should remain at 0.
    const shots = new Map<CoordinateKey, CellStatus>([
      ["3,0", "hit"],
      ["3,1", "hit"],
    ]);
    render(
      <ShipStatusList
        ships={twoShipFleet}
        shots={shots}
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
        shots={new Map()}
        sunkShipIds={new Set(["destroyer"])}
      />,
    );
    expect(screen.getByLabelText("Destroyer: sunk")).toBeInTheDocument();
    // The other ship should still reflect normal hit state
    expect(screen.getByLabelText("Submarine: 0 of 3 hit")).toBeInTheDocument();
  });
});
