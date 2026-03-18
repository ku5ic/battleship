import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShotResultAnnouncer } from "@/features/battleship/components/ShotResultAnnouncer";

describe("ShotResultAnnouncer", () => {
  // ---------------------------------------------------------------------------
  // Live region presence
  // ---------------------------------------------------------------------------

  it("always renders the live region so assistive tech can observe updates", () => {
    render(<ShotResultAnnouncer result={null} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("is empty when there is no result", () => {
    render(<ShotResultAnnouncer result={null} />);
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  // ---------------------------------------------------------------------------
  // Outcome announcements
  // ---------------------------------------------------------------------------

  it("announces a miss", () => {
    render(
      <ShotResultAnnouncer result={{ coordinate: "9,9", outcome: "miss" }} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Miss.");
  });

  it("announces a hit", () => {
    render(
      <ShotResultAnnouncer result={{ coordinate: "0,0", outcome: "hit" }} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Hit!");
  });

  it("announces already-fired", () => {
    render(
      <ShotResultAnnouncer
        result={{ coordinate: "0,0", outcome: "already-fired" }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "You already fired here.",
    );
  });

  it("announces a sunk ship by its display name", () => {
    render(
      <ShotResultAnnouncer
        result={{ coordinate: "1,0", outcome: "sunk", sunkShipId: "destroyer" }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Hit! You sunk the Destroyer!",
    );
  });

  it("announces all sunk ship names correctly", () => {
    const cases = [
      { id: "carrier", name: "Carrier" },
      { id: "battleship", name: "Battleship" },
      { id: "cruiser", name: "Cruiser" },
      { id: "submarine", name: "Submarine" },
    ] as const;

    for (const { id, name } of cases) {
      const { unmount } = render(
        <ShotResultAnnouncer
          result={{ coordinate: "0,0", outcome: "sunk", sunkShipId: id }}
        />,
      );
      expect(screen.getByRole("status")).toHaveTextContent(
        `Hit! You sunk the ${name}!`,
      );
      unmount();
    }
  });

  it("falls back to a generic ship name when sunkShipId is absent", () => {
    render(
      <ShotResultAnnouncer result={{ coordinate: "0,0", outcome: "sunk" }} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Hit! You sunk the Ship!",
    );
  });
});
