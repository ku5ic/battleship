import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlacementScreen } from "@/battleship/components/PlacementScreen";

vi.mock("@/battleship/services/placement", async () => {
  const { computeShipPreview } =
    await import("@/battleship/services/placement");
  const { parseLayout } = await import("@/battleship/data/layout");
  const { RAW_GAME_CONFIG } = await import("@/battleship/data/config");
  return {
    computeShipPreview,
    generateRandomLayout: vi.fn(() => parseLayout(RAW_GAME_CONFIG, 10)),
  };
});

describe("PlacementScreen", () => {
  it("renders all five ship types in the palette", () => {
    render(
      <PlacementScreen
        difficulty="easy"
        onConfirm={vi.fn()}
        onRandomise={vi.fn()}
      />,
    );

    const palette = screen.getByRole("listbox", {
      name: "Select a ship to place",
    });
    const options = within(palette).getAllByRole("option");
    expect(options).toHaveLength(5);
  });

  it("ship palette items are buttons", () => {
    render(
      <PlacementScreen
        difficulty="easy"
        onConfirm={vi.fn()}
        onRandomise={vi.fn()}
      />,
    );

    const palette = screen.getByRole("listbox", {
      name: "Select a ship to place",
    });
    const buttons = within(palette).getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(5);
  });

  it("clicking a ship item selects it", async () => {
    const user = userEvent.setup();
    render(
      <PlacementScreen
        difficulty="easy"
        onConfirm={vi.fn()}
        onRandomise={vi.fn()}
      />,
    );

    const carrierBtn = screen.getByLabelText(
      "Carrier, 5 cells. Select to place.",
    );
    await user.click(carrierBtn);

    expect(carrierBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("clicking a valid board cell after selecting a ship places it", async () => {
    const user = userEvent.setup();
    render(
      <PlacementScreen
        difficulty="easy"
        onConfirm={vi.fn()}
        onRandomise={vi.fn()}
      />,
    );

    // Select destroyer (size 2)
    const destroyerBtn = screen.getByLabelText(
      "Destroyer, 2 cells. Select to place.",
    );
    await user.click(destroyerBtn);

    const grid = screen.getByLabelText("Place your fleet");
    const gridCell = within(grid).getByLabelText("A1, empty");
    await user.hover(gridCell);
    await user.click(gridCell);

    // After placing, destroyer should show as "Placed"
    expect(screen.getByText("Placed")).toBeInTheDocument();
  });

  it("clicking an occupied cell does not add a duplicate placement", async () => {
    const user = userEvent.setup();
    render(
      <PlacementScreen
        difficulty="easy"
        onConfirm={vi.fn()}
        onRandomise={vi.fn()}
      />,
    );

    // Select and place destroyer at A1
    const destroyerBtn = screen.getByLabelText(
      "Destroyer, 2 cells. Select to place.",
    );
    await user.click(destroyerBtn);

    const grid = screen.getByLabelText("Place your fleet");
    const cellA1 = within(grid).getByLabelText("A1, empty");
    await user.hover(cellA1);
    await user.click(cellA1);

    // Now auto-selected next ship; hover over the occupied cell
    const occupiedCell = within(grid).getByLabelText("A1, ship placed");
    await user.hover(occupiedCell);
    await user.click(occupiedCell);

    // Should still only have 1 placed ship badge
    const placedBadges = screen.getAllByText("Placed");
    expect(placedBadges).toHaveLength(1);
  });

  it("placed ships appear with Placed badge", async () => {
    const user = userEvent.setup();
    render(
      <PlacementScreen
        difficulty="easy"
        onConfirm={vi.fn()}
        onRandomise={vi.fn()}
      />,
    );

    const destroyerBtn = screen.getByLabelText(
      "Destroyer, 2 cells. Select to place.",
    );
    await user.click(destroyerBtn);

    const grid = screen.getByLabelText("Place your fleet");
    const cellA1 = within(grid).getByLabelText("A1, empty");
    await user.hover(cellA1);
    await user.click(cellA1);

    expect(screen.getByText("Placed")).toBeInTheDocument();
  });

  it("selected ship has aria-pressed=true", async () => {
    const user = userEvent.setup();
    render(
      <PlacementScreen
        difficulty="easy"
        onConfirm={vi.fn()}
        onRandomise={vi.fn()}
      />,
    );

    const carrierBtn = screen.getByLabelText(
      "Carrier, 5 cells. Select to place.",
    );
    await user.click(carrierBtn);
    expect(carrierBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("Start game has aria-disabled when not all ships placed", () => {
    render(
      <PlacementScreen
        difficulty="easy"
        onConfirm={vi.fn()}
        onRandomise={vi.fn()}
      />,
    );

    const startBtn = screen.getByRole("button", { name: "Start game" });
    expect(startBtn).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Place all ships to continue")).toBeInTheDocument();
  });

  it("Start game calls onConfirm with Ship[] when all ships placed", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <PlacementScreen
        difficulty="easy"
        onConfirm={onConfirm}
        onRandomise={vi.fn()}
      />,
    );

    // Select the first ship manually — after that, auto-select kicks in
    const carrierBtn = screen.getByLabelText(
      "Carrier, 5 cells. Select to place.",
    );
    await user.click(carrierBtn);

    const grid = screen.getByLabelText("Place your fleet");

    // Place all 5 ships at non-overlapping rows (each horizontal from col A)
    for (let i = 0; i < 5; i++) {
      const rowNum = String(i + 1);
      const cellLabel = `A${rowNum}, empty`;
      const cell = within(grid).getByLabelText(cellLabel);
      await user.hover(cell);
      await user.click(cell);
    }

    const startBtn = screen.getByRole("button", { name: "Start game" });
    expect(startBtn).toHaveAttribute("aria-disabled", "false");
    await user.click(startBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "carrier" }),
        expect.objectContaining({ id: "destroyer" }),
      ]),
    );
  });

  it("Randomise for me calls onRandomise", async () => {
    const user = userEvent.setup();
    const onRandomise = vi.fn();
    render(
      <PlacementScreen
        difficulty="easy"
        onConfirm={vi.fn()}
        onRandomise={onRandomise}
      />,
    );

    const btn = screen.getByRole("button", { name: "Randomise for me" });
    await user.click(btn);

    expect(onRandomise).toHaveBeenCalledTimes(1);
  });

  it("orientation toggle button is present", () => {
    render(
      <PlacementScreen
        difficulty="easy"
        onConfirm={vi.fn()}
        onRandomise={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: /Rotate ship/,
      }),
    ).toBeInTheDocument();
  });

  it("aria-live region announces placement events", async () => {
    const user = userEvent.setup();
    render(
      <PlacementScreen
        difficulty="easy"
        onConfirm={vi.fn()}
        onRandomise={vi.fn()}
      />,
    );

    // Select and place destroyer
    const destroyerBtn = screen.getByLabelText(
      "Destroyer, 2 cells. Select to place.",
    );
    await user.click(destroyerBtn);

    const grid = screen.getByLabelText("Place your fleet");
    const cellA1 = within(grid).getByLabelText("A1, empty");
    await user.hover(cellA1);
    await user.click(cellA1);

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion?.textContent).toBe("Destroyer placed at A1");
  });

  it("R key triggers orientation toggle", async () => {
    const user = userEvent.setup();
    render(
      <PlacementScreen
        difficulty="easy"
        onConfirm={vi.fn()}
        onRandomise={vi.fn()}
      />,
    );

    // Select a ship first
    const carrierBtn = screen.getByLabelText(
      "Carrier, 5 cells. Select to place.",
    );
    await user.click(carrierBtn);

    // Press R key
    await user.keyboard("r");

    // The orientation toggle button should reflect the change
    expect(
      screen.getByRole("button", {
        name: /currently vertical/,
      }),
    ).toBeInTheDocument();
  });
});
