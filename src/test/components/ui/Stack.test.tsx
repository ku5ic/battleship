import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Stack } from "@/components/ui";

describe("Stack", () => {
  it("renders a div", () => {
    render(<Stack>content</Stack>);
    // No implicit ARIA role for a plain div — query by text.
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("renders all children", () => {
    render(
      <Stack>
        <span>first</span>
        <span>second</span>
        <span>third</span>
      </Stack>,
    );
    expect(screen.getByText("first")).toBeInTheDocument();
    expect(screen.getByText("second")).toBeInTheDocument();
    expect(screen.getByText("third")).toBeInTheDocument();
  });

  it("is a flex column", () => {
    const { container } = render(<Stack>content</Stack>);
    expect(container.firstChild).toHaveClass("flex", "flex-col");
  });

  it("applies gap='sm' class", () => {
    const { container } = render(<Stack gap="sm">content</Stack>);
    expect(container.firstChild).toHaveClass("gap-2");
  });

  it("applies gap='lg' class", () => {
    const { container } = render(<Stack gap="lg">content</Stack>);
    expect(container.firstChild).toHaveClass("gap-8");
  });

  it("defaults to center alignment", () => {
    const { container } = render(<Stack>content</Stack>);
    expect(container.firstChild).toHaveClass("items-center");
  });

  it("applies align='start' class", () => {
    const { container } = render(<Stack align="start">content</Stack>);
    expect(container.firstChild).toHaveClass("items-start");
  });

  it("merges className with layout classes", () => {
    const { container } = render(
      <Stack className="max-w-3xl mx-auto">content</Stack>,
    );
    expect(container.firstChild).toHaveClass("max-w-3xl", "mx-auto", "flex-col");
  });
});
