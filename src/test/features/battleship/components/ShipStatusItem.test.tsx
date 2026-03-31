import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShipStatusItem } from "@/features/battleship/components/ShipStatusItem";

describe("ShipStatusItem", () => {
  // ---------------------------------------------------------------------------
  // Display name
  // ---------------------------------------------------------------------------

  it("renders the human-readable ship name", () => {
    render(
      <ShipStatusItem id="destroyer" size={2} hitCount={0} isSunk={false} />,
    );
    expect(screen.getByText("Destroyer")).toBeInTheDocument();
  });

  it("resolves the correct display name for each ship type", () => {
    const cases = [
      { id: "carrier", name: "Carrier" },
      { id: "battleship", name: "Battleship" },
      { id: "cruiser", name: "Cruiser" },
      { id: "submarine", name: "Submarine" },
    ] as const;

    for (const { id, name } of cases) {
      const { unmount } = render(
        <ShipStatusItem id={id} size={3} hitCount={0} isSunk={false} />,
      );
      expect(screen.getByText(name)).toBeInTheDocument();
      unmount();
    }
  });

  // ---------------------------------------------------------------------------
  // Pip count
  // ---------------------------------------------------------------------------

  it("renders one pip per ship cell", () => {
    const { container } = render(
      <ShipStatusItem id="carrier" size={5} hitCount={0} isSunk={false} />,
    );
    // The pip container is aria-hidden so it won't pollute the accessible tree.
    const pipContainer = container.querySelector('[aria-hidden="true"]');
    expect(pipContainer?.children).toHaveLength(5);
  });

  it("renders the correct pip count for a 2-cell ship", () => {
    const { container } = render(
      <ShipStatusItem id="destroyer" size={2} hitCount={0} isSunk={false} />,
    );
    const pipContainer = container.querySelector('[aria-hidden="true"]');
    expect(pipContainer?.children).toHaveLength(2);
  });

  // ---------------------------------------------------------------------------
  // Accessible label — hit progress
  // ---------------------------------------------------------------------------

  it("accessible label reflects zero hits", () => {
    render(
      <ShipStatusItem id="destroyer" size={2} hitCount={0} isSunk={false} />,
    );
    expect(screen.getByLabelText("Destroyer: 0 of 2 hit")).toBeInTheDocument();
  });

  it("accessible label reflects partial hits", () => {
    render(
      <ShipStatusItem id="battleship" size={4} hitCount={2} isSunk={false} />,
    );
    expect(screen.getByLabelText("Battleship: 2 of 4 hit")).toBeInTheDocument();
  });

  it("accessible label says 'sunk' when the ship is sunk", () => {
    render(
      <ShipStatusItem id="destroyer" size={2} hitCount={2} isSunk={true} />,
    );
    expect(screen.getByLabelText("Destroyer: sunk")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Sunk badge
  // ---------------------------------------------------------------------------

  it("shows a Sunk badge when the ship is sunk", () => {
    render(
      <ShipStatusItem id="destroyer" size={2} hitCount={2} isSunk={true} />,
    );
    expect(screen.getByText("Sunk")).toBeInTheDocument();
  });

  it("does not show a Sunk badge when the ship is not sunk", () => {
    render(
      <ShipStatusItem id="destroyer" size={2} hitCount={1} isSunk={false} />,
    );
    expect(screen.queryByText("Sunk")).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Visual sunk state
  // ---------------------------------------------------------------------------

  it("applies strikethrough styling to the ship name when sunk", () => {
    render(
      <ShipStatusItem id="destroyer" size={2} hitCount={2} isSunk={true} />,
    );
    const nameEl = screen.getByText("Destroyer");
    expect(nameEl).toHaveClass("line-through");
  });

  it("does not apply strikethrough styling when the ship is still afloat", () => {
    render(
      <ShipStatusItem id="destroyer" size={2} hitCount={0} isSunk={false} />,
    );
    const nameEl = screen.getByText("Destroyer");
    expect(nameEl).not.toHaveClass("line-through");
  });

  // ---------------------------------------------------------------------------
  // Placement mode — onClick / isPlaced / isSelected
  // ---------------------------------------------------------------------------

  it("renders as div when onClick is absent", () => {
    const { container } = render(
      <ShipStatusItem id="destroyer" size={2} hitCount={0} isSunk={false} />,
    );
    expect(container.querySelector("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders as button with aria-pressed=false when onClick is provided", () => {
    render(
      <ShipStatusItem
        id="destroyer"
        size={2}
        hitCount={0}
        isSunk={false}
        onClick={vi.fn()}
      />,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("sets aria-pressed=true when isSelected is true", () => {
    render(
      <ShipStatusItem
        id="destroyer"
        size={2}
        hitCount={0}
        isSunk={false}
        onClick={vi.fn()}
        isSelected={true}
      />,
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("renders pip row when isPlaced is false", () => {
    const { container } = render(
      <ShipStatusItem
        id="destroyer"
        size={2}
        hitCount={0}
        isSunk={false}
        onClick={vi.fn()}
        isPlaced={false}
      />,
    );
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    expect(screen.queryByText("Placed")).not.toBeInTheDocument();
  });

  it("renders Placed badge and hides pip row when isPlaced is true", () => {
    const { container } = render(
      <ShipStatusItem
        id="destroyer"
        size={2}
        hitCount={0}
        isSunk={false}
        onClick={vi.fn()}
        isPlaced={true}
      />,
    );
    expect(screen.getByText("Placed")).toBeInTheDocument();
    expect(
      container.querySelector('[aria-hidden="true"]'),
    ).not.toBeInTheDocument();
  });

  it("accessible label in placement mode includes ship name and size", () => {
    render(
      <ShipStatusItem
        id="destroyer"
        size={2}
        hitCount={0}
        isSunk={false}
        onClick={vi.fn()}
        isPlaced={false}
        isSelected={false}
      />,
    );
    expect(
      screen.getByLabelText("Destroyer, 2 cells. Select to place."),
    ).toBeInTheDocument();
  });

  it("accessible label in placement mode includes Selected when isSelected", () => {
    render(
      <ShipStatusItem
        id="destroyer"
        size={2}
        hitCount={0}
        isSunk={false}
        onClick={vi.fn()}
        isPlaced={false}
        isSelected={true}
      />,
    );
    expect(
      screen.getByLabelText("Destroyer, 2 cells. Selected."),
    ).toBeInTheDocument();
  });

  it("accessible label in placement mode includes placed when isPlaced", () => {
    render(
      <ShipStatusItem
        id="destroyer"
        size={2}
        hitCount={0}
        isSunk={false}
        onClick={vi.fn()}
        isPlaced={true}
      />,
    );
    expect(
      screen.getByLabelText("Destroyer: placed. Click to re-place."),
    ).toBeInTheDocument();
  });
});
