import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Cell } from "@/components/board/Cell";

describe("Cell", () => {
  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  it("renders as a button element", () => {
    render(
      <Cell coord="0,0" status="untouched" onFire={vi.fn()} tabIndex={0} />,
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("includes column label and row number in the accessible name", () => {
    // col=0 → A, row=0 → 1
    render(
      <Cell coord="0,0" status="untouched" onFire={vi.fn()} tabIndex={0} />,
    );
    expect(screen.getByRole("button", { name: /A1/i })).toBeInTheDocument();
  });

  it("encodes 'not fired' state in the accessible name for untouched cells", () => {
    render(
      <Cell coord="0,0" status="untouched" onFire={vi.fn()} tabIndex={0} />,
    );
    expect(screen.getByRole("button")).toHaveAccessibleName(
      "A1, not fired. Press Space to fire",
    );
  });

  it("encodes 'hit' in the accessible name for a hit cell", () => {
    // col=2 → C, row=3 → 4
    render(<Cell coord="2,3" status="hit" onFire={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveAccessibleName("C4, hit");
  });

  it("encodes 'miss' in the accessible name for a miss cell", () => {
    // col=9 → J, row=9 → 10
    render(<Cell coord="9,9" status="miss" onFire={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveAccessibleName("J10, miss");
  });

  it("appends a fire hint to the accessible name for fireable cells only", () => {
    render(
      <Cell coord="0,0" status="untouched" onFire={vi.fn()} tabIndex={0} />,
    );
    expect(screen.getByRole("button")).toHaveAccessibleName(
      /Press Space to fire/i,
    );
  });

  it("omits the fire hint from fired cells", () => {
    render(<Cell coord="0,0" status="hit" onFire={vi.fn()} />);
    expect(screen.getByRole("button")).not.toHaveAccessibleName(/Press Space/i);
  });

  // ---------------------------------------------------------------------------
  // Disabled state
  // ---------------------------------------------------------------------------

  it("is not disabled for an untouched cell", () => {
    render(
      <Cell coord="0,0" status="untouched" onFire={vi.fn()} tabIndex={0} />,
    );
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("is disabled when status is hit", () => {
    render(<Cell coord="0,0" status="hit" onFire={vi.fn()} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("is disabled when status is miss", () => {
    render(<Cell coord="0,0" status="miss" onFire={vi.fn()} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("is disabled when the disabled prop is explicitly set", () => {
    render(
      <Cell
        coord="0,0"
        status="untouched"
        onFire={vi.fn()}
        disabled
        tabIndex={0}
      />,
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });

  // ---------------------------------------------------------------------------
  // Interaction
  // ---------------------------------------------------------------------------

  it("calls onFire with the cell's coordinate when clicked", async () => {
    const user = userEvent.setup();
    const onFire = vi.fn();
    render(
      <Cell coord="3,5" status="untouched" onFire={onFire} tabIndex={0} />,
    );
    await user.click(screen.getByRole("button"));
    expect(onFire).toHaveBeenCalledOnce();
    expect(onFire).toHaveBeenCalledWith("3,5");
  });

  it("does not call onFire when the cell has already been hit", async () => {
    const user = userEvent.setup();
    const onFire = vi.fn();
    render(<Cell coord="3,5" status="hit" onFire={onFire} />);
    await user.click(screen.getByRole("button"));
    expect(onFire).not.toHaveBeenCalled();
  });

  it("does not call onFire when the cell has already been missed", async () => {
    const user = userEvent.setup();
    const onFire = vi.fn();
    render(<Cell coord="3,5" status="miss" onFire={onFire} />);
    await user.click(screen.getByRole("button"));
    expect(onFire).not.toHaveBeenCalled();
  });

  it("stores the coordinate in data-coord for keyboard navigation lookups", () => {
    render(
      <Cell coord="4,7" status="untouched" onFire={vi.fn()} tabIndex={0} />,
    );
    expect(screen.getByRole("button")).toHaveAttribute("data-coord", "4,7");
  });
});
