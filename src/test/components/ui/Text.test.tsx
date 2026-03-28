import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Text } from "@/components/ui";

describe("Text", () => {
  // ---------------------------------------------------------------------------
  // Element type
  // ---------------------------------------------------------------------------

  it("renders as a span by default", () => {
    const { container } = render(<Text variant="title">Battleship</Text>);
    expect(container.querySelector("span")).toBeInTheDocument();
  });

  it("renders as the element specified by the 'as' prop", () => {
    const { container } = render(
      <Text as="h1" variant="title">
        Battleship
      </Text>,
    );
    expect(container.querySelector("h1")).toBeInTheDocument();
  });

  it("renders as h2 when as='h2'", () => {
    const { container } = render(
      <Text as="h2" variant="label">
        Fleet
      </Text>,
    );
    expect(container.querySelector("h2")).toBeInTheDocument();
  });

  it("renders as p when as='p'", () => {
    const { container } = render(
      <Text as="p" variant="label">
        Status
      </Text>,
    );
    expect(container.querySelector("p")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Children
  // ---------------------------------------------------------------------------

  it("renders the text content", () => {
    render(<Text variant="title">Battleship</Text>);
    expect(screen.getByText("Battleship")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Variants
  // ---------------------------------------------------------------------------

  it("title variant applies large text and light color classes", () => {
    const { container } = render(<Text variant="title">Battleship</Text>);
    expect(container.firstChild).toHaveClass("text-xl", "text-slate-100");
  });

  it("label variant applies small uppercase tracking classes", () => {
    const { container } = render(<Text variant="label">Fleet</Text>);
    expect(container.firstChild).toHaveClass(
      "text-xs",
      "uppercase",
      "tracking-widest",
      "text-slate-400",
    );
  });

  // ---------------------------------------------------------------------------
  // className override
  // ---------------------------------------------------------------------------

  it("merges className with variant classes", () => {
    const { container } = render(
      <Text variant="label" className="mb-2">
        Fleet
      </Text>,
    );
    expect(container.firstChild).toHaveClass("mb-2", "text-xs");
  });
});
