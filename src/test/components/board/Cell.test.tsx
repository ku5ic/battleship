import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Cell } from "@/components/board/Cell";

describe("Cell", () => {
  it("renders as a button element", () => {
    render(
      <Cell
        coord="0,0"
        columnLabel="A"
        status="untouched"
        onFire={vi.fn()}
        tabIndex={0}
      />,
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("includes column label and row number in the accessible name", () => {
    // col=0 → A, row=0 → 1
    render(
      <Cell
        coord="0,0"
        columnLabel="A"
        status="untouched"
        onFire={vi.fn()}
        tabIndex={0}
      />,
    );
    expect(screen.getByRole("button", { name: /A1/i })).toBeInTheDocument();
  });

  it("encodes 'not fired' state in the accessible name for untouched cells", () => {
    render(
      <Cell
        coord="0,0"
        columnLabel="A"
        status="untouched"
        onFire={vi.fn()}
        tabIndex={0}
      />,
    );
    expect(screen.getByRole("button")).toHaveAccessibleName(
      "A1, not fired. Press Space to fire",
    );
  });

  it("encodes 'hit' in the accessible name for a hit cell", () => {
    // col=2 → C, row=3 → 4
    render(<Cell coord="2,3" columnLabel="C" status="hit" onFire={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveAccessibleName("C4, hit");
  });

  it("encodes 'miss' in the accessible name for a miss cell", () => {
    // col=9 → J, row=9 → 10
    render(<Cell coord="9,9" columnLabel="J" status="miss" onFire={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveAccessibleName("J10, miss");
  });

  it("appends a fire hint to the accessible name for fireable cells only", () => {
    render(
      <Cell
        coord="0,0"
        columnLabel="A"
        status="untouched"
        onFire={vi.fn()}
        tabIndex={0}
      />,
    );
    expect(screen.getByRole("button")).toHaveAccessibleName(
      /Press Space to fire/i,
    );
  });

  it("omits the fire hint from fired cells", () => {
    render(<Cell coord="0,0" columnLabel="A" status="hit" onFire={vi.fn()} />);
    expect(screen.getByRole("button")).not.toHaveAccessibleName(/Press Space/i);
  });

  it("is not disabled for an untouched cell", () => {
    render(
      <Cell
        coord="0,0"
        columnLabel="A"
        status="untouched"
        onFire={vi.fn()}
        tabIndex={0}
      />,
    );
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("is disabled when status is hit", () => {
    render(<Cell coord="0,0" columnLabel="A" status="hit" onFire={vi.fn()} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("is disabled when status is miss", () => {
    render(<Cell coord="0,0" columnLabel="A" status="miss" onFire={vi.fn()} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("is disabled when the disabled prop is explicitly set", () => {
    render(
      <Cell
        coord="0,0"
        columnLabel="A"
        status="untouched"
        onFire={vi.fn()}
        disabled
        tabIndex={0}
      />,
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("calls onFire with the cell's coordinate when clicked", async () => {
    const user = userEvent.setup();
    const onFire = vi.fn();
    render(
      <Cell
        coord="3,5"
        columnLabel="D"
        status="untouched"
        onFire={onFire}
        tabIndex={0}
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(onFire).toHaveBeenCalledOnce();
    expect(onFire).toHaveBeenCalledWith("3,5");
  });

  it("does not call onFire when the cell has already been hit", async () => {
    const user = userEvent.setup();
    const onFire = vi.fn();
    render(<Cell coord="3,5" columnLabel="D" status="hit" onFire={onFire} />);
    await user.click(screen.getByRole("button"));
    expect(onFire).not.toHaveBeenCalled();
  });

  it("does not call onFire when the cell has already been missed", async () => {
    const user = userEvent.setup();
    const onFire = vi.fn();
    render(<Cell coord="3,5" columnLabel="D" status="miss" onFire={onFire} />);
    await user.click(screen.getByRole("button"));
    expect(onFire).not.toHaveBeenCalled();
  });

  it("stores the coordinate in data-coord for keyboard navigation lookups", () => {
    render(
      <Cell
        coord="4,7"
        columnLabel="E"
        status="untouched"
        onFire={vi.fn()}
        tabIndex={0}
      />,
    );
    expect(screen.getByRole("button")).toHaveAttribute("data-coord", "4,7");
  });

  it("applies scale class to an unfired enabled cell", () => {
    render(
      <Cell
        coord="0,0"
        columnLabel="A"
        status="untouched"
        onFire={vi.fn()}
        tabIndex={0}
      />,
    );
    expect(screen.getByRole("button").className).toContain("hover:scale-125");
  });

  it("does not apply scale class to a hit cell", () => {
    render(<Cell coord="0,0" columnLabel="A" status="hit" onFire={vi.fn()} />);
    expect(screen.getByRole("button").className).not.toContain(
      "hover:scale-125",
    );
  });

  it("does not apply scale class to a miss cell", () => {
    render(<Cell coord="0,0" columnLabel="A" status="miss" onFire={vi.fn()} />);
    expect(screen.getByRole("button").className).not.toContain(
      "hover:scale-125",
    );
  });

  it("retains tabIndex 0 when disabled and focused", () => {
    render(
      <Cell
        coord="0,0"
        columnLabel="A"
        status="hit"
        onFire={vi.fn()}
        tabIndex={0}
      />,
    );
    expect(screen.getByRole("button")).toHaveAttribute("tabindex", "0");
  });

  it("sets tabIndex -1 when disabled and not focused", () => {
    render(
      <Cell
        coord="0,0"
        columnLabel="A"
        status="hit"
        onFire={vi.fn()}
        tabIndex={-1}
      />,
    );
    expect(screen.getByRole("button")).toHaveAttribute("tabindex", "-1");
  });

  it("does not apply scale class to a disabled unfired cell", () => {
    render(
      <Cell
        coord="0,0"
        columnLabel="A"
        status="untouched"
        onFire={vi.fn()}
        disabled
        tabIndex={0}
      />,
    );
    expect(screen.getByRole("button").className).not.toContain(
      "hover:scale-125",
    );
  });

  it("shows tooltip on hover for an untouched enabled cell", async () => {
    const user = userEvent.setup();
    render(
      <Cell
        coord="0,0"
        columnLabel="A"
        status="untouched"
        onFire={vi.fn()}
        tabIndex={0}
      />,
    );
    await user.hover(screen.getByRole("button"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("A1");
  });

  it("does not render a tooltip for a hit cell", () => {
    render(<Cell coord="0,0" columnLabel="A" status="hit" onFire={vi.fn()} />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("does not render a tooltip for a miss cell", () => {
    render(<Cell coord="0,0" columnLabel="A" status="miss" onFire={vi.fn()} />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
