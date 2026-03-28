import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui";

describe("Button", () => {
  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  it("renders as a button element", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders children", () => {
    render(<Button>Play again</Button>);
    expect(
      screen.getByRole("button", { name: "Play again" }),
    ).toBeInTheDocument();
  });

  it("has type='button' by default", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("merges className with variant classes", () => {
    render(<Button className="mt-4">Click me</Button>);
    expect(screen.getByRole("button")).toHaveClass("mt-4");
  });

  // ---------------------------------------------------------------------------
  // Interaction
  // ---------------------------------------------------------------------------

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not call onClick when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Click me
      </Button>,
    );
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Ref forwarding
  // ---------------------------------------------------------------------------

  it("forwards ref to the underlying button element", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Click me</Button>);
    expect(ref.current).toBe(screen.getByRole("button"));
  });

  // ---------------------------------------------------------------------------
  // Prop spreading
  // ---------------------------------------------------------------------------

  it("spreads additional props onto the button element", () => {
    render(
      <Button aria-pressed={true} data-testid="toggle-btn">
        Single player
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(btn).toHaveAttribute("data-testid", "toggle-btn");
  });

  // ---------------------------------------------------------------------------
  // Variants
  // ---------------------------------------------------------------------------

  it("toggle variant applies active classes when active is true", () => {
    render(
      <Button variant="toggle" active>
        Single player
      </Button>,
    );
    // Active toggle uses a yellow border to signal the selected state.
    expect(screen.getByRole("button")).toHaveClass("border-yellow-400");
  });

  it("toggle variant applies inactive classes when active is false", () => {
    render(
      <Button variant="toggle" active={false}>
        vs Computer
      </Button>,
    );
    expect(screen.getByRole("button")).not.toHaveClass("border-yellow-400");
    expect(screen.getByRole("button")).toHaveClass("border-slate-500");
  });

  it("does not pass the active prop to the DOM element", () => {
    render(
      <Button variant="toggle" active>
        Single player
      </Button>,
    );
    // "active" is not a valid HTML button attribute and must not be forwarded.
    expect(screen.getByRole("button")).not.toHaveAttribute("active");
  });
});
